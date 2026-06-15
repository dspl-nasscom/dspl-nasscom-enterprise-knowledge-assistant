"""Unit tests for app/generation/guardrails.py"""

import pytest
from app.generation.guardrails import check_confidence, sanitise_response, NOT_FOUND_RESPONSE
from app.core.exceptions import AnswerNotFoundError


def _chunk(score: float) -> dict:
    return {
        "text": "Some retrieved text.",
        "metadata": {"source": "doc.txt", "page": 1},
        "rerank_score": score,
    }


class TestCheckConfidence:
    def test_empty_chunks_raises(self):
        with pytest.raises(AnswerNotFoundError):
            check_confidence([], query="test query")

    def test_score_below_threshold_raises(self):
        chunks = [_chunk(0.1), _chunk(0.05)]   # both below default 0.4
        with pytest.raises(AnswerNotFoundError):
            check_confidence(chunks, query="test query")

    def test_score_at_threshold_passes(self):
        chunks = [_chunk(0.4)]
        result = check_confidence(chunks, query="test")
        assert result == chunks

    def test_score_above_threshold_passes(self):
        chunks = [_chunk(0.85), _chunk(0.72)]
        result = check_confidence(chunks, query="test")
        assert len(result) == 2

    def test_first_chunk_determines_threshold(self):
        # First chunk passes, second doesn't matter for the gate
        chunks = [_chunk(0.9), _chunk(0.1)]
        result = check_confidence(chunks, query="test")
        assert result is chunks


class TestSanitiseResponse:
    def test_clean_answer_unchanged(self):
        answer = "The VPN policy requires MFA. [Source: vpn.txt, Page 2]"
        result = sanitise_response(answer, "VPN policy")
        assert result == answer

    def test_uncertainty_phrase_replaced(self):
        answer = "I don't know the answer to this question."
        result = sanitise_response(answer, "test query")
        assert result == NOT_FOUND_RESPONSE

    def test_cannot_find_phrase_replaced(self):
        answer = "I am not sure about this topic."
        result = sanitise_response(answer, "test")
        assert result == NOT_FOUND_RESPONSE

    def test_case_insensitive_detection(self):
        answer = "BASED ON MY KNOWLEDGE, the answer is..."
        result = sanitise_response(answer, "test")
        assert result == NOT_FOUND_RESPONSE

    def test_empty_answer_unchanged(self):
        result = sanitise_response("", "test")
        assert result == ""
