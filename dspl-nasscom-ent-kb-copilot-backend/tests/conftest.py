"""Pytest fixtures shared across unit and integration tests."""

from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import MagicMock, patch

from app.main import create_app


@pytest.fixture(scope="session")
def app():
    """Create a test FastAPI app instance (no lifespan startup)."""
    return create_app()


@pytest_asyncio.fixture
async def client(app):
    """Async HTTP test client that bypasses real lifespan hooks."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


@pytest.fixture
def mock_vector_store():
    """Mock vector store that returns fake chunk results."""
    store = MagicMock()
    store.collection_exists.return_value = True
    store.search.return_value = [
        {
            "text": "Password reset requires 12 characters minimum.",
            "metadata": {
                "source": "hr_policy_v3.txt",
                "page": 4,
                "doc_type": "sop",
                "section": "Password Policy",
                "chunk_id": "hr_policy_v3_0_abc12345",
                "chunk_index": 0,
                "total_chunks": 3,
            },
            "score": 0.92,
        }
    ]
    return store


@pytest.fixture
def sample_chunks():
    """Pre-built chunk list for generation tests."""
    return [
        {
            "text": "The VPN must be used for all remote access. Disable split tunnelling.",
            "metadata": {
                "source": "vpn_sop.txt",
                "page": 2,
                "doc_type": "sop",
                "section": "Remote Access Policy",
                "chunk_id": "vpn_sop_0_deadbeef",
                "chunk_index": 0,
                "total_chunks": 5,
            },
            "score": 0.88,
            "rerank_score": 0.76,
        }
    ]
