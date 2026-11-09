"""Shared Pydantic schemas and enums for VíaLibre microservices."""

import uuid
import enum
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


# ── Enums ──
# Fuente unica de los valores fijos del dominio. StrEnum: el miembro se compara
# y serializa como su valor ("reto" == ChallengeTipo.RETO).

class UserRole(enum.StrEnum):
    PUBLICADOR = "publicador"
    SOLUCIONADOR = "solucionador"  # estudiante
    EGRESADO = "egresado"
    ADMIN = "admin"


# Roles que buscan oportunidades (practica, empleo, retos) y se postulan.
TALENT_ROLES = (UserRole.SOLUCIONADOR, UserRole.EGRESADO)


class ChallengeTipo(enum.StrEnum):
    """Modulo de la publicacion: reto (laboratorio de innovacion), practica o empleo."""
    RETO = "reto"
    PRACTICA = "practica"
    EMPLEO = "empleo"


class Modalidad(enum.StrEnum):
    PRESENCIAL = "presencial"
    REMOTO = "remoto"
    HIBRIDO = "hibrido"


class ChallengeStatus(enum.StrEnum):
    ABIERTO = "abierto"
    EN_PROGRESO = "en_progreso"
    CERRADO = "cerrado"


class DifficultyLevel(enum.StrEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InteractionStatus(enum.StrEnum):
    PENDIENTE = "pendiente"
    APROBADO = "aprobado"
    RECHAZADO = "rechazado"


class ReactionType(enum.StrEnum):
    LIKE = "like"
    BOOKMARK = "bookmark"


class DocumentoTipo(enum.StrEnum):
    """Documentos requisito que carga el estudiante seleccionado para una practica."""
    DOCUMENTO_IDENTIDAD = "documento_identidad"
    CERTIFICADO_MATRICULA = "certificado_matricula"
    AFILIACION_EPS = "afiliacion_eps"

    @property
    def label(self) -> str:
        return _DOCUMENTO_LABELS[self]


_DOCUMENTO_LABELS = {
    DocumentoTipo.DOCUMENTO_IDENTIDAD: "Documento de identidad",
    DocumentoTipo.CERTIFICADO_MATRICULA: "Certificado de matrícula vigente",
    DocumentoTipo.AFILIACION_EPS: "Certificado de afiliación a EPS",
}


# ── Campos de perfil y publicacion con opciones fijas ──
# El valor es el mismo texto que se muestra y se guarda: los datos existentes,
# la carta de aval y los filtros siguen funcionando sin migracion.

class ProgramaAcademico(enum.StrEnum):
    INGENIERIA_SISTEMAS = "Ingeniería de Sistemas"
    INGENIERIA_INDUSTRIAL = "Ingeniería Industrial"
    INGENIERIA_AMBIENTAL = "Ingeniería Ambiental"
    CONTADURIA_PUBLICA = "Contaduría Pública"
    DERECHO = "Derecho"
    ADMINISTRACION_EMPRESAS = "Administración de Empresas"
    OTRO = "Otro"


class AfiliacionAcademica(enum.StrEnum):
    """Semilleros, ramas y consultorios de la universidad."""
    LABORATORIO_INNOVACION = "Laboratorio de Innovación"
    RAMA_IEEE = "Rama Estudiantil IEEE"
    CONSULTORIO_JURIDICO = "Consultorio Jurídico"
    SEMILLERO_FINANZAS = "Semillero de Finanzas Sostenibles"
    OTRO = "Otro"


class Semestre(enum.StrEnum):
    PRIMERO = "1° semestre"
    SEGUNDO = "2° semestre"
    TERCERO = "3° semestre"
    CUARTO = "4° semestre"
    QUINTO = "5° semestre"
    SEXTO = "6° semestre"
    SEPTIMO = "7° semestre"
    OCTAVO = "8° semestre"
    NOVENO = "9° semestre"
    DECIMO = "10° semestre"


class Ubicacion(enum.StrEnum):
    """Municipios del Atlantico."""
    BARRANQUILLA = "Barranquilla, Atlántico"
    BARANOA = "Baranoa, Atlántico"
    CAMPO_DE_LA_CRUZ = "Campo de la Cruz, Atlántico"
    CANDELARIA = "Candelaria, Atlántico"
    GALAPA = "Galapa, Atlántico"
    JUAN_DE_ACOSTA = "Juan de Acosta, Atlántico"
    LURUACO = "Luruaco, Atlántico"
    MALAMBO = "Malambo, Atlántico"
    MANATI = "Manatí, Atlántico"
    PALMAR_DE_VARELA = "Palmar de Varela, Atlántico"
    PIOJO = "Piojó, Atlántico"
    POLONUEVO = "Polonuevo, Atlántico"
    PONEDERA = "Ponedera, Atlántico"
    PUERTO_COLOMBIA = "Puerto Colombia, Atlántico"
    REPELON = "Repelón, Atlántico"
    SABANAGRANDE = "Sabanagrande, Atlántico"
    SABANALARGA = "Sabanalarga, Atlántico"
    SANTA_LUCIA = "Santa Lucía, Atlántico"
    SANTO_TOMAS = "Santo Tomás, Atlántico"
    SOLEDAD = "Soledad, Atlántico"
    SUAN = "Suan, Atlántico"
    TUBARA = "Tubará, Atlántico"
    USIACURI = "Usiacurí, Atlántico"
    OTRA_CIUDAD = "Otra ciudad"


def enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    """Para SQLAlchemy Enum(values_callable=...): guarda el valor, no el nombre."""
    return [member.value for member in enum_cls]


# ── Auth Schemas ──

class TokenPayload(BaseModel):
    sub: str
    exp: int
    iat: int
    role: UserRole


# ── User Schemas (shared across services) ──

class UserBase(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    avatar_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserPublic(BaseModel):
    """Limited user info for cross-service references."""
    id: uuid.UUID
    full_name: str
    role: UserRole
    avatar_url: str | None = None
