"""GET /api/v1/query/stream — SSE streaming endpoint.

Streams the agent's answer token-by-token using Server-Sent Events (SSE).
The frontend connects with EventSource and renders tokens as they arrive.

Event types emitted:
  - "token"   : partial answer text
  - "sources" : JSON array of source cards (sent once, after all tokens)
  - "done"    : signals stream completion with final metadata
  - "error"   : signals a server-side failure
"""

from __future__ import annotations

import asyncio
import json
from typing import AsyncGenerator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.agent.graph import run_agent
from app.api.v1.schemas.query import SourceCard
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


async def _token_stream(question: str) -> AsyncGenerator[dict, None]:
    """Run the agent, then yield the answer word-by-word as SSE events."""
    try:
        state = await run_agent(question=question)
        answer: str = state.get("answer", "")
        sources = state.get("sources", [])
        confidence = state.get("confidence", 0.0)
        escalated = state.get("escalated", False)

        # Stream answer word-by-word
        words = answer.split(" ")
        for i, word in enumerate(words):
            text = word if i == 0 else " " + word
            yield {"event": "token", "data": text}
            await asyncio.sleep(0.015)   # ~65 tokens/sec simulated streaming

        # Send source cards
        source_cards = [SourceCard(**s).model_dump() for s in sources]
        yield {"event": "sources", "data": json.dumps(source_cards)}

        # Final done event
        yield {
            "event": "done",
            "data": json.dumps({
                "confidence": confidence,
                "escalated": escalated,
            }),
        }

    except Exception as exc:
        logger.error("stream_error", error=str(exc))
        yield {"event": "error", "data": str(exc)}


@router.get(
    "/stream",
    summary="Stream the Knowledge Gemini answer (SSE)",
    description=(
        "Connect with EventSource. Receives token events, followed by "
        "a sources event and a done event. Use ?question=... as query param."
    ),
)
async def query_stream(question: str) -> EventSourceResponse:
    logger.info("stream_request", question=question[:80])
    return EventSourceResponse(_token_stream(question))
