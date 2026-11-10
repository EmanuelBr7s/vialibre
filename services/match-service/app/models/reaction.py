import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Enum, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base
from vialibre_common.schemas import ReactionType


class Reaction(Base):
    __tablename__ = "reactions"
    __table_args__ = (
        UniqueConstraint("user_id", "challenge_id", "reaction_type", name="uq_user_challenge_reaction_type"),
        {"schema": "vialibre_match"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Cross-service references (no FK constraints)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    challenge_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    # Reaction type
    reaction_type = Column(Enum(ReactionType), nullable=False)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
