import uuid
from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, AuthContext
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
from vialibre_common.schemas import UserRole

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
    if auth.payload.role != UserRole.SOLUCIONADOR:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only solucionadores can apply to challenges",
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

    interaction = Interaction(
        solucionador_id=uuid.UUID(auth.payload.sub),
        challenge_id=data.challenge_id,
        message=data.message,
    )
    db.add(interaction)
    await db.flush()
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
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.core_service_url}/api/v1/core/challenges/{challenge_id}",
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Challenge not found",
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


@router.get("/", response_model=InteractionListResponse)
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

    # Verify the current user is the author of the challenge
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.core_service_url}/api/v1/core/challenges/{interaction.challenge_id}",
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

    # Update status
    interaction.status = data.status

    # If approved, unlock contact
    if data.status == InteractionStatus.APROBADO and not interaction.contact_unlocked:
        interaction.contact_unlocked = True
        interaction.contact_unlocked_at = datetime.utcnow()

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

    if not interaction.contact_unlocked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Contact information is not unlocked yet",
        )

    # Only the solucionador or the challenge author can view contact
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.core_service_url}/api/v1/core/challenges/{interaction.challenge_id}",
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

    # Fetch solucionador info from auth-service (pass real JWT)
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.auth_service_url}/api/v1/auth/users/{interaction.solucionador_id}",
            headers={"Authorization": f"Bearer {auth.token}"},
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
