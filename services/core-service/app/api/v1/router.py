from fastapi import APIRouter

from app.api.v1.endpoints import challenges, empresas

router = APIRouter()

router.include_router(challenges.router, prefix="/challenges", tags=["Challenges"])
router.include_router(empresas.router, prefix="/empresas", tags=["Empresas"])
