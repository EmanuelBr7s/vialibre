"""Pruebas de endpoints de Empresa (Etapa 3.3).

Cubren autenticacion, autorizacion (solo admin), validacion, errores,
persistencia real y la validacion cruzada de publicador_user_id contra
auth-service (sin clave foranea entre servicios).
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

BASE = "/api/v1/core/empresas"


def _fetch_one_user_id():
    async def _run():
        async with test_engine.connect() as conn:
            result = await conn.execute(text("SELECT id FROM vialibre_auth.users LIMIT 1"))
            row = result.first()
            return row[0] if row else None

    return asyncio.run(_run())


def _delete_empresa(empresa_id: str):
    async def _run():
        async with test_engine.begin() as conn:
            await conn.execute(
                text("DELETE FROM vialibre_core.empresas WHERE id = :id"),
                {"id": empresa_id},
            )

    asyncio.run(_run())


def test_list_requires_auth():
    assert client.get(BASE).status_code == 401


def test_create_requires_auth():
    assert client.post(BASE, json={"razon_social": "X"}).status_code == 401


def test_non_admin_is_forbidden():
    headers = auth_headers(UserRole.PUBLICADOR)
    assert client.get(BASE, headers=headers).status_code == 403
    assert client.post(BASE, json={"razon_social": "X"}, headers=headers).status_code == 403


def test_create_and_persist_empresa():
    headers = auth_headers(UserRole.ADMIN)
    payload = {
        "nit": "900123456-7",
        "razon_social": "Artesanias Llamas SAS",
        "sector": "Manufactura",
        "contacto_email": "contacto@artesaniasllamas.com",
    }
    create = client.post(BASE, json=payload, headers=headers)
    assert create.status_code == 201, create.text
    empresa_id = create.json()["id"]
    try:
        assert create.json()["razon_social"] == "Artesanias Llamas SAS"
        assert create.json()["activa"] is True

        fetched = client.get(f"{BASE}/{empresa_id}", headers=headers)
        assert fetched.status_code == 200
        assert fetched.json()["nit"] == "900123456-7"
    finally:
        _delete_empresa(empresa_id)


def test_list_includes_created_empresa():
    headers = auth_headers(UserRole.ADMIN)
    create = client.post(BASE, json={"razon_social": "Empresa Listado"}, headers=headers)
    empresa_id = create.json()["id"]
    try:
        listing = client.get(BASE, headers=headers, params={"limit": 100})
        assert listing.status_code == 200
        body = listing.json()
        assert empresa_id in {e["id"] for e in body["empresas"]}
    finally:
        _delete_empresa(empresa_id)


def test_update_empresa():
    headers = auth_headers(UserRole.ADMIN)
    create = client.post(BASE, json={"razon_social": "Actualizable"}, headers=headers)
    empresa_id = create.json()["id"]
    try:
        update = client.patch(
            f"{BASE}/{empresa_id}", json={"activa": False}, headers=headers
        )
        assert update.status_code == 200
        assert update.json()["activa"] is False
    finally:
        _delete_empresa(empresa_id)


def test_update_missing_empresa_returns_404():
    headers = auth_headers(UserRole.ADMIN)
    response = client.patch(
        f"{BASE}/{uuid.uuid4()}", json={"sector": "X"}, headers=headers
    )
    assert response.status_code == 404


def test_unknown_publicador_reference_is_rejected():
    headers = auth_headers(UserRole.ADMIN)
    response = client.post(
        BASE,
        json={"razon_social": "Ref", "publicador_user_id": str(uuid.uuid4())},
        headers=headers,
    )
    assert response.status_code == 400


def test_valid_publicador_reference_is_accepted():
    user_id = _fetch_one_user_id()
    if user_id is None:
        pytest.skip("No hay usuarios en la base de datos para validar la referencia")

    headers = auth_headers(UserRole.ADMIN)
    create = client.post(
        BASE,
        json={"razon_social": "Con publicador", "publicador_user_id": str(user_id)},
        headers=headers,
    )
    assert create.status_code == 201, create.text
    empresa_id = create.json()["id"]
    try:
        assert create.json()["publicador_user_id"] == str(user_id)
    finally:
        _delete_empresa(empresa_id)
