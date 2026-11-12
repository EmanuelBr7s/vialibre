"""Pruebas de endpoints de Practica (Etapa 3.3).

Cubren autenticacion, autorizacion (solo admin), validacion, errores,
persistencia real, la formalizacion explicita (D6) y la unicidad 1:1 con la
interaccion (HTTP 409), ademas de la validacion cruzada opcional.
"""

import asyncio
import uuid
from datetime import date

from fastapi.testclient import TestClient

from app.main import app
from app.models.interaction import Interaction
from app.models.practica import Practica
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

BASE = "/api/v1/match/practicas"

ADMIN_ID = uuid.uuid4()


def _create_interaction() -> dict:
    async def _run():
        async with TestSession() as session:
            interaction = Interaction(
                solucionador_id=uuid.uuid4(),
                challenge_id=uuid.uuid4(),
            )
            session.add(interaction)
            await session.commit()
            return {
                "id": str(interaction.id),
                "challenge_id": str(interaction.challenge_id),
                "solucionador_id": str(interaction.solucionador_id),
            }

    return asyncio.run(_run())


def _cleanup(practica_ids=None, interaction_ids=None):
    async def _run():
        async with TestSession() as session:
            for pid in practica_ids or []:
                obj = await session.get(Practica, uuid.UUID(pid))
                if obj is not None:
                    await session.delete(obj)
            for iid in interaction_ids or []:
                obj = await session.get(Interaction, uuid.UUID(iid))
                if obj is not None:
                    await session.delete(obj)
            await session.commit()

    asyncio.run(_run())


def test_list_requires_auth():
    assert client.get(BASE).status_code == 401


def test_create_requires_auth():
    assert client.post(BASE, json={"interaction_id": str(uuid.uuid4())}).status_code == 401


def test_non_admin_is_forbidden():
    headers = auth_headers(UserRole.PUBLICADOR)
    assert client.get(BASE, headers=headers).status_code == 403
    assert (
        client.post(BASE, json={"interaction_id": str(uuid.uuid4())}, headers=headers).status_code
        == 403
    )


def test_create_unknown_interaction_returns_404():
    headers = auth_headers(UserRole.ADMIN)
    response = client.post(
        BASE, json={"interaction_id": str(uuid.uuid4())}, headers=headers
    )
    assert response.status_code == 404


def test_create_and_persist_practica_with_derived_refs():
    interaction = _create_interaction()
    headers = auth_headers(UserRole.ADMIN, sub=ADMIN_ID)
    create = client.post(
        BASE,
        json={"interaction_id": interaction["id"]},
        headers=headers,
    )
    assert create.status_code == 201, create.text
    body = create.json()
    try:
        # Formalizacion explicita y trazabilidad
        assert body["fecha_formalizacion"] is not None
        assert body["created_by"] == str(ADMIN_ID)
        # Referencias derivadas de la interaccion
        assert body["challenge_id"] == interaction["challenge_id"]
        assert body["solucionador_id"] == interaction["solucionador_id"]
        assert body["bilingue"] is False

        fetched = client.get(f"{BASE}/{body['id']}", headers=headers)
        assert fetched.status_code == 200
    finally:
        _cleanup([body["id"]], [interaction["id"]])


def test_duplicate_practica_returns_409():
    interaction = _create_interaction()
    headers = auth_headers(UserRole.ADMIN)
    first = client.post(BASE, json={"interaction_id": interaction["id"]}, headers=headers)
    assert first.status_code == 201
    try:
        second = client.post(
            BASE, json={"interaction_id": interaction["id"]}, headers=headers
        )
        assert second.status_code == 409
    finally:
        _cleanup([first.json()["id"]], [interaction["id"]])


def test_fecha_fin_before_inicio_is_rejected():
    interaction = _create_interaction()
    headers = auth_headers(UserRole.ADMIN)
    try:
        response = client.post(
            BASE,
            json={
                "interaction_id": interaction["id"],
                "fecha_inicio": date(2026, 6, 1).isoformat(),
                "fecha_fin": date(2026, 1, 1).isoformat(),
            },
            headers=headers,
        )
        assert response.status_code == 422
    finally:
        _cleanup(None, [interaction["id"]])


def test_invalid_challenge_reference_is_rejected():
    interaction = _create_interaction()
    headers = auth_headers(UserRole.ADMIN)
    try:
        response = client.post(
            BASE,
            json={
                "interaction_id": interaction["id"],
                "challenge_id": str(uuid.uuid4()),
            },
            headers=headers,
        )
        assert response.status_code == 400
    finally:
        _cleanup(None, [interaction["id"]])


def test_invalid_solucionador_reference_is_rejected():
    interaction = _create_interaction()
    headers = auth_headers(UserRole.ADMIN)
    try:
        response = client.post(
            BASE,
            json={
                "interaction_id": interaction["id"],
                "solucionador_id": str(uuid.uuid4()),
            },
            headers=headers,
        )
        assert response.status_code == 400
    finally:
        _cleanup(None, [interaction["id"]])


def test_list_and_update_practica():
    interaction = _create_interaction()
    headers = auth_headers(UserRole.ADMIN)
    create = client.post(BASE, json={"interaction_id": interaction["id"]}, headers=headers)
    practica_id = create.json()["id"]
    try:
        listing = client.get(BASE, headers=headers, params={"limit": 100})
        assert listing.status_code == 200
        assert practica_id in {p["id"] for p in listing.json()["practicas"]}

        update = client.patch(
            f"{BASE}/{practica_id}",
            json={"estado_administrativo": "en_revision"},
            headers=headers,
        )
        assert update.status_code == 200
        assert update.json()["estado_administrativo"] == "en_revision"
    finally:
        _cleanup([practica_id], [interaction["id"]])


def test_update_missing_practica_returns_404():
    headers = auth_headers(UserRole.ADMIN)
    response = client.patch(
        f"{BASE}/{uuid.uuid4()}", json={"estado_administrativo": "x"}, headers=headers
    )
    assert response.status_code == 404
