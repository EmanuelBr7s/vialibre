import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_role
from app.config import settings
from app.database import get_db
from app.models.empresa import Empresa
from app.schemas.empresa import (
    EmpresaCreate,
    EmpresaListResponse,
    EmpresaResponse,
    EmpresaUpdate,
)
from vialibre_common.schemas import TokenPayload, UserRole
from vialibre_common.service_auth import service_headers

router = APIRouter()


async def _get_empresa_or_404(db: AsyncSession, empresa_id: uuid.UUID) -> Empresa:
    result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
    empresa = result.scalar_one_or_none()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada",
        )
    return empresa


async def _validate_publicador(user_id: uuid.UUID | None) -> None:
    """Valida `publicador_user_id` contra auth-service (referencia entre servicios).

    No se crea clave foranea entre esquemas: la existencia se comprueba por el
    mecanismo interno existente (token de servicio). Si no puede verificarse con
    seguridad, se rechaza en lugar de aceptar una referencia invalida.
    """
    if user_id is None:
        return
    path = f"/api/v1/auth/users/{user_id}/resumen"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.auth_service_url}{path}",
                headers=service_headers(
                    settings.jwt_secret_key, settings.service_name, "GET", path
                ),
            )
    except httpx.HTTPError:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo validar el publicador",
        )
    if response.status_code == 404:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="publicador_user_id no corresponde a un usuario existente",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo validar el publicador",
        )


@router.post("", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
async def create_empresa(
    data: EmpresaCreate,
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Registra una empresa institucional. Operacion exclusiva del rol admin."""
    await _validate_publicador(data.publicador_user_id)
    empresa = Empresa(**data.model_dump())
    db.add(empresa)
    await db.flush()
    return empresa


@router.get("", response_model=EmpresaListResponse)
async def list_empresas(
    activa: bool | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Lista empresas. Operacion exclusiva del rol admin."""
    filters = []
    if activa is not None:
        filters.append(Empresa.activa.is_(activa))

    base = select(Empresa).where(*filters)
    total = (
        await db.execute(select(func.count()).select_from(base.subquery()))
    ).scalar()
    result = await db.execute(
        base.order_by(Empresa.created_at.desc()).offset(skip).limit(limit)
    )
    return EmpresaListResponse(
        empresas=result.scalars().all(),
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{empresa_id}", response_model=EmpresaResponse)
async def get_empresa(
    empresa_id: uuid.UUID,
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Obtiene una empresa por id. Operacion exclusiva del rol admin."""
    return await _get_empresa_or_404(db, empresa_id)


@router.patch("/{empresa_id}", response_model=EmpresaResponse)
async def update_empresa(
    empresa_id: uuid.UUID,
    data: EmpresaUpdate,
    current_user: TokenPayload = Depends(require_role(UserRole.ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    """Actualiza una empresa. Operacion exclusiva del rol admin."""
    empresa = await _get_empresa_or_404(db, empresa_id)
    update_dict = data.model_dump(exclude_unset=True)
    if "publicador_user_id" in update_dict:
        await _validate_publicador(update_dict["publicador_user_id"])
    for field, value in update_dict.items():
        setattr(empresa, field, value)
    await db.flush()
    return empresa
