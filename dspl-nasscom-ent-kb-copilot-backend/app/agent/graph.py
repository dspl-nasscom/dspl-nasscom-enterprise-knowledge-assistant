"""LangGraph StateGraph — compiles the full ReAct agent pipeline.

Graph topology:
  START
    └─► reason_node          ← LLM decides which tool to call
          └─► tool_dispatch  ← executes the tool
                └─► [loop back to reason_node if more tools needed]
                └─► rerank_node   ← merges + reranks full chunk pool
                      └─► generate_node  ← guardrail + LLM answer
                            └─► guard_node  ← terminal sanity check
                                  └─► END

The conditional edge after tool_dispatch checks:
  - If max tool calls reached OR tool == "done" → go to rerank
  - Otherwise → loop back to reason
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from langgraph.graph import END, START, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agent.nodes import (
    generate_node,
    guard_node,
    reason_node,
    rerank_node,
    tool_dispatch_node,
)
from app.agent.state import AgentState
from app.core.logging import get_logger
from app.db.config_store import get_retrieval_config

logger = get_logger(__name__)

MAX_TOOL_CALLS = 3   # must match nodes.py


def _should_continue(state: AgentState) -> str:
    """Conditional edge: loop back to reason or proceed to rerank."""
    tool_calls = state.get("tool_calls", [])
    next_tool = state.get("_next_tool", "done")

    if next_tool == "done" or len(tool_calls) >= MAX_TOOL_CALLS:
        return "rerank"
    return "reason"   # loop


def _after_reason(state: AgentState) -> str:
    """Conditional edge after reason_node.

    If the LLM classified the input as chit-chat, jump straight to END
    (answer already in state, no retrieval or ticket needed).
    Otherwise fall through to tool_dispatch.
    """
    if state.get("is_chitchat", False):
        return "end"
    return "tool_dispatch"


def build_graph() -> CompiledStateGraph:
    """Construct and compile the LangGraph StateGraph."""
    builder = StateGraph(AgentState)

    # ── Register nodes ────────────────────────────────────────────────────────
    builder.add_node("reason", reason_node)
    builder.add_node("tool_dispatch", tool_dispatch_node)
    builder.add_node("rerank", rerank_node)
    builder.add_node("generate", generate_node)
    builder.add_node("guard", guard_node)

    # ── Edges ─────────────────────────────────────────────────────────────────
    builder.add_edge(START, "reason")

    # After reason: chit-chat → END immediately; real question → tool_dispatch
    builder.add_conditional_edges(
        "reason",
        _after_reason,
        {"end": END, "tool_dispatch": "tool_dispatch"},
    )

    # Conditional: loop back to reason OR proceed to rerank
    builder.add_conditional_edges(
        "tool_dispatch",
        _should_continue,
        {"reason": "reason", "rerank": "rerank"},
    )

    builder.add_edge("rerank", "generate")
    builder.add_edge("generate", "guard")
    builder.add_edge("guard", END)

    return builder.compile()


# Compiled singleton — built once at module import
_graph = None


def get_graph() -> CompiledStateGraph:
    """Return the compiled LangGraph graph, building it on first call."""
    global _graph
    if _graph is None:
        logger.info("building_langgraph")
        _graph = build_graph()
        logger.info("langgraph_ready")
    return _graph


async def run_agent(question: str,user_email: Optional[str]=None) -> Dict[str, Any]:
    """Run the full ReAct agent for a given question.

    Args:
        question: Raw user question string.

    Returns:
        Final AgentState dict containing answer, sources, confidence, escalated.
    """
    graph = get_graph()
    initial_state: AgentState = {
        "question": question,
        "user_email": user_email,
        "is_chitchat": False,
        "messages": [],
        "tool_calls": [],
        "retrieved_chunks": [],
        "reranked_chunks": [],
        "answer": "",
        "sources": [],
        "confidence": 0.0,
        "escalated": False,
        "tool_used": None,
        "error": None,
        "_next_tool": None,
        "_next_query": None,
    }

    logger.info("agent_run_start", question=question[:80])
    
    # Pre-populate retrieval config cache so downstream synchronous tools/rerankers can access it
    try:
        await get_retrieval_config()
    except Exception as exc:
        logger.warning("failed_prepopulating_config_cache", error=str(exc)[:200])

    try:
        final_state = await graph.ainvoke(initial_state)
    except Exception as exc:
        logger.error("agent_run_failed", error=str(exc))
        final_state = {
            **initial_state,
            "answer": "An internal error occurred. Please try again.",
            "escalated": True,
            "error": str(exc),
        }

    logger.info(
        "agent_run_done",
        escalated=final_state.get("escalated"),
        confidence=final_state.get("confidence"),
        sources=len(final_state.get("sources", [])),
    )
    return final_state
