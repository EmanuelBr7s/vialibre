from fastapi import APIRouter

from app.api.v1.endpoints import auth, tutores_docentes, users

router = APIRouter()

router.include_router(auth.router, tags=["Authentication"])
router.include_router(users.router, prefix="/users", tags=["Users"])
router.include_router(
    tutores_docentes.router, prefix="/tutores-docentes", tags=["Tutores docentes"]
)
