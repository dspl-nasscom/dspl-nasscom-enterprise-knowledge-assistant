"""Shared FastAPI dependencies (injected via Depends)."""

from app.db.session import get_db

__all__ = ["get_db"]
