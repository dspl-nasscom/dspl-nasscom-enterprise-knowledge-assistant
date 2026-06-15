"""Pydantic I/O schemas for the /query endpoint."""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request body for POST /api/v1/query."""

    question: str = Field(
        ...,
        min_length=3,
        max_length=2000,
        description="The employee's natural-language question.",
        examples=["What is the password reset policy?"],
    )
    users_email: Optional[str] = Field(
        default=None,
        description="The email of the user asking the question.",
    )
    session_id: Optional[str] = Field(
        default=None,
        description="Optional session ID for conversation continuity (future use).",
    )


class SourceCard(BaseModel):
    """A single cited source returned alongside the answer."""

    source: str = Field(..., description="Filename of the source document.")
    page: Optional[int] = Field(default=None, description="Page number (for doc, txt, pdf, starting with 1).")
    row: Optional[int] = Field(default=None, description="Row number (for CSV, starting with 0).")
    line: Optional[int] = Field(default=None, description="Line number (for CSV, starting with 0).")
    section: str = Field(default="", description="Section heading, if extracted.")
    doc_type: str = Field(default="", description="sop | ticket | wiki")
    rerank_score: float = Field(default=0.0, description="BGE-Reranker confidence score.")
    url: str = Field(
        default="",
        description="GCS public URL to view the original source document.",
    )


class QueryResponse(BaseModel):
    """Response body for POST /api/v1/query."""

    answer: str = Field(..., description="Grounded, cited answer from the knowledge base.")
    sources: List[SourceCard] = Field(
        default_factory=list,
        description="Source cards for every document cited in the answer.",
    )
    confidence: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Top BGE-Reranker score (0–1). < threshold means escalated.",
    )
    escalated: bool = Field(
        default=False,
        description="True when the guardrail fired and no confident answer was found.",
    )
    ticket_id: Optional[str] = Field(
        default=None,
        description="Support ticket ID auto-created when the query is escalated.",
    )
    tool_used: Optional[str] = Field(
        default=None,
        description="Primary tool invoked: document_search | ticket_lookup | summariser",
    )
    session_id: Optional[str] = Field(default=None)
