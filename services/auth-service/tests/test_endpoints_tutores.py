"""Pruebas de endpoints de TutorDocente (Etapa 3.3).

Cubren autenticacion, autorizacion (solo admin), validacion, errores,
persistencia real y las referencias a User.
"""

import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.main import app
from tests.helpers import auth_headers, test_engine
from vialibre_common.schemas import UserRole

client = TestClient(app)

BASE = "/api/v1/auth/tutores-docentes"


def _fetch_one_user_id():
    async def _run():
        async with test_engine.connect() as conn:
            result = await conn.execute(text("SELECT id FROM vialibre_auth.users LIMIT 1"))
            row = result.first()
            return row[0] if row else None

    return asyncio.run(_run())


def _delete_tutor(tutor_id: str):
    async def _run():
        async with test_engine.begin() as conn:
            await conn.execute(
                text("DELETE FROM vialibre_auth.tutores_docentes WHERE id = :id"),
                {"id": tutor_id},
            )

    asyncio.run(_run())


def test_list_requires_auth():
    response = client.get(BASE)
    assert response.status_code == 401


def test_create_requires_auth():
    response = client.post(BASE, json={"nombres": "Ana"})
    assert response.status_code == 401


def test_non_admin_is_forbidden():
    headers = auth_headers(UserRole.PUBLICADOR)
    assert client.get(BASE, headers=headers).status_code == 403
    assert client.post(BASE, json={"nombres": "Ana"}, headers=headers).status_code == 403


def test_create_and_persist_tutor():
    headers = auth_headers(UserRole.ADMIN)
    payload = {
        "identificacion": "12345678",
        "nombres": "Maria",
        "apellidos": "Gomez",
        "email": "maria.gomez@vialibre.edu.co",
        "programa_academico": "Ingenieria de Sistemas",
    }
    create = client.post(BASE, json=payload, headers=headers)
    assert create.status_code == 201, create.text
    created = create.json()
    tutor_id = created["id"]
    try:
        assert created["nombres"] == "Maria"
        assert created["activo"] is True

        fetched = client.get(f"{BASE}/{tutor_id}", headers=headers)
        assert fetched.status_code == 200
        assert fetched.json()["email"] == "maria.gomez@vialibre.edu.co"
    finally:
        _delete_tutor(tutor_id)


def test_list_includes_created_tutor():
    headers = auth_headers(UserRole.ADMIN)
    create = client.post(BASE, json={"nombres": "Listado"}, headers=headers)
    assert create.status_code == 201
    tutor_id = create.json()["id"]
    try:
        listing = client.get(BASE, headers=headers, params={"limit": 100})
        assert listing.status_code == 200
        body = listing.json()
        assert body["total"] >= 1
        assert tutor_id in {t["id"] for t in body["tutores"]}
    finally:
        _delete_tutor(tutor_id)


def test_update_tutor():
    headers = auth_headers(UserRole.ADMIN)
    create = client.post(BASE, json={"nombres": "Pedro"}, headers=headers)
    tutor_id = create.json()["id"]
    try:
        update = client.patch(
            f"{BASE}/{tutor_id}", json={"apellidos": "Ramirez"}, headers=headers
        )
        assert update.status_code == 200
        assert update.json()["apellidos"] == "Ramirez"
    finally:
        _delete_tutor(tutor_id)


def test_update_missing_tutor_returns_404():
    headers = auth_headers(UserRole.ADMIN)
    response = client.patch(
        f"{BASE}/{uuid.uuid4()}", json={"nombres": "X"}, headers=headers
    )
    assert response.status_code == 404


def test_invalid_email_is_rejected():
    headers = auth_headers(UserRole.ADMIN)
    response = client.post(BASE, json={"email": "no-es-email"}, headers=headers)
    assert response.status_code == 422


def test_unknown_user_reference_is_rejected():
    headers = auth_headers(UserRole.ADMIN)
    response = client.post(
        BASE, json={"nombres": "Ref", "user_id": str(uuid.uuid4())}, headers=headers
    )
    assert response.status_code == 400


def test_valid_user_reference_is_accepted():
    user_id = _fetch_one_user_id()
    if user_id is None:
        pytest.skip("No hay usuarios en la base de datos para validar la referencia")

    headers = auth_headers(UserRole.ADMIN)
    create = client.post(
        BASE, json={"nombres": "Con User", "user_id": str(user_id)}, headers=headers
    )
    assert create.status_code == 201, create.text
    tutor_id = create.json()["id"]
    try:
        assert create.json()["user_id"] == str(user_id)
    finally:
        _delete_tutor(tutor_id)
