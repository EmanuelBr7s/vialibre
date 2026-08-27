import uuid
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class InteractionStatus(str, enum.Enum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"


class Interaction(Base):
    __tablename__ = "interactions"
    __table_args__ = (
        UniqueConstraint("solucionador_id", "challenge_id", name="uq_solucionador_challenge"),
        {"schema": "vialibre_match"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Cross-service references (no FK constraints)
    solucionador_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    challenge_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Interaction data
    status = Column(Enum(InteractionStatus), default=InteractionStatus.PENDIENTE, nullable=False)
    message = Column(Text, nullable=True)

    # Contact unlock logic
    contact_unlocked = Column(Boolean, default=False, nullable=False)
    contact_unlocked_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
