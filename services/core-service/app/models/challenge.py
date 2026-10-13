import uuid
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Numeric, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.database import Base


class ChallengeStatus(str, enum.Enum):
    ABIERTO = "abierto"
    EN_PROGRESO = "en_progreso"
    CERRADO = "cerrado"


class DifficultyLevel(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class Challenge(Base):
    __tablename__ = "challenges"
    __table_args__ = {"schema": "vialibre_core"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(300), nullable=False, index=True)
    # Modulo de la empresa: reto (laboratorio de innovacion), practica o empleo
    tipo = Column(String(20), default="reto", server_default=text("'reto'"), nullable=False, index=True)
    short_description = Column(String(500), nullable=False)
    long_description = Column(Text, nullable=False)

    # Relationships
    category_id = Column(UUID(as_uuid=True), ForeignKey("vialibre_core.categories.id"), nullable=True)

    # Publisher reference (cross-service - no FK constraint)
    author_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Status and metadata
    status = Column(Enum(ChallengeStatus), default=ChallengeStatus.ABIERTO, nullable=False)
    difficulty = Column(Enum(DifficultyLevel), nullable=True)
    tags = Column(JSONB, nullable=True)
    budget = Column(Numeric(12, 2), nullable=True)
    deadline = Column(DateTime, nullable=True)
    image_url = Column(String(512), nullable=True)
    modalidad = Column(String(20), nullable=True)  # presencial | remoto | hibrido
    ubicacion = Column(String(120), nullable=True)

    # Featured algorithm
    is_featured = Column(Boolean, default=False, nullable=False)
    featured_score = Column(Numeric(5, 2), default=0.0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    category = relationship("Category", back_populates="challenges")
