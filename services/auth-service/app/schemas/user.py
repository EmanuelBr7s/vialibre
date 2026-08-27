import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from vialibre_common.schemas import UserRole


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.SOLUCIONADOR
    phone: Optional[str] = None
    bio: Optional[str] = None
    nit_empresa: Optional[str] = None
    empresa_nombre: Optional[str] = None
    programa_academico: Optional[str] = None
    afiliacion_academica: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    nit_empresa: Optional[str] = None
    empresa_nombre: Optional[str] = None
    programa_academico: Optional[str] = None
    afiliacion_academica: Optional[str] = None


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
