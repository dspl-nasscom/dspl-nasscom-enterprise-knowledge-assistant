"""Metadata extraction and normalisation for ingested chunks.

Every chunk that enters the vector store must have a clean, consistent
metadata dict. This module enforces that contract so retrieval results
always carry the fields the citation template expects:
  - source       : original filename
  - page         : page number (or row number for CSV tickets)
  - doc_type     : "sop" | "ticket" | "wiki"
  - section      : optional heading extracted from the chunk text
  - chunk_index  : position of this chunk within the parent document
  - chunk_id     : globally unique identifier (used as vector store ID)
"""

from __future__ import annotations

import hashlib
import re
import uuid
import unicodedata
from typing import Any, Dict, List

MetadataDict = Dict[str, Any]


def _extract_section_heading(text: str) -> str:
    """Attempt to pull a section heading from the first line of the chunk.

    Matches markdown-style headings (# Heading) or ALL-CAPS lines.
    Returns an empty string if nothing plausible is found.
    """
    first_line = text.split("\n")[0].strip()

    # Markdown heading
    md_match = re.match(r"^#{1,4}\s+(.+)$", first_line)
    if md_match:
        return md_match.group(1).strip()

    # ALL-CAPS short line (typical SOP section header)
    if first_line.isupper() and 3 < len(first_line) < 80:
        return first_line.title()

    return ""


def _make_chunk_id(source: str, chunk_index: int, text: str) -> str:
    """Generate a deterministic, collision-resistant chunk ID.

    Format: {sanitised_source}_{chunk_index}_{short_hash}
    Using a hash of the text prevents ID collisions across re-ingestions
    of the same file with different chunk boundaries.
    """
    slug = re.sub(r"[^a-zA-Z0-9_-]", "_", source)[:40]
    text_hash = hashlib.sha256(text.encode()).hexdigest()[:8]
    string_id = f"{slug}_{chunk_index}_{text_hash}"
    # Qdrant requires UUID or integer IDs. Convert our string ID to a deterministic UUID.
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, string_id))


def normalise_metadata(chunk: dict) -> MetadataDict:
    """Extract and normalise metadata from a raw chunk dict.

    Returns a clean metadata dict suitable for the vector store.
    All values are plain strings or ints (Chroma / FAISS requirement).
    """
    source = str(chunk.get("source", "unknown"))
    page_raw = chunk.get("page")
    page = int(page_raw) if page_raw is not None else 1
    doc_type = str(chunk.get("doc_type", "wiki"))
    chunk_index = int(chunk.get("chunk_index", 0))
    total_chunks = int(chunk.get("total_chunks", 1))
    text = chunk.get("text", "")

    section = chunk.get("section") or _extract_section_heading(text)
    chunk_id = _make_chunk_id(source, chunk_index, text)
    storage_url = str(chunk.get("storage_url", ""))

    metadata: MetadataDict = {
        "chunk_id": chunk_id,
        "source": source,
        "page": page,
        "doc_type": doc_type,
        "section": section,
        "chunk_index": chunk_index,
        "total_chunks": total_chunks,
        "storage_url": storage_url,
    }

    # Preserve row and line fields if present
    if "row" in chunk:
        metadata["row"] = int(chunk["row"])
    if "line" in chunk:
        metadata["line"] = int(chunk["line"])

    # Preserve ticket-specific fields
    if doc_type == "ticket" and "ticket_id" in chunk:
        metadata["ticket_id"] = str(chunk["ticket_id"])

    return metadata


def prepare_chunks_for_store(chunks: List[dict]) -> tuple[List[str], List[str], List[MetadataDict]]:
    """Convert raw chunk dicts into parallel lists ready for vector store insertion.

    Returns:
        (ids, texts, metadatas) — three lists of equal length.
    """
    ids: List[str] = []
    texts: List[str] = []
    metadatas: List[MetadataDict] = []

    for chunk in chunks:
        text = chunk.get("text", "").strip()
        if not text:
            continue
        meta = normalise_metadata(chunk)
        ids.append(meta["chunk_id"])
        texts.append(text)
        metadatas.append(meta)

    return ids, texts, metadatas
