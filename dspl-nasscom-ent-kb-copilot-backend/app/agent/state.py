"""AgentState — the shared state TypedDict that flows through the LangGraph graph.

Every node reads from and writes to this dict. LangGraph merges updates
from each node into the running state automatically.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict


class AgentState(TypedDict, total=False):
    """Shared state for the ReAct agent graph.

    Fields
    ------
    question : str
        The original user question, never mutated.
    messages : list[dict]
        Conversation history (role/content dicts) for the LLM context window.
    tool_calls : list[dict]
        Sequence of {"tool": str, "query": str, "result": list[dict]} records,
        one per tool invocation in the current turn.
    retrieved_chunks : list[dict]
        Final merged set of chunks after all tool calls, before reranking.
    reranked_chunks : list[dict]
        Top-N chunks after the BGE-Reranker pass.
    answer : str
        The final generated answer (may be the "not found" fallback).
    sources : list[dict]
        Source cards extracted from chunk metadata.
    confidence : float
        Highest rerank_score among the returned chunks.
    escalated : bool
        True when the guardrail fires and no answer is found.
    tool_used : str | None
        Name of the primary tool invoked ("document_search" | "ticket_lookup" | "summariser").
    error : str | None
        Populated if an unrecoverable error occurs during graph execution.
    """

    question: str
    user_email: Optional[str]
    is_chitchat: bool          # True → LLM handled it conversationally; skip retrieval & ticket
    messages: List[Dict[str, Any]]
    tool_calls: List[Dict[str, Any]]
    retrieved_chunks: List[Dict[str, Any]]
    reranked_chunks: List[Dict[str, Any]]
    answer: str
    sources: List[Dict[str, Any]]
    confidence: float
    escalated: bool
    tool_used: Optional[str]
    error: Optional[str]
    # Internal routing fields — set by reason_node, consumed by tool_dispatch_node
    _next_tool: Optional[str]
    _next_query: Optional[str]
