from fastapi import APIRouter

from app.api.v1.endpoints import challenges

router = APIRouter()

router.include_router(challenges.router, prefix="/challenges", tags=["Challenges"])
