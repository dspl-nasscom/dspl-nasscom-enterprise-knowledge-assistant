import sqlite3
from pathlib import Path

DB_PATH = Path("data/copilot.db")

def view_audit_log():
    if not DB_PATH.exists():
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("\n=== RECENT INGEST JOBS ===")
    cursor.execute("SELECT id, status, total_files, processed_files, failed_files, total_chunks, created_at FROM ingest_jobs ORDER BY created_at DESC LIMIT 5;")
    jobs = cursor.fetchall()
    for job in jobs:
        print(f"ID: {job[0]} | Status: {job[1]} | Files: {job[3]}/{job[2]} | Chunks: {job[5]} | Date: {job[6]}")

    print("\n=== RECENT DOCUMENT RECORDS ===")
    cursor.execute("SELECT filename, doc_type, collection, chunk_count, ingested_at FROM document_records ORDER BY ingested_at DESC LIMIT 10;")
    docs = cursor.fetchall()
    for doc in docs:
        print(f"File: {doc[0]} | Type: {doc[1]} | Collection: {doc[2]} | Chunks: {doc[3]} | Date: {doc[4]}")

    conn.close()

if __name__ == "__main__":
    view_audit_log()
