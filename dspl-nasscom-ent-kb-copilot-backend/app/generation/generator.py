"""Answer generator — builds the grounded, cited LLM prompt and calls the LLM.

Responsibilities:
  1. Receive the top-N re-ranked chunks (with metadata).
  2. Build a strict RAG prompt that forces the LLM to:
     a. Answer ONLY from the provided context.
     b. Append [Source: <filename>, Page <N>] after every factual claim.
     c. State "Answer not found" if the context is insufficient.
  3. Parse the raw LLM output and extract source citations.
  4. Run the post-generation guardrail.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

from langchain_core.messages import HumanMessage, SystemMessage

from app.core.logging import get_logger
from app.generation.guardrails import sanitise_response
from app.generation.llm import get_llm
from app.storage.gcs import get_signed_url
from app.db.config_store import get_retrieval_config
from app.core.dlp import mask_pii_text

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are the Enterprise Knowledge Gemini, an internal AI assistant \
for a large IT organisation.

RULES (follow strictly):
1. Answer ONLY using the information in the CONTEXT BLOCKS below.
2. Do NOT include any inline citations, sources, page numbers, row numbers, or reference brackets like [1], [Source: ...], [Source: <filename>, Page <page>] or similar within the answer itself. Just provide a clean, natural-language response.
3. If the context does not contain enough information to answer the question, \
respond with exactly: "Answer not found in the knowledge base."
4. Never fabricate information. Never use your training-data knowledge.
5. Keep answers concise and professional. Use bullet points for steps or lists.
6. HANDLING MASKED PII: Note that when PII masking is enabled, both the question and the context blocks may contain masked placeholders (such as [PERSON_NAME], [EMAIL_ADDRESS], [PHONE_NUMBER], [US_SOCIAL_SECURITY_NUMBER]). You must treat these placeholders as valid matching entities. For example, if the question asks "what is the department of [PERSON_NAME]" and the context blocks show multiple tickets for [PERSON_NAME] with different departments (such as Finance, Security, and Operations), you should treat them as referring to [PERSON_NAME], resolve all of them, list all the departments associated with [PERSON_NAME] (e.g. Finance, Security, and Operations) in your answer, and reply using the masked placeholders. Do NOT state "Answer not found in the knowledge base." in these situations.

CONTEXT BLOCKS:
{context}
"""

HUMAN_TEMPLATE = "Question: {question}"


def _build_context_block(chunks: List[dict]) -> str:
    """Format re-ranked chunks into a numbered context string for the prompt."""
    parts: List[str] = []
    for i, chunk in enumerate(chunks, start=1):
        meta = chunk.get("metadata", {})
        source = meta.get("source", "unknown")
        
        is_csv = source.lower().endswith(".csv") or meta.get("doc_type") == "ticket"
        if is_csv:
            row = meta.get("row")
            if row is None and "line" in meta:
                row = meta.get("line")
            if row is None:
                # fallback for legacy ingested chunks
                raw_page = meta.get("page")
                row = int(raw_page) - 1 if raw_page is not None else 0
                if row < 0:
                    row = 0
            loc_str = f"Row {row}"
        else:
            raw_page = meta.get("page")
            page = int(raw_page) if raw_page is not None else 1
            if page == 0:
                page = 1
            loc_str = f"Page {page}"
            
        section = meta.get("section", "")
        section_str = f" | Section: {section}" if section else ""
        parts.append(
            f"[{i}] Source: {source}, {loc_str}{section_str}\n"
            f"{chunk['text']}"
        )
    return "\n\n---\n\n".join(parts)


async def generate_answer(
    question: str,
    chunks: List[dict],
) -> Dict[str, Any]:
    """Generate a grounded, cited answer from the top-N re-ranked chunks.

    Args:
        question: The original user question.
        chunks: Re-ranked chunks from the retrieval + reranking pipeline.
                Each must have "text" and "metadata" keys.

    Returns:
        dict with keys:
          - "answer"  : str — the LLM-generated cited answer
          - "sources" : list[dict] — source cards (filename, page, section)
          - "confidence" : float — top rerank_score
          - "escalated"  : bool
    """

    config = await get_retrieval_config()
    pii_masking_enabled = config.get("pii_masking_enabled", True)

    context = _build_context_block(chunks)
    if pii_masking_enabled:
        question = await mask_pii_text(question)
        context = await mask_pii_text(context)

    system_msg = SYSTEM_PROMPT.format(context=context)
    human_msg = HUMAN_TEMPLATE.format(question=question)

    llm = get_llm()
    messages = [SystemMessage(content=system_msg), HumanMessage(content=human_msg)]

    try:
        response = llm.invoke(messages)
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
                raw_answer = "".join(parts)
            else:
                raw_answer = str(content)
        else:
            raw_answer = str(response)
    except Exception as exc:
        err_str = str(exc)
        if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
            logger.warning("llm_quota_exhausted", error=err_str[:200])
            raw_answer = "LLM_QUOTA_EXCEEDED"
        else:
            logger.error("llm_generation_failed", error=err_str[:200])
            raise

    # Post-generation guardrail
    logger.info("llm_raw_answer", raw_answer=raw_answer)
    answer = sanitise_response(raw_answer, question)

    if raw_answer == "LLM_QUOTA_EXCEEDED":
        top_score = chunks[0].get("rerank_score", 0.0) if chunks else 0.0
        return {
            "answer": (
                "The knowledge base has relevant information for your query, but "
                "the AI model is temporarily unavailable (API quota exceeded). "
                "Please try again in a few minutes."
            ),
            "sources": [],
            "confidence": round(top_score, 4),
            "escalated": True,
        }

    # Clean up any residual source/citation brackets in the answer text, e.g. [Source: ...] or [1]
    cleaned_answer = re.sub(r'\[Source:\s*[^\]]+\]', '', answer)
    cleaned_answer = re.sub(r'\[\d+\]', '', cleaned_answer)
    cleaned_answer = re.sub(r'\[\s*\]', '', cleaned_answer)
    cleaned_answer = re.sub(r'\s{2,}', ' ', cleaned_answer)
    cleaned_answer = re.sub(r'\s+\.', '.', cleaned_answer)
    cleaned_answer = re.sub(r'\s+,', ',', cleaned_answer).strip()

    # Build source cards from metadata.
    # Re-generate a fresh URL at query time using the source filename so the
    # token-based URL is always current (the token cached in GCS warm-up is used).
    seen: set = set()
    sources: List[dict] = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        source_filename = meta.get("source", "unknown")
        
        is_csv = source_filename.lower().endswith(".csv") or meta.get("doc_type") == "ticket"
        
        page = None
        row = None
        line = None
        
        if is_csv:
            if "row" in meta:
                row = int(meta["row"])
            elif "line" in meta:
                row = int(meta["line"])
            else:
                raw_page = meta.get("page")
                row = int(raw_page) - 1 if raw_page is not None else 0
                if row < 0:
                    row = 0
            line = row
            key = (source_filename, "csv", row)
        else:
            raw_page = meta.get("page")
            page = int(raw_page) if raw_page is not None else 1
            if page == 0:
                page = 1
            key = (source_filename, "doc", page)

        if key not in seen:
            seen.add(key)
            # get_signed_url is sync and uses the cached ADC token — no network call
            url = get_signed_url(source_filename) if source_filename else ""
            sources.append({
                "source": source_filename,
                "page": page,
                "row": row,
                "line": line,
                "section": meta.get("section", ""),
                "doc_type": meta.get("doc_type", ""),
                "rerank_score": round(chunk.get("rerank_score", 0.0), 4),
                "url": url,
            })

    top_score = chunks[0].get("rerank_score", 0.0) if chunks else 0.0
    escalated = "Answer not found" in cleaned_answer

    logger.info(
        "answer_generated",
        escalated=escalated,
        top_score=round(top_score, 4),
        sources=len(sources),
    )

    return {
        "answer": cleaned_answer,
        "sources": sources,
        "confidence": round(top_score, 4),
        "escalated": escalated,
    }
