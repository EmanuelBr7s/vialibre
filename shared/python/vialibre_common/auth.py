"""Shared JWT authentication utilities for VíaLibre microservices."""

import uuid
from datetime import datetime, timezone

from jose import JWTError, jwt
from pydantic import BaseModel

from vialibre_common.schemas import TokenPayload, UserRole


class TokenVerificationError(Exception):
    """Raised when JWT token verification fails."""
    pass


def verify_token(
    token: str,
    secret_key: str,
    algorithm: str = "HS256",
) -> TokenPayload:
    """
    Verify and decode a JWT token.

    Args:
        token: The JWT token string.
        secret_key: The secret key used to sign the token.
        algorithm: The signing algorithm (default: HS256).

    Returns:
        TokenPayload with decoded claims.

    Raises:
        TokenVerificationError: If token is invalid or expired.
    """
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])

        sub = payload.get("sub")
        if sub is None:
            raise TokenVerificationError("Token missing 'sub' claim")

        exp = payload.get("exp")
        if exp is None:
            raise TokenVerificationError("Token missing 'exp' claim")

        iat = payload.get("iat", 0)
        role_str = payload.get("role")

        if role_str is None:
            raise TokenVerificationError("Token missing 'role' claim")

        try:
            role = UserRole(role_str)
        except ValueError:
            raise TokenVerificationError(f"Invalid role: {role_str}")

        return TokenPayload(
            sub=sub,
            exp=exp,
            iat=iat,
            role=role,
        )

    except JWTError as e:
        raise TokenVerificationError(f"Invalid token: {str(e)}")
