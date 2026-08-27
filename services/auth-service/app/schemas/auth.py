from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from vialibre_common.schemas import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    """Registration request with role-specific validation."""
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole = UserRole.SOLUCIONADOR
    phone: Optional[str] = None

    # PUBLICADOR fields (organizaciones externas)
    nit_empresa: Optional[str] = None
    empresa_nombre: Optional[str] = None

    # SOLUCIONADOR fields (estudiantes)
    programa_academico: Optional[str] = None
    afiliacion_academica: Optional[str] = None

    @model_validator(mode="after")
    def validate_role_fields(self) -> "RegisterRequest":
        """Ensure role-specific fields are provided correctly."""
        if self.role == UserRole.PUBLICADOR:
            if not self.nit_empresa:
                raise ValueError(
                    "Publicadores must provide 'nit_empresa'"
                )
            if not self.empresa_nombre:
                raise ValueError(
                    "Publicadores must provide 'empresa_nombre'"
                )
        elif self.role == UserRole.SOLUCIONADOR:
            if not self.programa_academico:
                raise ValueError(
                    "Solucionadores must provide 'programa_academico'"
                )
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: UserRole
