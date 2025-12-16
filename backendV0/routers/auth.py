from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..database import get_session
from ..models import User
from ..schemas import Token, UserCreate, UserRead, UserUpdate
from ..utils import create_access_token, get_password_hash, verify_password
from ..deps import get_current_user
from fastapi import Request

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead)
async def register_user(
    payload: UserCreate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        hashed_password=get_password_hash(payload.password),
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(
        subject={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(hours=12),
    )
    return Token(access_token=access_token, role=user.role)


@router.get("/debug-headers")
async def debug_headers(request: Request):
    """Development helper: echo Authorization header back so frontend can verify it was sent."""
    auth = request.headers.get("authorization")
    return {"authorization_header": auth}


@router.get("/me", response_model=UserRead)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserRead)
async def update_user_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update the current user's profile information."""
    
    # Check if email is being changed and if it's already taken
    if payload.email and payload.email != current_user.email:
        result = await session.execute(select(User).where(User.email == payload.email))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use",
            )
        current_user.email = payload.email
    
    # Update full name if provided
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    
    await session.commit()
    await session.refresh(current_user)
    return current_user

