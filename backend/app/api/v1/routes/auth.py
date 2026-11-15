"""Authentication and User Profile endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database.dependencies import get_db_session
from app.database.models import User, gen_uuid
from app.schemas.auth import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
    UserUpdate,
)

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=TokenResponse, summary="Register a new account")
def register(
    data: UserRegister,
    db: Annotated[Session, Depends(get_db_session)],
) -> TokenResponse:
    """Register new user with hashed password and return access token."""
    existing = db.query(User).filter(User.email == data.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address is already registered",
        )

    pwd_hash, salt = hash_password(data.password)
    user = User(
        id=gen_uuid(),
        email=data.email.lower(),
        full_name=data.full_name.strip(),
        hashed_password=pwd_hash,
        salt=salt,
        role="user",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email, user.role)
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )
    return TokenResponse(access_token=token, user=user_resp)


@router.post("/login", response_model=TokenResponse, summary="User login")
def login(
    data: UserLogin,
    db: Annotated[Session, Depends(get_db_session)],
) -> TokenResponse:
    """Authenticate user with email/password and issue JWT."""
    user = db.query(User).filter(User.email == data.email.lower()).first()
    if not user or not verify_password(data.password, user.hashed_password, user.salt):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    token = create_access_token(user.id, user.email, user.role)
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )
    return TokenResponse(access_token=token, user=user_resp)


@router.get("/me", response_model=UserResponse, summary="Get current user profile")
def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
) -> UserResponse:
    """Return profile of currently logged-in user."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserResponse, summary="Update user profile")
def update_me(
    data: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db_session)],
) -> UserResponse:
    """Update full name or password for logged in user."""
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()

    if data.new_password is not None:
        if not data.current_password or not verify_password(
            data.current_password, current_user.hashed_password, current_user.salt
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed",
            )
        pwd_hash, salt = hash_password(data.new_password)
        current_user.hashed_password = pwd_hash
        current_user.salt = salt

    db.commit()
    db.refresh(current_user)
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        is_active=current_user.is_active,
        created_at=current_user.created_at,
    )


@router.post("/logout", summary="User logout")
def logout() -> dict[str, str]:
    """Client clears local token; returns success acknowledgment."""
    return {"status": "ok", "message": "Successfully logged out"}

