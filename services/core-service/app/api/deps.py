from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from vialibre_common.auth import TokenVerificationError, verify_token
from vialibre_common.schemas import TokenPayload, UserRole

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenPayload:
    """Dependency to extract and verify the current user from JWT."""
    try:
        token_payload = verify_token(
            token=credentials.credentials,
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )
        return token_payload
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
        current_user: TokenPayload = Depends(get_current_user),
    ) -> TokenPayload:
        if current_user.role.value not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos suficientes para esta operación",
            )
        return current_user

    return _checker
