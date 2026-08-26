from fastapi import APIRouter

from app.api.v1.endpoints import interactions, reactions

router = APIRouter()

router.include_router(interactions.router, prefix="/interactions", tags=["Interactions"])
router.include_router(reactions.router, prefix="/reactions", tags=["Reactions"])
