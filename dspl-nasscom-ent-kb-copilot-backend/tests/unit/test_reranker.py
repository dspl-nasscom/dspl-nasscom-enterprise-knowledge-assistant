"""Unit tests for app/retrieval/reranker.py"""

import pytest
from unittest.mock import MagicMock, patch
from app.retrieval.reranker import rerank


def _make_chunks(n: int, score: float = 0.8) -> list:
    return [
        {
            "text": f"Chunk {i} text about the topic.",
            "metadata": {"source": f"doc_{i}.txt", "page": i},
            "score": score,
        }
        for i in range(n)
    ]


class TestRerank:
    def test_empty_candidates_returns_empty(self):
        result = rerank(query="What is the VPN policy?", candidates=[])
        assert result == []

    def test_returns_at_most_top_n(self):
        chunks = _make_chunks(20)
        fake_scores = [0.9 - i * 0.02 for i in range(20)]

        with patch("app.retrieval.reranker.get_reranker") as mock_get:
            mock_model = MagicMock()
            mock_model.predict.return_value = fake_scores
            mock_get.return_value = mock_model

            result = rerank("VPN policy", chunks, top_n=5)
            assert len(result) <= 5

    def test_filters_below_threshold(self):
        chunks = _make_chunks(5)
        # All scores below the default threshold (0.4)
        fake_scores = [0.1, 0.05, 0.2, 0.15, 0.08]

        with patch("app.retrieval.reranker.get_reranker") as mock_get:
            mock_model = MagicMock()
            mock_model.predict.return_value = fake_scores
            mock_get.return_value = mock_model

            result = rerank("VPN policy", chunks, top_n=5)
            assert result == []   # all filtered out

    def test_sorted_by_score_descending(self):
        chunks = _make_chunks(3)
        fake_scores = [0.5, 0.9, 0.7]   # chunk 1 should be first

        with patch("app.retrieval.reranker.get_reranker") as mock_get:
            mock_model = MagicMock()
            mock_model.predict.return_value = fake_scores
            mock_get.return_value = mock_model

            result = rerank("query", chunks, top_n=3)
            scores = [r["rerank_score"] for r in result]
            assert scores == sorted(scores, reverse=True)

    def test_rerank_score_attached_to_each_chunk(self):
        chunks = _make_chunks(3)
        fake_scores = [0.75, 0.82, 0.61]

        with patch("app.retrieval.reranker.get_reranker") as mock_get:
            mock_model = MagicMock()
            mock_model.predict.return_value = fake_scores
            mock_get.return_value = mock_model

            result = rerank("query", chunks, top_n=3)
            for r in result:
                assert "rerank_score" in r
                assert isinstance(r["rerank_score"], float)
