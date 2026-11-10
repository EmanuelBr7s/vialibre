"""Pruebas de regresion del bloque B3-B.5: transporte en `documents.py`.

`_fetch_json` tenia timeout pero no manejaba `httpx.HTTPError`, por lo que una
conexion rechazada o un timeout de un servicio relacionado propagaba hasta un
HTTP 500. Ahora devuelve 502 con un mensaje estatico (sin URL interna, host ni
detalle de la excepcion), conserva las respuestas actuales cuando el servicio
responde correctamente y NO enmascara errores de programacion.

Cubre las dos vias de la funcion: la unidad (`_fetch_json` directa: conexion
rechazada real, timeout simulado, no-200 y error de programacion) y el endpoint
(`GET /interactions/{id}/documentos` y `GET /interactions/{id}/carta-aval`).
"""

import asyncio
import uuid
from datetime import datetime

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.endpoints.documents import _fetch_json
from app.config import settings
from app.main import app
from app.models.document import InteractionDocument
from app.models.interaction import Interaction, InteractionStatus
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

BASE = "/api/v1/match/interactions"

REQUIRED_TIPOS = ("documento_identidad", "certificado_matricula", "afiliacion_eps")

DETALLE_ESTATICO = "No se pudo consultar un servicio relacionado"


def _fake_request() -> httpx.Request:
    return httpx.Request("GET", f"{settings.core_service_url}/api/v1/core/challenges/x")


class _TransportErrorClient:
    """Sustituto de httpx.AsyncClient: toda peticion falla como ConnectError."""

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        raise httpx.ConnectError("servicio relacionado no disponible", request=_fake_request())


class _TimeoutClient(_TransportErrorClient):
    async def get(self, *args, **kwargs):
        raise httpx.ReadTimeout("timeout simulado", request=_fake_request())


class _BuggyClient(_TransportErrorClient):
    async def get(self, *args, **kwargs):
        raise ValueError("bug de programacion simulado")


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload if self._payload is not None else {}


def _client_returning(status_code: int, payload: dict | None = None):
    class _Client(_TransportErrorClient):
        async def get(self, *args, **kwargs):
            return _FakeResponse(status_code, payload)

    return _Client


def _client_documents(auth_behaviour, challenge=None):
    """core responde 200 con `challenge`; auth sigue `auth_behaviour`."""

    class _Client(_TransportErrorClient):
        async def get(self, url, *args, **kwargs):
            if str(url).startswith(settings.core_service_url):
                return _FakeResponse(200, challenge or _challenge_payload())
            if auth_behaviour == "transport":
                raise httpx.ConnectError("auth no disponible", request=_fake_request())
            if auth_behaviour == "ok":
                return _FakeResponse(
                    200,
                    {"id": str(uuid.uuid4()), "full_name": "Ana Perez", "email": "ana@x.com"},
                )
            raise AssertionError("comportamiento de auth no reconocido")

    return _Client


def _challenge_payload(author_id: str | None = None, tipo: str = "practica") -> dict:
    return {"author_id": author_id or str(uuid.uuid4()), "tipo": tipo}


def _create_interaction(status: InteractionStatus = InteractionStatus.APROBADO) -> str:
    async def _run():
        async with TestSession() as session:
            interaction = Interaction(
                solucionador_id=uuid.uuid4(),
                challenge_id=uuid.uuid4(),
                status=status,
            )
            session.add(interaction)
            await session.commit()
            return str(interaction.id)

    return asyncio.run(_run())


def _create_documents(interaction_id: str) -> list[str]:
    async def _run():
        async with TestSession() as session:
            ids = []
            for tipo in REQUIRED_TIPOS:
                doc = InteractionDocument(
                    interaction_id=uuid.UUID(interaction_id),
                    tipo=tipo,
                    filename=f"{tipo}.pdf",
                    content_type="application/pdf",
                    size=10,
                    data=b"%PDF-1.4",
                    uploaded_at=datetime.utcnow(),
                )
                session.add(doc)
                ids.append(str(doc.id))
            await session.commit()
            return ids

    return asyncio.run(_run())


def _cleanup(interaction_ids) -> None:
    async def _run():
        async with TestSession() as session:
            from sqlalchemy import select

            for iid in interaction_ids:
                docs = (
                    await session.execute(
                        select(InteractionDocument).where(
                            InteractionDocument.interaction_id == uuid.UUID(iid)
                        )
                    )
                ).scalars().all()
                for doc in docs:
                    await session.delete(doc)
                obj = await session.get(Interaction, uuid.UUID(iid))
                if obj is not None:
                    await session.delete(obj)
            await session.commit()

    asyncio.run(_run())


# ── UNIDAD: `_fetch_json` ──


def test_fetch_json_conexion_rechazada_real_devuelve_502():
    """Conexion rechazada real (loopback sin listener): 502, no 500."""
    with pytest.raises(HTTPException) as info:
        asyncio.run(_fetch_json("http://127.0.0.1:9/"))
    assert info.value.status_code == 502
    assert info.value.detail == DETALLE_ESTATICO


def test_fetch_json_timeout_devuelve_502(monkeypatch):
    monkeypatch.setattr(httpx, "AsyncClient", _TimeoutClient)
    with pytest.raises(HTTPException) as info:
        asyncio.run(_fetch_json("http://core-service:8000/x"))
    assert info.value.status_code == 502
    assert info.value.detail == DETALLE_ESTATICO


def test_fetch_json_no_200_conserva_502(monkeypatch):
    """Contrato preexistente: un no-200 sigue siendo 502 con el mismo detail."""
    monkeypatch.setattr(httpx, "AsyncClient", _client_returning(500))
    with pytest.raises(HTTPException) as info:
        asyncio.run(_fetch_json("http://core-service:8000/x"))
    assert info.value.status_code == 502
    assert info.value.detail == DETALLE_ESTATICO


def test_fetch_json_error_de_programacion_no_se_enmascara(monkeypatch):
    """Solo httpx.HTTPError se convierte en 502; otros errores propagan."""
    monkeypatch.setattr(httpx, "AsyncClient", _BuggyClient)
    with pytest.raises(ValueError, match="bug de programacion simulado"):
        asyncio.run(_fetch_json("http://core-service:8000/x"))


# ── ENDPOINT: documentos ──


def test_listar_documentos_core_caido_devuelve_502(monkeypatch):
    interaction_id = _create_interaction()
    monkeypatch.setattr(httpx, "AsyncClient", _TransportErrorClient)
    try:
        response = client.get(
            f"{BASE}/{interaction_id}/documentos",
            headers=auth_headers(UserRole.ADMIN),
        )
        assert response.status_code == 502
        assert response.json()["detail"] == DETALLE_ESTATICO
        assert "core-service" not in response.text
        assert "http://" not in response.text
        assert "no disponible" not in response.text
    finally:
        _cleanup([interaction_id])


def test_listar_documentos_timeout_devuelve_502(monkeypatch):
    interaction_id = _create_interaction()
    monkeypatch.setattr(httpx, "AsyncClient", _TimeoutClient)
    try:
        response = client.get(
            f"{BASE}/{interaction_id}/documentos",
            headers=auth_headers(UserRole.ADMIN),
        )
        assert response.status_code == 502
        assert response.json()["detail"] == DETALLE_ESTATICO
        assert "timeout simulado" not in response.text
    finally:
        _cleanup([interaction_id])


def test_listar_documentos_respuesta_valida_conserva_contrato(monkeypatch):
    """Cuando core responde correctamente, el 200 y su sobre no cambian."""
    interaction_id = _create_interaction()
    monkeypatch.setattr(httpx, "AsyncClient", _client_documents("ok"))
    try:
        response = client.get(
            f"{BASE}/{interaction_id}/documentos",
            headers=auth_headers(UserRole.ADMIN),
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert {"aplica", "completos", "requeridos"} <= set(body)
        assert body["aplica"] is True
        assert body["completos"] is False
        assert {r["tipo"] for r in body["requeridos"]} == set(REQUIRED_TIPOS)
    finally:
        _cleanup([interaction_id])


def test_listar_documentos_sin_permiso_sigue_403(monkeypatch):
    """La autorizacion se evalua antes/dentro de `_load`; el 403 no cambia."""
    interaction_id = _create_interaction()
    monkeypatch.setattr(httpx, "AsyncClient", _client_documents("ok"))
    try:
        response = client.get(
            f"{BASE}/{interaction_id}/documentos",
            headers=auth_headers(UserRole.PUBLICADOR),
        )
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "No autorizado para ver los documentos de esta postulación"
        )
    finally:
        _cleanup([interaction_id])


# ── ENDPOINT: carta de aval (segunda y tercera llamada a `_fetch_json`) ──


def test_carta_aval_auth_caido_devuelve_502(monkeypatch):
    """core responde bien (via `_load`) y auth falla: 502 sin filtrar detalles."""
    interaction_id = _create_interaction()
    _create_documents(interaction_id)
    monkeypatch.setattr(httpx, "AsyncClient", _client_documents("transport"))
    try:
        response = client.get(
            f"{BASE}/{interaction_id}/carta-aval",
            headers=auth_headers(UserRole.ADMIN),
        )
        assert response.status_code == 502
        assert response.json()["detail"] == DETALLE_ESTATICO
        assert "auth" not in response.text.lower()
        assert "http://" not in response.text
        assert "no disponible" not in response.text
    finally:
        _cleanup([interaction_id])
