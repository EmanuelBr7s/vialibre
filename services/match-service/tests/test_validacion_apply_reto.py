"""Validacion de existencia del reto en apply (B3-B.4, F5.1).

`POST /interactions/apply` debe consultar a core-service ANTES de insertar:
sin esa validacion se persistian interacciones huerfanas (reto inexistente)
que luego no podian resolverse (los flujos de autores y aprobacion devuelven
404/502). El orden de validaciones se conserva intacto: autorizacion y
duplicado local primero, llamada remota despues, insercion al final.

Contratos nuevos (espejo exacto de `create_practica` / `_validate_challenge`):

- reto inexistente -> 400 `challenge_id no corresponde a una publicacion existente`
- core inaccesible -> 502 `No se pudo validar la publicacion` (solo httpx.HTTPError)

Fuera de alcance (decisiones pendientes): elegibilidad por estado del reto
(F5.1b) NO se valida aqui.
"""

import asyncio
import uuid

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.main import app
from app.models.interaction import Interaction
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

APPLY_URL = "/api/v1/match/interactions/apply"


# ── Transportes falsos (patron B3-A) ──


class _FakeRequest:
    url = "http://core-service.test/api/v1/core/challenges/xyz"


class _CoreCaido:
    """httpx.AsyncClient falso: toda peticion falla como ConnectError."""

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        raise httpx.ConnectError("core no disponible", request=_FakeRequest())


class _CoreDisponible:
    """httpx.AsyncClient falso: el reto consultado siempre existe (200).

    Cuenta las consultas para poder verificar el orden de validaciones
    (el chequeo local de duplicado no debe volver a consultar core).
    """

    instances: list = []

    def __init__(self, *args, **kwargs):
        self.calls = 0
        _CoreDisponible.instances.append(self)

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        self.calls += 1
        return _FakeResponse(200, {"id": str(uuid.uuid4()), "status": "abierto"})


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _total_interacciones_de(sub: uuid.UUID) -> int:
    async def _run():
        async with TestSession() as session:
            result = await session.execute(
                select(func.count(Interaction.id)).where(
                    Interaction.solucionador_id == sub
                )
            )
            return result.scalar()

    return asyncio.run(_run())


def _limpiar(sub: uuid.UUID):
    async def _run():
        async with TestSession() as session:
            result = await session.execute(
                select(Interaction).where(Interaction.solucionador_id == sub)
            )
            for row in result.scalars():
                await session.delete(row)
            await session.commit()

    asyncio.run(_run())


# ── Contratos nuevos ──


def test_apply_sin_token_sigue_devolviendo_401():
    """Sin token no se llega ni a validar el reto (401 conservado)."""
    response = client.post(APPLY_URL, json={"challenge_id": str(uuid.uuid4())})
    assert response.status_code == 401


def test_apply_reto_inexistente_devuelve_400_sin_persistencia():
    """Contra core REAL: un UUID inexistente produce 400 y NO crea fila."""
    solucionador = uuid.uuid4()
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=solucionador)
    try:
        response = client.post(
            APPLY_URL,
            json={"challenge_id": str(uuid.uuid4()), "message": "fantasma"},
            headers=headers,
        )
        assert response.status_code == 400, response.text
        assert (
            response.json()["detail"]
            == "challenge_id no corresponde a una publicacion existente"
        )
        # Sin fugas internas en la respuesta.
        assert "http" not in response.text.lower()
        assert _total_interacciones_de(solucionador) == 0
    finally:
        _limpiar(solucionador)


def test_apply_core_indisponible_devuelve_502_sin_persistencia(monkeypatch):
    """Fallo de transporte/timeout -> 502 con el contrato de create_practica,
    sin exponer URLs, hostnames ni trazas, y sin persistir nada."""
    monkeypatch.setattr(httpx, "AsyncClient", _CoreCaido)
    solucionador = uuid.uuid4()
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=solucionador)
    try:
        response = client.post(
            APPLY_URL,
            json={"challenge_id": str(uuid.uuid4()), "message": "sin core"},
            headers=headers,
        )
        assert response.status_code == 502, response.text
        assert response.json()["detail"] == "No se pudo validar la publicacion"
        assert "http" not in response.text.lower()
        assert "core-service" not in response.text.lower()
        assert _total_interacciones_de(solucionador) == 0
    finally:
        _limpiar(solucionador)


def test_apply_reto_existente_devuelve_201_y_persiste(monkeypatch):
    """Camino de exito conservado: reto existente -> 201 y fila persistida."""
    _CoreDisponible.instances.clear()
    monkeypatch.setattr(httpx, "AsyncClient", _CoreDisponible)
    solucionador = uuid.uuid4()
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=solucionador)
    try:
        response = client.post(
            APPLY_URL,
            json={"challenge_id": str(uuid.uuid4()), "message": "propuesta"},
            headers=headers,
        )
        assert response.status_code == 201, response.text
        assert _total_interacciones_de(solucionador) == 1
        # La validacion remoto se realizo exactamente una vez.
        total_consultas = sum(i.calls for i in _CoreDisponible.instances)
        assert total_consultas == 1
    finally:
        _limpiar(solucionador)


def test_apply_duplicado_local_no_vuelve_a_consultar_core(monkeypatch):
    """Orden de validaciones: autorizacion -> duplicado local -> core -> insert.
    Un duplicado local responde 409 SIN nueva consulta remota."""
    _CoreDisponible.instances.clear()
    monkeypatch.setattr(httpx, "AsyncClient", _CoreDisponible)
    solucionador = uuid.uuid4()
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=solucionador)
    challenge_id = str(uuid.uuid4())
    try:
        primero = client.post(
            APPLY_URL, json={"challenge_id": challenge_id}, headers=headers
        )
        assert primero.status_code == 201, primero.text
        consultas_tras_1 = sum(i.calls for i in _CoreDisponible.instances)
        assert consultas_tras_1 == 1

        segundo = client.post(
            APPLY_URL, json={"challenge_id": challenge_id}, headers=headers
        )
        assert segundo.status_code == 409
        assert segundo.json()["detail"] == "You already applied to this challenge"
        consultas_tras_2 = sum(i.calls for i in _CoreDisponible.instances)
        assert consultas_tras_2 == consultas_tras_1  # el 409 no consulto core
    finally:
        _limpiar(solucionador)
