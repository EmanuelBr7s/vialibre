import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, AuthContext
from app.api.duplicates import raise_duplicate_conflict
from app.database import get_db
from app.models.reaction import Reaction, ReactionType
from app.schemas.match import (
    ReactionCreate,
    ReactionListResponse,
    ReactionResponse,
)

router = APIRouter()


@router.post("", response_model=ReactionResponse, status_code=status.HTTP_201_CREATED)
async def create_reaction(
    data: ReactionCreate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a reaction (like/bookmark)."""
    # Check if user already has this reaction type for this challenge
    existing = await db.execute(
        select(Reaction).where(
            Reaction.user_id == uuid.UUID(auth.payload.sub),
            Reaction.challenge_id == data.challenge_id,
            Reaction.reaction_type == data.reaction_type,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"You already have a {data.reaction_type.value} reaction for this challenge",
        )

    reaction = Reaction(
        user_id=uuid.UUID(auth.payload.sub),
        challenge_id=data.challenge_id,
        reaction_type=data.reaction_type,
    )
    db.add(reaction)
    try:
        await db.flush()
    except IntegrityError as exc:
        # La restriccion uq_user_challenge_reaction_type sostiene la unicidad
        # ante carrera; se traduce a 409 con el mismo detail secuencial.
        await db.rollback()
        raise_duplicate_conflict(
            exc,
            constraint="uq_user_challenge_reaction_type",
            detail=(
                f"You already have a {data.reaction_type.value} "
                "reaction for this challenge"
            ),
        )
        raise
    return reaction


@router.get("", response_model=ReactionListResponse)
async def list_my_reactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    reaction_type: ReactionType | None = None,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's reactions."""
    query = select(Reaction).where(
        Reaction.user_id == uuid.UUID(auth.payload.sub)
    )
    count_query = select(func.count(Reaction.id)).where(
        Reaction.user_id == uuid.UUID(auth.payload.sub)
    )

    if reaction_type:
        query = query.where(Reaction.reaction_type == reaction_type)
        count_query = count_query.where(Reaction.reaction_type == reaction_type)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Reaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    reactions = result.scalars().all()

    return ReactionListResponse(
        reactions=reactions,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.delete("/{reaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reaction(
    reaction_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a reaction."""
    result = await db.execute(
        select(Reaction).where(
            Reaction.id == reaction_id,
            Reaction.user_id == uuid.UUID(auth.payload.sub),
        )
    )
    reaction = result.scalar_one_or_none()

    if not reaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found",
        )

    await db.delete(reaction)


# ── Internal endpoints ──

# DECISION (B3-A): se mantiene GET /internal/count/{challenge_id} SIN CAMBIOS
# funcionales. Sigue protegido con get_current_user (JWT de usuario) y NO se
# migra a autenticacion de servicio ni se elimina: el endpoint no tiene
# llamadores en el repositorio (0 consumidores en frontend, gateway y otros
# servicios), por lo que migrarlo a X-Service-Token obligaria a crear
# infraestructura de verificacion interna en match-service para nadie.
# La nomenclatura "/internal" con autenticacion JWT es imprecisa y asi queda
# registrada (ver .opencode/reports/B3_01_INVESTIGACION.md, Duda 2/H4).
# Revisar si aparece algun consumidor cross-service real o en una fase de limpieza.
@router.get("/internal/count/{challenge_id}")
async def count_reactions(
    challenge_id: uuid.UUID,
    reaction_type: ReactionType | None = None,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Count reactions for a challenge (requires authentication)."""
    query = select(func.count(Reaction.id)).where(
        Reaction.challenge_id == challenge_id
    )

    if reaction_type:
        query = query.where(Reaction.reaction_type == reaction_type)

    result = await db.execute(query)
    count = result.scalar()

    return {"challenge_id": str(challenge_id), "count": count}
