import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.database import get_db
from app.models.tutor_docente import TutorDocente
from app.models.user import User
from app.schemas.tutor_docente import (
    TutorDocenteCreate,
    TutorDocenteListResponse,
    TutorDocenteResponse,
    TutorDocenteUpdate,
)
from vialibre_common.schemas import TokenPayload, UserRole

router = APIRouter()


async def _get_tutor_or_404(db: AsyncSession, tutor_id: uuid.UUID) -> TutorDocente:
    result = await db.execute(
        select(TutorDocente).where(TutorDocente.id == tutor_id)
    )
    tutor = result.scalar_one_or_none()
    if not tutor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor docente no encontrado",
        )
    return tutor


async def _validate_user_ref(db: AsyncSession, user_id: uuid.UUID | None) -> None:
    """Existence check for `user_id` (same schema, no ORM relationship).

    D3 sigue pendiente: no se decide la relacion TutorDocente-User, por lo que
    solo se verifica que el UUID corresponda a un usuario real del servicio.
    """
    if user_id is None:
        return
    result = await db.execute(select(User.id).where(User.id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El user_id indicado no corresponde a un usuario existente",
        )


@router.post("", response_model=TutorDocenteResponse, status_code=status.HTTP_201_CREATED)
async def create_tutor_docente(
    data: TutorDocenteCreate,
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Registra un tutor docente. Operacion exclusiva del rol admin."""
    await _validate_user_ref(db, data.user_id)
    tutor = TutorDocente(**data.model_dump())
    db.add(tutor)
    await db.flush()
    return tutor


@router.get("", response_model=TutorDocenteListResponse)
async def list_tutores_docentes(
    activo: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Lista tutores docentes. Operacion exclusiva del rol admin."""
    filters = []
    if activo is not None:
        filters.append(TutorDocente.activo.is_(activo))

    base = select(TutorDocente).where(*filters)
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar()
    result = await db.execute(
        base.order_by(TutorDocente.created_at.desc()).offset(skip).limit(limit)
    )
    return TutorDocenteListResponse(
        tutores=result.scalars().all(),
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{tutor_id}", response_model=TutorDocenteResponse)
async def get_tutor_docente(
    tutor_id: uuid.UUID,
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Obtiene un tutor docente por id. Operacion exclusiva del rol admin."""
    return await _get_tutor_or_404(db, tutor_id)


@router.patch("/{tutor_id}", response_model=TutorDocenteResponse)
async def update_tutor_docente(
    tutor_id: uuid.UUID,
    data: TutorDocenteUpdate,
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Actualiza un tutor docente. Operacion exclusiva del rol admin."""
    tutor = await _get_tutor_or_404(db, tutor_id)
    update_dict = data.model_dump(exclude_unset=True)
    if "user_id" in update_dict:
        await _validate_user_ref(db, update_dict["user_id"])
    for field, value in update_dict.items():
        setattr(tutor, field, value)
    await db.flush()
    return tutor
