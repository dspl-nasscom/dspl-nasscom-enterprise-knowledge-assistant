"""Top-K cosine similarity search against a vector store collection.

This is Layer 3 — Phase 1: fast bi-encoder recall.
Results are passed to the reranker for precision refinement.
"""

from typing import List

from app.core.config import settings
from app.core.logging import get_logger
from app.db.config_store import get_cached_config
from app.retrieval.embedder import embed_query
from app.retrieval.vector_store import ChunkDict, get_vector_store

logger = get_logger(__name__)


def search(
    query: str,
    collection: str,
    top_k: int | None = None,
) -> List[ChunkDict]:
    """Embed the query and retrieve Top-K chunks from the named collection.

    Args:
        query: Raw user question string.
        collection: Name of the Qdrant collection to search.
        top_k: Number of candidates to retrieve. Defaults to settings.top_k_retrieve.

    Returns:
        List of chunk dicts sorted by vector similarity (highest first).
        Each dict has keys: "text", "metadata", "score".
    """
    if top_k is None:
        try:
            top_k = get_cached_config().get("top_k_retrieve")
        except Exception:
            top_k = settings.top_k_retrieve
    store = get_vector_store()

    if not store.collection_exists(collection):
        logger.error(
            "collection_not_found",
            collection=collection,
            qdrant_url=settings.qdrant_url,
            hint="Re-ingest documents or check QDRANT_COLLECTION in .env",
        )
        return []

    query_vec = embed_query(query)
    results = store.search(collection=collection, query_embedding=query_vec, top_k=top_k)

    logger.info(
        "vector_search_done",
        collection=collection,
        query_preview=query[:60],
        returned=len(results),
        top_score=results[0]["score"] if results else 0.0,
    )
    return results
