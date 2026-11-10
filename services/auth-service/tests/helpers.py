"""Utilidades de prueba (motor NullPool + tokens JWT)."""

import uuid
from datetime import datetime, timedelta, timezone

from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from vialibre_common.schemas import UserRole

# NullPool evita reutilizar conexiones entre los distintos event loops que
# pytest-asyncio / TestClient crean por prueba.
test_engine = create_async_engine(settings.database_url, poolclass=NullPool)
TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


def make_token(role: UserRole, sub: uuid.UUID | None = None) -> str:
    """Genera un JWT valido con el rol indicado para las pruebas."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(sub or uuid.uuid4()),
        "role": role.value,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=1)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def auth_headers(role: UserRole, sub: uuid.UUID | None = None) -> dict:
    return {"Authorization": f"Bearer {make_token(role, sub)}"}
