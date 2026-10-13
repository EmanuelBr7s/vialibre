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
    title="VíaLibre Match Service",
    description="Interactions, reactions, and matchmaking microservice",
    version="0.1.0",
    lifespan=lifespan,
    # Igual que core-service: colecciones sin slash final y sin redirecciones.
    # Un 307 aqui apunta al host interno del gateway y rompe las peticiones
    # que llegan a traves del proxy de Next.js.
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
