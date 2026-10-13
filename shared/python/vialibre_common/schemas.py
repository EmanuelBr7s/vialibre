"""Shared Pydantic schemas and enums for VíaLibre microservices."""

import uuid
import enum
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ── Enums ──

class UserRole(str, enum.Enum):
    PUBLICADOR = "publicador"
    SOLUCIONADOR = "solucionador"  # estudiante
    EGRESADO = "egresado"
    ADMIN = "admin"


# Roles que buscan oportunidades (practica, empleo, retos) y se postulan.
TALENT_ROLES = (UserRole.SOLUCIONADOR, UserRole.EGRESADO)


class ChallengeStatus(str, enum.Enum):
    DRAFT = "draft"
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InteractionStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    COMPLETED = "completed"


class ReactionType(str, enum.Enum):
    LIKE = "like"
    BOOKMARK = "bookmark"


# ── Auth Schemas ──

class TokenPayload(BaseModel):
    sub: str
    exp: int
    iat: int
    role: UserRole


# ── User Schemas (shared across services) ──

class UserBase(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    """Limited user info for cross-service references."""
    id: uuid.UUID
    full_name: str
    role: UserRole
    avatar_url: str | None = None
