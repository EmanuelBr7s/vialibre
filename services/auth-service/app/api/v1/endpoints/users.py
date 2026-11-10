import uuid
from datetime import datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, undefer

from app.api.deps import get_current_user
from app.database import get_db
from app.models.role import Role
from app.models.user import User
from app.schemas.user import UserListResponse, UserResponse, UserUpdate
from vialibre_common.schemas import TALENT_ROLES, TokenPayload, UserRole

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


@router.get("/talent", response_model=UserListResponse)
async def search_talent(
    role: UserRole | None = None,
    q: str | None = Query(None, max_length=100),
    programa: str | None = Query(None, max_length=100),
    afiliacion: str | None = Query(None, max_length=100),
    con_cv: bool = False,
    skip: int = Query(0, ge=0),
    limit: int = Query(24, ge=1, le=100),
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Banco de hojas de vida: estudiantes y egresados disponibles.
    Solo para empresas y la administracion.
    """
    if current_user.role not in (UserRole.PUBLICADOR, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo las empresas pueden consultar el banco de hojas de vida",
        )
    if role and role not in TALENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="role debe ser solucionador o egresado",
        )

    roles = [role.value] if role else [r.value for r in TALENT_ROLES]
    filters = [Role.name.in_(roles), User.is_active.is_(True), User.disponible.is_(True)]
    if q:
        like = f"%{q.strip()}%"
        filters.append(
            or_(
                User.full_name.ilike(like),
                User.bio.ilike(like),
                User.programa_academico.ilike(like),
                cast(User.skills, String).ilike(like),
                cast(User.soft_skills, String).ilike(like),
            )
        )
    if programa:
        filters.append(User.programa_academico.ilike(f"%{programa.strip()}%"))
    if afiliacion:
        filters.append(User.afiliacion_academica.ilike(f"%{afiliacion.strip()}%"))
    if con_cv:
        filters.append(User.cv_filename.is_not(None))

    base = select(User).join(User.role).where(*filters)
    total = (await db.execute(select(func.count()).select_from(base.subquery()))).scalar()
    result = await db.execute(
        base.options(selectinload(User.role))
        .order_by(User.cv_updated_at.desc().nulls_last(), User.full_name)
        .offset(skip)
        .limit(limit)
    )
    return UserListResponse(
        users=[user_to_response(u) for u in result.scalars().all()],
        total=total,
        skip=skip,
        limit=limit,
    )


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
