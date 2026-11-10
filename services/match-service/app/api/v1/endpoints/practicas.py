import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import AuthContext, require_role
from app.api.duplicates import raise_duplicate_conflict
from app.config import settings
from app.database import get_db
from app.models.interaction import Interaction
from app.models.practica import Practica
from app.schemas.practica import (
    PracticaCreate,
    PracticaListResponse,
    PracticaResponse,
    PracticaUpdate,
)
from vialibre_common.schemas import UserRole
from vialibre_common.service_auth import service_headers

router = APIRouter()


async def _get_practica_or_404(
    db: AsyncSession, practica_id: uuid.UUID, for_update: bool = False
) -> Practica:
    """Obtiene una practica por id o responde 404.

    `for_update=True` toma un bloqueo de fila (SELECT ... FOR UPDATE) para
    que las validaciones cruzadas (fechas) se calculen sobre el estado
    vigente de la fila. Solo `update_practica` lo usa: es una operacion de
    modificacion sin llamadas HTTP, por lo que el bloqueo no se retiene
    durante esperas de red (transaccion unica, patron TOCTOU del plan).
    """
    query = select(Practica).where(Practica.id == practica_id)
    if for_update:
        query = query.with_for_update()
    result = await db.execute(query)
    practica = result.scalar_one_or_none()
    if not practica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Practica no encontrada",
        )
    return practica


async def _get_interaction_or_404(
    db: AsyncSession, interaction_id: uuid.UUID
) -> Interaction:
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La interaccion indicada no existe",
        )
    return interaction


async def _validate_challenge(challenge_id: uuid.UUID | None) -> None:
    """Valida `challenge_id` contra core-service (referencia entre servicios)."""
    if challenge_id is None:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.core_service_url}/api/v1/core/challenges/{challenge_id}"
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo validar la publicacion",
        )
    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="challenge_id no corresponde a una publicacion existente",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo validar la publicacion",
        )


async def _validate_user(user_id: uuid.UUID | None) -> None:
    """Valida `solucionador_id` contra auth-service (referencia entre servicios)."""
    if user_id is None:
        return
    path = f"/api/v1/auth/users/{user_id}/resumen"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.auth_service_url}{path}",
                headers=service_headers(
                    settings.jwt_secret_key, settings.service_name, "GET", path
                ),
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo validar el estudiante",
        )
    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="solucionador_id no corresponde a un usuario existente",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo validar el estudiante",
        )


def _validate_dates(fecha_inicio, fecha_fin) -> None:
    if fecha_inicio is not None and fecha_fin is not None and fecha_fin < fecha_inicio:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="fecha_fin no puede ser anterior a fecha_inicio",
        )


@router.post("", response_model=PracticaResponse, status_code=status.HTTP_201_CREATED)
async def create_practica(
    data: PracticaCreate,
    current_user: AuthContext = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Formaliza explicitamente una practica. Operacion exclusiva del rol admin.

    No se crea automaticamente al aprobar una interaccion (D6). Maximo una
    `Practica` por `interaction_id`; duplicado -> 409.
    """
    interaction = await _get_interaction_or_404(db, data.interaction_id)

    existing = await db.execute(
        select(Practica.id).where(Practica.interaction_id == data.interaction_id)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una practica formalizada para esta interaccion",
        )

    if data.challenge_id is not None:
        await _validate_challenge(data.challenge_id)
    if data.solucionador_id is not None:
        await _validate_user(data.solucionador_id)

    _validate_dates(data.fecha_inicio, data.fecha_fin)

    payload = data.model_dump()
    payload["challenge_id"] = data.challenge_id or interaction.challenge_id
    payload["solucionador_id"] = data.solucionador_id or interaction.solucionador_id
    practica = Practica(
        **payload,
        created_by=uuid.UUID(current_user.payload.sub),
        fecha_formalizacion=datetime.utcnow(),
    )
    db.add(practica)
    try:
        await db.flush()
    except IntegrityError as exc:
        # La restriccion uq_practica_interaction sostiene la unicidad 1:1
        # frente a carrera; se traduce a 409 con el mismo detail secuencial.
        await db.rollback()
        raise_duplicate_conflict(
            exc,
            constraint="uq_practica_interaction",
            detail="Ya existe una practica formalizada para esta interaccion",
        )
        raise
    return practica


@router.get("", response_model=PracticaListResponse)
async def list_practicas(
    estado: str | None = Query(None, max_length=30),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: AuthContext = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Lista practicas formalizadas. Operacion exclusiva del rol admin."""
    filters = []
    if estado is not None:
        filters.append(Practica.estado_administrativo == estado)

    base = select(Practica).where(*filters)
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar()
    result = await db.execute(
        base.order_by(Practica.created_at.desc()).offset(skip).limit(limit)
    )
    return PracticaListResponse(
        practicas=result.scalars().all(),
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{practica_id}", response_model=PracticaResponse)
async def get_practica(
    practica_id: uuid.UUID,
    current_user: AuthContext = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Obtiene una practica por id. Operacion exclusiva del rol admin."""
    return await _get_practica_or_404(db, practica_id)


@router.patch("/{practica_id}", response_model=PracticaResponse)
async def update_practica(
    practica_id: uuid.UUID,
    data: PracticaUpdate,
    current_user: AuthContext = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Actualiza el expediente de una practica. Operacion exclusiva del rol admin.

    No permite cambiar `interaction_id` ni las referencias derivadas.
    """
    practica = await _get_practica_or_404(db, practica_id, for_update=True)
    update_dict = data.model_dump(exclude_unset=True)

    fecha_inicio = update_dict.get("fecha_inicio", practica.fecha_inicio)
    fecha_fin = update_dict.get("fecha_fin", practica.fecha_fin)
    _validate_dates(fecha_inicio, fecha_fin)

    for field, value in update_dict.items():
        setattr(practica, field, value)
    await db.flush()
    return practica
