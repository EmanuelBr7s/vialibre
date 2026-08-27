"""
Seed script for Vialibre core-service.
Creates initial challenges linked to auth-service users.

Usage:
  docker-compose exec core-service python -m app.seed_core
"""

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.challenge import Challenge, ChallengeStatus, DifficultyLevel


# These UUIDs must match the users created by auth-service seed
AUTH_USER_ADMIN = uuid.UUID("00000000-0000-0000-0000-000000000001")
AUTH_USER_PUBLICADOR = uuid.UUID("00000000-0000-0000-0000-000000000002")
AUTH_USER_SOLUCIONADOR = uuid.UUID("00000000-0000-0000-0000-000000000003")

# All challenges authored by the publicador user
SEED_AUTHOR = AUTH_USER_PUBLICADOR


CHALLENGES = [
    {
        "id": uuid.UUID("aaaa1111-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        "title": "Modelo predictivo para rendimiento de mango de hilaza",
        "short_description": (
            "Buscamos estudiantes que apliquen modelos de Machine Learning "
            "(XGBoost, Random Forest) con variables agroclimaticas para predecir cosechas."
        ),
        "long_description": """La finca Agropecuaria Malambo, ubicada en la zona bananera del Atlantico, enfrenta desafios significativos en la planificacion de sus cosechas de mango de hilaza. Actualmente, la toma de decisiones se basa en experiencia empirica y observaciones directas, lo que genera perdidas por sobreproduccion o subproduccion en distintas temporadas.

Buscamos un equipo de estudiantes o profesionales que disene e implemente un modelo predictivo capaz de estimar el rendimiento esperado de mango de hilaza por hectarea, utilizando variables como:

- Temperatura media mensual
- Precipitacion acumulada
- Humedad relativa del suelo
- Historial de rendimientos (ultimos 5 anos)
- Variedad del cultivar

El modelo debe ser capaz de generar predicciones con un horizonte de 3 a 6 meses, y presentarse en un dashboard interactivo que permita a los administradores de la finca visualizar escenarios de produccion.

Tecnologias sugeridas: Python, scikit-learn, XGBoost, Pandas, Streamlit o similar.""",
        "author_id": SEED_AUTHOR,
        "status": ChallengeStatus.ABIERTO,
        "difficulty": DifficultyLevel.HARD,
        "tags": ["Python", "ML", "Agronomia", "Dashboard"],
        "is_featured": True,
        "featured_score": 9.5,
    },
    {
        "id": uuid.UUID("bbbb2222-bbbb-bbbb-bbbb-bbbbbbbbbbbb"),
        "title": "Diseno de plataforma E-commerce y gestion de marca",
        "short_description": (
            "Necesitamos digitalizar nuestro catalogo de productos artesanales "
            "y posicionar la marca a nivel regional."
        ),
        "long_description": """Artesanias Llamas es una empresa familiar dedicada a la fabricacion de hamacas, chinchorros y tejidos tradicionales de la costa colombiana. Con mas de 20 anos de trayectoria, hemos consolidado una marca reconocida en el mercado local, pero nuestra presencia digital es practicamente inexistente.

Necesitamos desarrollar una plataforma de comercio electronico que:

- Presente un catalogo visual atractivo de nuestros productos
- Permita compras en linea con pasarela de pago (PSE, tarjeta)
- Incluya un sistema de gestion de inventario simple
- Cuent con un blog para compartir la historia artesanal y tecnicas de tejido
- Este optimizada para dispositivos moviles

Adicionalmente, requerimos apoyo en la definicion de la identidad visual de marca: logotipo, paleta de colores, tipografia y guidelines para redes sociales.

El publico objetivo son compradores de artesanias en Barranquilla, Santa Marta y Bogota, con edad entre 25 y 55 anos.""",
        "author_id": SEED_AUTHOR,
        "status": ChallengeStatus.ABIERTO,
        "difficulty": DifficultyLevel.MEDIUM,
        "tags": ["E-commerce", "Branding", "React", "Diseno UI/UX"],
        "is_featured": True,
        "featured_score": 8.8,
    },
    {
        "id": uuid.UUID("cccc3333-cccc-cccc-cccc-cccccccccccc"),
        "title": "Auditoria de seguridad y analisis de red (ISO 27001)",
        "short_description": (
            "Se requiere un analisis de vulnerabilidades y levantamiento "
            "de la estructura de red actual."
        ),
        "long_description": """La Rama Estudiantil IEEE de la Universidad Libre Seccional Barranquilla necesita realizar un diagnostico completo de la infraestructura de red y seguridad informatica de sus sistemas internos.

El alcance del proyecto incluye:

- Levantamiento topologico de la red actual (diagrama de red)
- Identificacion de dispositivos activos y vulnerabilidades
- Analisis de politicas de seguridad vigentes
- Evaluacion del cumplimiento parcial con estandar ISO 27001
- Informe detallado con hallazgos y recomendaciones
- Propuesta de plan de mejora a 12 meses

Herramientas sugeridas: Nmap, Nessus, Wireshark, OpenVAS.

Este proyecto es parte del programa de formacion tecnica de la rama y tiene como objetivo sensibilizar a los estudiantes sobre la importancia de la ciberseguridad en entornos educativos.""",
        "author_id": SEED_AUTHOR,
        "status": ChallengeStatus.ABIERTO,
        "difficulty": DifficultyLevel.HARD,
        "tags": ["Redes", "ISO 27001", "Pentesting", "Analisis"],
        "is_featured": False,
        "featured_score": 7.5,
    },
]


async def seed_challenges(db: AsyncSession) -> None:
    """Create challenges if they don't exist."""
    for challenge_data in CHALLENGES:
        result = await db.execute(
            select(Challenge).where(Challenge.id == challenge_data["id"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"  Challenge '{challenge_data['title'][:50]}...' already exists, skipping.")
            continue

        challenge = Challenge(**challenge_data)
        db.add(challenge)
        await db.flush()
        print(f"  Challenge '{challenge_data['title'][:50]}...' created.")


async def main():
    print("Seeding Vialibre core database...")
    async with async_session() as db:
        try:
            await seed_challenges(db)
            await db.commit()
            print("Core seed complete!")
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
