"""scripts/ingest_all.py — bulk-ingest everything under data/raw/.

Usage:
    poetry run python scripts/ingest_all.py
    # or via Makefile:
    make ingest

Walks the three data subdirectories in order:
    data/raw/sop_pdfs/    → doc_type=sop   → collection: sop_wiki
    data/raw/hr_policies/ → doc_type=sop   → collection: sop_wiki
    data/raw/tickets/     → doc_type=ticket → collection: resolved_tickets

Prints a summary table at the end.
"""

from __future__ import annotations

import sys
import os
import time

# Allow running from repo root without installing the package
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.logging import setup_logging, get_logger
from app.ingestion.pipeline import ingest_file
from app.retrieval.vector_store import get_vector_store

setup_logging()
logger = get_logger("ingest_all")

BASE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "raw")

INGEST_TARGETS = [
    {"dir": os.path.join(BASE_DIR, "sop_pdfs"),    "doc_type": "sop"},
    {"dir": os.path.join(BASE_DIR, "hr_policies"), "doc_type": "sop"},
    {"dir": os.path.join(BASE_DIR, "tickets"),     "doc_type": "ticket"},
]

CHUNK_SIZE = 512
CHUNK_OVERLAP = 64
ALLOWED_EXTS = {".pdf", ".csv", ".txt", ".md"}


def main():
    t_start = time.perf_counter()
    all_results = []

    for target in INGEST_TARGETS:
        directory = target["dir"]
        doc_type = target["doc_type"]

        if not os.path.isdir(directory):
            logger.warning("directory_not_found", path=directory)
            continue

        files = []
        for root, _, fnames in os.walk(directory):
            for fname in sorted(fnames):
                ext = os.path.splitext(fname)[1].lower()
                if ext in ALLOWED_EXTS:
                    files.append(os.path.join(root, fname))

        if not files:
            logger.info("no_files_found", directory=directory)
            continue

        logger.info("ingesting_directory", directory=directory, files=len(files), doc_type=doc_type)

        for file_path in files:
            fname = os.path.basename(file_path)
            try:
                result = ingest_file(
                    file_path=file_path,
                    doc_type=doc_type,
                    chunk_size=CHUNK_SIZE,
                    chunk_overlap=CHUNK_OVERLAP,
                )
                all_results.append(result)
                print(f"  ✓  {fname:50s}  chunks={result.get('chunk_count', 0):>5}")
            except Exception as exc:
                print(f"  ✗  {fname:50s}  ERROR: {exc}")
                all_results.append({"file": fname, "error": str(exc), "chunk_count": 0})

    total_chunks = sum(r.get("chunk_count", 0) for r in all_results)
    total_files  = len(all_results)
    failed       = sum(1 for r in all_results if "error" in r)
    elapsed_s    = time.perf_counter() - t_start

    print("\n" + "=" * 60)
    print(f"  Ingestion complete in {elapsed_s:.1f}s")
    print(f"  Files processed : {total_files - failed}/{total_files}")
    print(f"  Total chunks    : {total_chunks:,}")
    print(f"  Failed files    : {failed}")
    print("=" * 60)

    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()
