"""Pruebas focalizadas del bloque B3-A: resiliencia de las llamadas a
core-service desde los endpoints de interacciones.

Demuestran que timeout y fallos de transporte (httpx.HTTPError) se convierten
en HTTP 502 con mensajes genericos (sin exponer URLs internas ni detalles de
la excepcion), que los contratos existentes se conservan (core 404 sigue
siendo 404; el resto de respuestas no-200 de core siguen siendo 502) y que
los errores de programacion NO se enmascaran como 502.
"""

import asyncio
import uuid

import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.models.interaction import Interaction, InteractionStatus
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

CORE_URL = "http://core-service:8000/api/v1/core/challenges/x"


def _fake_request() -> httpx.Request:
    return httpx.Request("GET", CORE_URL)


class _TransportErrorClient:
    """Sustituto de httpx.AsyncClient: toda peticion falla como ConnectError."""

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        raise httpx.ConnectError("core-service no disponible", request=_fake_request())


class _TimeoutClient(_TransportErrorClient):
    """Sustituto que falla con timeout de lectura."""

    async def get(self, *args, **kwargs):
        raise httpx.ReadTimeout("timeout simulado hacia core-service", request=_fake_request())


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload if self._payload is not None else {"author_id": str(uuid.uuid4())}


def _client_returning(status_code: int):
    """Sustituto de httpx.AsyncClient que responde con el codigo indicado."""

    class _Client(_TransportErrorClient):
        async def get(self, *args, **kwargs):
            return _FakeResponse(status_code)

    return _Client


class _BuggyClient(_TransportErrorClient):
    """Sustituto que lanza un error de programacion (no debe ser 502)."""

    async def get(self, *args, **kwargs):
        raise ValueError("bug de programacion simulado")


def _create_interaction(
    contact_unlocked: bool = False,
    status: InteractionStatus = InteractionStatus.PENDIENTE,
) -> dict:
    async def _run():
        async with TestSession() as session:
            interaction = Interaction(
                solucionador_id=uuid.uuid4(),
                challenge_id=uuid.uuid4(),
                status=status,
                contact_unlocked=contact_unlocked,
            )
            session.add(interaction)
            await session.commit()
            return {"id": str(interaction.id)}

    return asyncio.run(_run())


def _cleanup(interaction_ids):
    async def _run():
        async with TestSession() as session:
            for iid in interaction_ids:
                obj = await session.get(Interaction, uuid.UUID(iid))
                if obj is not None:
                    await session.delete(obj)
            await session.commit()

    asyncio.run(_run())


# ── GET /interactions/challenge/{challenge_id} ──


def test_applicants_transport_error_returns_502(monkeypatch):
    monkeypatch.setattr(httpx, "AsyncClient", _TransportErrorClient)
    headers = auth_headers(UserRole.PUBLICADOR)
    response = client.get(
        f"/api/v1/match/interactions/challenge/{uuid.uuid4()}", headers=headers
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "Could not verify challenge"
    # No se exponen URLs internas ni mensajes de la excepcion
    assert "core-service" not in response.text
    assert "http://" not in response.text


def test_applicants_timeout_returns_502(monkeypatch):
    monkeypatch.setattr(httpx, "AsyncClient", _TimeoutClient)
    headers = auth_headers(UserRole.PUBLICADOR)
    response = client.get(
        f"/api/v1/match/interactions/challenge/{uuid.uuid4()}", headers=headers
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "Could not verify challenge"
    assert "timeout simulado" not in response.text


def test_applicants_core_404_keeps_contract(monkeypatch):
    """core devuelve 404 -> el contrato existente sigue devolviendo 404."""
    monkeypatch.setattr(httpx, "AsyncClient", _client_returning(404))
    headers = auth_headers(UserRole.PUBLICADOR)
    response = client.get(
        f"/api/v1/match/interactions/challenge/{uuid.uuid4()}", headers=headers
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Challenge not found"


def test_applicants_core_5xx_becomes_502(monkeypatch):
    """Fallo de dependencia (core responde 500) -> 502 justificado."""
    monkeypatch.setattr(httpx, "AsyncClient", _client_returning(500))
    headers = auth_headers(UserRole.PUBLICADOR)
    response = client.get(
        f"/api/v1/match/interactions/challenge/{uuid.uuid4()}", headers=headers
    )
    assert response.status_code == 502
    assert response.json()["detail"] == "Could not verify challenge"


# ── PATCH /interactions/{interaction_id}/approve ──


def test_approve_transport_error_returns_502(monkeypatch):
    interaction = _create_interaction()
    headers = auth_headers(UserRole.PUBLICADOR)
    monkeypatch.setattr(httpx, "AsyncClient", _TransportErrorClient)
    try:
        response = client.patch(
            f"/api/v1/match/interactions/{interaction['id']}/approve",
            json={"status": "aprobado"},
            headers=headers,
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "Could not verify challenge ownership"
        assert "core-service" not in response.text
    finally:
        _cleanup([interaction["id"]])


def test_approve_core_error_keeps_502_contract(monkeypatch):
    """Contrato existente: cualquier no-200 de core en approve sigue siendo 502."""
    interaction = _create_interaction()
    headers = auth_headers(UserRole.PUBLICADOR)
    monkeypatch.setattr(httpx, "AsyncClient", _client_returning(500))
    try:
        response = client.patch(
            f"/api/v1/match/interactions/{interaction['id']}/approve",
            json={"status": "aprobado"},
            headers=headers,
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "Could not verify challenge ownership"
    finally:
        _cleanup([interaction["id"]])


# ── GET /interactions/{interaction_id}/contact ──


def test_contact_transport_error_returns_502(monkeypatch):
    interaction = _create_interaction(
        contact_unlocked=True, status=InteractionStatus.APROBADO
    )
    headers = auth_headers(UserRole.ADMIN)
    monkeypatch.setattr(httpx, "AsyncClient", _TransportErrorClient)
    try:
        response = client.get(
            f"/api/v1/match/interactions/{interaction['id']}/contact", headers=headers
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "Could not fetch challenge info"
        assert "core-service" not in response.text
    finally:
        _cleanup([interaction["id"]])


# ── Los errores de programacion no se enmascaran ──


def test_programming_error_is_not_masked_as_502(monkeypatch):
    """Solo httpx.HTTPError se convierte en 502; otros errores propagan."""
    monkeypatch.setattr(httpx, "AsyncClient", _BuggyClient)
    headers = auth_headers(UserRole.PUBLICADOR)
    with pytest.raises(ValueError, match="bug de programacion simulado"):
        client.get(
            f"/api/v1/match/interactions/challenge/{uuid.uuid4()}", headers=headers
        )


# ── B3-A.1: la llamada restante a auth-service (bloque de contacto) ──


def _contact_client(auth_behaviour, calls: list | None = None):
    """Sustituto de httpx.AsyncClient para el flujo de contacto.

    core-service responde siempre 200 con un author_id; el comportamiento
    ante la llamada a auth-service lo define `auth_behaviour`:
    "transport" | "timeout" | "bug" | "ok" | codigo HTTP (int).
    """
    author_id = uuid.uuid4()
    auth_user_id = uuid.uuid4()

    class _Client(_TransportErrorClient):
        contact_user_id = auth_user_id  # expuesto para el caso de exito

        async def get(self, url, *args, **kwargs):
            if calls is not None:
                calls.append(str(url))
            if str(url).startswith(settings.core_service_url):
                return _FakeResponse(200, {"author_id": str(author_id)})
            if auth_behaviour == "transport":
                raise httpx.ConnectError(
                    "auth-service no disponible", request=_fake_request()
                )
            if auth_behaviour == "timeout":
                raise httpx.ReadTimeout(
                    "timeout simulado hacia auth-service", request=_fake_request()
                )
            if auth_behaviour == "bug":
                raise ValueError("bug de programacion simulado en auth")
            if auth_behaviour == "ok":
                return _FakeResponse(
                    200,
                    {
                        "id": str(auth_user_id),
                        "full_name": "Ana Perez",
                        "email": "ana@example.com",
                        "phone": "3001234567",
                    },
                )
            if isinstance(auth_behaviour, int):
                return _FakeResponse(auth_behaviour)
            raise AssertionError("comportamiento de auth no reconocido")

    return _Client


def test_contact_auth_transport_error_returns_502(monkeypatch):
    interaction = _create_interaction(
        contact_unlocked=True, status=InteractionStatus.APROBADO
    )
    headers = auth_headers(UserRole.ADMIN)
    monkeypatch.setattr(httpx, "AsyncClient", _contact_client("transport"))
    try:
        response = client.get(
            f"/api/v1/match/interactions/{interaction['id']}/contact", headers=headers
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "Could not fetch user information"
        assert "auth-service" not in response.text
        assert "http://" not in response.text
    finally:
        _cleanup([interaction["id"]])


def test_contact_auth_timeout_returns_502(monkeypatch):
    interaction = _create_interaction(
        contact_unlocked=True, status=InteractionStatus.APROBADO
    )
    headers = auth_headers(UserRole.ADMIN)
    monkeypatch.setattr(httpx, "AsyncClient", _contact_client("timeout"))
    try:
        response = client.get(
            f"/api/v1/match/interactions/{interaction['id']}/contact", headers=headers
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "Could not fetch user information"
        assert "timeout simulado" not in response.text
    finally:
        _cleanup([interaction["id"]])


def test_contact_auth_valid_response_succeeds(monkeypatch):
    """El comportamiento de exito queda intacto: 200 con los datos del contacto."""
    interaction = _create_interaction(
        contact_unlocked=True, status=InteractionStatus.APROBADO
    )
    headers = auth_headers(UserRole.ADMIN)
    client_cls = _contact_client("ok")
    monkeypatch.setattr(httpx, "AsyncClient", client_cls)
    try:
        response = client.get(
            f"/api/v1/match/interactions/{interaction['id']}/contact", headers=headers
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["user_id"] == str(client_cls.contact_user_id)
        assert body["full_name"] == "Ana Perez"
        assert body["email"] == "ana@example.com"
        assert body["phone"] == "3001234567"
    finally:
        _cleanup([interaction["id"]])


def test_contact_auth_error_keeps_502_contract(monkeypatch):
    """Contrato existente: un no-200 de auth sigue siendo 502 con el mismo detail."""
    interaction = _create_interaction(
        contact_unlocked=True, status=InteractionStatus.APROBADO
    )
    headers = auth_headers(UserRole.ADMIN)
    monkeypatch.setattr(httpx, "AsyncClient", _contact_client(500))
    try:
        response = client.get(
            f"/api/v1/match/interactions/{interaction['id']}/contact", headers=headers
        )
        assert response.status_code == 502
        assert response.json()["detail"] == "Could not fetch user information"
    finally:
        _cleanup([interaction["id"]])


def test_contact_unauthorized_still_403_before_auth_call(monkeypatch):
    """La autorizacion se evalua ANTES de llamar a auth (contrato intacto)."""
    interaction = _create_interaction(
        contact_unlocked=True, status=InteractionStatus.APROBADO
    )
    calls: list = []
    headers = auth_headers(UserRole.PUBLICADOR)
    monkeypatch.setattr(httpx, "AsyncClient", _contact_client("transport", calls=calls))
    try:
        response = client.get(
            f"/api/v1/match/interactions/{interaction['id']}/contact", headers=headers
        )
        assert response.status_code == 403
        assert response.json()["detail"] == "Not authorized to view contact info"
        # Solo se consulto core-service para la autorizacion; jamas auth-service
        assert all(settings.auth_service_url not in url for url in calls)
    finally:
        _cleanup([interaction["id"]])


def test_contact_auth_programming_error_is_not_masked(monkeypatch):
    """Un error de programacion en el bloque de auth propaga; no se vuelve 502."""
    interaction = _create_interaction(
        contact_unlocked=True, status=InteractionStatus.APROBADO
    )
    headers = auth_headers(UserRole.ADMIN)
    monkeypatch.setattr(httpx, "AsyncClient", _contact_client("bug"))
    try:
        with pytest.raises(ValueError, match="bug de programacion simulado en auth"):
            client.get(
                f"/api/v1/match/interactions/{interaction['id']}/contact",
                headers=headers,
            )
    finally:
        _cleanup([interaction["id"]])
