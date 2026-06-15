"""Admin API — configuration management and support ticket management.

Config endpoints
----------------
GET    /api/v1/admin/config          — read current retrieval config
PATCH  /api/v1/admin/config          — update one or more fields
DELETE /api/v1/admin/config/reset    — reset to .env defaults

Ticket endpoints
----------------
GET    /api/v1/admin/tickets                   — list tickets (filter by status/assignee)
GET    /api/v1/admin/tickets/{ticket_id}       — get single ticket
PATCH  /api/v1/admin/tickets/{ticket_id}       — update ticket fields
POST   /api/v1/admin/tickets/{ticket_id}/comments — add a comment
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.db.config_store import get_retrieval_config, update_retrieval_config
from app.db.firestore import (
    add_ticket_comment,
    get_ticket,
    list_tickets,
    update_ticket,
    list_document_records,
)
from app.storage.gcs import get_signed_url

logger = get_logger(__name__)
router = APIRouter()


# ════════════════════════════════════════════════════════════════════════════════
# Config schemas & endpoints
# ════════════════════════════════════════════════════════════════════════════════

class RetrievalConfig(BaseModel):
    confidence_threshold: float = Field(ge=0.0, le=1.0,
        description="Min BGE-Reranker score to generate an answer (0.0–1.0).")
    top_n_rerank: int = Field(ge=1, le=20,
        description="Chunks returned after reranking (1–20).")
    top_k_retrieve: int = Field(ge=1, le=100,
        description="Candidates pulled from Qdrant (1–100).")
    pii_masking_enabled: bool = Field(default=True,
        description="Enable/Disable Google Cloud DLP PII Masking on queries and responses.")


class RetrievalConfigPatch(BaseModel):
    confidence_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    top_n_rerank: Optional[int] = Field(default=None, ge=1, le=20)
    top_k_retrieve: Optional[int] = Field(default=None, ge=1, le=100)
    pii_masking_enabled: Optional[bool] = Field(default=None)


class ConfigResponse(BaseModel):
    config: RetrievalConfig
    source: str = Field(description="'firestore' or 'defaults'")


@router.get("/config", response_model=ConfigResponse, summary="Get retrieval configuration")
async def get_config() -> ConfigResponse:
    cfg = await get_retrieval_config()
    source = "defaults"
    try:
        from app.db.firestore import get_firestore
        doc = await get_firestore().collection("app_config").document("retrieval").get()
        if doc.exists:
            source = "firestore"
    except Exception:
        pass
    return ConfigResponse(config=RetrievalConfig(**cfg), source=source)


@router.patch("/config", response_model=ConfigResponse, summary="Update retrieval configuration")
async def patch_config(body: RetrievalConfigPatch) -> ConfigResponse:
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        cfg = await get_retrieval_config()
        return ConfigResponse(config=RetrievalConfig(**cfg), source="firestore")
    logger.info("admin_config_update", updates=updates)
    cfg = await update_retrieval_config(updates)
    return ConfigResponse(config=RetrievalConfig(**cfg), source="firestore")


@router.delete("/config/reset", response_model=ConfigResponse,
               summary="Reset configuration to .env defaults")
async def reset_config() -> ConfigResponse:
    from app.db.firestore import get_firestore
    from app.db.config_store import _defaults
    await get_firestore().collection("app_config").document("retrieval").delete()
    import app.db.config_store as cs
    cs._cache = {}
    cs._cache_ts = 0.0
    logger.info("admin_config_reset")
    return ConfigResponse(config=RetrievalConfig(**_defaults()), source="defaults")


# ════════════════════════════════════════════════════════════════════════════════
# Ticket schemas
# ════════════════════════════════════════════════════════════════════════════════

VALID_STATUSES = {"open", "in_progress", "resolved", "closed"}


class TicketOut(BaseModel):
    """Full ticket as returned by the API."""
    ticket_id: str
    title: str
    description: str
    answer_attempted: str = ""
    confidence_score: float = 0.0
    status: str
    assigned_to: str
    reporter_email: str = ""
    created_at: datetime
    updated_at: datetime
    comments: List[Dict[str, Any]] = []


class TicketPatch(BaseModel):
    """Single update body — send any combination of fields to change them.

    All fields are optional. Omit a field to leave it unchanged.
    At least one field must be provided.
    """
    title: Optional[str] = Field(
        default=None, min_length=1, max_length=200,
        description="Short summary of the issue.",
    )
    description: Optional[str] = Field(
        default=None, min_length=1,
        description="Full description / original user question.",
    )
    answer_attempted: Optional[str] = Field(
        default=None,
        description="Resolution note or attempted answer.",
    )
    status: Optional[str] = Field(
        default=None,
        description=f"Ticket status — one of: {sorted(VALID_STATUSES)}",
    )
    assigned_to: Optional[str] = Field(
        default=None, min_length=1,
        description="Name or email of the assignee.",
    )
    reporter_email: Optional[str] = Field(
        default=None,
        description="Email of the user reporting the issue.",
    )

    @property
    def has_changes(self) -> bool:
        return any(v is not None for v in self.model_dump().values())

    def validated_updates(self) -> dict:
        """Return only the non-None fields, raising 422 for invalid status."""
        if self.status and self.status not in VALID_STATUSES:
            raise HTTPException(
                status_code=422,
                detail=f"status must be one of: {sorted(VALID_STATUSES)}",
            )
        return {k: v for k, v in self.model_dump().items() if v is not None}


class CommentIn(BaseModel):
    """Body for adding a comment to a ticket."""
    author: str = Field(..., min_length=1, max_length=100,
        description="Name or email of the commenter.")
    text: str = Field(..., min_length=1,
        description="Comment body.")


class CommentOut(BaseModel):
    id: str
    author: str
    text: str
    created_at: datetime


class TicketListResponse(BaseModel):
    tickets: List[TicketOut]
    total: int


# ════════════════════════════════════════════════════════════════════════════════
# Document schemas
# ════════════════════════════════════════════════════════════════════════════════

class DocumentOut(BaseModel):
    id: str
    job_id: str
    filename: str
    doc_type: str
    collection: str
    chunk_count: int
    file_size_bytes: int
    sha256: str
    storage_url: str
    ingested_at: datetime


class DocumentListResponse(BaseModel):
    documents: List[DocumentOut]
    total: int


# ════════════════════════════════════════════════════════════════════════════════
# Ticket endpoints
# ════════════════════════════════════════════════════════════════════════════════

@router.get(
    "/tickets",
    response_model=TicketListResponse,
    summary="List support tickets",
    description=(
        "Returns tickets ordered by creation date (newest first). "
        "Filter by `status`, `assigned_to`, or `reporter_email`. Default limit is 50."
    ),
)
async def list_tickets_endpoint(
    status: Optional[str] = Query(
        default=None,
        description="Filter by status: open | in_progress | resolved | closed",
    ),
    assigned_to: Optional[str] = Query(
        default=None,
        description="Filter by assignee name/email.",
    ),
    reporter_email: Optional[str] = Query(
        default=None,
        description="Filter by reporter email.",
    ),
    limit: int = Query(default=50, ge=1, le=200, description="Max tickets to return."),
    offset: int = Query(default=0, ge=0, description="Number of tickets to skip."),
) -> TicketListResponse:
    if status and status not in VALID_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of: {sorted(VALID_STATUSES)}",
        )
    tickets, total = await list_tickets(
        status=status,
        assigned_to=assigned_to,
        reporter_email=reporter_email,
        limit=limit,
        offset=offset,
    )
    return TicketListResponse(tickets=[TicketOut(**t) for t in tickets], total=total)


@router.get(
    "/tickets/{ticket_id}",
    response_model=TicketOut,
    summary="Get a single support ticket",
)
async def get_ticket_endpoint(ticket_id: str) -> TicketOut:
    ticket = await get_ticket(ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")
    return TicketOut(**ticket)


@router.patch(
    "/tickets/{ticket_id}",
    response_model=TicketOut,
    summary="Update a support ticket",
    description=(
        "Update any combination of fields: `title`, `description`, "
        "`answer_attempted`, `status`, `assigned_to`. "
        "Omit a field to leave it unchanged. "
        f"Valid statuses: `open`, `in_progress`, `resolved`, `closed`."
    ),
)
async def patch_ticket_endpoint(ticket_id: str, body: TicketPatch) -> TicketOut:
    updates = body.validated_updates()
    if not updates:
        raise HTTPException(status_code=422, detail="At least one field must be provided.")

    updated = await update_ticket(ticket_id, updates)
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")
    logger.info("admin_ticket_updated", ticket_id=ticket_id, fields=list(updates.keys()))
    return TicketOut(**updated)


@router.post(
    "/tickets/{ticket_id}/comments",
    response_model=TicketOut,
    summary="Add a comment to a ticket",
    description="Appends a comment to the ticket's comments array.",
)
async def add_comment_endpoint(ticket_id: str, body: CommentIn) -> TicketOut:
    updated = await add_ticket_comment(
        ticket_id,
        author=body.author,
        text=body.text,
    )
    if updated is None:
        raise HTTPException(status_code=404, detail=f"Ticket '{ticket_id}' not found.")
    logger.info("admin_ticket_comment_added", ticket_id=ticket_id, author=body.author)
    return TicketOut(**updated)


# ════════════════════════════════════════════════════════════════════════════════
# Document endpoints
# ════════════════════════════════════════════════════════════════════════════════

@router.get(
    "/documents",
    response_model=DocumentListResponse,
    summary="List uploaded documents",
    description="Returns all uploaded documents with pagination. Generates signed storage URLs dynamically.",
)
async def list_documents_endpoint(
    limit: int = Query(default=50, ge=1, le=200, description="Max documents to return."),
    offset: int = Query(default=0, ge=0, description="Number of documents to skip."),
) -> DocumentListResponse:
    docs, total = await list_document_records(limit=limit, offset=offset)
    
    # Dynamically generate signed storage URLs for each document
    ret = []
    for doc in docs:
        filename = doc.get("filename")
        signed_url = get_signed_url(filename) if filename else ""
        doc["storage_url"] = signed_url
        ret.append(DocumentOut(**doc))
        
    return DocumentListResponse(documents=ret, total=total)
