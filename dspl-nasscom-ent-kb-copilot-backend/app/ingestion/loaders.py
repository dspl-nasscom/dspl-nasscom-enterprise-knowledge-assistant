from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Dict, List

from langchain_community.document_loaders import (
    PyPDFLoader,
    CSVLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)

from app.core.logging import get_logger

logger = get_logger(__name__)

RawDoc = Dict[str, Any]  # {"text", "source", "page", "doc_type"}


def load_pdf(file_path: str) -> List[RawDoc]:
    """Extract text from a PDF using LangChain PyPDFLoader."""
    loader = PyPDFLoader(file_path)
    pages = loader.load()
    filename = Path(file_path).name
    
    docs = []
    for page in pages:
        raw_page = page.metadata.get("page", 0)
        docs.append({
            "text": page.page_content,
            "source": filename,
            "page": raw_page + 1,
            "doc_type": "sop",
        })
    
    logger.info("pdf_loaded", file=filename, pages=len(docs))
    return docs


def load_csv(file_path: str) -> List[RawDoc]:
    """Load a CSV using LangChain CSVLoader."""
    loader = CSVLoader(file_path)
    data = loader.load()
    filename = Path(file_path).name
    
    docs = []
    for idx, row in enumerate(data, start=0):
        docs.append({
            "text": row.page_content,
            "source": filename,
            "page": None,
            "row": idx,
            "line": idx,
            "doc_type": "ticket",
        })
    
    logger.info("csv_loaded", file=filename, rows=len(docs))
    return docs


def load_text(file_path: str, doc_type: str = "wiki") -> List[RawDoc]:
    """Load a text file using LangChain TextLoader."""
    loader = TextLoader(file_path)
    data = loader.load()
    filename = Path(file_path).name
    
    docs = []
    for page in data:
        docs.append({
            "text": page.page_content,
            "source": filename,
            "page": 1,
            "doc_type": doc_type,
        })
    
    logger.info("text_loaded", file=filename, chars=len(docs[0]["text"]) if docs else 0)
    return docs


def load_markdown(file_path: str, doc_type: str = "wiki") -> List[RawDoc]:
    """Load a markdown file using LangChain UnstructuredMarkdownLoader."""
    loader = UnstructuredMarkdownLoader(file_path)
    data = loader.load()
    filename = Path(file_path).name
    
    docs = []
    for page in data:
        docs.append({
            "text": page.page_content,
            "source": filename,
            "page": 1,
            "doc_type": doc_type,
        })
    
    logger.info("markdown_loaded", file=filename, chars=len(docs[0]["text"]) if docs else 0)
    return docs


EXTENSION_LOADERS = {
    ".pdf": load_pdf,
    ".csv": load_csv,
    ".txt": load_text,
    ".md": load_markdown,
}


def load_directory(directory: str) -> List[RawDoc]:
    """Recursively load all supported files from a directory."""
    all_docs: List[RawDoc] = []
    for root, _, files in os.walk(directory):
        for fname in sorted(files):
            ext = Path(fname).suffix.lower()
            loader = EXTENSION_LOADERS.get(ext)
            if loader is None:
                continue
            full_path = os.path.join(root, fname)
            try:
                docs = loader(full_path)
                all_docs.extend(docs)
            except Exception as exc:
                logger.error("loader_failed", file=fname, error=str(exc))

    logger.info("directory_loaded", dir=directory, total_docs=len(all_docs))
    return all_docs
