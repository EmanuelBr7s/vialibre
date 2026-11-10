import uuid
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class PracticaCreate(BaseModel):
    """Formalizacion explicita de una practica.

    D6 (adoptado provisionalmente): la formalizacion es un acto explicito y hay
    como maximo una `Practica` por `Interaction`; aprobar una `Interaction` no
    crea una `Practica`. `interaction_id` es obligatorio. Si no se envian
    `challenge_id`/`solucionador_id`, se toman de la interaccion.

    D1/D3/D4/D11 siguen pendientes: `modalidad`, `tipo_practica` y
    `estado_administrativo` se aceptan como texto libre (sin catalogo), y
    `empresa_id`/`tutor_docente_id` son referencias logicas opcionales sin
    clave foranea entre servicios.
    """

    interaction_id: uuid.UUID
    challenge_id: Optional[uuid.UUID] = None
    solucionador_id: Optional[uuid.UUID] = None
    empresa_id: Optional[uuid.UUID] = None
    tutor_docente_id: Optional[uuid.UUID] = None
    estado_administrativo: Optional[str] = Field(None, max_length=30)
    modalidad: Optional[str] = Field(None, max_length=20)
    tipo_practica: Optional[str] = Field(None, max_length=30)
    duracion_horas: Optional[int] = Field(None, ge=0)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    anio_academico: Optional[str] = Field(None, max_length=10)
    periodo_academico: Optional[str] = Field(None, max_length=10)
    bilingue: bool = False
    observaciones_institucionales: Optional[str] = None


class PracticaUpdate(BaseModel):
    """Actualizacion parcial del expediente de una practica.

    No permite cambiar `interaction_id` (unicidad D6) ni las referencias
    derivadas de la interaccion.
    """

    empresa_id: Optional[uuid.UUID] = None
    tutor_docente_id: Optional[uuid.UUID] = None
    estado_administrativo: Optional[str] = Field(None, max_length=30)
    modalidad: Optional[str] = Field(None, max_length=20)
    tipo_practica: Optional[str] = Field(None, max_length=30)
    duracion_horas: Optional[int] = Field(None, ge=0)
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    anio_academico: Optional[str] = Field(None, max_length=10)
    periodo_academico: Optional[str] = Field(None, max_length=10)
    bilingue: Optional[bool] = None
    observaciones_institucionales: Optional[str] = None


class PracticaResponse(BaseModel):
    id: uuid.UUID
    challenge_id: Optional[uuid.UUID] = None
    interaction_id: Optional[uuid.UUID] = None
    solucionador_id: Optional[uuid.UUID] = None
    empresa_id: Optional[uuid.UUID] = None
    tutor_docente_id: Optional[uuid.UUID] = None
    created_by: Optional[uuid.UUID] = None
    estado_administrativo: Optional[str] = None
    modalidad: Optional[str] = None
    tipo_practica: Optional[str] = None
    duracion_horas: Optional[int] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    anio_academico: Optional[str] = None
    periodo_academico: Optional[str] = None
    bilingue: bool
    observaciones_institucionales: Optional[str] = None
    fecha_formalizacion: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PracticaListResponse(BaseModel):
    practicas: list[PracticaResponse]
    total: int
    skip: int
    limit: int
