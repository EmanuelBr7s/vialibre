from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from vialibre_common.auth import TokenVerificationError, verify_token
from vialibre_common.schemas import TokenPayload, UserRole
from vialibre_common.service_auth import (
    SERVICE_TOKEN_HEADER,
    NonceStore,
    ServiceTokenError,
    verify_service_token,
)

security = HTTPBearer()

# Single per-process anti-replay store for internal service tokens. Valid while
# auth-service runs a single worker process (see report for limitations).
_nonce_store = NonceStore()


def _verify_internal_request(request: Request, token: str | None) -> str:
    """Verify an internal service token bound to this request; raise 401 otherwise."""
    try:
        return verify_service_token(
            token,
            settings.jwt_secret_key,
            request.method,
            request.url.path,
            store=_nonce_store,
        )
    except ServiceTokenError:
        # Fail closed: never fall back to JWT for a present-but-invalid token.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal service token",
        )


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


@dataclass
class Principal:
    """Caller identity: an end user (JWT) or a trusted internal service."""

    is_service: bool
    user: TokenPayload | None = None


async def get_principal(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
    x_service_token: str | None = Header(default=None, alias=SERVICE_TOKEN_HEADER),
) -> Principal:
    """
    Accepts either a valid user JWT or a valid internal service token.

    - Valid service token -> Principal(is_service=True)
    - Valid user JWT       -> Principal(is_service=False, user=<payload>)
    - Neither              -> 401

    If the ``X-Service-Token`` header is present it must be valid: an invalid
    token never falls back to JWT authentication (fail closed).
    """
    if x_service_token is not None:
        _verify_internal_request(request, x_service_token)
        return Principal(is_service=True)

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        token_payload = verify_token(
            token=credentials.credentials,
            secret_key=settings.jwt_secret_key,
            algorithm=settings.jwt_algorithm,
        )
    except TokenVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Principal(is_service=False, user=token_payload)


async def require_internal_service(
    request: Request,
    x_service_token: str | None = Header(default=None, alias=SERVICE_TOKEN_HEADER),
) -> None:
    """
    Restrict an endpoint to trusted internal services only.

    A user JWT is not sufficient here: the caller must present a valid internal
    service token bound to this exact request. Missing/invalid token -> 401.
    """
    _verify_internal_request(request, x_service_token)
