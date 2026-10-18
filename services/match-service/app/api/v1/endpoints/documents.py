"""
Documentos requisito y carta de aval de practica.

Flujo acordado con la universidad: cuando una empresa selecciona (aprueba) a
un estudiante para una practica, el estudiante carga los documentos requisito
y descarga automaticamente su carta de aval para la empresa.
"""

import uuid
from datetime import datetime
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import undefer

from app.api.deps import AuthContext, get_current_user
from app.api.duplicates import raise_duplicate_conflict
from app.config import settings
from app.database import get_db
from app.models.document import InteractionDocument
from app.models.interaction import Interaction, InteractionStatus
from app.schemas.match import DocumentChecklist, DocumentInfo, RequiredDocument
from vialibre_common.pdf import A4_HEIGHT, A4_WIDTH, Pdf
from vialibre_common.schemas import UserRole
from vialibre_common.service_auth import service_headers

router = APIRouter()

REQUIRED_DOCUMENTS = {
    "documento_identidad": "Documento de identidad",
    "certificado_matricula": "Certificado de matrícula vigente",
    "afiliacion_eps": "Certificado de afiliación a EPS",
}
DOC_MAX_BYTES = 5 * 1024 * 1024
# Firma de los formatos admitidos: PDF, JPEG y PNG.
DOC_SIGNATURES = {
    b"%PDF": "application/pdf",
    b"\xff\xd8\xff": "image/jpeg",
    b"\x89PNG": "image/png",
}

MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]


async def _fetch_json(url: str, headers: dict | None = None) -> dict:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, headers=headers)
    except httpx.HTTPError:
        # Fallo de transporte/timeout de un servicio relacionado: 502 con
        # mensaje estatico, sin exponer URL interna, host ni la excepcion.
        # Solo httpx.HTTPError: un error de programacion propaga sin enmascarar.
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo consultar un servicio relacionado",
        )
    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo consultar un servicio relacionado",
        )
    return response.json()


def _service_headers(method: str, path: str) -> dict:
    return service_headers(settings.jwt_secret_key, settings.service_name, method, path)


async def _load(
    db: AsyncSession, interaction_id: uuid.UUID, auth: AuthContext
) -> tuple[Interaction, dict, bool]:
    """Devuelve (postulacion, reto, es_duenio) verificando permisos de lectura."""
    interaction = (
        await db.execute(select(Interaction).where(Interaction.id == interaction_id))
    ).scalar_one_or_none()
    if not interaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interaction not found")

    challenge = await _fetch_json(
        f"{settings.core_service_url}/api/v1/core/challenges/{interaction.challenge_id}"
    )
    is_owner = str(interaction.solucionador_id) == auth.payload.sub
    is_author = challenge.get("author_id") == auth.payload.sub
    if not (is_owner or is_author or auth.payload.role == UserRole.ADMIN):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No autorizado para ver los documentos de esta postulación",
        )
    return interaction, challenge, is_owner


async def _documents(db: AsyncSession, interaction_id: uuid.UUID) -> dict[str, InteractionDocument]:
    result = await db.execute(
        select(InteractionDocument).where(InteractionDocument.interaction_id == interaction_id)
    )
    return {doc.tipo: doc for doc in result.scalars().all()}


def _applies(interaction: Interaction, challenge: dict) -> bool:
    return challenge.get("tipo") == "practica" and interaction.status == InteractionStatus.APROBADO


@router.get("/{interaction_id}/documentos", response_model=DocumentChecklist)
async def list_documents(
    interaction_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lista de documentos requisito con su estado de carga."""
    interaction, challenge, _ = await _load(db, interaction_id, auth)
    docs = await _documents(db, interaction_id)
    required = [
        RequiredDocument(
            tipo=tipo,
            label=label,
            documento=DocumentInfo.model_validate(docs[tipo]) if tipo in docs else None,
        )
        for tipo, label in REQUIRED_DOCUMENTS.items()
    ]
    return DocumentChecklist(
        aplica=_applies(interaction, challenge),
        completos=all(r.documento for r in required),
        requeridos=required,
    )


@router.put("/{interaction_id}/documentos/{tipo}", response_model=DocumentInfo)
async def upload_document(
    interaction_id: uuid.UUID,
    tipo: str,
    file: UploadFile = File(...),
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """El estudiante seleccionado carga (o reemplaza) un documento requisito."""
    if tipo not in REQUIRED_DOCUMENTS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no requerido")
    interaction, challenge, is_owner = await _load(db, interaction_id, auth)
    if not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el estudiante seleccionado puede cargar sus documentos",
        )
    if not _applies(interaction, challenge):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Los documentos se cargan cuando la empresa te selecciona para una práctica",
        )

    content = await file.read(DOC_MAX_BYTES + 1)
    if len(content) > DOC_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El archivo supera el límite de 5 MB",
        )
    content_type = next((ct for sig, ct in DOC_SIGNATURES.items() if content.startswith(sig)), None)
    if not content_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no admitido: usa PDF, JPG o PNG",
        )

    doc = (await _documents(db, interaction_id)).get(tipo) or InteractionDocument(
        interaction_id=interaction_id, tipo=tipo
    )
    doc.filename = (file.filename or f"{tipo}")[:255]
    doc.content_type = content_type
    doc.size = len(content)
    doc.data = content
    doc.uploaded_at = datetime.utcnow()
    db.add(doc)
    try:
        await db.flush()
    except IntegrityError as exc:
        # El upsert secuencial reemplaza el documento; bajo carrera, la
        # restriccion uq_interaction_document_tipo convierte la doble carga
        # concurrente en 409 (nuevo detalle: no existia duplicado secuencial).
        await db.rollback()
        raise_duplicate_conflict(
            exc,
            constraint="uq_interaction_document_tipo",
            detail="El documento fue cargado por otra solicitud; intentalo de nuevo",
        )
        raise
    return DocumentInfo.model_validate(doc)


@router.get("/{interaction_id}/documentos/{tipo}")
async def download_document(
    interaction_id: uuid.UUID,
    tipo: str,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _load(db, interaction_id, auth)
    doc = (
        await db.execute(
            select(InteractionDocument)
            .options(undefer(InteractionDocument.data))
            .where(
                InteractionDocument.interaction_id == interaction_id,
                InteractionDocument.tipo == tipo,
            )
        )
    ).scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Documento no cargado")
    return Response(
        content=doc.data,
        media_type=doc.content_type,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{quote(doc.filename)}"},
    )


def _fecha(value: datetime) -> str:
    return f"{value.day} de {MESES[value.month - 1]} de {value.year}"


def build_endorsement_letter(student: dict, company: dict, challenge: dict,
                             interaction: Interaction, docs_date: datetime) -> bytes:
    """Carta de aval de practica en PDF (una pagina A4)."""
    margin = 64
    width = A4_WIDTH - 2 * margin
    blue = (0.114, 0.306, 0.847)
    gray = (0.42, 0.45, 0.5)
    empresa = company.get("empresa_nombre") or challenge.get("empresa_nombre") or company.get("full_name", "")
    codigo = f"VL-{str(interaction.id)[:8].upper()}"
    nivel = f", {student['semestre']}" if student.get("semestre") else ""

    pdf = Pdf()
    pdf.rect(0, A4_HEIGHT - 96, A4_WIDTH, 96, blue)
    pdf.text(margin, A4_HEIGHT - 48, "Universidad Libre · Seccional Barranquilla", 16, True, (1, 1, 1))
    pdf.text(margin, A4_HEIGHT - 70, "Coordinación de Prácticas Empresariales · ViaLibre", 10, False, (0.86, 0.9, 1))

    y = A4_HEIGHT - 140
    pdf.text(margin, y, f"Barranquilla, {_fecha(datetime.utcnow())}", 11)
    pdf.text(A4_WIDTH - margin - 150, y, f"Código: {codigo}", 10, True, gray)
    y -= 40
    pdf.text(margin, y, "Señores", 11)
    pdf.text(margin, y - 16, empresa.upper(), 11, True)
    if company.get("nit_empresa"):
        pdf.text(margin, y - 32, f"NIT {company['nit_empresa']}", 11)
    y -= 64
    y = pdf.paragraph(margin, y, f"Asunto: Carta de aval para práctica empresarial — {challenge['title']}",
                      width, 11, bold=True)
    y -= 12
    y = pdf.paragraph(margin, y, "Cordial saludo.", width)
    y -= 6
    y = pdf.paragraph(
        margin, y,
        f"La Universidad Libre Seccional Barranquilla avala a {student['full_name']}, estudiante del "
        f"programa de {student.get('programa_academico') or 'pregrado'}{nivel}, para realizar su práctica "
        f"empresarial en {empresa}, en la oferta «{challenge['title']}», a la cual fue seleccionado(a) "
        "a través de la plataforma ViaLibre.",
        width,
    )
    y -= 8
    y = pdf.paragraph(
        margin, y,
        "El estudiante cargó la documentación requerida para iniciar su práctica: documento de identidad, "
        f"certificado de matrícula vigente y certificado de afiliación a EPS (completa desde el "
        f"{_fecha(docs_date)}).",
        width,
    )
    y -= 8
    y = pdf.paragraph(
        margin, y,
        "Agradecemos a la empresa acompañar el proceso formativo del estudiante y reportar a la "
        "coordinación cualquier novedad durante el desarrollo de la práctica.",
        width,
    )
    y -= 70
    pdf.line(margin, y, margin + 220, y, (0.3, 0.3, 0.3))
    pdf.text(margin, y - 16, "Coordinación de Prácticas Empresariales", 11, True)
    pdf.text(margin, y - 32, "Universidad Libre · Seccional Barranquilla", 10, False, gray)

    pdf.line(margin, 72, A4_WIDTH - margin, 72)
    pdf.paragraph(
        margin, 56,
        f"Documento generado automáticamente por ViaLibre. Verificación: {codigo} · {student.get('email', '')}. "
        "Prototipo: la validez institucional requiere la firma de la coordinación de prácticas.",
        width, 8, color=gray, leading=11,
    )
    return pdf.output()


@router.get("/{interaction_id}/carta-aval")
async def download_endorsement_letter(
    interaction_id: uuid.UUID,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Carta de aval en PDF, disponible cuando los documentos requisito estan completos."""
    interaction, challenge, _ = await _load(db, interaction_id, auth)
    if not _applies(interaction, challenge):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La carta de aval aplica a prácticas en las que fuiste seleccionado",
        )
    docs = await _documents(db, interaction_id)
    missing = [label for tipo, label in REQUIRED_DOCUMENTS.items() if tipo not in docs]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Faltan documentos: {', '.join(missing)}",
        )

    auth_url = f"{settings.auth_service_url}/api/v1/auth/users"
    student_path = f"/api/v1/auth/users/{interaction.solucionador_id}"
    company_path = f"/api/v1/auth/users/{challenge['author_id']}"
    student = await _fetch_json(
        f"{auth_url}/{interaction.solucionador_id}",
        headers=_service_headers("GET", student_path),
    )
    company = await _fetch_json(
        f"{auth_url}/{challenge['author_id']}",
        headers=_service_headers("GET", company_path),
    )
    pdf = build_endorsement_letter(
        student, company, challenge, interaction, max(d.uploaded_at for d in docs.values())
    )
    filename = f"Carta de aval - {student['full_name']}.pdf"
    return Response(
        content=pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(filename)}"},
    )
