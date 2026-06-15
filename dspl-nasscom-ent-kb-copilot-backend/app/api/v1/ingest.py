"""POST /api/v1/ingest — upload and index new documents into the knowledge base."""

from __future__ import annotations

import asyncio
import functools
import hashlib
import os
import tempfile
import time
import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, File, Form, UploadFile
from fastapi import status as http_status

from app.api.v1.schemas.ingest import FileIngestResult, IngestResponse
from app.core.exceptions import IngestionError
from app.core.logging import get_logger
from app.db.firestore import (
    create_document_record,
    create_ingest_job,
    find_document_by_sha256,
    update_ingest_job,
)
from app.ingestion.pipeline import ingest_file
from app.storage.gcs import get_signed_url, upload_file as gcs_upload

logger = get_logger(__name__)
router = APIRouter()

ALLOWED_EXTENSIONS = {".pdf", ".csv", ".txt", ".md"}


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


async def _run_in_thread(fn, *args, **kwargs):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, functools.partial(fn, *args, **kwargs))


@router.post(
    "",
    response_model=IngestResponse,
    status_code=http_status.HTTP_202_ACCEPTED,
    summary="Ingest documents into the knowledge base",
    description=(
        "Upload one or more files (PDF, CSV, TXT, MD). "
        "Duplicate files (same SHA-256) are skipped. "
        "Files are stored in GCS and indexed in Qdrant. "
        "Job metadata is persisted in Firestore."
    ),
)
async def ingest(
    files: List[UploadFile] = File(...),
    chunk_size: int = Form(512, ge=128, le=2048),
    chunk_overlap: int = Form(64, ge=0, le=256),
) -> IngestResponse:
    job_id = str(uuid.uuid4())
    logger.info("ingest_job_started", job_id=job_id, file_count=len(files))

    await create_ingest_job(job_id=job_id, total_files=len(files))

    results: List[FileIngestResult] = []
    total_chunks = 0
    failed = 0
    processed = 0

    for upload in files:
        filename = upload.filename or "unknown"
        ext = os.path.splitext(filename)[1].lower()

        if ext not in ALLOWED_EXTENSIONS:
            logger.warning("ingest_file_bad_ext", file=filename, ext=ext)
            results.append(FileIngestResult(
                file=filename,
                error=f"Unsupported file type '{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
            ))
            failed += 1
            continue

        tmp_path = None
        try:
            # ── 1. Read ───────────────────────────────────────────────────────
            content = await upload.read()
            sha256 = _sha256_bytes(content)
            logger.debug("ingest_sha256", file=filename, sha256=sha256[:12])

            # ── 2. Dedup check ────────────────────────────────────────────────
            existing = await find_document_by_sha256(sha256)
            if existing is not None:
                logger.info("ingest_duplicate_skipped", file=filename, sha256=sha256[:12])
                fresh_url = ""
                if existing.get("storage_url"):
                    fresh_url = await _run_in_thread(get_signed_url, existing["filename"])
                results.append(FileIngestResult(
                    file=filename,
                    collection=existing.get("collection", ""),
                    chunk_count=existing.get("chunk_count", 0),
                    sha256=sha256,
                    storage_url=fresh_url,
                    skipped=True,
                    skip_reason="duplicate",
                ))
                total_chunks += existing.get("chunk_count", 0)
                processed += 1
                continue

            # ── 3. Write temp file ────────────────────────────────────────────
            with tempfile.NamedTemporaryFile(suffix=ext, delete=False, mode="wb") as tmp:
                tmp.write(content)
                tmp_path = tmp.name

            # ── 4. GCS upload ─────────────────────────────────────────────────
            storage_url = ""
            try:
                logger.debug("ingest_step", file=filename, step="gcs_upload")
                t0 = time.perf_counter()
                storage_url = await _run_in_thread(gcs_upload, tmp_path, filename)
                logger.debug("ingest_step_done", file=filename, step="gcs_upload",
                             elapsed_ms=int((time.perf_counter()-t0)*1000))
            except Exception as exc:
                logger.warning("gcs_upload_skipped", file=filename, error=str(exc)[:200])

            # ── 5. Vector ingest ──────────────────────────────────────────────
            logger.debug("ingest_step", file=filename, step="vector_ingest")
            t0 = time.perf_counter()
            result_dict = await _run_in_thread(
                ingest_file,
                file_path=tmp_path,
                original_filename=filename,
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                storage_url=storage_url or None,
            )
            logger.debug("ingest_step_done", file=filename, step="vector_ingest",
                         chunks=result_dict.get("chunk_count", 0),
                         elapsed_ms=int((time.perf_counter()-t0)*1000))

            result_dict["file"] = filename
            chunk_count = result_dict.get("chunk_count", 0)
            total_chunks += chunk_count
            processed += 1

            # ── 6. Persist to Firestore ───────────────────────────────────────
            await create_document_record(
                job_id=job_id,
                filename=filename,
                doc_type=result_dict.get("doc_type", "wiki"),
                collection=result_dict.get("collection", ""),
                chunk_count=chunk_count,
                file_size_bytes=len(content),
                sha256=sha256,
                storage_url=storage_url or None,
            )

            # Use signed URL for the API response
            signed_url = ""
            if storage_url:
                signed_url = await _run_in_thread(get_signed_url, filename)
            result_dict["storage_url"] = signed_url

            results.append(FileIngestResult(**result_dict))
            logger.info("ingest_file_success", file=filename, chunks=chunk_count,
                        has_url=bool(storage_url))

        except IngestionError as exc:
            logger.error("ingest_file_failed", file=filename, error=exc.detail)
            results.append(FileIngestResult(file=filename, error=exc.detail))
            failed += 1
        except Exception as exc:
            import traceback
            logger.error("ingest_unexpected_error", file=filename, error=str(exc),
                         traceback=traceback.format_exc())
            results.append(FileIngestResult(file=filename, error=str(exc)))
            failed += 1
        finally:
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.unlink(tmp_path)
                except Exception:
                    pass

    # ── Update job record ─────────────────────────────────────────────────────
    status = "failed" if failed == len(files) else "completed"
    await update_ingest_job(
        job_id=job_id,
        status=status,
        processed_files=processed,
        failed_files=failed,
        total_chunks=total_chunks,
        completed_at=datetime.now(timezone.utc),
    )

    logger.info("ingest_job_done", job_id=job_id, total_chunks=total_chunks, failed=failed)

    return IngestResponse(
        job_id=job_id,
        status=status,
        total_files=len(files),
        total_chunks=total_chunks,
        results=results,
        message=f"Ingested {len(files) - failed}/{len(files)} files successfully.",
    )
