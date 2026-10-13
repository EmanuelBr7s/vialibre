import uuid
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, undefer

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate
from vialibre_common.schemas import TokenPayload, UserRole

CV_MAX_BYTES = 5 * 1024 * 1024

router = APIRouter()


def user_to_response(user: User) -> UserResponse:
    """Convert ORM User to UserResponse, handling the role relationship."""
    data = {
        field: getattr(user, field)
        for field in UserResponse.model_fields
        if field != "role"
    }
    data["role"] = user.role.name
    data["skills"] = user.skills or []
    data["soft_skills"] = user.soft_skills or []
    return UserResponse(**data)


async def _get_user_or_404(db: AsyncSession, user_id: uuid.UUID, *options) -> User:
    result = await db.execute(
        select(User).options(selectinload(User.role), *options).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


@router.get("/me", response_model=UserResponse)
async def get_my_profile(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get current user's profile."""
    user = await _get_user_or_404(db, uuid.UUID(current_user.sub))

    return user_to_response(user)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    update_data: UserUpdate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update current user's profile."""
    user = await _get_user_or_404(db, uuid.UUID(current_user.sub))

    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(user, field, value)

    await db.flush()
    return user_to_response(user)


@router.put("/me/cv", response_model=UserResponse)
async def upload_my_cv(
    file: UploadFile = File(...),
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Sube o reemplaza la hoja de vida (PDF, máx. 5 MB) del usuario actual."""
    content = await file.read(CV_MAX_BYTES + 1)
    if len(content) > CV_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La hoja de vida supera el límite de 5 MB",
        )
    if not content.startswith(b"%PDF"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Solo se permiten archivos PDF",
        )

    user = await _get_user_or_404(db, uuid.UUID(current_user.sub))
    user.cv_data = content
    user.cv_filename = (file.filename or "hoja-de-vida.pdf")[:255]
    user.cv_size = len(content)
    user.cv_updated_at = datetime.utcnow()
    await db.flush()
    return user_to_response(user)


@router.delete("/me/cv", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_cv(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await _get_user_or_404(db, uuid.UUID(current_user.sub))
    user.cv_data = None
    user.cv_filename = None
    user.cv_size = None
    user.cv_updated_at = None


@router.get("/{user_id}/cv")
async def get_user_cv(
    user_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Descarga la hoja de vida de un usuario. Datos personales (Ley 1581):
    solo la ven su dueño, las empresas y la administración.
    """
    if current_user.sub != str(user_id) and current_user.role not in (
        UserRole.PUBLICADOR,
        UserRole.ADMIN,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para ver esta hoja de vida",
        )
    user = await _get_user_or_404(db, user_id, undefer(User.cv_data))
    if not user.cv_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Este usuario aún no ha cargado su hoja de vida",
        )
    return Response(
        content=user.cv_data,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(user.cv_filename or 'cv.pdf')}"},
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Get a user by ID.
    This is used by other services (core/match) via internal calls and by
    the frontend for resolving public display info.
    """
    user = await _get_user_or_404(db, user_id)

    return user_to_response(user)
