import asyncio
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_role
from app.config import settings
from app.database import get_db
from app.models.challenge import Challenge, ChallengeStatus, DifficultyLevel
from app.models.category import Category
from app.schemas.challenge import (
    CategoryCreate,
    CategoryResponse,
    ChallengeCreate,
    ChallengeListResponse,
    ChallengeResponse,
    ChallengeTipo,
    ChallengeUpdate,
)
from vialibre_common.schemas import TokenPayload, UserRole
from vialibre_common.service_auth import service_headers

router = APIRouter()


async def _resolve_author(author_id: uuid.UUID) -> dict:
    """
    Fetch a single author's display info from auth-service.
    Uses a request-bound internal service token; only display fields are returned.
    Returns fields (author_name, empresa_nombre) or empty dict on failure.
    """
    path = f"/api/v1/auth/users/{author_id}/resumen"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.auth_service_url}{path}",
                headers=service_headers(
                    settings.jwt_secret_key, settings.service_name, "GET", path
                ),
            )
            if response.status_code != 200:
                return {}
            data = response.json()
            return {
                "author_name": data.get("full_name"),
                "empresa_nombre": data.get("empresa_nombre")
                or data.get("full_name"),
            }
    except httpx.HTTPError:
        return {}


async def _attach_authors(
    challenges: list[Challenge],
) -> list[dict]:
    """
    Resolve unique author IDs via auth-service in parallel (asyncio.gather),
    then enrich each challenge with author_name / empresa_nombre.
    """
    author_ids = {str(c.author_id) for c in challenges}
    results = await asyncio.gather(
        *(_resolve_author(uuid.UUID(uid)) for uid in author_ids)
    )
    author_map = {uid: info for uid, info in zip(author_ids, results)}

    enriched = []
    for challenge in challenges:
        data = {
            **{k: getattr(challenge, k) for k in (
                "id", "title", "short_description", "long_description",
                "author_id", "category_id", "status", "difficulty", "tags",
                "budget", "deadline", "is_featured", "featured_score",
                "created_at", "updated_at", "tipo", "image_url", "modalidad",
                "ubicacion",
            )},
        }
        info = author_map.get(str(challenge.author_id), {})
        data["author_name"] = info.get("author_name")
        data["empresa_nombre"] = info.get("empresa_nombre")
        enriched.append(data)
    return enriched


# ── Categories ──

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
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
# IMPORTANTE: las rutas de colección se definen SIN slash final ("") para que
# queden como /api/v1/core/challenges (no /challenges/). El proxy de Next.js
# normaliza con 308 a rutas sin slash; con redirect_slashes=False FastAPI ya no
# rebota con 307, evitando el bucle que rompía el POST (publicación de empresas).

@router.post("", response_model=ChallengeResponse, status_code=status.HTTP_201_CREATED)
async def create_challenge(
    data: ChallengeCreate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new challenge.
    Solo las empresas (PUBLICADOR) y el administrador pueden publicar.
    """
    if current_user.role not in (UserRole.PUBLICADOR, UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo las empresas y el administrador pueden publicar",
        )

    challenge = Challenge(
        **data.model_dump(),
        author_id=uuid.UUID(current_user.sub),
    )
    db.add(challenge)
    await db.flush()
    enriched = await _attach_authors([challenge])
    return ChallengeResponse(**enriched[0])


@router.get("", response_model=ChallengeListResponse)
async def list_challenges(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    # Los filtros se tipean con los enums locales del modelo (igual que `tipo`):
    # un valor fuera del enum produce 422 de validacion en vez del 500 que
    # provocaba comparar una cadena arbitraria contra una columna Enum.
    status_filter: ChallengeStatus | None = Query(None, alias="status"),
    category_id: uuid.UUID | None = None,
    difficulty: DifficultyLevel | None = None,
    featured_only: bool = False,
    tipo: ChallengeTipo | None = None,
    author_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List challenges.
    By default, returns only ABIERTO challenges for the feed. When filtering by
    author_id (publicaciones de una empresa) every status is returned.
    """
    query = select(Challenge)
    count_query = select(func.count(Challenge.id))

    # Default to ABIERTO if no status filter provided
    if status_filter:
        query = query.where(Challenge.status == status_filter)
        count_query = count_query.where(Challenge.status == status_filter)
    elif not author_id:
        query = query.where(Challenge.status == ChallengeStatus.ABIERTO)
        count_query = count_query.where(Challenge.status == ChallengeStatus.ABIERTO)

    if tipo:
        query = query.where(Challenge.tipo == tipo)
        count_query = count_query.where(Challenge.tipo == tipo)

    if author_id:
        query = query.where(Challenge.author_id == author_id)
        count_query = count_query.where(Challenge.author_id == author_id)

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

    enriched = await _attach_authors(list(challenges))

    return ChallengeListResponse(
        challenges=[ChallengeResponse(**c) for c in enriched],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{challenge_id}", response_model=ChallengeResponse)
async def get_challenge(
    challenge_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get challenge details by ID."""
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    enriched = await _attach_authors([challenge])
    return ChallengeResponse(**enriched[0])


@router.patch("/{challenge_id}", response_model=ChallengeResponse)
async def update_challenge(
    challenge_id: uuid.UUID,
    data: ChallengeUpdate,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a challenge. Only author or admin can update."""
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    if str(challenge.author_id) != current_user.sub and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this challenge",
        )

    update_dict = data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(challenge, field, value)

    await db.flush()
    enriched = await _attach_authors([challenge])
    return ChallengeResponse(**enriched[0])


@router.delete("/{challenge_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_challenge(
    challenge_id: uuid.UUID,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a challenge. Only author or admin can delete."""
    result = await db.execute(select(Challenge).where(Challenge.id == challenge_id))
    challenge = result.scalar_one_or_none()

    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    if str(challenge.author_id) != current_user.sub and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this challenge",
        )

    await db.delete(challenge)
