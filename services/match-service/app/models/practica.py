import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, Date, DateTime, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Practica(Base):
    """Expediente institucional de una practica formalizada. No equivale a `Interaction`.

    Fuente de diseno: docs/gestion-practicas/diseno-modelo-datos.md (apartado D.6).

    Decision tecnica adoptada para esta implementacion (D6, provisional y NO norma
    institucional confirmada): la formalizacion es un acto explicito y existe como
    maximo una `Practica` por `Interaction` (`uq_practica_interaction`). Aprobar una
    `Interaction` no crea automaticamente una `Practica`.

    D1, D3, D4, la confirmacion de D6 y D11 siguen pendientes: todas las referencias
    son UUID puros sin clave foranea entre esquemas/servicios, y
    `estado_administrativo`, `modalidad` y `tipo_practica` son texto libre nulo
    porque los catalogos institucionales no estan aprobados.
    """

    __tablename__ = "practicas"
    __table_args__ = (
        UniqueConstraint("interaction_id", name="uq_practica_interaction"),
        {"schema": "vialibre_match"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Referencias logicas (UUID puro, sin clave foranea entre servicios)
    challenge_id = Column(UUID(as_uuid=True), nullable=True)      # core-service
    interaction_id = Column(UUID(as_uuid=True), nullable=True)    # match-service
    solucionador_id = Column(UUID(as_uuid=True), nullable=True)   # auth-service
    empresa_id = Column(UUID(as_uuid=True), nullable=True)        # core-service
    tutor_docente_id = Column(UUID(as_uuid=True), nullable=True)  # auth-service
    created_by = Column(UUID(as_uuid=True), nullable=True)        # auth-service

    # Expediente; catalogos pendientes (D1/D7) -> texto libre nulo
    estado_administrativo = Column(String(30), nullable=True)
    modalidad = Column(String(20), nullable=True)
    tipo_practica = Column(String(30), nullable=True)
    duracion_horas = Column(Integer, nullable=True)
    fecha_inicio = Column(Date, nullable=True)
    fecha_fin = Column(Date, nullable=True)
    anio_academico = Column(String(10), nullable=True)
    periodo_academico = Column(String(10), nullable=True)
    bilingue = Column(Boolean, default=False, server_default=text("false"), nullable=False)
    observaciones_institucionales = Column(Text, nullable=True)
    fecha_formalizacion = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
