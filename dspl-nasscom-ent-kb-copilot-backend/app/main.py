"""FastAPI application factory with lifespan management.

Startup sequence:
  1. Setup structured logging
  2. Warm up Firestore client
  3. Warm up GCS client
  4. Connect / warm up the vector store
  5. Pre-load the embedding model and reranker
  6. Build the LangGraph ReAct agent graph
"""

from contextlib import asynccontextmanager
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import v1_router
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import get_logger, setup_logging
from app.db.firestore import warm_up_firestore
from app.retrieval.embedder import get_embedder
from app.retrieval.reranker import get_reranker
from app.retrieval.vector_store import warm_up_vector_store
from app.storage.gcs import warm_up_gcs

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown lifecycle events."""
    setup_logging()
    logger.info("startup_begin", env=settings.app_env)

    # ── Firestore ─────────────────────────────────────────────────────────────
    await warm_up_firestore()
    logger.info("firestore_ready")

    # ── GCS (blocking auth — run in thread) ───────────────────────────────────
    await asyncio.get_event_loop().run_in_executor(None, warm_up_gcs)

    # ── Qdrant ────────────────────────────────────────────────────────────────
    await warm_up_vector_store()

    # ── ML models ─────────────────────────────────────────────────────────────
    get_embedder()
    get_reranker()
    logger.info("models_loaded")

    # ── LangGraph ─────────────────────────────────────────────────────────────
    from app.agent.graph import get_graph
    get_graph()
    logger.info("langgraph_compiled")

    logger.info("startup_complete", host="0.0.0.0", port=8000)
    yield

    logger.info("shutdown_begin")


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title="Enterprise Knowledge Copilot",
        description=(
            "Agentic RAG API — ReAct agent with BGE-Reranker precision layer, "
            "source citations, and hallucination guardrails."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(v1_router, prefix="/api/v1")
    register_exception_handlers(app)

    return app


app = create_app()
