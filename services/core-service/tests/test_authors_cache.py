"""Cache del nombre visible de los autores (app.authors)."""

import uuid

import httpx
import pytest

from app import authors
from app.config import settings


class _FakeClient:
    """Sustituye al cliente HTTP: cuenta llamadas y responde lo que se le indique."""

    def __init__(self, status_code: int = 200, payload: dict | None = None, error: Exception | None = None):
        self.calls = 0
        self.status_code = status_code
        self.payload = payload or {"full_name": "Ana Ruiz", "empresa_nombre": "Empresa Uno"}
        self.error = error

    async def get(self, url, headers=None):
        self.calls += 1
        if self.error:
            raise self.error
        return httpx.Response(self.status_code, json=self.payload)


@pytest.fixture(autouse=True)
def _cache_limpia(monkeypatch):
    authors.clear_cache()
    monkeypatch.setattr(settings, "author_cache_ttl_seconds", 300)
    yield
    authors.clear_cache()


def _usar(monkeypatch, client: _FakeClient) -> _FakeClient:
    monkeypatch.setattr(authors, "_get_client", lambda: client)
    return client


async def test_segunda_consulta_no_llama_a_auth(monkeypatch):
    client = _usar(monkeypatch, _FakeClient())
    author_id = uuid.uuid4()

    primero = await authors.resolve_author(author_id)
    segundo = await authors.resolve_author(author_id)

    assert primero == segundo == {"author_name": "Ana Ruiz", "empresa_nombre": "Empresa Uno"}
    assert client.calls == 1


async def test_varios_autores_se_resuelven_una_vez_cada_uno(monkeypatch):
    client = _usar(monkeypatch, _FakeClient())
    ids = {uuid.uuid4(), uuid.uuid4(), uuid.uuid4()}

    resultado = await authors.resolve_authors(ids)
    await authors.resolve_authors(ids)

    assert set(resultado) == {str(i) for i in ids}
    assert client.calls == 3


async def test_un_fallo_no_se_guarda_y_se_reintenta(monkeypatch):
    author_id = uuid.uuid4()
    caido = _usar(monkeypatch, _FakeClient(error=httpx.ConnectError("auth caido")))
    assert await authors.resolve_author(author_id) == {}
    assert caido.calls == 1

    no_encontrado = _usar(monkeypatch, _FakeClient(status_code=404, payload={"detail": "User not found"}))
    assert await authors.resolve_author(author_id) == {}

    ok = _usar(monkeypatch, _FakeClient())
    assert (await authors.resolve_author(author_id))["empresa_nombre"] == "Empresa Uno"
    assert no_encontrado.calls == 1 and ok.calls == 1


async def test_la_entrada_caduca_y_se_puede_olvidar(monkeypatch):
    client = _usar(monkeypatch, _FakeClient())
    author_id = uuid.uuid4()
    reloj = [1000.0]
    monkeypatch.setattr(authors.time, "monotonic", lambda: reloj[0])

    await authors.resolve_author(author_id)
    reloj[0] += 299
    await authors.resolve_author(author_id)
    assert client.calls == 1

    reloj[0] += 2  # supera los 300 s
    await authors.resolve_author(author_id)
    assert client.calls == 2

    authors.forget_author(author_id)
    await authors.resolve_author(author_id)
    assert client.calls == 3


async def test_ttl_cero_desactiva_la_cache(monkeypatch):
    monkeypatch.setattr(settings, "author_cache_ttl_seconds", 0)
    client = _usar(monkeypatch, _FakeClient())
    author_id = uuid.uuid4()

    await authors.resolve_author(author_id)
    await authors.resolve_author(author_id)

    assert client.calls == 2


async def test_sin_empresa_se_muestra_el_nombre_completo(monkeypatch):
    _usar(monkeypatch, _FakeClient(payload={"full_name": "Luis Mora", "empresa_nombre": None}))
    info = await authors.resolve_author(uuid.uuid4())
    assert info == {"author_name": "Luis Mora", "empresa_nombre": "Luis Mora"}
