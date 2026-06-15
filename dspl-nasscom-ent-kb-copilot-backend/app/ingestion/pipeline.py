"""Ingestion pipeline — orchestrates: load → chunk → embed → store.

Supports both bulk ingestion (scripts/ingest_all.py) and
incremental ingestion via the POST /api/v1/ingest endpoint.
"""

from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import List, Optional

from app.core.config import settings
from app.core.exceptions import IngestionError
from app.core.logging import get_logger
from app.ingestion.chunker import chunk_documents
from app.ingestion.loaders import load_csv, load_directory, load_pdf, load_text
from app.ingestion.metadata import prepare_chunks_for_store
from app.retrieval.embedder import embed_texts
from app.retrieval.vector_store import get_vector_store

logger = get_logger(__name__)


def _sha256(file_path: str) -> str:
    """Compute SHA-256 of a file for deduplication."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def _get_collection() -> str:
    """Return the single unified vector store collection name."""
    return settings.qdrant_collection


def ingest_file(
    file_path: str,
    original_filename: Optional[str] = None,
    doc_type: Optional[str] = None,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
    storage_url: Optional[str] = None,
) -> dict:
    """Ingest a single file into the vector store.

    Args:
        file_path: Absolute path to the (temporary) local file to read.
        original_filename: The user-facing filename (e.g. "HR-POL-001.pdf").
                           Falls back to the basename of file_path when not given.
                           This is what gets stored in chunk metadata as "source".
        doc_type: Override doc type ("sop" | "ticket" | "wiki"). Auto-detected if None.
        chunk_size: Max characters per chunk.
        chunk_overlap: Overlap characters between chunks.
        storage_url: GCS signed URL for the original file. Stamped on every chunk's
                     metadata so citations can link directly to the source document.

    Returns:
        Summary dict: {"file", "doc_type", "collection", "chunk_count", "sha256",
                       "storage_url"}
    """
    ext = Path(file_path).suffix.lower()
    # Use the original filename for all metadata; fall back to temp basename only if
    # no original was supplied (e.g. direct script usage).
    file_name = original_filename or Path(file_path).name

    # ── 1. Load ───────────────────────────────────────────────────────────────
    try:
        if ext == ".pdf":
            raw_docs = load_pdf(file_path)
            inferred_type = doc_type or "sop"
        elif ext == ".csv":
            raw_docs = load_csv(file_path)
            inferred_type = doc_type or "ticket"
        elif ext in (".txt", ".md"):
            raw_docs = load_text(file_path, doc_type=doc_type or "wiki")
            inferred_type = doc_type or "wiki"
        else:
            raise IngestionError(f"Unsupported file type: {ext}")

        # Stamp inferred_type, original filename, and storage_url on each doc
        for d in raw_docs:
            d.setdefault("doc_type", inferred_type)
            d["source"] = file_name          # overwrite temp-path basename with real name
            if storage_url:
                d["storage_url"] = storage_url

    except IngestionError:
        raise
    except Exception as exc:
        raise IngestionError(f"Loading '{file_name}' failed: {exc}") from exc

    if not raw_docs:
        logger.warning("no_content_loaded", file=file_name)
        return {"file": file_name, "doc_type": inferred_type, "chunk_count": 0}

    # ── 2. Chunk ──────────────────────────────────────────────────────────────
    chunks = chunk_documents(raw_docs, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    # ── 3. Prepare metadata ───────────────────────────────────────────────────
    ids, texts, metadatas = prepare_chunks_for_store(chunks)

    if not ids:
        logger.warning("no_chunks_after_prep", file=file_name)
        return {"file": file_name, "doc_type": inferred_type, "chunk_count": 0}

    # ── 4. Embed ──────────────────────────────────────────────────────────────
    logger.info("embedding_chunks", file=file_name, count=len(texts))
    embeddings = embed_texts(texts)

    # ── 5. Store ──────────────────────────────────────────────────────────────
    collection = _get_collection()
    store = get_vector_store()
    store.add_chunks(
        collection=collection,
        ids=ids,
        texts=texts,
        embeddings=embeddings,
        metadatas=metadatas,
    )

    sha = _sha256(file_path)
    logger.info(
        "ingestion_complete",
        file=file_name,
        collection=collection,
        chunks=len(ids),
        sha256=sha[:12],
    )

    return {
        "file": file_name,
        "doc_type": inferred_type,
        "collection": collection,
        "chunk_count": len(ids),
        "sha256": sha,
        "storage_url": storage_url or "",
    }


def ingest_directory(
    directory: str,
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> List[dict]:
    """Ingest all supported files from a directory tree.

    Returns a list of per-file summary dicts.
    """
    results: List[dict] = []
    for root, _, files in os.walk(directory):
        for fname in sorted(files):
            ext = Path(fname).suffix.lower()
            if ext not in (".pdf", ".csv", ".txt", ".md"):
                continue
            full_path = os.path.join(root, fname)
            try:
                result = ingest_file(full_path, chunk_size=chunk_size, chunk_overlap=chunk_overlap)
                results.append(result)
            except IngestionError as e:
                logger.error("ingest_file_failed", file=fname, error=e.detail)
                results.append({"file": fname, "error": e.detail})
    return results
