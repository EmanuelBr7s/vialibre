import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class TutorDocente(Base):
    """Informacion institucional del tutor docente asignado a una practica.

    Fuente de diseno: docs/gestion-practicas/diseno-modelo-datos.md (apartado D.5).

    D3 y D11 siguen [Pendiente de confirmar]. Por eso no se decide si el tutor es
    una entidad independiente o un perfil/rol de `User`: `user_id` es solo una
    referencia logica como UUID puro, sin clave foranea ni relacion ORM hacia
    `User`, aunque ambas entidades convivan en el mismo esquema. No se imponen
    unicidades (identificacion, email) que dependan de politica institucional.
    """

    __tablename__ = "tutores_docentes"
    __table_args__ = {"schema": "vialibre_auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    identificacion = Column(String(20), nullable=True)
    nombres = Column(String(255), nullable=True)
    apellidos = Column(String(255), nullable=True)
    email = Column(String(255), nullable=True)
    telefono = Column(String(50), nullable=True)
    programa_academico = Column(String(255), nullable=True)
    # Referencia logica a User (mismo esquema); sin FK ni relationship (D3 pendiente).
    user_id = Column(UUID(as_uuid=True), nullable=True)
    activo = Column(Boolean, default=True, server_default=text("true"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
