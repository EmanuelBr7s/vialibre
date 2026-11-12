"""Resolucion del nombre visible de los autores de las publicaciones.

El listado de publicaciones muestra el nombre de la empresa que las publico,
que vive en auth-service. Pedirlo en cada listado (una llamada HTTP por autor,
con un cliente nuevo cada vez) era la mayor parte del tiempo de respuesta, asi
que aqui se reutiliza una conexion y se recuerda el resultado unos minutos.
"""

import asyncio
import time
import uuid

import httpx

from app.config import settings
from vialibre_common.service_auth import service_headers

# author_id -> (caduca_en, datos). Solo se guardan respuestas correctas: un
# fallo de auth-service se reintenta en la siguiente peticion.
_cache: dict[str, tuple[float, dict]] = {}
_MAX_ENTRIES = 2000

_client: httpx.AsyncClient | None = None
_client_loop: asyncio.AbstractEventLoop | None = None


def _get_client() -> httpx.AsyncClient:
    """Cliente HTTP compartido (reutiliza conexiones con auth-service).

    Un cliente pertenece al bucle de eventos que lo creo: si el bucle cambia
    (p. ej. entre pruebas) se crea uno nuevo en vez de reutilizar conexiones
    de un bucle cerrado.
    """
    global _client, _client_loop
    loop = asyncio.get_running_loop()
    if _client is None or _client.is_closed or _client_loop is not loop:
        _client = httpx.AsyncClient(timeout=5.0)
        _client_loop = loop
    return _client


async def close_client() -> None:
    """Cierra el cliente compartido al apagar el servicio."""
    global _client, _client_loop
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None
    _client_loop = None


def clear_cache() -> None:
    _cache.clear()


def forget_author(author_id: uuid.UUID | str) -> None:
    """Olvida un autor para que su siguiente consulta sea fresca."""
    _cache.pop(str(author_id), None)


async def resolve_author(author_id: uuid.UUID) -> dict:
    """Nombre visible de un autor: `author_name` y `empresa_nombre`.

    Devuelve un dict vacio si auth-service no responde o no conoce al usuario.
    """
    key = str(author_id)
    ttl = settings.author_cache_ttl_seconds
    now = time.monotonic()
    if ttl > 0:
        cached = _cache.get(key)
        if cached and cached[0] > now:
            return cached[1]

    path = f"/api/v1/auth/users/{author_id}/resumen"
    try:
        response = await _get_client().get(
            f"{settings.auth_service_url}{path}",
            headers=service_headers(
                settings.jwt_secret_key, settings.service_name, "GET", path
            ),
        )
    except httpx.HTTPError:
        return {}
    if response.status_code != 200:
        return {}

    data = response.json()
    info = {
        "author_name": data.get("full_name"),
        "empresa_nombre": data.get("empresa_nombre") or data.get("full_name"),
    }
    if ttl > 0:
        if len(_cache) >= _MAX_ENTRIES:
            _cache.clear()
        _cache[key] = (now + ttl, info)
    return info


async def resolve_authors(author_ids: set[uuid.UUID]) -> dict[str, dict]:
    """Resuelve varios autores en paralelo; devuelve author_id (str) -> datos."""
    ids = list(author_ids)
    results = await asyncio.gather(*(resolve_author(author_id) for author_id in ids))
    return {str(author_id): info for author_id, info in zip(ids, results)}
