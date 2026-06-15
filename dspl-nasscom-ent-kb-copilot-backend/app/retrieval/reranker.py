"""BGE-Reranker cross-encoder (Bypassed).

Temporary measure because sentence-transformers is incompatible with Python 3.14.
"""

import threading
from typing import List

from sentence_transformers import CrossEncoder

from app.core.config import settings
from app.core.logging import get_logger
from app.db.config_store import get_cached_config

logger = get_logger(__name__)

_lock = threading.Lock()
_reranker: CrossEncoder | None = None


def get_reranker() -> CrossEncoder:
    """Return the singleton CrossEncoder instance, loading it on first call."""
    global _reranker
    if _reranker is None:
        with _lock:
            if _reranker is None:
                logger.info("loading_reranker_model", model=settings.reranker_model)
                _reranker = CrossEncoder(settings.reranker_model)
                logger.info("reranker_model_ready", model=settings.reranker_model)
    return _reranker


def rerank(
    query: str,
    candidates: List[dict],
    top_n: int | None = None,
) -> List[dict]:
    """Rerank candidates using a Cross-Encoder for higher precision.

    top_n defaults to the runtime config value from Firestore (falls back to
    settings.top_n_rerank from .env if config store is unavailable).
    """
    if not candidates:
        return []

    if top_n is None:
        # Fetch from config store cache directly. Cache is populated at run_agent startup.
        # Fall back to settings.top_n_rerank if config store/cache is unavailable.
        try:
            top_n = get_cached_config().get("top_n_rerank")
        except Exception:
            top_n = settings.top_n_rerank

    model = get_reranker()
    pairs = [[query, chunk["text"]] for chunk in candidates]
    scores = model.predict(pairs)

    for chunk, score in zip(candidates, scores):
        chunk["rerank_score"] = float(score)

    candidates.sort(key=lambda x: x["rerank_score"], reverse=True)

    # Filter by confidence threshold
    try:
        threshold = get_cached_config().get("confidence_threshold")
    except Exception:
        threshold = settings.confidence_threshold

    filtered = [c for c in candidates if c["rerank_score"] >= threshold]

    logger.info(
        "reranking_complete",
        total_candidates=len(candidates),
        returned=len(filtered[:top_n]),
        best_score=candidates[0]["rerank_score"] if candidates else 0.0,
        top_n=top_n,
    )
    return filtered[:top_n]
