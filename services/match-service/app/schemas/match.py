import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.models.interaction import InteractionStatus
from app.models.reaction import ReactionType


# ── Interaction Schemas ──

class InteractionCreate(BaseModel):
    """Schema for a solucionador applying to a challenge."""
    challenge_id: uuid.UUID
    message: Optional[str] = Field(None, max_length=2000)


class InteractionApprove(BaseModel):
    """Schema for a publicador approving/rejecting an interaction."""
    status: InteractionStatus


class InteractionResponse(BaseModel):
    id: uuid.UUID
    solucionador_id: uuid.UUID
    challenge_id: uuid.UUID
    status: InteractionStatus
    message: Optional[str] = None
    contact_unlocked: bool
    contact_unlocked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InteractionListResponse(BaseModel):
    interactions: list[InteractionResponse]
    total: int
    skip: int
    limit: int


class ChallengeApplicantsResponse(BaseModel):
    """List of solucionadores who applied to a specific challenge."""
    interactions: list[InteractionResponse]
    total: int


# ── Reaction Schemas ──

class ReactionCreate(BaseModel):
    challenge_id: uuid.UUID
    reaction_type: ReactionType


class ReactionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    challenge_id: uuid.UUID
    reaction_type: ReactionType
    created_at: datetime

    model_config = {"from_attributes": True}


class ReactionListResponse(BaseModel):
    reactions: list[ReactionResponse]
    total: int
    skip: int
    limit: int


# ── Documentos requisito de practica ──

class DocumentInfo(BaseModel):
    tipo: str
    filename: str
    size: int
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class RequiredDocument(BaseModel):
    tipo: str
    label: str
    documento: Optional[DocumentInfo] = None


class DocumentChecklist(BaseModel):
    aplica: bool  # practica en la que el estudiante fue seleccionado
    completos: bool
    requeridos: list[RequiredDocument]


# ── Contact Info (for unlocked contacts) ──

class ContactInfo(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    empresa_nombre: Optional[str] = None
    programa_academico: Optional[str] = None
    afiliacion_academica: Optional[str] = None
