"""Data models for Firestore documents.

Plain dataclasses — no SQLAlchemy ORM.
Serialisation to/from Firestore dicts is handled in app/db/firestore.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class IngestJob:
    id: str
    status: str = "running"
    total_files: int = 0
    processed_files: int = 0
    failed_files: int = 0
    total_chunks: int = 0
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=_utcnow)
    completed_at: Optional[datetime] = None


@dataclass
class DocumentRecord:
    id: str
    job_id: str
    filename: str
    doc_type: str
    collection: str
    chunk_count: int = 0
    file_size_bytes: int = 0
    sha256: Optional[str] = None
    storage_url: Optional[str] = None
    ingested_at: datetime = field(default_factory=_utcnow)


@dataclass
class QueryLog:
    id: str
    question: str
    answer: str
    top_score: float = 0.0
    escalated: bool = False
    tool_used: Optional[str] = None
    latency_ms: int = 0
    created_at: datetime = field(default_factory=_utcnow)


@dataclass
class UserRecord:
    id: str
    email: str
    name: str
    role: str  # "Admin" or "User"
    created_at: datetime = field(default_factory=_utcnow)
    updated_at: datetime = field(default_factory=_utcnow)

