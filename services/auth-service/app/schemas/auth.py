from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from vialibre_common.schemas import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.SOLUCIONADOR
    phone: Optional[str] = None
    nit_empresa: Optional[str] = None
    empresa_nombre: Optional[str] = None
    programa_academico: Optional[str] = None
    afiliacion_academica: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: UserRole
