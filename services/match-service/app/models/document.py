import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, LargeBinary, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import deferred

from app.database import Base


class InteractionDocument(Base):
    """Documento requisito que carga un estudiante seleccionado para practica."""

    __tablename__ = "interaction_documents"
    __table_args__ = (
        UniqueConstraint("interaction_id", "tipo", name="uq_interaction_document_tipo"),
        {"schema": "vialibre_match"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    interaction_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vialibre_match.interactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tipo = Column(String(40), nullable=False)
    filename = Column(String(255), nullable=False)
    content_type = Column(String(100), nullable=False)
    size = Column(Integer, nullable=False)
    # ponytail: binario en Postgres, igual que el CV; almacenamiento de objetos si crece.
    data = deferred(Column(LargeBinary, nullable=False))
    uploaded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
