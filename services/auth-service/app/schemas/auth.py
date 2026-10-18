from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator

from vialibre_common.schemas import UserRole

# Roles that a person may self-assign through the public registration flow.
# Privileged roles (admin) can never be requested by the client.
PUBLIC_REGISTER_ROLES = (
    UserRole.SOLUCIONADOR,
    UserRole.EGRESADO,
    UserRole.PUBLICADOR,
)


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
        if self.role not in PUBLIC_REGISTER_ROLES:
            raise ValueError(
                "El registro público solo admite los roles: "
                + ", ".join(r.value for r in PUBLIC_REGISTER_ROLES)
            )
        if self.role == UserRole.PUBLICADOR:
            if not self.nit_empresa:
                raise ValueError(
                    "Publicadores must provide 'nit_empresa'"
                )
            if not self.empresa_nombre:
                raise ValueError(
                    "Publicadores must provide 'empresa_nombre'"
                )
        elif self.role in (UserRole.SOLUCIONADOR, UserRole.EGRESADO):
            if not self.programa_academico:
                raise ValueError(
                    "Estudiantes y egresados deben indicar 'programa_academico'"
                )
        return self


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    role: UserRole
