"""Tool 3 — Summariser: synthesises multiple retrieved chunks into one answer.

Called when:
  - The agent has already retrieved chunks from one or more tools.
  - The query requires cross-document synthesis ("compare X and Y",
    "give me a summary of all steps involved in Z").
  - The individual chunks are too fragmented to answer the question alone.

This tool does NOT re-run retrieval. It receives the already-retrieved
chunks from the AgentState and calls the generator to produce a
synthesised, cited answer.
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.core.logging import get_logger
from app.generation.generator import generate_answer

logger = get_logger(__name__)


def summariser(question: str, chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Synthesise multiple chunks into a single cited answer.

    Args:
        question: Original user question.
        chunks: Pre-retrieved and re-ranked chunks from document_search
                and/or ticket_lookup results.

    Returns:
        Generation result dict: {"answer", "sources", "confidence", "escalated"}.
    """
    if not chunks:
        logger.warning("summariser_called_with_no_chunks")
        return {
            "answer": "Answer not found in the knowledge base.",
            "sources": [],
            "confidence": 0.0,
            "escalated": True,
        }

    logger.info("tool_summariser", chunks=len(chunks), question=question[:60])
    result = generate_answer(question=question, chunks=chunks)
    logger.info("summariser_done", escalated=result.get("escalated"))
    return result
