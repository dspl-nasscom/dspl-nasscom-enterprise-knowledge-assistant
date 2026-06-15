"""LangGraph node functions for the ReAct agent.

Each node is a pure function: (AgentState) → dict of state updates.
LangGraph merges the returned dict into the running AgentState.

Node execution order:
  reason → tool_dispatch → rerank_node → generate_node → guard_node
                ↑___________|  (loop back if more tool calls needed)
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage

from app.agent.state import AgentState
from app.agent.tools.document_search import document_search
from app.agent.tools.ticket_lookup import ticket_lookup
from app.agent.tools.summariser import summariser
from app.core.exceptions import AnswerNotFoundError
from app.core.logging import get_logger
from app.generation.generator import generate_answer
from app.generation.guardrails import check_confidence
from app.retrieval.reranker import rerank

logger = get_logger(__name__)

# Load system prompt from file
_PROMPT_DIR = Path(__file__).parent / "prompts"


def _load_prompt(name: str) -> str:
    return (_PROMPT_DIR / name).read_text(encoding="utf-8")


REACT_SYSTEM = _load_prompt("react_system.txt")

MAX_TOOL_CALLS = 3   # latency budget — never exceed

# ── Rule-based router ─────────────────────────────────────────────────────────
# Matches ticket/incident patterns → ticket_lookup; everything else → document_search.
_TICKET_RE = re.compile(
    r"\b(ticket|incident|tkt|issue|bug|error|fix|resolved|workaround"
    r"|outage|escalat|support.request|case\s*#?|how.was.+fixed"
    r"|has.anyone.seen|standard.fix|known.issue)\b",
    re.IGNORECASE,
)


def _rule_based_tool(question: str) -> tuple[str, str]:
    """Return (tool_name, refined_query) using fast keyword rules.

    Falls back to document_search for anything that doesn't clearly
    look like a ticket/incident query.
    """
    if _TICKET_RE.search(question):
        return "ticket_lookup", question
    return "document_search", question


# ── Node 1: Reason ────────────────────────────────────────────────────────────

_INTENT_SYSTEM = """You are a classification assistant. Your sole job is to classify the user's message.

Categories:
1. CHITCHAT: greetings (e.g. "hello", "good morning", "hii", "how are you"), thanks, farewells, or simple social messages.
2. QUESTION: any factual question, statement, pasted line of text, policy query, or ticket lookup.

Few-shot examples:
- User: "hi" -> CHITCHAT: Hello! I'm the Knowledge Copilot. Feel free to ask me anything about our policies, procedures, or knowledge base.
- User: "good morning" -> CHITCHAT: Good morning! I'm the Knowledge Copilot. How can I help you today?
- User: "how are you?" -> CHITCHAT: I'm doing well, thank you! I'm the Knowledge Copilot. How can I help you today?
- User: "Acme Corporation is an equal opportunity employer." -> QUESTION
- User: "what is the leave policy?" -> QUESTION
- User: "ticket TKT-12345" -> QUESTION

Response format (strict):
- If CHITCHAT: reply with   CHITCHAT:<your warm friendly reply>
- If QUESTION: reply with exactly the word   QUESTION

No extra text, no markdown block wrappers, no quotes."""


_EASY_GREETINGS = {
    "hi", "hello", "hii", "hiii", "hey", "heyy",
    "thanks", "thank you", "thank u", "thx", "ok", "okay"
}


async def _classify_intent(question: str) -> tuple[bool, str]:
    """Use the LLM to classify chit-chat vs knowledge question.

    Returns:
        (is_chitchat: bool, reply: str)  — reply is non-empty only for chit-chat.
    """
    clean_q = question.strip()
    
    # 1. Fast pre-filter: check for simple, obvious greetings/social phrases
    if clean_q.lower().strip("!?. ") in _EASY_GREETINGS:
        logger.info("intent_classification_easy_greeting", question=clean_q[:80])
        return True, (
            "Hello! I'm the Knowledge Copilot. "
            "Feel free to ask me anything about our policies, procedures, or knowledge base."
        )

    # 2. Bypass LLM intent classification for long inputs or sentences with many words to save 4+ seconds of latency.
    if len(clean_q) > 100 or len(clean_q.split()) > 15:
        logger.info("intent_classification_bypass", reason="length_or_word_count", length=len(clean_q))
        return False, ""

    from app.generation.llm import get_llm
    try:
        llm = get_llm()
        # Bind max_output_tokens to limit generation time since the expected classification answer is short
        fast_llm = llm.bind(max_output_tokens=1500)
        response = fast_llm.invoke([
            SystemMessage(content=_INTENT_SYSTEM),
            HumanMessage(content=question),
        ])
        
        if hasattr(response, "content"):
            content = response.content
            if isinstance(content, list):
                parts = []
                for part in content:
                    if isinstance(part, str):
                        parts.append(part)
                    elif isinstance(part, dict) and "text" in part:
                        parts.append(part["text"])
                    elif hasattr(part, "get") and part.get("text"):
                        parts.append(part.get("text"))
                raw_text = "".join(parts)
            else:
                raw_text = str(content)
        else:
            raw_text = str(response)
            
        # Clean potential quotes or markdown code-block wrappers from LLM output
        text = raw_text.strip()
        text = re.sub(r"^```[a-zA-Z]*\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
        text = text.strip().strip('"\'')
        
        # Match CHITCHAT:<reply> or CHITCHAT <reply> or just CHITCHAT case-insensitively
        match = re.match(r"^chitchat\s*:?\s*(.*)", text, re.IGNORECASE)
        if match:
            reply = match.group(1).strip()
            # Fail-safe: ensure no leading "chitchat:" prefix remains in the reply
            reply = re.sub(r"^chitchat\s*:?\s*", "", reply, flags=re.IGNORECASE).strip()
            if not reply:
                reply = (
                    "Hello! I'm the Knowledge Copilot. "
                    "Feel free to ask me anything about our policies, procedures, or knowledge base."
                )
            return True, reply
        return False, ""
    except Exception as exc:
        logger.warning("intent_classification_failed", error=str(exc)[:200])
        # Safe default: treat as a real question so retrieval always runs
        return False, ""


# ── Node 1: Reason ────────────────────────────────────────────────────────────

async def reason_node(state: AgentState) -> Dict[str, Any]:
    """Classify intent then decide which tool to invoke next.

    Step 1 (LLM): Detect chit-chat vs knowledge question.
                  If chit-chat, return answer immediately — graph short-circuits to END.
    Step 2 (rules): For real questions, use keyword rules to pick tool.
    """
    question = state.get("question", "")
    tool_calls: List[dict] = state.get("tool_calls", [])

    # ── Step 1: chit-chat gate (only on the very first pass) ────────────────────
    if not tool_calls:  # first iteration only
        is_chitchat, reply = await _classify_intent(question)
        if is_chitchat:
            logger.info("reason_node_chitchat", question=question[:80])
            return {
                "is_chitchat": True,
                "answer": reply,
                "sources": [],
                "confidence": 1.0,
                "escalated": False,
                "tool_calls": tool_calls,
            }

    # ── Step 2: tool selection (real knowledge question) ───────────────────────
    if len(tool_calls) >= MAX_TOOL_CALLS:
        logger.warning("max_tool_calls_reached", count=len(tool_calls))
        return {"_next_tool": "done", "_next_query": "", "tool_calls": tool_calls}

    # After the first tool call, if we got chunks → done; if empty → try the other tool
    if len(tool_calls) == 1:
        last = tool_calls[0]
        if last["result_count"] > 0:
            tool = "done"
            query = ""
        else:
            tool = "ticket_lookup" if last["tool"] == "document_search" else "document_search"
            query = question
        logger.info("reason_node", tool=tool, query=query[:60], reasoning="fallback_to_other_tool")
        return {"_next_tool": tool, "_next_query": query, "tool_calls": tool_calls}

    # First call: use rule-based router
    tool, query = _rule_based_tool(question)
    logger.info("reason_node", tool=tool, query=query[:60], reasoning="rule_based_router")
    return {
        "is_chitchat": False,
        "_next_tool": tool,
        "_next_query": query,
        "tool_calls": tool_calls,
    }


# ── Node 2: Tool dispatch ─────────────────────────────────────────────────────

def tool_dispatch_node(state: AgentState) -> Dict[str, Any]:
    """Execute the tool selected by the reason node."""
    tool_name: str = state.get("_next_tool", "done")
    query: str = state.get("_next_query", state.get("question", ""))
    tool_calls: List[dict] = list(state.get("tool_calls", []))
    retrieved: List[dict] = list(state.get("retrieved_chunks", []))

    if tool_name == "done":
        return {}   # skip — proceed straight to generation

    chunks: List[dict] = []

    if tool_name == "document_search":
        chunks = document_search(query)
    elif tool_name == "ticket_lookup":
        chunks = ticket_lookup(query)
    elif tool_name == "summariser":
        # Summariser uses what we already have
        return {}   # jump to generate with current retrieved_chunks
    else:
        logger.warning("unknown_tool", tool=tool_name)
        chunks = document_search(query)   # safe fallback

    tool_calls.append({"tool": tool_name, "query": query, "result_count": len(chunks)})
    retrieved.extend(chunks)

    logger.info(
        "tool_dispatch_done",
        tool=tool_name,
        new_chunks=len(chunks),
        total_chunks=len(retrieved),
    )

    return {
        "tool_calls": tool_calls,
        "retrieved_chunks": retrieved,
        "tool_used": tool_name,
    }


# ── Node 3: Rerank (deduplicate + re-score merged pool) ───────────────────────

def rerank_node(state: AgentState) -> Dict[str, Any]:
    """Deduplicate and rerank the full pool of retrieved chunks."""
    question = state.get("question", "")
    retrieved: List[dict] = state.get("retrieved_chunks", [])

    if not retrieved:
        return {"reranked_chunks": []}

    # Deduplicate by chunk_id
    seen_ids: set = set()
    unique: List[dict] = []
    for c in retrieved:
        cid = c.get("metadata", {}).get("chunk_id", id(c))
        if cid not in seen_ids:
            seen_ids.add(cid)
            unique.append(c)

    reranked = rerank(query=question, candidates=unique)
    logger.info("rerank_node_done", unique=len(unique), reranked=len(reranked))
    return {"reranked_chunks": reranked}


# ── Node 4: Generate ──────────────────────────────────────────────────────────

async def generate_node(state: AgentState) -> Dict[str, Any]:
    """Run the guardrail check and generate the final cited answer."""
    question = state.get("question", "")
    chunks: List[dict] = state.get("reranked_chunks", [])

    try:
        verified = await check_confidence(chunks, question)
    except AnswerNotFoundError:
        return {
            "answer": (
                "Answer not found in the knowledge base. A support ticket has been raised for further review. In the meantime, feel free to ask another question or rephrase your query"
            ),
            "sources": [],
            "confidence": 0.0,
            "escalated": True,
        }

    result = await generate_answer(question=question, chunks=verified)
    return result


# ── Node 5: Guard (terminal validation) ───────────────────────────────────────

def guard_node(state: AgentState) -> Dict[str, Any]:
    """Final sanity check — ensures the state is consistent before returning."""
    answer = state.get("answer", "")
    if not answer:
        return {
            "answer": "Answer not found in the knowledge base.",
            "escalated": True,
            "sources": [],
            "confidence": 0.0,
        }
    return {}   # state already valid
