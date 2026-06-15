"""DB session shim — re-exports the Firestore client.

Previously this module owned the SQLAlchemy engine and session factory.
Now it simply re-exports helpers from app.db.firestore so existing imports
that do `from app.db.session import get_db / init_db` keep working.
"""

from app.db.firestore import get_firestore, warm_up_firestore


async def init_db() -> None:
    """No-op: Firestore requires no schema creation."""
    pass


def get_db():
    """Return the Firestore async client (replaces the SQLAlchemy session dependency)."""
    return get_firestore()
