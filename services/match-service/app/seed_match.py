"""
Seed script for Vialibre match-service.
Simulates real interactions between users and challenges.

Usage:
  docker-compose exec match-service python -m app.seed_match
"""

import asyncio
import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.interaction import Interaction, InteractionStatus


# Fixed UUIDs (matching auth-service and core-service seeds)
USER_SOLUCIONADOR_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")  # Leonardo Barraza
IEEE_CHALLENGE_ID = uuid.UUID("cccc3333-cccc-cccc-cccc-cccccccccccc")    # Auditoria ISO 27001
INTERACTION_ID = uuid.UUID("dddd4444-dddd-dddd-dddd-dddddddddddd")       # Fixed ID for the interaction


INTERACTIONS = [
    {
        "id": INTERACTION_ID,
        "solucionador_id": USER_SOLUCIONADOR_ID,
        "challenge_id": IEEE_CHALLENGE_ID,
        "status": InteractionStatus.APROBADO,
        "message": "Hola, soy estudiante de Ingenieria de Sistemas con experiencia en redes y seguridad informatica. Me interesa participar en esta auditoria.",
        "contact_unlocked": True,
        "contact_unlocked_at": datetime.utcnow(),
    },
]


async def seed_interactions(db: AsyncSession) -> None:
    """Create interactions if they don't exist."""
    for interaction_data in INTERACTIONS:
        result = await db.execute(
            select(Interaction).where(Interaction.id == interaction_data["id"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"  Interaction {interaction_data['id']} already exists, skipping.")
            continue

        interaction = Interaction(**interaction_data)
        db.add(interaction)
        await db.flush()
        print(f"  Interaction created: Leonardo -> IEEE ISO 27001 (APROBADO)")


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
