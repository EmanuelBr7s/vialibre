import os
import httpx
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="VíaLibre Gateway")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

TARGETS = {
    "/api/v1/auth": "http://127.0.0.1:8001",
    "/api/v1/core": "http://127.0.0.1:8002",
    "/api/v1/match": "http://127.0.0.1:8003",
}

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
        return Response(content='{"detail": "Not Found"}', status_code=404, media_type="application/json")

    url = f"{target_base}{full_path}"
    if request.url.query:
        url += f"?{request.url.query}"

    headers = dict(request.headers)
    headers.pop("host", None)

    body = await request.body()
    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.request(
            method=request.method,
            url=url,
            headers=headers,
            content=body,
        )
        excluded_headers = ["content-encoding", "content-length", "transfer-encoding", "connection"]
        res_headers = {k: v for k, v in res.headers.items() if k.lower() not in excluded_headers}
        return Response(content=res.content, status_code=res.status_code, headers=res_headers)

