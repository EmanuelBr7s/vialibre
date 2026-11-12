import logging
import time
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logger = logging.getLogger("vialibre.gateway")

TARGETS = {
    "/api/v1/auth": "http://127.0.0.1:8001",
    "/api/v1/core": "http://127.0.0.1:8002",
    "/api/v1/match": "http://127.0.0.1:8003",
}

# Cabeceras que no se reenvian tal cual entre saltos.
EXCLUDED_HEADERS = {
    "content-encoding",
    "content-length",
    "transfer-encoding",
    "connection",
    "server-timing",  # se recompone abajo sumando el tiempo del gateway
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Un unico cliente reutiliza las conexiones con los microservicios en vez
    # de abrir una nueva por peticion.
    app.state.client = httpx.AsyncClient(timeout=60.0)
    yield
    await app.state.client.aclose()


app = FastAPI(title="VíaLibre Gateway", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Server-Timing"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "vialibre-gateway"}


@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
async def reverse_proxy(request: Request, path: str):
    full_path = f"/{path}"
    target_base = None
    for prefix, target in TARGETS.items():
        if full_path.startswith(prefix):
            target_base = target
            break

    if not target_base:
        return JSONResponse({"detail": "Recurso no encontrado"}, status_code=404)

    url = f"{target_base}{full_path}"
    if request.url.query:
        url += f"?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)
    body = await request.body()

    started = time.perf_counter()
    try:
        res = await request.app.state.client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )
    except httpx.TimeoutException:
        logger.warning("Timeout del servicio interno: %s %s", request.method, full_path)
        return JSONResponse(
            {"detail": "El servidor tardó demasiado en responder. Inténtalo de nuevo."},
            status_code=504,
        )
    except httpx.RequestError:
        # Servicio interno aun arrancando o caido: respuesta JSON, nunca texto plano.
        logger.warning("Servicio interno no disponible: %s %s", request.method, full_path)
        return JSONResponse(
            {"detail": "El servicio no está disponible. Reintenta en unos segundos."},
            status_code=503,
        )

    elapsed_ms = (time.perf_counter() - started) * 1000
    res_headers = {k: v for k, v in res.headers.items() if k.lower() not in EXCLUDED_HEADERS}
    upstream_timing = res.headers.get("server-timing")
    res_headers["Server-Timing"] = ", ".join(
        part for part in (upstream_timing, f"gateway;dur={elapsed_ms:.1f}") if part
    )
    return Response(content=res.content, status_code=res.status_code, headers=res_headers)
