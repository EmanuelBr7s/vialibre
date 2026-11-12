import uuid
from datetime import date, datetime
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, Field

# Catálogos del expediente (los mismos valores que ofrece el panel de administración).
EstadoAdministrativo = Literal["en_revision", "en_proceso", "culminada", "suspendida", "cancelada"]
ModalidadPractica = Literal["presencial", "remoto", "hibrido"]
TipoPractica = Literal["empresarial", "social", "investigacion"]
# Año de cuatro dígitos y periodo semestral: juntos se muestran como "2026-2".
AnioAcademico = Annotated[str, Field(pattern=r"^(19|20)\d{2}$")]
PeriodoAcademico = Literal["1", "2"]
DuracionHoras = Annotated[int, Field(ge=1, le=2000)]
Observaciones = Annotated[str, Field(max_length=2000)]


class PracticaCreate(BaseModel):
    """Formalizacion explicita de una practica.

    D6 (adoptado provisionalmente): la formalizacion es un acto explicito y hay
    como maximo una `Practica` por `Interaction`; aprobar una `Interaction` no
    crea una `Practica`. `interaction_id` es obligatorio. Si no se envian
    `challenge_id`/`solucionador_id`, se toman de la interaccion.

    `modalidad`, `tipo_practica` y `estado_administrativo` se validan contra
    los catalogos de este modulo; `empresa_id`/`tutor_docente_id` son
    referencias logicas opcionales sin clave foranea entre servicios (D4/D11).
    """

    interaction_id: uuid.UUID
    challenge_id: Optional[uuid.UUID] = None
    solucionador_id: Optional[uuid.UUID] = None
    empresa_id: Optional[uuid.UUID] = None
    tutor_docente_id: Optional[uuid.UUID] = None
    estado_administrativo: Optional[EstadoAdministrativo] = None
    modalidad: Optional[ModalidadPractica] = None
    tipo_practica: Optional[TipoPractica] = None
    duracion_horas: Optional[DuracionHoras] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    anio_academico: Optional[AnioAcademico] = None
    periodo_academico: Optional[PeriodoAcademico] = None
    bilingue: bool = False
    observaciones_institucionales: Optional[Observaciones] = None


class PracticaUpdate(BaseModel):
    """Actualizacion parcial del expediente de una practica.

    No permite cambiar `interaction_id` (unicidad D6) ni las referencias
    derivadas de la interaccion.
    """

    empresa_id: Optional[uuid.UUID] = None
    tutor_docente_id: Optional[uuid.UUID] = None
    estado_administrativo: Optional[EstadoAdministrativo] = None
    modalidad: Optional[ModalidadPractica] = None
    tipo_practica: Optional[TipoPractica] = None
    duracion_horas: Optional[DuracionHoras] = None
    fecha_inicio: Optional[date] = None
    fecha_fin: Optional[date] = None
    anio_academico: Optional[AnioAcademico] = None
    periodo_academico: Optional[PeriodoAcademico] = None
    bilingue: Optional[bool] = None
    observaciones_institucionales: Optional[Observaciones] = None


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
