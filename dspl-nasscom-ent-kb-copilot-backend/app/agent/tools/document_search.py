"""Tool 1 — Document Search: searches SOPs, wikis, and HR policy documents.

Runs the full retrieval + reranking pipeline against the sop_wiki collection.
Returns the top-N reranked chunks ready for the generation layer.
"""

from __future__ import annotations

from typing import Any, Dict, List

from app.core.config import settings
from app.core.logging import get_logger
from app.retrieval.reranker import rerank
from app.retrieval.searcher import search

logger = get_logger(__name__)


def document_search(query: str, top_k: int | None = None) -> List[Dict[str, Any]]:
    """Search official SOPs, wikis, and HR policy documents.

    Args:
        query: The search query (may differ from the original user question
               if the agent has refined it through its ReAct loop).
        top_k: Number of vector-search candidates. Defaults to settings.top_k_retrieve.

    Returns:
        Re-ranked list of chunk dicts (may be empty if nothing clears threshold).
    """
    collection = settings.qdrant_collection
    logger.info("tool_document_search", query=query[:80], collection=collection)

    candidates = search(query=query, collection=collection, top_k=top_k)
    if not candidates:
        logger.warning("document_search_empty", query=query[:80])
        return []

    ranked = rerank(query=query, candidates=candidates)
    logger.info("document_search_done", returned=len(ranked))
    return ranked
