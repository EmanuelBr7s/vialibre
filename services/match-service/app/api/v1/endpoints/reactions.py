import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.reaction import Reaction, ReactionType
from app.schemas.match import (
    ReactionCreate,
    ReactionListResponse,
    ReactionResponse,
)
from vialibre_common.schemas import TokenPayload

router = APIRouter()


@router.post("/", response_model=ReactionResponse, status_code=status.HTTP_201_CREATED)
async def create_reaction(
    data: ReactionCreate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a reaction (like/bookmark)."""
    # Check if user already has this reaction type for this challenge
    existing = await db.execute(
        select(Reaction).where(
            Reaction.user_id == uuid.UUID(current_user.sub),
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
        user_id=uuid.UUID(current_user.sub),
        challenge_id=data.challenge_id,
        reaction_type=data.reaction_type,
    )
    db.add(reaction)
    await db.flush()
    return reaction


@router.get("/", response_model=ReactionListResponse)
async def list_my_reactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    reaction_type: ReactionType | None = None,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List current user's reactions."""
    query = select(Reaction).where(
        Reaction.user_id == uuid.UUID(current_user.sub)
    )
    count_query = select(func.count(Reaction.id)).where(
        Reaction.user_id == uuid.UUID(current_user.sub)
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
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remove a reaction."""
    result = await db.execute(
        select(Reaction).where(
            Reaction.id == reaction_id,
            Reaction.user_id == uuid.UUID(current_user.sub),
        )
    )
    reaction = result.scalar_one_or_none()

    if not reaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reaction not found",
        )

    await db.delete(reaction)


# ── Internal endpoints (no auth) ──

@router.get("/internal/count/{challenge_id}")
async def count_reactions(
    challenge_id: uuid.UUID,
    reaction_type: ReactionType | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Count reactions for a challenge (internal endpoint)."""
    query = select(func.count(Reaction.id)).where(
        Reaction.challenge_id == challenge_id
    )

    if reaction_type:
        query = query.where(Reaction.reaction_type == reaction_type)

    result = await db.execute(query)
    count = result.scalar()

    return {"challenge_id": str(challenge_id), "count": count}
