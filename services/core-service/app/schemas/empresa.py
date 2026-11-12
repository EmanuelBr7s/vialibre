import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class EmpresaCreate(BaseModel):
    """Datos para registrar una empresa institucional.

    D4 y D11 siguen pendientes: `nit` no se impone unico y `razon_social` es
    opcional. `publicador_user_id` es una referencia logica a `User`
    (auth-service) validada por aplicacion, sin clave foranea entre servicios.
    """

    nit: Optional[str] = Field(None, max_length=20)
    razon_social: Optional[str] = Field(None, max_length=255)
    sector: Optional[str] = Field(None, max_length=100)
    representante_legal: Optional[str] = Field(None, max_length=255)
    contacto_email: Optional[str] = Field(None, max_length=255)
    contacto_telefono: Optional[str] = Field(None, max_length=50)
    publicador_user_id: Optional[uuid.UUID] = None
    activa: bool = True


class EmpresaUpdate(BaseModel):
    """Actualizacion parcial de una empresa."""

    nit: Optional[str] = Field(None, max_length=20)
    razon_social: Optional[str] = Field(None, max_length=255)
    sector: Optional[str] = Field(None, max_length=100)
    representante_legal: Optional[str] = Field(None, max_length=255)
    contacto_email: Optional[str] = Field(None, max_length=255)
    contacto_telefono: Optional[str] = Field(None, max_length=50)
    publicador_user_id: Optional[uuid.UUID] = None
    activa: Optional[bool] = None


class EmpresaResponse(BaseModel):
    id: uuid.UUID
    nit: Optional[str] = None
    razon_social: Optional[str] = None
    sector: Optional[str] = None
    representante_legal: Optional[str] = None
    contacto_email: Optional[str] = None
    contacto_telefono: Optional[str] = None
    publicador_user_id: Optional[uuid.UUID] = None
    activa: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EmpresaListResponse(BaseModel):
    empresas: list[EmpresaResponse]
    total: int
    skip: int
    limit: int
