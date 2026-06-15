"""Vector store abstraction supporting Qdrant as the primary backend.

Exposes a unified interface so the searcher and ingestion pipeline are
decoupled from the underlying vector database implementation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Sequence, cast

from app.core.config import settings
from app.core.logging import get_logger
from qdrant_client import QdrantClient
from qdrant_client.http import models

logger = get_logger(__name__)


# ── Shared chunk type ─────────────────────────────────────────────────────────

ChunkDict = Dict[str, Any]  # {"id", "text", "metadata", "score"}


# ── Abstract backend ──────────────────────────────────────────────────────────

class VectorStoreBackend(ABC):
    """Abstract interface every vector store backend must implement."""

    @abstractmethod
    def add_chunks(
        self,
        collection: str,
        ids: Sequence[str],
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[dict],
    ) -> None: ...

    @abstractmethod
    def search(
        self,
        collection: str,
        query_embedding: List[float],
        top_k: int,
    ) -> List[ChunkDict]: ...

    @abstractmethod
    def collection_exists(self, collection: str) -> bool: ...

    @abstractmethod
    def delete_collection(self, collection: str) -> None: ...

    @abstractmethod
    def ping(self) -> bool: ...


# ── Qdrant backend ────────────────────────────────────────────────────────────

class QdrantBackend(VectorStoreBackend):
    """Qdrant backend for vector storage."""

    _client: QdrantClient

    def __init__(self, url: str, api_key: str | None = None):
        # Only pass api_key if it's truthy to avoid "insecure connection" warnings for empty keys
        self._client = QdrantClient(
            url=url, 
            api_key=api_key if api_key else None,
            check_compatibility=False,
        )
        logger.info("qdrant_connected", url=url)

    def add_chunks(
        self,
        collection: str,
        ids: Sequence[str],
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: List[dict],
    ) -> None:
        # Ensure collection exists
        if not self.collection_exists(collection):
            dim = len(embeddings[0])
            self._client.create_collection(
                collection_name=collection,
                vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE),
            )
            logger.info("qdrant_collection_created", collection=collection, dim=dim)

        # Upsert in batches
        batch_size = 100
        for i in range(0, len(ids), batch_size):
            self._client.upsert(
                collection_name=collection,
                points=models.Batch(
                    ids=cast(List[Any], ids[i : i + batch_size]),
                    vectors=embeddings[i : i + batch_size],
                    payloads=[
                        {"text": t, **m} 
                        for t, m in zip(texts[i : i + batch_size], metadatas[i : i + batch_size])
                    ],
                ),
            )
        logger.info("qdrant_chunks_added", collection=collection, count=len(ids))

    def search(
        self,
        collection: str,
        query_embedding: List[float],
        top_k: int,
    ) -> List[ChunkDict]:
        results = self._client.query_points(
            collection_name=collection,
            query=query_embedding,
            limit=top_k,
        ).points
        
        chunks: List[ChunkDict] = []
        for res in results:
            payload = res.payload or {}
            text = payload.pop("text", "")
            chunks.append({
                "text": text,
                "metadata": payload,
                "score": res.score,
            })
        return chunks

    def collection_exists(self, collection: str) -> bool:
        from qdrant_client.http.exceptions import UnexpectedResponse
        try:
            exists = self._client.collection_exists(collection_name=collection)
            logger.debug("collection_exists_check", collection=collection, exists=exists)
            return exists
        except UnexpectedResponse as exc:
            logger.error("collection_exists_failed", collection=collection, error=str(exc))
            return False
        except Exception as exc:
            logger.error("collection_exists_error", collection=collection, error=str(exc))
            return False

    def delete_collection(self, collection: str) -> None:
        self._client.delete_collection(collection_name=collection)

    def ping(self) -> bool:
        try:
            self._client.get_collections()
            return True
        except Exception:
            return False


# ── Singleton factory ──────────────────────────────────────────────────────────

_store: QdrantBackend | None = None


def get_vector_store() -> QdrantBackend:
    """Return the singleton Qdrant vector store backend."""
    global _store
    if _store is None:
        _store = QdrantBackend(url=settings.qdrant_url, api_key=settings.qdrant_api_key)
    return _store


async def warm_up_vector_store() -> None:
    """Called during FastAPI lifespan — ensures the store is initialised and reachable."""
    store = get_vector_store()
    collection = settings.qdrant_collection

    if not store.ping():
        logger.error("vector_store_connection_failed", backend="qdrant", url=settings.qdrant_url)
    else:
        exists = store.collection_exists(collection)
        logger.info(
            "vector_store_ready",
            backend="qdrant",
            url=settings.qdrant_url,
            collection=collection,
            collection_exists=exists,
        )
        if not exists:
            logger.warning(
                "collection_not_yet_created",
                collection=collection,
                hint="Ingest documents via POST /api/v1/ingest to create it",
            )
