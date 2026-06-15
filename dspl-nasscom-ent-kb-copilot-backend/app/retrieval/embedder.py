"""Singleton bi-encoder embedding model (all-MiniLM-L6-v2).

Loaded once at startup via the lifespan hook and reused across all workers
thanks to gunicorn's preload_app=True (copy-on-write fork semantics).
"""

from __future__ import annotations

import threading
from typing import List

from langchain_huggingface import HuggingFaceEmbeddings

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_lock = threading.Lock()
_embedder: HuggingFaceEmbeddings | None = None


def get_embedder() -> HuggingFaceEmbeddings:
    """Return the singleton HuggingFaceEmbeddings instance, loading it on first call."""
    global _embedder
    if _embedder is None:
        with _lock:
            if _embedder is None:   # double-checked locking
                logger.info("loading_embedding_model", model=settings.embedding_model)
                _embedder = HuggingFaceEmbeddings(
                    model_name=settings.embedding_model,
                    model_kwargs={'device': 'cpu'},  # Default to CPU, can be tuned
                    encode_kwargs={'normalize_embeddings': True}
                )
                logger.info("embedding_model_ready", model=settings.embedding_model)
    return _embedder


def embed_texts(texts: List[str]) -> List[List[float]]:
    """Embed a list of texts into dense vectors using HuggingFace.

    Args:
        texts: Raw text strings to encode.

    Returns:
        List of float vectors, one per input text.
    """
    model = get_embedder()
    vectors = model.embed_documents(texts)
    return vectors


def embed_query(query: str) -> List[float]:
    """Embed a single query string."""
    model = get_embedder()
    return model.embed_query(query)
