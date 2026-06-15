"""Integration tests for POST /api/v1/query endpoint."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


QUERY_URL = "/api/v1/query"

MOCK_AGENT_STATE = {
    "answer": "The password reset policy requires 12 characters minimum. [Source: hr_policy_v3.txt, Page 4]",
    "sources": [
        {"source": "hr_policy_v3.txt", "page": 4, "section": "Password Policy", "doc_type": "sop", "rerank_score": 0.87}
    ],
    "confidence": 0.87,
    "escalated": False,
    "tool_used": "document_search",
}

ESCALATED_STATE = {
    "answer": "I could not find a verified answer in the knowledge base for your query.",
    "sources": [],
    "confidence": 0.1,
    "escalated": True,
    "tool_used": "document_search",
}


class TestQueryEndpoint:
    @pytest.mark.asyncio
    async def test_valid_query_returns_200(self, client):
        with patch("app.api.v1.query.run_agent", new_callable=AsyncMock) as mock_agent, \
             patch("app.api.v1.query.get_db"):
            mock_agent.return_value = MOCK_AGENT_STATE
            response = await client.post(QUERY_URL, json={"question": "What is the password reset policy?"})

        assert response.status_code == 200
        body = response.json()
        assert "answer" in body
        assert "sources" in body
        assert "confidence" in body
        assert "escalated" in body

    @pytest.mark.asyncio
    async def test_response_contains_source_cards(self, client):
        with patch("app.api.v1.query.run_agent", new_callable=AsyncMock) as mock_agent, \
             patch("app.api.v1.query.get_db"):
            mock_agent.return_value = MOCK_AGENT_STATE
            response = await client.post(QUERY_URL, json={"question": "Password policy?"})

        body = response.json()
        assert len(body["sources"]) == 1
        assert body["sources"][0]["source"] == "hr_policy_v3.txt"
        assert body["sources"][0]["page"] == 4

    @pytest.mark.asyncio
    async def test_escalated_answer_when_low_confidence(self, client):
        with patch("app.api.v1.query.run_agent", new_callable=AsyncMock) as mock_agent, \
             patch("app.api.v1.query.get_db"):
            mock_agent.return_value = ESCALATED_STATE
            response = await client.post(QUERY_URL, json={"question": "What is the meaning of life?"})

        assert response.status_code == 200
        body = response.json()
        assert body["escalated"] is True
        assert body["sources"] == []

    @pytest.mark.asyncio
    async def test_short_question_rejected(self, client):
        response = await client.post(QUERY_URL, json={"question": "Hi"})
        assert response.status_code == 422   # Pydantic min_length=3

    @pytest.mark.asyncio
    async def test_missing_question_field_rejected(self, client):
        response = await client.post(QUERY_URL, json={})
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_session_id_echoed_back(self, client):
        with patch("app.api.v1.query.run_agent", new_callable=AsyncMock) as mock_agent, \
             patch("app.api.v1.query.get_db"):
            mock_agent.return_value = MOCK_AGENT_STATE
            response = await client.post(
                QUERY_URL,
                json={"question": "What is the VPN policy?", "session_id": "sess-abc123"},
            )
        assert response.json()["session_id"] == "sess-abc123"
