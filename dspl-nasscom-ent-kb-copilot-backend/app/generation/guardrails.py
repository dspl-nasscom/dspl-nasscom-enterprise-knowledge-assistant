"""Guardrails — confidence threshold gate and hallucination prevention."""

from __future__ import annotations

import re
from typing import List

from app.core.exceptions import AnswerNotFoundError
from app.core.logging import get_logger

logger = get_logger(__name__)

_UNCERTAINTY_PATTERNS = re.compile(
    r"\b(i (don't|do not|cannot|can't) know|i('m| am) not sure|"
    r"no information|not (found|available)|unable to (find|answer)|"
    r"based on (my|general) knowledge)\b",
    re.IGNORECASE,
)

NOT_FOUND_RESPONSE = (
    "I couldn't find a verified answer to your question in the knowledge base. "
    "A support ticket has been raised for further review. "
    "In the meantime, feel free to ask another question or rephrase your query"
)


async def check_confidence(chunks: List[dict], query: str) -> List[dict]:
    """Validate chunks against the runtime confidence threshold (from Firestore config).

    Raises AnswerNotFoundError if no chunk clears the threshold.
    """
    from app.db.config_store import get_retrieval_config
    cfg = await get_retrieval_config()
    threshold = cfg["confidence_threshold"]

    if not chunks:
        logger.warning("guardrail_triggered", reason="no_chunks", query=query[:80])
        raise AnswerNotFoundError(query=query)

    top_score = chunks[0].get("rerank_score", 0.0)
    if top_score < threshold:
        logger.warning(
            "guardrail_triggered",
            reason="below_threshold",
            top_score=top_score,
            threshold=threshold,
            query=query[:80],
        )
        raise AnswerNotFoundError(query=query)

    logger.info("guardrail_passed", top_score=top_score, chunks=len(chunks), threshold=threshold)
    return chunks


def sanitise_response(answer: str, query: str) -> str:
    """Post-generation guard: replace uncertainty phrases with a structured message."""
    if _UNCERTAINTY_PATTERNS.search(answer):
        logger.warning("post_gen_guardrail", query=query[:80])
        return NOT_FOUND_RESPONSE
    return answer
