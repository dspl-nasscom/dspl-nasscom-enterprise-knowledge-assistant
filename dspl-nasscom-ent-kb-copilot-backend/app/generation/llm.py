"""LLM client factory — returns a LangChain chat model for Gemini.

Loaded on demand and cached per-worker.
"""

from __future__ import annotations

import threading
from typing import Any

from app.core.config import settings
from app.core.exceptions import LLMProviderError
from app.core.logging import get_logger

from langchain_google_genai import ChatGoogleGenerativeAI
# from pydantic.v1 import Str

logger = get_logger(__name__)

_lock = threading.Lock()
_llm: Any = None


def get_llm() -> Any:
    """Return the singleton LangChain chat model, initialising on first call."""
    global _llm
    if _llm is None:
        with _lock:
            if _llm is None:
                _llm = _build_llm()
    return _llm


def _build_llm() -> Any:
    model = settings.llm_model

    try:
        if not settings.gemini_api_key:
            raise LLMProviderError("gemini", "GEMINI_API_KEY is not set in .env")

        logger.info("llm_initialised", provider="gemini", model=model)
        return ChatGoogleGenerativeAI(
            model=model,
            api_key= settings.gemini_api_key,
            temperature=0.0,
            convert_system_message_to_human=True,
        )

    except LLMProviderError:
        raise
    except Exception as exc:
        raise LLMProviderError("gemini", str(exc)) from exc
