import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field

from vialibre_common.schemas import ChallengeStatus, ChallengeTipo, DifficultyLevel, Modalidad, Ubicacion


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
    short_description: str = Field(..., min_length=10, max_length=500)
    long_description: str = Field(..., min_length=20)
    tipo: ChallengeTipo = ChallengeTipo.RETO
    category_id: Optional[uuid.UUID] = None
    difficulty: Optional[DifficultyLevel] = None
    tags: Optional[list[str]] = None
    budget: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    image_url: Optional[str] = Field(None, max_length=512)
    modalidad: Optional[Modalidad] = None
    ubicacion: Optional[Ubicacion] = None


class ChallengeUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=300)
    short_description: Optional[str] = Field(None, min_length=10, max_length=500)
    long_description: Optional[str] = Field(None, min_length=20)
    category_id: Optional[uuid.UUID] = None
    status: Optional[ChallengeStatus] = None
    difficulty: Optional[DifficultyLevel] = None
    tags: Optional[list[str]] = None
    budget: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    tipo: Optional[ChallengeTipo] = None
    image_url: Optional[str] = Field(None, max_length=512)
    modalidad: Optional[Modalidad] = None
    ubicacion: Optional[Ubicacion] = None


class ChallengeResponse(BaseModel):
    id: uuid.UUID
    title: str
    short_description: str
    long_description: str
    tipo: ChallengeTipo
    author_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    status: ChallengeStatus
    difficulty: Optional[DifficultyLevel] = None
    tags: Optional[list[str]] = None
    budget: Optional[Decimal] = None
    deadline: Optional[datetime] = None
    image_url: Optional[str] = None
    modalidad: Optional[Modalidad] = None
    ubicacion: Optional[str] = None
    is_featured: bool
    featured_score: Decimal
    created_at: datetime
    updated_at: datetime

    # Resolved author info (filled via cross-service call to auth-service)
    author_name: Optional[str] = None
    empresa_nombre: Optional[str] = None

    model_config = {"from_attributes": True}


class ChallengeListResponse(BaseModel):
    challenges: list[ChallengeResponse]
    total: int
    skip: int
    limit: int
