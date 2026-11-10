"""Pruebas de regresion del bloque B3-B.5: filtro `status` de mis postulaciones.

`list_my_interactions` declaraba `status` como cadena libre y lo comparaba con
una columna Enum de SQLAlchemy: un valor invalido producia HTTP 500. Ahora el
parametro usa el enum local `InteractionStatus`, de modo que un valor invalido
produce 422 y los valores validos conservan su comportamiento (filtrar sin
alterar autorizacion, paginacion ni el resto de la respuesta).
"""

import asyncio
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.interaction import Interaction, InteractionStatus
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

BASE = "/api/v1/match/interactions"

STATUS_INVALIDOS = ["no_existente", "PENDIENTE", "en-progreso", "", "0"]


def _create_interaction(
    solucionador_id: uuid.UUID, status: InteractionStatus = InteractionStatus.PENDIENTE
) -> str:
    async def _run():
        async with TestSession() as session:
            interaction = Interaction(
                solucionador_id=solucionador_id,
                challenge_id=uuid.uuid4(),
                status=status,
            )
            session.add(interaction)
            await session.commit()
            return str(interaction.id)

    return asyncio.run(_run())


def _cleanup(interaction_ids) -> None:
    async def _run():
        async with TestSession() as session:
            for iid in interaction_ids:
                obj = await session.get(Interaction, uuid.UUID(iid))
                if obj is not None:
                    await session.delete(obj)
            await session.commit()

    asyncio.run(_run())


# ── Valores invalidos: 422 (antes: 500) ──


@pytest.mark.parametrize("valor", STATUS_INVALIDOS)
def test_status_invalido_devuelve_422(valor):
    headers = auth_headers(UserRole.SOLUCIONADOR)
    response = client.get(BASE, params={"status": valor}, headers=headers)
    assert response.status_code == 422, response.text


def test_422_no_filtra_detalles_internos():
    headers = auth_headers(UserRole.SOLUCIONADOR)
    response = client.get(BASE, params={"status": "no_existente"}, headers=headers)
    assert response.status_code == 422
    texto = response.text.lower()
    for fuga in ("traceback", "sqlalchemy", "lookuperror", "psycopg", "select "):
        assert fuga not in texto, f"fuga interna en la respuesta: {fuga}"


def test_status_invalido_no_afecta_autorizacion():
    """Sin token sigue siendo 401 aunque el filtro sea invalido."""
    assert client.get(BASE, params={"status": "no_existente"}).status_code in (401, 403)


# ── Valores validos: comportamiento intacto ──


def test_status_valido_filtra_mis_postulaciones():
    solucionador_id = uuid.uuid4()
    pendiente = _create_interaction(solucionador_id, InteractionStatus.PENDIENTE)
    aprobada = _create_interaction(solucionador_id, InteractionStatus.APROBADO)
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=solucionador_id)
    try:
        por_pendiente = client.get(BASE, params={"status": "pendiente"}, headers=headers)
        assert por_pendiente.status_code == 200
        ids = {i["id"] for i in por_pendiente.json()["interactions"]}
        assert pendiente in ids
        assert aprobada not in ids
        assert all(
            i["status"] == "pendiente" for i in por_pendiente.json()["interactions"]
        )

        por_aprobado = client.get(BASE, params={"status": "aprobado"}, headers=headers)
        assert por_aprobado.status_code == 200
        assert {i["id"] for i in por_aprobado.json()["interactions"]} == {aprobada}
    finally:
        _cleanup([pendiente, aprobada])


def test_sin_filtro_conserva_el_sobre_de_paginacion():
    solucionador_id = uuid.uuid4()
    iid = _create_interaction(solucionador_id, InteractionStatus.PENDIENTE)
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=solucionador_id)
    try:
        response = client.get(BASE, params={"limit": 1, "skip": 0}, headers=headers)
        assert response.status_code == 200
        body = response.json()
        assert {"interactions", "total", "skip", "limit"} <= set(body)
        assert body["skip"] == 0
        assert body["limit"] == 1
        assert len(body["interactions"]) <= 1
    finally:
        _cleanup([iid])


def test_paginacion_invalida_sigue_siendo_422():
    headers = auth_headers(UserRole.SOLUCIONADOR)
    assert client.get(BASE, params={"limit": 0}, headers=headers).status_code == 422
    assert client.get(BASE, params={"skip": -1}, headers=headers).status_code == 422
    assert client.get(BASE, params={"limit": 101}, headers=headers).status_code == 422
