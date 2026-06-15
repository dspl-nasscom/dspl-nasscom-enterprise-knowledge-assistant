"""Recursive character splitter with configurable chunk size and overlap.

Splitting strategy:
  1. Try to split on paragraph breaks (double newline).
  2. Fall back to single newline, then sentence-ending punctuation, then spaces.
  3. Hard-cut any remaining oversized pieces by character count.

This mirrors LangChain's RecursiveCharacterTextSplitter behaviour.
"""

from typing import List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def chunk_documents(
    docs: List[dict],
    chunk_size: int = 512,
    chunk_overlap: int = 64,
) -> List[dict]:
    """Split a list of raw documents into overlapping text chunks using LangChain.

    Args:
        docs: List of raw document dicts from loaders.py. Each must have
              at least {"text": str, "source": str, "page": int}.
        chunk_size: Maximum characters per chunk.
        chunk_overlap: Characters of overlap between consecutive chunks.

    Returns:
        List of chunk dicts, each with:
          {"text", "source", "page", "doc_type", "chunk_index", ...original_keys}
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        add_start_index=True,
    )

    chunks: List[dict] = []
    for doc in docs:
        text = doc.get("text", "").strip()
        if not text:
            continue

        # Split the text
        splits = splitter.split_text(text)

        for idx, split_text in enumerate(splits):
            chunk = {
                **doc,                      # inherit all metadata from parent doc
                "text": split_text,
                "chunk_index": idx,
                "total_chunks": len(splits),
            }
            chunks.append(chunk)

    logger.info(
        "chunking_done",
        input_docs=len(docs),
        output_chunks=len(chunks),
        chunk_size=chunk_size,
        overlap=chunk_overlap,
    )
    return chunks
