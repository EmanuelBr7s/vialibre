"""
Seed script for Vialibre match-service.
Simulates applications between students/graduates and the demo publications,
including practice documents for the endorsement letter. Idempotent.

Usage:
  docker-compose exec match-service python -m app.seed_match
"""

import asyncio
import uuid
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.document import InteractionDocument
from app.models.interaction import Interaction, InteractionStatus
from vialibre_common.pdf import Pdf


def _uid(n: int) -> uuid.UUID:
    return uuid.UUID(f"00000000-0000-0000-0000-{n:012d}")


def _pub(n: int) -> uuid.UUID:
    return uuid.UUID(f"c0000000-0000-0000-0000-{n:012d}")


def _int(n: int) -> uuid.UUID:
    return uuid.UUID(f"e0000000-0000-0000-0000-{n:012d}")


# Fixed UUIDs (matching auth-service and core-service seeds)
LEONARDO, VALENTINA, ANDRES, MARIANA = _uid(3), _uid(201), _uid(202), _uid(203)
SEBASTIAN, DANIELA = _uid(204), _uid(205)
LAURA, JORGE, NATALIA, RICARDO = _uid(301), _uid(302), _uid(303), _uid(304)

RETO_MANGO = uuid.UUID("aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
RETO_ECOMMERCE = uuid.UUID("bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
RETO_ISO = uuid.UUID("cccc3333-cccc-cccc-cccc-cccccccccccc")
PRACTICA_WEB, PRACTICA_CONTABLE, PRACTICA_AMBIENTAL, PRACTICA_JURIDICA = _pub(11), _pub(12), _pub(13), _pub(14)
EMPLEO_BACKEND, EMPLEO_CONTABLE, EMPLEO_ABOGADO, EMPLEO_PROCESOS = _pub(21), _pub(22), _pub(23), _pub(24)

P, A, R = InteractionStatus.PENDIENTE, InteractionStatus.APROBADO, InteractionStatus.RECHAZADO

INTERACTIONS = [
    # (id, estudiante, publicación, estado, mensaje, documentos de práctica cargados)
    (uuid.UUID("dddd4444-dddd-dddd-dddd-dddddddddddd"), LEONARDO, RETO_ISO, A,
     "Soy estudiante de Ingeniería de Sistemas con experiencia en redes y seguridad informática. Me interesa participar en esta auditoría.", []),
    (_int(1), LEONARDO, PRACTICA_WEB, A,
     "Trabajo con Next.js y FastAPI en un proyecto real; me encantaría hacer mi práctica con ustedes.",
     ["documento_identidad", "certificado_matricula"]),
    (_int(2), MARIANA, PRACTICA_CONTABLE, A,
     "He presentado más de 40 declaraciones de renta en el consultorio contable de la universidad.",
     ["documento_identidad", "certificado_matricula", "afiliacion_eps"]),
    (_int(3), VALENTINA, RETO_MANGO, P, "Puedo aportar en la parte de datos y simulación con mi equipo del Laboratorio de Innovación.", []),
    (_int(4), DANIELA, RETO_MANGO, A, "Tenemos un mapa de riesgo hídrico de Malambo que sirve como variable para el modelo.", []),
    (_int(5), VALENTINA, RETO_ECOMMERCE, P, "Propongo un flujo de compra simple pensado en celulares y un tablero de inventario.", []),
    (_int(6), ANDRES, RETO_ECOMMERCE, P, "Ya construí una tienda virtual para un emprendimiento familiar; adjunto mi portafolio.", []),
    (_int(7), ANDRES, PRACTICA_WEB, P, "Me interesa crecer como desarrollador frontend con buenas prácticas.", []),
    (_int(8), DANIELA, PRACTICA_AMBIENTAL, P, "Tengo experiencia en muestreo de suelos y QGIS.", []),
    (_int(9), SEBASTIAN, PRACTICA_JURIDICA, P, "Acompaño casos laborales en el consultorio jurídico desde hace un año.", []),
    (_int(10), LAURA, EMPLEO_BACKEND, A, "Dos años como backend en Python; me interesa el esquema híbrido.", []),
    (_int(11), JORGE, EMPLEO_CONTABLE, P, "Experiencia en revisoría fiscal y nómina electrónica para pymes.", []),
    (_int(12), NATALIA, EMPLEO_ABOGADO, R, "Abogada laboral con experiencia en conciliaciones.", []),
    (_int(13), RICARDO, EMPLEO_PROCESOS, P, "Green Belt con experiencia en plantas de alimentos.", []),
]

DOC_LABELS = {
    "documento_identidad": "Documento de identidad",
    "certificado_matricula": "Certificado de matrícula vigente",
    "afiliacion_eps": "Certificado de afiliación a EPS",
}


def demo_document(label: str) -> bytes:
    pdf = Pdf()
    pdf.text(56, 780, label, 18, True)
    pdf.text(56, 750, "Documento de demostración para el prototipo ViaLibre.", 11)
    return pdf.output()


async def seed_interactions(db: AsyncSession) -> None:
    now = datetime.utcnow()
    for i, (iid, student, challenge, status, message, docs) in enumerate(INTERACTIONS):
        interaction = (await db.execute(select(Interaction).where(Interaction.id == iid))).scalar_one_or_none()
        if interaction is None:
            # Respeta la restricción única (estudiante, publicación) si ya existía con otro id.
            interaction = (
                await db.execute(
                    select(Interaction).where(
                        Interaction.solucionador_id == student, Interaction.challenge_id == challenge
                    )
                )
            ).scalar_one_or_none() or Interaction(id=iid, solucionador_id=student, challenge_id=challenge)
            db.add(interaction)
        interaction.status = status
        interaction.message = message
        interaction.contact_unlocked = status == A
        interaction.contact_unlocked_at = now - timedelta(days=i) if status == A else None
        interaction.created_at = now - timedelta(days=3 + i)
        await db.flush()

        for tipo in docs:
            exists = (
                await db.execute(
                    select(InteractionDocument).where(
                        InteractionDocument.interaction_id == interaction.id, InteractionDocument.tipo == tipo
                    )
                )
            ).scalar_one_or_none()
            if exists:
                continue
            data = demo_document(DOC_LABELS[tipo])
            db.add(InteractionDocument(
                interaction_id=interaction.id, tipo=tipo, filename=f"{tipo}.pdf",
                content_type="application/pdf", size=len(data), data=data,
            ))
        await db.flush()
    print(f"  {len(INTERACTIONS)} postulaciones sembradas.")


async def main():
    print("Seeding Vialibre match database...")
    async with async_session() as db:
        try:
            await seed_interactions(db)
            await db.commit()
            print("Match seed complete!")
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
