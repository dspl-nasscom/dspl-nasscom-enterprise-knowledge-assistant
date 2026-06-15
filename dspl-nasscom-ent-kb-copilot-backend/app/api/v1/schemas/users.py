"""Pydantic I/O schemas for the /users endpoint."""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

VALID_ROLES = {"Admin", "User"}


class UserCreate(BaseModel):
    """Body for creating a user."""
    email: str = Field(..., description="The user's unique email address.")
    name: str = Field(..., min_length=1, max_length=100, description="The user's full name.")
    role: str = Field(default="User", description="User role: Admin | User.")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address format.")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {sorted(VALID_ROLES)}")
        return v


class UserUpdate(BaseModel):
    """Body for updating an existing user."""
    email: Optional[str] = Field(default=None, description="Optional new email address.")
    name: Optional[str] = Field(default=None, min_length=1, max_length=100, description="Optional new full name.")
    role: Optional[str] = Field(default=None, description="Optional new role: Admin | User.")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address format.")
        return v

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if v not in VALID_ROLES:
            raise ValueError(f"Role must be one of: {sorted(VALID_ROLES)}")
        return v

    @property
    def has_changes(self) -> bool:
        return any(v is not None for v in self.model_dump().values())

    def validated_updates(self) -> dict:
        """Return only the non-None fields."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


class UserOut(BaseModel):
    """Full user details representation."""
    id: str
    email: str
    name: str
    role: str
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    """Response body for GET /api/v1/users."""
    users: List[UserOut]
    total: int
    exists: Optional[bool] = None
