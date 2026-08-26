import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.config import settings
from app.database import get_db
from app.models.interaction import Interaction, InteractionStatus
from app.schemas.match import (
    ContactInfo,
    InteractionCreate,
    InteractionListResponse,
    InteractionResponse,
    InteractionUpdate,
)
from vialibre_common.schemas import TokenPayload

router = APIRouter()


@router.post("/", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
async def create_interaction(
    data: InteractionCreate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Postularse a un reto (botón 'Aceptar')."""
    # Check if user already has an interaction with this challenge
    existing = await db.execute(
        select(Interaction).where(
            Interaction.user_id == uuid.UUID(current_user.sub),
            Interaction.challenge_id == data.challenge_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an interaction with this challenge",
        )

    interaction = Interaction(
        user_id=uuid.UUID(current_user.sub),
        challenge_id=data.challenge_id,
        message=data.message,
    )
    db.add(interaction)
    await db.flush()
    return interaction


@router.get("/", response_model=InteractionListResponse)
async def list_my_interactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's interactions."""
    query = select(Interaction).where(
        Interaction.user_id == uuid.UUID(current_user.sub)
    )
    count_query = select(func.count(Interaction.id)).where(
        Interaction.user_id == uuid.UUID(current_user.sub)
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
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get interaction details."""
    result = await db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.user_id == uuid.UUID(current_user.sub),
        )
    )
    interaction = result.scalar_one_or_none()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    return interaction


@router.patch("/{interaction_id}", response_model=InteractionResponse)
async def update_interaction(
    interaction_id: uuid.UUID,
    data: InteractionUpdate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update interaction status (accept/reject)."""
    result = await db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.user_id == uuid.UUID(current_user.sub),
        )
    )
    interaction = result.scalar_one_or_none()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    # If status is being changed to ACCEPTED, unlock contact
    if data.status == InteractionStatus.ACCEPTED and not interaction.contact_unlocked:
        interaction.contact_unlocked = True
        interaction.contact_unlocked_at = datetime.now(timezone.utc)

    interaction.status = data.status
    if data.message:
        interaction.message = data.message

    await db.flush()
    return interaction


@router.delete("/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_interaction(
    interaction_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel/delete an interaction."""
    result = await db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.user_id == uuid.UUID(current_user.sub),
        )
    )
    interaction = result.scalar_one_or_none()

    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interaction not found",
        )

    await db.delete(interaction)


@router.get("/{interaction_id}/contact", response_model=ContactInfo)
async def get_contact_info(
    interaction_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get contact data if contact is unlocked."""
    result = await db.execute(
        select(Interaction).where(
            Interaction.id == interaction_id,
            Interaction.user_id == uuid.UUID(current_user.sub),
        )
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

    # Fetch user info from auth-service
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.auth_service_url}/api/v1/auth/users/{interaction.user_id}",
            headers={"Authorization": f"Bearer {current_user.sub}"},
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
