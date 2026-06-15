"""Custom HTTP exceptions and global exception handlers for FastAPI."""

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


# ── Custom exception types ─────────────────────────────────────────────────────

class KnowledgeBaseError(Exception):
    """Raised when the vector store or retrieval pipeline fails."""
    def __init__(self, detail: str = "Knowledge base error"):
        self.detail = detail
        super().__init__(detail)


class IngestionError(Exception):
    """Raised when document ingestion fails."""
    def __init__(self, detail: str = "Document ingestion failed"):
        self.detail = detail
        super().__init__(detail)


class AnswerNotFoundError(Exception):
    """Raised when no chunk clears the confidence threshold — not a 500."""
    def __init__(self, query: str = ""):
        self.query = query
        super().__init__("Answer not found in the knowledge base.")


class LLMProviderError(Exception):
    """Raised when the upstream LLM API is unavailable."""
    def __init__(self, provider: str, detail: str = ""):
        self.provider = provider
        self.detail = detail or f"LLM provider '{provider}' returned an error."
        super().__init__(self.detail)


# ── Handler registration ───────────────────────────────────────────────────────

def register_exception_handlers(app: FastAPI) -> None:
    """Attach all custom exception handlers to the FastAPI app instance."""

    @app.exception_handler(KnowledgeBaseError)
    async def knowledge_base_handler(request: Request, exc: KnowledgeBaseError):
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"error": "knowledge_base_error", "detail": exc.detail},
        )

    @app.exception_handler(IngestionError)
    async def ingestion_handler(request: Request, exc: IngestionError):
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": "ingestion_error", "detail": exc.detail},
        )

    @app.exception_handler(AnswerNotFoundError)
    async def answer_not_found_handler(request: Request, exc: AnswerNotFoundError):
        return JSONResponse(
            status_code=status.HTTP_200_OK,   # 200 — not a server error
            content={
                "answer": (
                    "Answer not found in the knowledge base. A support ticket has been raised for further review. In the meantime, feel free to ask another question or rephrase your query"
                ),
                "sources": [],
                "confidence": 0.0,
                "escalated": True,
            },
        )

    @app.exception_handler(LLMProviderError)
    async def llm_configuration_handler(request: Request, exc: LLMProviderError):
        from app.core.logging import get_logger
        logger = get_logger(__name__)
        logger.error("llm_configuration_error", error=exc.detail)
        return JSONResponse(
            status_code=500,
            content={"error": "llm_configuration_error", "detail": exc.detail},
        )
