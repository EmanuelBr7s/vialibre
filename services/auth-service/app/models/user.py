import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, LargeBinary, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import deferred, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "vialibre_auth"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role_id = Column(UUID(as_uuid=True), ForeignKey("vialibre_auth.roles.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Profile fields
    avatar_url = Column(String(512), nullable=True)
    phone = Column(String(20), nullable=True)
    bio = Column(String(500), nullable=True)

    # Externos / Empresariales
    nit_empresa = Column(String(20), nullable=True)
    empresa_nombre = Column(String(255), nullable=True)

    # Estudiantes / Academicos
    programa_academico = Column(String(255), nullable=True)
    afiliacion_academica = Column(String(255), nullable=True)  # semilleros, capítulos

    # Perfil profesional (estudiantes y egresados) visible para las empresas
    skills = Column(JSONB, nullable=True)  # habilidades técnicas
    soft_skills = Column(JSONB, nullable=True)  # habilidades blandas
    linkedin_url = Column(String(512), nullable=True)
    github_url = Column(String(512), nullable=True)
    portfolio_url = Column(String(512), nullable=True)
    ubicacion = Column(String(120), nullable=True)
    semestre = Column(String(30), nullable=True)  # estudiantes, p. ej. "8° semestre"
    anio_egreso = Column(Integer, nullable=True)  # egresados
    disponible = Column(Boolean, default=True, server_default=text("true"), nullable=False)

    # Hoja de vida en PDF. deferred: los bytes solo se cargan al descargarla.
    # ponytail: PDF en Postgres; pasar a almacenamiento de objetos si crece el volumen.
    cv_filename = Column(String(255), nullable=True)
    cv_size = Column(Integer, nullable=True)
    cv_updated_at = Column(DateTime, nullable=True)
    cv_data = deferred(Column(LargeBinary, nullable=True))

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    role = relationship("Role", back_populates="users")
