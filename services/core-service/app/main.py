from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.v1.router import router as v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    yield
    # Shutdown


app = FastAPI(
    title="VíaLibre Core Service",
    description="Challenges and categories management microservice",
    version="0.1.0",
    lifespan=lifespan,
    # Evita el rebote 307 entre rutas con/sin slash final. El proxy de Next.js
    # normaliza a rutas SIN slash (308), de modo que FastAPI debe resolver la
    # colección en /challenges (sin slash) sin devolver un 307 que cree un bucle
    # que rompía el POST (publicación de problemáticas) en el navegador.
    redirect_slashes=False,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 router
app.include_router(v1_router, prefix=settings.api_v1_prefix)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"service": settings.service_name, "status": "healthy"}
