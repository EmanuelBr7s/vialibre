import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class TutorDocenteCreate(BaseModel):
    """Datos para registrar un tutor docente.

    D3 y D11 siguen pendientes: `user_id` es una referencia logica opcional
    (UUID) y no se impone ninguna regla institucional de unicidad.
    """

    identificacion: Optional[str] = Field(None, max_length=20)
    nombres: Optional[str] = Field(None, max_length=255)
    apellidos: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=50)
    programa_academico: Optional[str] = Field(None, max_length=255)
    user_id: Optional[uuid.UUID] = None
    activo: bool = True


class TutorDocenteUpdate(BaseModel):
    """Actualizacion parcial de un tutor docente."""

    identificacion: Optional[str] = Field(None, max_length=20)
    nombres: Optional[str] = Field(None, max_length=255)
    apellidos: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    telefono: Optional[str] = Field(None, max_length=50)
    programa_academico: Optional[str] = Field(None, max_length=255)
    user_id: Optional[uuid.UUID] = None
    activo: Optional[bool] = None


class TutorDocenteResponse(BaseModel):
    id: uuid.UUID
    identificacion: Optional[str] = None
    nombres: Optional[str] = None
    apellidos: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    programa_academico: Optional[str] = None
    user_id: Optional[uuid.UUID] = None
    activo: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TutorDocenteListResponse(BaseModel):
    tutores: list[TutorDocenteResponse]
    total: int
    skip: int
    limit: int
