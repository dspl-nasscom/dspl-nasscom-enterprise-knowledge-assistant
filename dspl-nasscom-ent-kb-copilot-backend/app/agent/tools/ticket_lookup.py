"""Tool 2 — Ticket Lookup: searches the resolved IT support ticket archive.

Operates against the dedicated resolved_tickets collection.
Useful for questions like:
  - "How was the Kubernetes OOMKill issue fixed last quarter?"
  - "Has anyone seen this error before?"
  - "What's the standard fix for a failed Jenkins pipeline?"
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.core.config import settings
from app.core.logging import get_logger
from app.retrieval.reranker import rerank
from app.retrieval.searcher import search

logger = get_logger(__name__)


def ticket_lookup(query: str, top_k: int | None = None) -> List[Dict[str, Any]]:
    """Search the resolved IT support ticket archive.

    Args:
        query: The search query — ideally the error message or symptom description.
        top_k: Number of vector-search candidates. Defaults to settings.top_k_retrieve.

    Returns:
        Re-ranked list of ticket chunk dicts.
    """
    collection = settings.qdrant_collection
    logger.info("tool_ticket_lookup", query=query[:80], collection=collection)

    candidates = search(query=query, collection=collection, top_k=top_k)
    if not candidates:
        logger.warning("ticket_lookup_empty", query=query[:80])
        return []

    ranked = rerank(query=query, candidates=candidates)
    logger.info("ticket_lookup_done", returned=len(ranked))
    return ranked
