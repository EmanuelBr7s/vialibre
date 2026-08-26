import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from app.models.challenge import ChallengeStatus, DifficultyLevel


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    icon: Optional[str] = None


class CategoryResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None

    model_config = {"from_attributes": True}


class ChallengeCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=300)
    description: str = Field(..., min_length=20)
    category_id: Optional[uuid.UUID] = None
    difficulty: Optional[DifficultyLevel] = None
    tags: Optional[list[str]] = None
    budget: Optional[Decimal] = None
    deadline: Optional[datetime] = None


class ChallengeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=300)
    description: Optional[str] = Field(None, min_length=20)
    category_id: Optional[uuid.UUID] = None
    status: Optional[ChallengeStatus] = None
    difficulty: Optional[DifficultyLevel] = None
    tags: Optional[list[str]] = None
    budget: Optional[Decimal] = None
    deadline: Optional[datetime] = None


class ChallengeResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    publisher_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    status: ChallengeStatus
    difficulty: Optional[DifficultyLevel] = None
    tags: Optional[list[str]] = None
    budget: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    is_featured: bool
    featured_score: Decimal
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChallengeListResponse(BaseModel):
    challenges: list[ChallengeResponse]
    total: int
    skip: int
    limit: int
