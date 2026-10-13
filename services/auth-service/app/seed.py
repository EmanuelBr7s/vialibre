"""
Seed script for Vialibre auth-service.
Creates initial roles and test users with FIXED UUIDs.
"""

import asyncio
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.database import async_session
from app.models.role import Role
from app.models.user import User


# Fixed UUIDs for deterministic seeding
ROLE_ADMIN_ID = uuid.UUID("a0000000-0000-0000-0000-000000000001")
ROLE_PUBLICADOR_ID = uuid.UUID("a0000000-0000-0000-0000-000000000002")
ROLE_SOLUCIONADOR_ID = uuid.UUID("a0000000-0000-0000-0000-000000000003")
ROLE_EGRESADO_ID = uuid.UUID("a0000000-0000-0000-0000-000000000004")

USER_ADMIN_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
USER_PUBLICADOR_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
USER_SOLUCIONADOR_ID = uuid.UUID("00000000-0000-0000-0000-000000000003")


ROLES = [
    {"id": ROLE_ADMIN_ID, "name": "admin", "description": "Administrator with full access"},
    {"id": ROLE_PUBLICADOR_ID, "name": "publicador", "description": "Organization that publishes challenges"},
    {"id": ROLE_SOLUCIONADOR_ID, "name": "solucionador", "description": "Student/solver that accepts challenges"},
    {"id": ROLE_EGRESADO_ID, "name": "egresado", "description": "Graduate looking for job offers"},
]

USERS = [
    {
        "id": USER_ADMIN_ID,
        "full_name": "Juan Camilo Llamas Cardenas",
        "email": "admin@vialibre.edu.co",
        "password": "Admin1234",
        "role_name": "admin",
        "programa_academico": "Ingenieria de Sistemas",
    },
    {
        "id": USER_PUBLICADOR_ID,
        "full_name": "Artesanias Llamas",
        "email": "contacto@artesaniasllamas.com",
        "password": "Publicador1234",
        "role_name": "publicador",
        "nit_empresa": "900.123.456-7",
        "empresa_nombre": "Artesanias Llamas",
    },
    {
        "id": USER_SOLUCIONADOR_ID,
        "full_name": "Leonardo Barraza",
        "email": "leonardo@vialibre.edu.co",
        "password": "Solucionador1234",
        "role_name": "solucionador",
        "programa_academico": "Ingenieria de Sistemas",
        "afiliacion_academica": "Rama Estudiantil IEEE",
    },
]


async def seed_roles(db: AsyncSession) -> dict[str, Role]:
    """Create roles if they don't exist. Returns name->Role mapping."""
    roles_map = {}
    for role_data in ROLES:
        result = await db.execute(
            select(Role).where(Role.name == role_data["name"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            roles_map[role_data["name"]] = existing
            print(f"  Role '{role_data['name']}' already exists, skipping.")
        else:
            role = Role(**role_data)
            db.add(role)
            await db.flush()
            roles_map[role_data["name"]] = role
            print(f"  Role '{role_data['name']}' created.")
    return roles_map


async def seed_users(db: AsyncSession, roles_map: dict[str, Role]) -> None:
    """Create test users if they don't exist."""
    for user_data in USERS:
        result = await db.execute(
            select(User).where(User.email == user_data["email"])
        )
        existing = result.scalar_one_or_none()
        if existing:
            print(f"  User '{user_data['email']}' already exists, skipping.")
            continue

        role_name = user_data.pop("role_name")
        password = user_data.pop("password")
        user_id = user_data.pop("id")
        role = roles_map[role_name]

        user = User(
            id=user_id,
            email=user_data["email"],
            password_hash=hash_password(password),
            full_name=user_data["full_name"],
            role_id=role.id,
            nit_empresa=user_data.get("nit_empresa"),
            empresa_nombre=user_data.get("empresa_nombre"),
            programa_academico=user_data.get("programa_academico"),
            afiliacion_academica=user_data.get("afiliacion_academica"),
        )
        db.add(user)
        await db.flush()
        print(f"  User '{user_data['email']}' created (id: {user_id}).")


async def main():
    print("Seeding Vialibre auth database...")
    async with async_session() as db:
        try:
            roles_map = await seed_roles(db)
            await seed_users(db, roles_map)
            await db.commit()
            print("Auth seed complete!")
        except Exception as e:
            await db.rollback()
            print(f"Error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(main())
