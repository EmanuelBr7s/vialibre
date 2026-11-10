from fastapi import APIRouter

from app.api.v1.endpoints import documents, interactions, practicas, reactions

router = APIRouter()

router.include_router(interactions.router, prefix="/interactions", tags=["Interactions"])
router.include_router(documents.router, prefix="/interactions", tags=["Documentos de practica"])
router.include_router(reactions.router, prefix="/reactions", tags=["Reactions"])
router.include_router(practicas.router, prefix="/practicas", tags=["Practicas"])
