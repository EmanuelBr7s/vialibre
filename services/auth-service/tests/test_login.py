"""Inicio de sesion: credenciales, coste de bcrypt y actualizacion del hash."""

import asyncio
import uuid

from fastapi.testclient import TestClient
from passlib.context import CryptContext
from sqlalchemy import delete, select

from app.config import settings
from app.core.security import hash_password, needs_rehash
from app.main import app
from app.models.role import Role
from app.models.user import User
from tests.helpers import TestSession
from vialibre_common.schemas import UserRole

client = TestClient(app)

LOGIN_URL = "/api/v1/auth/login"
PASSWORD = "Secreta1234"


def _crear_usuario(password_hash: str) -> tuple[uuid.UUID, str]:
    email = f"login-{uuid.uuid4().hex[:10]}@example.com"

    async def _run() -> uuid.UUID:
        async with TestSession() as db:
            role = (
                await db.execute(select(Role).where(Role.name == UserRole.SOLUCIONADOR.value))
            ).scalar_one()
            user = User(
                email=email, password_hash=password_hash, full_name="Usuario de prueba", role_id=role.id
            )
            db.add(user)
            await db.commit()
            return user.id

    return asyncio.run(_run()), email


def _hash_guardado(user_id: uuid.UUID) -> str:
    async def _run() -> str:
        async with TestSession() as db:
            return (
                await db.execute(select(User.password_hash).where(User.id == user_id))
            ).scalar_one()

    return asyncio.run(_run())


def _borrar(user_id: uuid.UUID) -> None:
    async def _run() -> None:
        async with TestSession() as db:
            await db.execute(delete(User).where(User.id == user_id))
            await db.commit()

    asyncio.run(_run())


def test_hash_usa_el_coste_configurado():
    hashed = hash_password(PASSWORD)
    assert hashed.split("$")[2] == f"{settings.bcrypt_rounds:02d}"
    assert not needs_rehash(hashed)


def test_login_correcto_devuelve_token():
    user_id, email = _crear_usuario(hash_password(PASSWORD))
    try:
        response = client.post(LOGIN_URL, json={"email": email, "password": PASSWORD})
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["user_id"] == str(user_id)
        assert body["role"] == UserRole.SOLUCIONADOR.value
        assert body["access_token"]
    finally:
        _borrar(user_id)


def test_login_con_clave_incorrecta_o_usuario_desconocido_devuelve_401():
    user_id, email = _crear_usuario(hash_password(PASSWORD))
    try:
        assert client.post(LOGIN_URL, json={"email": email, "password": "otra-clave"}).status_code == 401
        desconocido = {"email": f"nadie-{uuid.uuid4().hex[:8]}@example.com", "password": PASSWORD}
        assert client.post(LOGIN_URL, json=desconocido).status_code == 401
        # Una clave incorrecta nunca reescribe el hash guardado.
        assert _hash_guardado(user_id).split("$")[2] == f"{settings.bcrypt_rounds:02d}"
    finally:
        _borrar(user_id)


def test_login_actualiza_un_hash_creado_con_otro_coste():
    otro_coste = 12 if settings.bcrypt_rounds != 12 else 11
    antiguo = CryptContext(schemes=["bcrypt"], bcrypt__rounds=otro_coste).hash(PASSWORD)
    assert needs_rehash(antiguo)
    user_id, email = _crear_usuario(antiguo)
    try:
        response = client.post(LOGIN_URL, json={"email": email, "password": PASSWORD})
        assert response.status_code == 200, response.text
        guardado = _hash_guardado(user_id)
        assert guardado != antiguo
        assert guardado.split("$")[2] == f"{settings.bcrypt_rounds:02d}"
        # La misma clave sigue funcionando con el hash nuevo.
        assert client.post(LOGIN_URL, json={"email": email, "password": PASSWORD}).status_code == 200
    finally:
        _borrar(user_id)
