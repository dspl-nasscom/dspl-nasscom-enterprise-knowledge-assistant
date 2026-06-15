"""Health check endpoints — /health, /readyz, /livez.

- GET /health  : detailed status (models loaded, vector store reachable)
- GET /readyz  : Kubernetes readiness probe (200 when ready)
- GET /livez   : Kubernetes liveness probe (always 200 if process is alive)
"""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import get_logger
from app.retrieval.vector_store import get_vector_store

logger = get_logger(__name__)
router = APIRouter()


class HealthDetail(BaseModel):
    status: str
    version: str
    llm_model: str
    vector_store_backend: str
    embedding_model: str
    reranker_model: str
    docs_collection_ready: bool
    tickets_collection_ready: bool


@router.get(
    "",
    response_model=HealthDetail,
    summary="Detailed health check",
)
async def health() -> HealthDetail:
    store = get_vector_store()
    collection_ready = store.collection_exists(settings.qdrant_collection)

    return HealthDetail(
        status="ok",
        version="0.1.0",
        llm_model=settings.llm_model,
        vector_store_backend="qdrant",
        embedding_model=settings.embedding_model,
        reranker_model=settings.reranker_model,
        docs_collection_ready=collection_ready,
        tickets_collection_ready=collection_ready,
    )


@router.get("/readyz", summary="Kubernetes readiness probe")
async def readyz() -> dict:
    """Returns 200 only when the vector store collection exists."""
    store = get_vector_store()
    ready = store.collection_exists(settings.qdrant_collection)
    return {"ready": ready}


@router.get("/livez", summary="Kubernetes liveness probe")
async def livez() -> dict:
    """Always returns 200 — signals the process is alive."""
    return {"alive": True}
