from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from vialibre_common.auth import TokenVerificationError, verify_token
from vialibre_common.schemas import TokenPayload, UserRole

security = HTTPBearer()


@dataclass
class AuthContext:
    payload: TokenPayload
    token: str


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthContext:
    """Dependency to extract and verify the current user from JWT."""
    try:
        token_payload = verify_token(
            token=credentials.credentials,
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )
        return AuthContext(payload=token_payload, token=credentials.credentials)
    except TokenVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )


def require_role(*roles: UserRole):
    """
    Dependency factory that requires the authenticated user to hold one of
    the given roles. Denies by default: insufficient role -> 403.
    """
    allowed = {r.value for r in roles}

    async def _checker(
        auth: AuthContext = Depends(get_current_user),
    ) -> AuthContext:
        if auth.payload.role.value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos suficientes para esta operación",
            )
        return auth

    return _checker
