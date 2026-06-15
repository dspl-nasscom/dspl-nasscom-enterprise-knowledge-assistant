"""Users API — retrieve, create, update, and delete users."""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, HTTPException, Query, status

from app.core.logging import get_logger
from app.db.firestore import (
    create_user,
    delete_user,
    find_user_by_email,
    get_user,
    list_users,
    update_user,
)
from app.api.v1.schemas.users import (
    VALID_ROLES,
    UserCreate,
    UserListResponse,
    UserOut,
    UserUpdate,
)

logger = get_logger(__name__)
router = APIRouter()


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new user",
    description="Registers a new user in the system with either Admin or User role.",
)
async def create_user_endpoint(body: UserCreate) -> UserOut:
    # Check if user with email already exists
    existing = await find_user_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User with email '{body.email}' already exists.",
        )
    
    user_data = await create_user(
        email=body.email,
        name=body.name,
        role=body.role,
    )
    return UserOut(**user_data)


@router.get(
    "",
    response_model=UserListResponse,
    summary="List users",
    description="Returns a list of users, optionally filtered by role (Admin or User) and/or email.",
)
async def list_users_endpoint(
    role: Optional[str] = Query(
        default=None,
        description="Filter by role: Admin | User",
    ),
    email: Optional[str] = Query(
        default=None,
        description="Filter/search by email (substring match).",
    ),
    limit: int = Query(default=50, ge=1, le=200, description="Max users to return."),
    offset: int = Query(default=0, ge=0, description="Number of users to skip."),
) -> UserListResponse:
    if role and role not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"role must be one of: {sorted(VALID_ROLES)}",
        )
    users, total = await list_users(role=role, email=email, limit=limit, offset=offset)
    exists = (total > 0) if email else None
    return UserListResponse(users=[UserOut(**u) for u in users], total=total, exists=exists)


@router.get(
    "/{user_id}",
    response_model=UserOut,
    summary="Get a user by ID",
)
async def get_user_endpoint(user_id: str) -> UserOut:
    user = await get_user(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )
    return UserOut(**user)


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    summary="Update a user",
    description="Update a user's name, email, or role.",
)
async def patch_user_endpoint(user_id: str, body: UserUpdate) -> UserOut:
    user = await get_user(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )

    updates = body.validated_updates()
    if not updates:
        return UserOut(**user)

    # If email is being updated, check if it's already taken by another user
    if "email" in updates and updates["email"] != user["email"]:
        existing = await find_user_by_email(updates["email"])
        if existing and existing["id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"User with email '{updates['email']}' already exists.",
            )

    updated = await update_user(user_id, updates)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )
    return UserOut(**updated)


@router.delete(
    "/{user_id}",
    summary="Delete a user",
    status_code=status.HTTP_200_OK,
)
async def delete_user_endpoint(user_id: str) -> dict:
    deleted = await delete_user(user_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID '{user_id}' not found.",
        )
    return {"message": "User deleted successfully", "user_id": user_id}
