"""POST /api/v1/query — main chat endpoint."""

import time
from typing import Optional

from fastapi import APIRouter

from app.agent.graph import run_agent
from app.api.v1.schemas.query import QueryRequest, QueryResponse, SourceCard
from app.core.logging import get_logger
from app.db.firestore import create_query_log, create_support_ticket

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "",
    response_model=QueryResponse,
    summary="Ask the Knowledge Copilot",
    description=(
        "Submit a natural-language question. The ReAct agent retrieves relevant "
        "chunks, reranks them with BGE-Reranker, and generates a cited answer. "
        "When confidence is below threshold the query is escalated and a support "
        "ticket is automatically created in Firestore."
    ),
)
async def query(body: QueryRequest) -> QueryResponse:
    t0 = time.perf_counter()
    logger.info("query_received", question=body.question[:80])

    question = body.question

    state = await run_agent(question=question, user_email=body.users_email)
    latency_ms = int((time.perf_counter() - t0) * 1000)

    is_chitchat: bool = state.get("is_chitchat", False)
    escalated: bool = state.get("escalated", False)
    confidence: float = state.get("confidence", 0.0)
    answer: str = state.get("answer", "")
    ticket_id: Optional[str] = None

    # ── Auto-create support ticket on escalation (never for chit-chat) ────────
    if escalated and not is_chitchat:
        try:
            ticket_id = await create_support_ticket(
                question=body.question,
                answer=answer,
                confidence=confidence,
                reporter_email=body.users_email,
            )
            logger.info("escalation_ticket_created", ticket_id=ticket_id,
                        confidence=confidence)
        except Exception as exc:
            logger.warning("ticket_creation_failed", error=str(exc)[:200])

    # ── Persist query log ─────────────────────────────────────────────────────
    try:
        await create_query_log(
            question=body.question,
            answer=answer,
            top_score=confidence,
            escalated=escalated,
            tool_used=state.get("tool_used"),
            latency_ms=latency_ms,
            user_email=body.users_email,
        )
    except Exception as exc:
        logger.warning("query_log_failed", error=str(exc)[:200])

    logger.info(
        "query_done",
        latency_ms=latency_ms,
        is_chitchat=is_chitchat,
        escalated=escalated,
        confidence=confidence,
        ticket_id=ticket_id,
    )

    return QueryResponse(
        answer=answer,
        sources=[SourceCard(**s) for s in state.get("sources", [])],
        confidence=confidence,
        escalated=escalated,
        ticket_id=ticket_id,
        tool_used=state.get("tool_used"),
        session_id=body.session_id,
    )
