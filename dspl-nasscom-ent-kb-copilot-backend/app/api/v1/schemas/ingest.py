"""Pydantic I/O schemas for the /ingest endpoint."""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class IngestRequest(BaseModel):
    """Optional JSON metadata that can accompany a file upload."""

    chunk_size: int = Field(default=512, ge=128, le=2048)
    chunk_overlap: int = Field(default=64, ge=0, le=256)


class FileIngestResult(BaseModel):
    """Per-file ingestion result."""

    file: str
    collection: str = ""
    chunk_count: int = 0
    sha256: str = ""
    storage_url: str = Field(
        default="",
        description="GCS signed URL for the original uploaded file (valid 1 hour).",
    )
    skipped: bool = Field(
        default=False,
        description="True when the file was skipped due to deduplication.",
    )
    skip_reason: Optional[str] = Field(
        default=None,
        description="Reason for skipping: 'duplicate' | None.",
    )
    error: Optional[str] = None


class IngestResponse(BaseModel):
    """Response body for POST /api/v1/ingest."""

    job_id: str
    status: str
    total_files: int
    total_chunks: int
    results: List[FileIngestResult] = Field(default_factory=list)
    message: str = ""
