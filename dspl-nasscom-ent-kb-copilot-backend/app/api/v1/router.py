"""v1 API router — aggregates all sub-routers under /api/v1."""

from fastapi import APIRouter

from app.api.v1 import health, ingest, query, stream
from app.api.v1 import admin, users

v1_router = APIRouter()

# Health
v1_router.include_router(health.router, prefix="/health", tags=["Health"])

# Query — POST /api/v1/query
v1_router.include_router(query.router, prefix="/query", tags=["Query"])

# Stream — GET /api/v1/query/stream
v1_router.include_router(stream.router, prefix="/query", tags=["Stream"])

# Ingest — POST /api/v1/ingest
v1_router.include_router(ingest.router, prefix="/ingest", tags=["Ingest"])

# Admin — GET/PATCH /api/v1/admin/config
v1_router.include_router(admin.router, prefix="/admin", tags=["Admin"])

# Users — GET/POST/PATCH/DELETE /api/v1/users
v1_router.include_router(users.router, prefix="/users", tags=["Users"])

