import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.challenge import Challenge
from app.models.category import Category
from app.schemas.challenge import (
    CategoryCreate,
    CategoryResponse,
    ChallengeCreate,
    ChallengeListResponse,
    ChallengeResponse,
    ChallengeUpdate,
)
from vialibre_common.schemas import TokenPayload

router = APIRouter()


# ── Categories ──

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = Category(**data.model_dump())
    db.add(category)
    await db.flush()
    return category


@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).order_by(Category.name))
    return result.scalars().all()


# ── Challenges ──

@router.post("/", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    data: ChallengeCreate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    challenge = Challenge(
        **data.model_dump(),
        publisher_id=uuid.UUID(current_user.sub),
    )
    db.add(challenge)
    await db.flush()
    return challenge


@router.get("/", response_model=ChallengeListResponse)
async def list_challenges(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    category_id: uuid.UUID | None = None,
    difficulty: str | None = None,
    featured_only: bool = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(Challenge)
    count_query = select(func.count(Challenge.id))

    if status_filter:
        query = query.where(Challenge.status == status_filter)
        count_query = count_query.where(Challenge.status == status_filter)

    if category_id:
        query = query.where(Challenge.category_id == category_id)
        count_query = count_query.where(Challenge.category_id == category_id)

    if difficulty:
        query = query.where(Challenge.difficulty == difficulty)
        count_query = count_query.where(Challenge.difficulty == difficulty)

    if featured_only:
        query = query.where(Challenge.is_featured == True)
        count_query = count_query.where(Challenge.is_featured == True)

    total_result = await db.execute(count_query)
    total = total_result.scalar()

    query = query.order_by(Challenge.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    challenges = result.scalars().all()

    return ChallengeListResponse(
        challenges=challenges,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    return challenge


@router.patch("/{challenge_id}", response_model=ChallengeResponse)
async def update_challenge(
    challenge_id: uuid.UUID,
    data: ChallengeUpdate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    # Only publisher or admin can update
    if str(challenge.publisher_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this challenge",
        )

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(challenge, field, value)

    await db.flush()
    return challenge


@router.delete("/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_challenge(
    challenge_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    if str(challenge.publisher_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this challenge",
        )

    await db.delete(challenge)
