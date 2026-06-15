"""Firestore client and CRUD helpers replacing the SQLAlchemy layer.

Collections:
  ingest_jobs       — one document per ingest job
  document_records  — one document per ingested file
  query_logs        — one document per query

All operations are async using the Firestore AsyncClient.
The client is a singleton pre-warmed at startup.

Authentication uses the same ADC chain as GCS:
  GOOGLE_APPLICATION_CREDENTIALS → service account key
  Otherwise                      → gcloud ADC / Workload Identity
"""

from __future__ import annotations

import random
import threading
import uuid
from datetime import datetime, timezone
from typing import Optional

from google.cloud import firestore
from google.cloud.firestore_v1.async_client import AsyncClient

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# ── Singleton ─────────────────────────────────────────────────────────────────

_lock = threading.Lock()
_client: Optional[AsyncClient] = None


def _get_client() -> AsyncClient:
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                project = settings.firestore_project or None
                _client = firestore.AsyncClient(project=project)
                logger.info(
                    "firestore_client_initialised",
                    project=_client.project,
                )
    return _client


def get_firestore() -> AsyncClient:
    """Return the singleton Firestore async client."""
    return _get_client()


async def warm_up_firestore() -> None:
    """Pre-initialize the Firestore client at startup.

    Prevents the first request from paying the auth round-trip cost.
    """
    try:
        client = _get_client()
        # Light ping: list one document from ingest_jobs
        async for _ in client.collection("ingest_jobs").limit(1).stream():
            break
        logger.info("firestore_ready", project=client.project)
    except Exception as exc:
        logger.warning(
            "firestore_warmup_failed",
            error=str(exc)[:200],
            hint="Check FIRESTORE_PROJECT and credentials",
        )


# ── Helper ────────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _new_id() -> str:
    return str(uuid.uuid4())


# ── IngestJob ─────────────────────────────────────────────────────────────────

async def create_ingest_job(
    job_id: str,
    total_files: int,
) -> None:
    """Create a new ingest_job document with status='running'."""
    client = _get_client()
    await client.collection("ingest_jobs").document(job_id).set({
        "id": job_id,
        "status": "running",
        "total_files": total_files,
        "processed_files": 0,
        "failed_files": 0,
        "total_chunks": 0,
        "error_message": None,
        "created_at": _utcnow(),
        "completed_at": None,
    })


async def update_ingest_job(
    job_id: str,
    *,
    status: str,
    processed_files: int,
    failed_files: int,
    total_chunks: int,
    completed_at: datetime,
) -> None:
    """Update an existing ingest_job document on completion."""
    client = _get_client()
    await client.collection("ingest_jobs").document(job_id).update({
        "status": status,
        "processed_files": processed_files,
        "failed_files": failed_files,
        "total_chunks": total_chunks,
        "completed_at": completed_at,
    })


# ── DocumentRecord ────────────────────────────────────────────────────────────

async def create_document_record(
    *,
    job_id: str,
    filename: str,
    doc_type: str,
    collection: str,
    chunk_count: int,
    file_size_bytes: int,
    sha256: str,
    storage_url: Optional[str],
) -> str:
    """Insert a document_record and return its auto-generated ID."""
    client = _get_client()
    doc_id = _new_id()
    await client.collection("document_records").document(doc_id).set({
        "id": doc_id,
        "job_id": job_id,
        "filename": filename,
        "doc_type": doc_type,
        "collection": collection,
        "chunk_count": chunk_count,
        "file_size_bytes": file_size_bytes,
        "sha256": sha256,
        "storage_url": storage_url or "",
        "ingested_at": _utcnow(),
    })
    return doc_id


async def find_document_by_sha256(sha256: str) -> Optional[dict]:
    """Return the first document_record with the given SHA-256, or None."""
    client = _get_client()
    query = (
        client.collection("document_records")
        .where(filter=firestore.FieldFilter("sha256", "==", sha256))
        .limit(1)
    )
    async for doc in query.stream():
        return doc.to_dict()
    return None


async def list_document_records(
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """List document_records ordered by ingested_at desc, with pagination support.

    Returns a tuple of (documents_list, total_count).
    """
    client = _get_client()
    query = (
        client.collection("document_records")
        .order_by("ingested_at", direction=firestore.Query.DESCENDING)
    )

    documents = []
    async for doc in query.stream():
        documents.append(doc.to_dict())

    total = len(documents)
    paginated_docs = documents[offset : offset + limit]
    return paginated_docs, total


# ── Ticket ────────────────────────────────────────────────────────────────────

async def create_support_ticket(
    *,
    question: str,
    answer: str,
    confidence: float,
    reporter_email: Optional[str] = None,
) -> str:
    """Create a support ticket when a query is escalated (below confidence threshold).

    Returns the ticket_id.
    """
    client = _get_client()
    ticket_id = f"TKT-{_new_id()[:8].upper()}"
    now = _utcnow()

    # Query for users with "Admin" role to pick a random assignee
    assignee = "Admin"
    try:
        admins, _ = await list_users(role="Admin")
        if admins:
            chosen = random.choice(admins)
            assignee = chosen.get("email") or chosen.get("name") or "Admin"
    except Exception as exc:
        logger.warning(
            "failed_fetching_admins_for_ticket_assignment",
            error=str(exc)[:200],
        )

    await client.collection("support_tickets").document(ticket_id).set({
        "ticket_id": ticket_id,
        "title": question[:120],          # first 120 chars of the question as title
        "description": question,
        "answer_attempted": answer,
        "confidence_score": round(confidence, 4),
        "status": "open",                  # open | in_progress | resolved | closed
        "assigned_to": assignee,
        "reporter_email": reporter_email or "",
        "created_at": now,
        "updated_at": now,
        "comments": [],
    })
    logger.info(
        "support_ticket_created",
        ticket_id=ticket_id,
        question=question[:60],
        assignee=assignee,
        reporter_email=reporter_email or "anonymous",
    )
    return ticket_id


async def get_ticket(ticket_id: str) -> Optional[dict]:
    """Fetch a single support ticket by ID. Returns None if not found."""
    client = _get_client()
    doc = await client.collection("support_tickets").document(ticket_id).get()
    return doc.to_dict() if doc.exists else None


async def list_tickets(
    status: Optional[str] = None,
    assigned_to: Optional[str] = None,
    reporter_email: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """List support tickets ordered by created_at desc, optionally filtered.

    Filtering is done client-side to avoid requiring composite Firestore indexes.
    Returns a tuple of (tickets_list, total_count).
    """
    client = _get_client()
    query = (
        client.collection("support_tickets")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
    )

    tickets = []
    async for doc in query.stream():
        data = doc.to_dict()
        if status and data.get("status") != status:
            continue
        if assigned_to and data.get("assigned_to") != assigned_to:
            continue
        if reporter_email and data.get("reporter_email") != reporter_email:
            continue
        tickets.append(data)
        
    total = len(tickets)
    paginated_tickets = tickets[offset : offset + limit]
    return paginated_tickets, total


async def update_ticket(
    ticket_id: str,
    updates: dict,
) -> Optional[dict]:
    """Apply a partial update to a ticket. Returns the updated doc, or None if not found."""
    client = _get_client()
    ref = client.collection("support_tickets").document(ticket_id)
    doc = await ref.get()
    if not doc.exists:
        return None

    updates["updated_at"] = _utcnow()
    await ref.update(updates)
    updated = await ref.get()
    logger.info("support_ticket_updated", ticket_id=ticket_id, fields=list(updates.keys()))
    return updated.to_dict()


async def add_ticket_comment(
    ticket_id: str,
    *,
    author: str,
    text: str,
) -> Optional[dict]:
    """Append a comment to a ticket's comments array. Returns updated doc."""
    client = _get_client()
    ref = client.collection("support_tickets").document(ticket_id)
    doc = await ref.get()
    if not doc.exists:
        return None

    comment = {
        "id": _new_id()[:8].upper(),
        "author": author,
        "text": text,
        "created_at": _utcnow(),
    }
    await ref.update({
        "comments": firestore.ArrayUnion([comment]),
        "updated_at": _utcnow(),
    })
    updated = await ref.get()
    logger.info("ticket_comment_added", ticket_id=ticket_id, author=author)
    return updated.to_dict()

async def create_query_log(
    *,
    question: str,
    answer: str,
    top_score: float,
    escalated: bool,
    tool_used: Optional[str],
    latency_ms: int,
    user_email: Optional[str] = None,
) -> str:
    """Insert a query_log entry and return its ID."""
    client = _get_client()
    doc_id = _new_id()
    await client.collection("query_logs").document(doc_id).set({
        "id": doc_id,
        "question": question,
        "answer": answer,
        "top_score": top_score,
        "escalated": escalated,
        "tool_used": tool_used or "",
        "latency_ms": latency_ms,
        "user_email": user_email or "",
        "created_at": _utcnow(),
    })
    return doc_id


# ── User ──────────────────────────────────────────────────────────────────────

async def create_user(
    *,
    email: str,
    name: str,
    role: str,
) -> dict:
    """Create a new user and return their dict representation."""
    client = _get_client()
    user_id = _new_id()
    now = _utcnow()
    user_data = {
        "id": user_id,
        "email": email,
        "name": name,
        "role": role,
        "created_at": now,
        "updated_at": now,
    }
    await client.collection("users").document(user_id).set(user_data)
    logger.info("user_created", user_id=user_id, email=email)
    return user_data


async def get_user(user_id: str) -> Optional[dict]:
    """Fetch a single user by ID. Returns None if not found."""
    client = _get_client()
    doc = await client.collection("users").document(user_id).get()
    return doc.to_dict() if doc.exists else None


async def find_user_by_email(email: str) -> Optional[dict]:
    """Fetch a single user by email. Returns None if not found."""
    client = _get_client()
    query = (
        client.collection("users")
        .where(filter=firestore.FieldFilter("email", "==", email))
        .limit(1)
    )
    async for doc in query.stream():
        return doc.to_dict()
    return None


async def list_users(
    *,
    role: Optional[str] = None,
    email: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[dict], int]:
    """List users ordered by created_at desc, optionally filtered by role and/or email.

    Filtering is done client-side to avoid requirement of composite index on firestore.
    Returns a tuple of (users_list, total_count).
    """
    client = _get_client()
    query = (
        client.collection("users")
        .order_by("created_at", direction=firestore.Query.DESCENDING)
    )
    
    users = []
    async for doc in query.stream():
        data = doc.to_dict()
        if role and data.get("role") != role:
            continue
        if email and email.lower() not in data.get("email", "").lower():
            continue
        users.append(data)
        
    total = len(users)
    paginated_users = users[offset : offset + limit]
    return paginated_users, total


async def update_user(
    user_id: str,
    updates: dict,
) -> Optional[dict]:
    """Apply a partial update to a user. Returns the updated doc, or None if not found."""
    client = _get_client()
    ref = client.collection("users").document(user_id)
    doc = await ref.get()
    if not doc.exists:
        return None

    updates["updated_at"] = _utcnow()
    await ref.update(updates)
    updated = await ref.get()
    logger.info("user_updated", user_id=user_id, fields=list(updates.keys()))
    return updated.to_dict()


async def delete_user(user_id: str) -> bool:
    """Delete a user by ID. Returns True if deleted, False if not found."""
    client = _get_client()
    ref = client.collection("users").document(user_id)
    doc = await ref.get()
    if not doc.exists:
        return False
    await ref.delete()
    logger.info("user_deleted", user_id=user_id)
    return True

