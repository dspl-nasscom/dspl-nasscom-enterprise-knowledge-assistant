"""Runtime configuration store backed by Firestore.

Stores admin-tunable parameters in:
  Collection : app_config
  Document   : retrieval

Supported fields
----------------
  confidence_threshold  float   0.0 – 1.0   Min rerank score to generate an answer
  top_n_rerank          int     1 – 20       How many chunks to return after reranking
  top_k_retrieve        int     1 – 100      How many candidates to pull from Qdrant

Values fall back to the .env / Settings defaults when the Firestore document
does not exist yet (e.g. first boot before any admin call).

A short in-process TTL cache (60 s) means at most one Firestore read per
minute across all requests — the overhead is negligible.
"""

from __future__ import annotations

import time
from typing import Any, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.db.firestore import get_firestore

logger = get_logger(__name__)

_COLLECTION = "app_config"
_DOCUMENT = "retrieval"
_CACHE_TTL = 60.0          # seconds between Firestore reads

# ── In-process cache ──────────────────────────────────────────────────────────
_cache: dict[str, Any] = {}
_cache_ts: float = 0.0


def _defaults() -> dict[str, Any]:
    return {
        "confidence_threshold": settings.confidence_threshold,
        "top_n_rerank": settings.top_n_rerank,
        "top_k_retrieve": settings.top_k_retrieve,
        "pii_masking_enabled": settings.pii_masking_enabled,
    }


def get_cached_config() -> dict[str, Any]:
    """Return the currently cached retrieval config, or defaults if not populated."""
    return _cache if _cache else _defaults()



async def get_retrieval_config() -> dict[str, Any]:
    """Return current retrieval config, using cache when fresh.

    Falls back to .env defaults if Firestore is unavailable or the document
    has not been created yet.
    """
    global _cache, _cache_ts
    now = time.monotonic()
    if _cache and (now - _cache_ts) < _CACHE_TTL:
        return _cache

    try:
        db = get_firestore()
        doc = await db.collection(_COLLECTION).document(_DOCUMENT).get()
        if doc.exists:
            data = doc.to_dict()
            merged = {**_defaults(), **{k: v for k, v in data.items() if v is not None}}
        else:
            merged = _defaults()

        _cache = merged
        _cache_ts = now
        return merged

    except Exception as exc:
        logger.warning("config_store_read_failed", error=str(exc)[:200])
        return _defaults()


async def update_retrieval_config(updates: dict[str, Any]) -> dict[str, Any]:
    """Persist updated values to Firestore and invalidate the local cache.

    Only the keys present in `updates` are changed — omitted keys keep their
    current values (merge=True).
    """
    global _cache, _cache_ts
    db = get_firestore()
    await db.collection(_COLLECTION).document(_DOCUMENT).set(updates, merge=True)
    # Invalidate cache so next read picks up the new values
    _cache = {}
    _cache_ts = 0.0
    logger.info("config_store_updated", updates=updates)
    # Return the full config after update
    return await get_retrieval_config()
