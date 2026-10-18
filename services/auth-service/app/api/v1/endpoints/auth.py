from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.auth import (
    PUBLIC_REGISTER_ROLES,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from vialibre_common.schemas import UserRole

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate user and return JWT token."""
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.email == request.email)
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    access_token = create_access_token(
        user_id=str(user.id),
        role=user.role.name,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=3600,
        user_id=str(user.id),
        role=UserRole(user.role.name),
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user.

    The role is determined server-side: the public flow only allows
    SOLUCIONADOR, EGRESADO or PUBLICADOR. Privileged roles (admin) are rejected.
    """
    if request.role not in PUBLIC_REGISTER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El registro público no permite asignar este rol",
        )

    # Check duplicate email
    result = await db.execute(
        select(User).where(User.email == request.email)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    # Look up role
    role_result = await db.execute(
        select(Role).where(Role.name == request.role.value)
    )
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role: {request.role}",
        )

    # Create user with role-specific fields
    user = User(
        email=request.email,
        password_hash=hash_password(request.password),
        full_name=request.full_name,
        role_id=role.id,
        phone=request.phone,
        nit_empresa=request.nit_empresa,
        empresa_nombre=request.empresa_nombre,
        programa_academico=request.programa_academico,
        afiliacion_academica=request.afiliacion_academica,
    )

    db.add(user)
    await db.flush()

    access_token = create_access_token(
        user_id=str(user.id),
        role=role.name,
    )

    return TokenResponse(
        access_token=access_token,
        expires_in=3600,
        user_id=str(user.id),
        role=UserRole(role.name),
    )
