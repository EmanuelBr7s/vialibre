import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, String, text
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Empresa(Base):
    """Registro institucional de una empresa, separado de la cuenta publicadora.

    Fuente de diseno: docs/gestion-practicas/diseno-modelo-datos.md (apartado D.4).

    D4 y D11 siguen [Pendiente de confirmar]; por eso no se imponen reglas sin
    aprobar: `nit` no es unico, `razon_social` se deja nulo y `publicador_user_id`
    es una referencia logica a `User` (auth-service) como UUID puro, sin clave
    foranea entre servicios. No se duplican `User.nit_empresa` ni
    `User.empresa_nombre`.
    """

    __tablename__ = "empresas"
    __table_args__ = {"schema": "vialibre_core"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nit = Column(String(20), nullable=True)
    razon_social = Column(String(255), nullable=True)
    sector = Column(String(100), nullable=True)
    representante_legal = Column(String(255), nullable=True)
    contacto_email = Column(String(255), nullable=True)
    contacto_telefono = Column(String(50), nullable=True)
    # Referencia logica a User (vialibre_auth): UUID puro, sin FK entre servicios.
    publicador_user_id = Column(UUID(as_uuid=True), nullable=True)
    activa = Column(Boolean, default=True, server_default=text("true"), nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
