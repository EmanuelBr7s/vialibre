import uuid
from datetime import datetime
from typing import Optional

from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, StringConstraints, model_validator

from vialibre_common.schemas import (
    AfiliacionAcademica,
    ProgramaAcademico,
    Semestre,
    Ubicacion,
    UserRole,
)


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.SOLUCIONADOR
    phone: Optional[str] = None
    bio: Optional[str] = None
    nit_empresa: Optional[str] = None
    empresa_nombre: Optional[str] = None
    programa_academico: Optional[ProgramaAcademico] = None
    afiliacion_academica: Optional[AfiliacionAcademica] = None


SkillList = Annotated[
    list[Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]],
    Field(max_length=30),
]
Url = Annotated[str, StringConstraints(strip_whitespace=True, max_length=512)]


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    nit_empresa: Optional[str] = None
    empresa_nombre: Optional[str] = None
    programa_academico: Optional[ProgramaAcademico] = None
    afiliacion_academica: Optional[AfiliacionAcademica] = None
    skills: Optional[SkillList] = None
    soft_skills: Optional[SkillList] = None
    linkedin_url: Optional[Url] = None
    github_url: Optional[Url] = None
    portfolio_url: Optional[Url] = None
    ubicacion: Optional[Ubicacion] = None
    semestre: Optional[Semestre] = None
    anio_egreso: Optional[int] = Field(None, ge=1960, le=2100)
    disponible: Optional[bool] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None
    nit_empresa: Optional[str] = None
    empresa_nombre: Optional[str] = None
    programa_academico: Optional[str] = None
    afiliacion_academica: Optional[str] = None
    skills: list[str] = []
    soft_skills: list[str] = []
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    ubicacion: Optional[str] = None
    semestre: Optional[str] = None
    anio_egreso: Optional[int] = None
    disponible: bool = True
    cv_filename: Optional[str] = None
    cv_size: Optional[int] = None
    cv_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def extract_role_name(cls, data):
        """Extract role name from ORM Role object."""
        if hasattr(data, "role") and hasattr(data.role, "name"):
            # Create a copy-like approach: set role to the name string
            # Pydantic will handle this when from_attributes=True
            pass
        return data

    @classmethod
    def from_orm_model(cls, obj):
        """Custom factory to handle Role ORM relationship."""
        data = {}
        for field_name in cls.model_fields:
            if field_name == "role":
                data["role"] = obj.role.name if hasattr(obj.role, "name") else obj.role
            else:
                data[field_name] = getattr(obj, field_name)
        return cls(**data)


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    skip: int
    limit: int
