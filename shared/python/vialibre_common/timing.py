"""Medicion del tiempo de proceso de cada peticion.

Cada servicio anade la cabecera `Server-Timing` (visible en las herramientas
del navegador y sumada por el gateway) y registra un aviso cuando una peticion
supera el umbral, para localizar donde se va el tiempo sin instrumentar a mano.
"""

import logging
import time

from fastapi import FastAPI, Request

logger = logging.getLogger("vialibre.timing")

SLOW_REQUEST_MS = 800.0


def add_server_timing(app: FastAPI, name: str, slow_ms: float = SLOW_REQUEST_MS) -> None:
    """Registra en `app` el middleware que mide y expone el tiempo de proceso."""

    @app.middleware("http")
    async def _server_timing(request: Request, call_next):
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["Server-Timing"] = f"{name};dur={elapsed_ms:.1f}"
        if elapsed_ms >= slow_ms:
            logger.warning(
                "Peticion lenta: %s %s -> %s en %.0f ms",
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
        return response
