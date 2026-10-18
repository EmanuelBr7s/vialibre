import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, AuthContext
from app.api.duplicates import raise_duplicate_conflict
from app.api.v1.endpoints.practicas import _validate_challenge
from app.config import settings
from app.database import get_db
from app.models.interaction import Interaction, InteractionStatus
from app.schemas.match import (
    ChallengeApplicantsResponse,
    ContactInfo,
    InteractionApprove,
    InteractionCreate,
    InteractionListResponse,
    InteractionResponse,
)
from vialibre_common.schemas import TALENT_ROLES, UserRole
from vialibre_common.service_auth import service_headers

router = APIRouter()


@router.post("/apply", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def apply_to_challenge(
    data: InteractionCreate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    A Solucionador applies to a challenge.
    Creates an interaction in PENDIENTE status.
    """
    if auth.payload.role not in TALENT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo estudiantes y egresados pueden postularse",
        )

    # Check if user already applied to this challenge
    existing = await db.execute(
        select(Interaction).where(
            Interaction.solucionador_id == uuid.UUID(auth.payload.sub),
            Interaction.challenge_id == data.challenge_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already applied to this challenge",
        )

    # Validar la existencia del reto en core-service ANTES de insertar
    # (mismo patron y contratos que _validate_challenge en create_practica):
    # sin esta comprobacion se persistian interacciones huerfanas cuyos
    # flujos de autores/aprobacion responden 404 o 502. Orden de
    # validaciones intacto: autorizacion y duplicado local primero,
    # consulta remota despues.
    await _validate_challenge(data.challenge_id)

    interaction = Interaction(
        solucionador_id=uuid.UUID(auth.payload.sub),
        challenge_id=data.challenge_id,
        message=data.message,
    )
    db.add(interaction)
    try:
        await db.flush()
    except IntegrityError as exc:
        # La restriccion uq_solucionador_challenge (no el chequeo SELECT de
        # arriba) es lo que garantiza la unicidad ante concurrencia: se
        # traduce a 409 con el mismo detail que el duplicado secuencial.
        await db.rollback()
        raise_duplicate_conflict(
            exc,
            constraint="uq_solucionador_challenge",
            detail="You already applied to this challenge",
        )
        raise
    return interaction


@router.get("/challenge/{challenge_id}", response_model=ChallengeApplicantsResponse)
async def list_challenge_applicants(
    challenge_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all solucionadores who applied to a specific challenge.
    Only the challenge author (publicador) can view this.
    """
    # Verify the challenge exists and get author_id
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.core_service_url}/api/v1/core/challenges/{challenge_id}",
            )
    except httpx.HTTPError:
        # Fallo de transporte/timeout de core: 502 sin exponer la URL interna.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify challenge",
        )
    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify challenge",
        )
    challenge_data = response.json()

    # Verify the current user is the author of the challenge
    author_id = challenge_data.get("author_id")
    if author_id != auth.payload.sub and auth.payload.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the challenge author can view applicants",
        )

    query = select(Interaction).where(
        Interaction.challenge_id == challenge_id
    )
    count_query = select(func.count(Interaction.id)).where(
        Interaction.challenge_id == challenge_id
    )

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Interaction.created_at.desc())
    result = await db.execute(query)
    interactions = result.scalars().all()

    return ChallengeApplicantsResponse(
        interactions=interactions,
        total=total,
    )


@router.get("", response_model=InteractionListResponse)
async def list_my_interactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's interactions (as solucionador)."""
    query = select(Interaction).where(
        Interaction.solucionador_id == uuid.UUID(auth.payload.sub)
    )
    count_query = select(func.count(Interaction.id)).where(
        Interaction.solucionador_id == uuid.UUID(auth.payload.sub)
    )

    if status_filter:
        query = query.where(Interaction.status == status_filter)
        count_query = count_query.where(Interaction.status == status_filter)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Interaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    interactions = result.scalars().all()

    return InteractionListResponse(
        interactions=interactions,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{interaction_id}", response_model=InteractionResponse)
async def get_interaction(
    interaction_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get interaction details."""
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    # Only the solucionador or admin can view
    if (str(interaction.solucionador_id) != auth.payload.sub and
            auth.payload.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this interaction",
        )

    return interaction


@router.patch("/{interaction_id}/approve", response_model=InteractionResponse)
async def approve_interaction(
    interaction_id: uuid.UUID,
    data: InteractionApprove,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    A Publicador approves or rejects an interaction.
    If approved, contact_unlocked = True.
    """
    if auth.payload.role != UserRole.PUBLICADOR and auth.payload.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only publicadores can approve interactions",
        )

    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    # Verificar el autor del challenge ANTES de tomar el bloqueo de fila:
    # una llamada HTTP entre servicios nunca debe esperar con un lock retenido.
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.core_service_url}/api/v1/core/challenges/{interaction.challenge_id}",
            )
    except httpx.HTTPError:
        # Fallo de transporte/timeout de core: 502 sin exponer la URL interna.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify challenge ownership",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not verify challenge ownership",
        )
    challenge_data = response.json()

    author_id = challenge_data.get("author_id")
    if author_id != auth.payload.sub and auth.payload.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the challenge author can approve interactions",
        )

    # Bloqueo de fila sobre la interaccion concreta (sin bloqueos globales) y
    # releo del estado vigente: el estado leido antes de la llamada HTTP puede
    # haber cambiado mientras tanto (F3). populate_existing fuerza la
    # recarga del objeto del mapa de identidad con los valores devueltos por
    # el SELECT ... FOR UPDATE.
    locked = await db.execute(
        select(Interaction)
        .where(Interaction.id == interaction_id)
        .with_for_update()
        .execution_options(populate_existing=True)
    )
    interaction = locked.scalar_one_or_none()

    if not interaction:
        # La interaccion fue eliminada en paralelo.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    # Maquina de estados (I2): solo pendiente -> aprobado | rechazado.
    if interaction.status != InteractionStatus.PENDIENTE:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Interaction has already been resolved",
        )
    if data.status not in (InteractionStatus.APROBADO, InteractionStatus.RECHAZADO):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Invalid interaction status transition",
        )

    interaction.status = data.status

    if data.status == InteractionStatus.APROBADO:
        # Aprobado implica contacto desbloqueado con marca de tiempo (I1).
        interaction.contact_unlocked = True
        interaction.contact_unlocked_at = datetime.utcnow()
    else:
        # Rechazado implica contacto bloqueado: se limpian los campos de
        # desbloqueo para no conservar datos de una decision previa (F1).
        interaction.contact_unlocked = False
        interaction.contact_unlocked_at = None

    # El commit llega con get_db al terminar la peticion; el bloqueo de fila
    # se libera ahi y el estado ya quedo validado bajo el lock.
    await db.flush()
    return interaction


@router.delete("/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel/delete an interaction."""
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    # Only the solucionador who created it can delete
    if str(interaction.solucionador_id) != auth.payload.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this interaction",
        )

    await db.delete(interaction)


@router.get("/{interaction_id}/contact", response_model=ContactInfo)
async def get_contact_info(
    interaction_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get contact data if contact is unlocked."""
    result = await db.execute(
        select(Interaction).where(Interaction.id == interaction_id)
    )
    interaction = result.scalar_one_or_none()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    # Defensa en profundidad (I1): el desbloqueo por si solo no basta; el
    # contacto solo se entrega con la interaccion APROBADA. Asi, aunque una
    # fila anomala conserve contact_unlocked=True en estado pendiente o
    # rechazado, no se filtran datos.
    if not interaction.contact_unlocked or interaction.status != InteractionStatus.APROBADO:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contact information is not unlocked yet",
        )

    # Only the solucionador or the challenge author can view contact
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.core_service_url}/api/v1/core/challenges/{interaction.challenge_id}",
            )
    except httpx.HTTPError:
        # Fallo de transporte/timeout de core: 502 sin exponer la URL interna.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch challenge info",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch challenge info",
        )
    challenge_data = response.json()

    author_id = challenge_data.get("author_id")
    if (str(interaction.solucionador_id) != auth.payload.sub and
            author_id != auth.payload.sub and
            auth.payload.role != UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view contact info",
        )

    # Contacto de la contraparte: el estudiante ve a la empresa; la empresa y
    # la administracion ven al estudiante. La autorizacion sobre la interaccion
    # ya se verifico arriba; la consulta a auth se hace con el token interno.
    is_solucionador = str(interaction.solucionador_id) == auth.payload.sub
    contact_id = author_id if is_solucionador else interaction.solucionador_id
    contact_path = f"/api/v1/auth/users/{contact_id}"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.auth_service_url}{contact_path}",
                headers=service_headers(
                    settings.jwt_secret_key, settings.service_name, "GET", contact_path
                ),
            )
    except httpx.HTTPError:
        # Fallo de transporte/timeout de auth: 502 sin exponer la URL interna.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch user information",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not fetch user information",
        )
    user_data = response.json()

    return ContactInfo(
        user_id=uuid.UUID(user_data["id"]),
        full_name=user_data["full_name"],
        email=user_data["email"],
        phone=user_data.get("phone"),
        empresa_nombre=user_data.get("empresa_nombre"),
        programa_academico=user_data.get("programa_academico"),
        afiliacion_academica=user_data.get("afiliacion_academica"),
    )
