"""Integration tests for POST /api/v1/ingest endpoint."""

import io
import pytest
from unittest.mock import patch, MagicMock

INGEST_URL = "/api/v1/ingest"

FAKE_INGEST_RESULT = {
    "file": "test_sop.txt",
    "doc_type": "sop",
    "collection": "sop_wiki",
    "chunk_count": 12,
    "sha256": "abc123" * 10,
}


class TestIngestEndpoint:
    def _txt_file(self, name: str = "test_sop.txt", content: bytes = b"Test content " * 50):
        return ("files", (name, io.BytesIO(content), "text/plain"))

    @pytest.mark.asyncio
    async def test_valid_txt_upload_returns_202(self, client):
        with patch("app.api.v1.ingest.ingest_file", return_value=FAKE_INGEST_RESULT), \
             patch("app.api.v1.ingest.get_db"):
            response = await client.post(
                INGEST_URL,
                files=[self._txt_file()],
                data={"doc_type": "sop"},
            )
        assert response.status_code == 202
        body = response.json()
        assert body["status"] == "completed"
        assert body["total_files"] == 1

    @pytest.mark.asyncio
    async def test_response_contains_job_id(self, client):
        with patch("app.api.v1.ingest.ingest_file", return_value=FAKE_INGEST_RESULT), \
             patch("app.api.v1.ingest.get_db"):
            response = await client.post(INGEST_URL, files=[self._txt_file()])
        body = response.json()
        assert "job_id" in body
        assert len(body["job_id"]) == 36   # UUID format

    @pytest.mark.asyncio
    async def test_unsupported_extension_reports_error(self, client):
        bad_file = ("files", ("malware.exe", io.BytesIO(b"binary"), "application/octet-stream"))
        with patch("app.api.v1.ingest.get_db"):
            response = await client.post(INGEST_URL, files=[bad_file])
        assert response.status_code == 202
        body = response.json()
        assert body["results"][0]["error"] is not None

    @pytest.mark.asyncio
    async def test_multiple_files_all_processed(self, client):
        files = [
            self._txt_file("sop1.txt"),
            self._txt_file("sop2.txt"),
        ]
        with patch("app.api.v1.ingest.ingest_file", return_value=FAKE_INGEST_RESULT), \
             patch("app.api.v1.ingest.get_db"):
            response = await client.post(INGEST_URL, files=files)
        body = response.json()
        assert body["total_files"] == 2
        assert len(body["results"]) == 2

    @pytest.mark.asyncio
    async def test_chunk_count_summed_correctly(self, client):
        with patch("app.api.v1.ingest.ingest_file", return_value=FAKE_INGEST_RESULT), \
             patch("app.api.v1.ingest.get_db"):
            files = [self._txt_file("a.txt"), self._txt_file("b.txt")]
            response = await client.post(INGEST_URL, files=files)
        body = response.json()
        assert body["total_chunks"] == 24   # 12 + 12
