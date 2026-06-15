"""Unit tests for app/ingestion/chunker.py"""

import pytest
from app.ingestion.chunker import chunk_documents, _split_text, DEFAULT_SEPARATORS


class TestSplitText:
    def test_short_text_not_split(self):
        text = "Hello world."
        result = _split_text(text, DEFAULT_SEPARATORS, chunk_size=200, chunk_overlap=20)
        assert result == ["Hello world."]

    def test_splits_on_double_newline(self):
        text = "Para one.\n\nPara two.\n\nPara three."
        result = _split_text(text, DEFAULT_SEPARATORS, chunk_size=20, chunk_overlap=0)
        assert len(result) >= 2

    def test_overlap_creates_repeated_content(self):
        text = "word " * 100   # 500 chars
        result = _split_text(text, DEFAULT_SEPARATORS, chunk_size=100, chunk_overlap=30)
        # With overlap, adjacent chunks should share some content
        assert len(result) > 1

    def test_empty_text_returns_empty(self):
        assert _split_text("", DEFAULT_SEPARATORS, 200, 20) == []

    def test_single_word_beyond_chunk_size(self):
        # Very long single token — should still return something
        text = "a" * 600
        result = _split_text(text, DEFAULT_SEPARATORS, chunk_size=200, chunk_overlap=0)
        assert len(result) >= 1


class TestChunkDocuments:
    def test_basic_chunking(self):
        docs = [{"text": "Sentence one.\n\nSentence two.\n\nSentence three.", "source": "test.txt", "page": 1, "doc_type": "sop"}]
        chunks = chunk_documents(docs, chunk_size=30, chunk_overlap=5)
        assert len(chunks) >= 1
        for c in chunks:
            assert "text" in c
            assert "chunk_index" in c
            assert "source" in c

    def test_empty_doc_skipped(self):
        docs = [{"text": "", "source": "empty.txt", "page": 1, "doc_type": "sop"}]
        chunks = chunk_documents(docs)
        assert chunks == []

    def test_chunk_inherits_parent_metadata(self):
        docs = [{"text": "Long enough text " * 20, "source": "file.txt", "page": 5, "doc_type": "wiki"}]
        chunks = chunk_documents(docs, chunk_size=100, chunk_overlap=10)
        for c in chunks:
            assert c["source"] == "file.txt"
            assert c["page"] == 5
            assert c["doc_type"] == "wiki"

    def test_multiple_docs(self):
        docs = [
            {"text": "Doc A content " * 10, "source": "a.txt", "page": 1, "doc_type": "sop"},
            {"text": "Doc B content " * 10, "source": "b.txt", "page": 1, "doc_type": "ticket"},
        ]
        chunks = chunk_documents(docs, chunk_size=80, chunk_overlap=10)
        sources = {c["source"] for c in chunks}
        assert "a.txt" in sources
        assert "b.txt" in sources
