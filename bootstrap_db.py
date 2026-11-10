"""Prepara la base de datos de un microservicio antes de arrancarlo.

Las migraciones versionadas parten de un esquema ya existente (la primera,
``sync_schema_phase1``, solo añade columnas), así que sobre una base vacía
—p. ej. una base nueva de Neon— ``alembic upgrade head`` falla. Este script:

1. crea el esquema del servicio si no existe;
2. si el servicio nunca fue migrado (no existe su tabla de versión), crea las
   tablas desde los modelos y marca la base con ``alembic stamp head``;
3. en cualquier caso termina con ``alembic upgrade head``.

Una base que ya tiene versión no se toca más allá del ``upgrade`` habitual.

Uso (desde la carpeta del servicio):  python ../../bootstrap_db.py <auth|core|match>
"""

import asyncio
import importlib
import os
import subprocess
import sys

from sqlalchemy import text

# Los módulos ``app.*`` son los del servicio en el directorio actual.
sys.path.insert(0, os.getcwd())

MODELS = {
    "auth": ("user", "role", "tutor_docente"),
    "core": ("challenge", "category", "empresa"),
    "match": ("document", "interaction", "reaction", "practica"),
}


async def prepare(service: str) -> bool:
    """Devuelve True si la base estaba vacía y se crearon las tablas."""
    from app.config import settings
    from app.database import Base, engine

    for module in MODELS[service]:
        importlib.import_module(f"app.models.{module}")

    version_table = f"alembic_version_{service}"
    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{settings.schema_name}"'))
        exists = await conn.scalar(text("SELECT to_regclass(:name) IS NOT NULL"), {"name": version_table})
        if not exists:
            await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()
    return not exists


def alembic(*args: str) -> None:
    subprocess.run([sys.executable, "-m", "alembic", *args], check=True)


def main() -> None:
    service = sys.argv[1] if len(sys.argv) > 1 else ""
    if service not in MODELS:
        sys.exit(f"Uso: python bootstrap_db.py <{'|'.join(MODELS)}>")
    created = asyncio.run(prepare(service))
    if created:
        print(f"==> {service}: base vacía, tablas creadas desde los modelos; se marca la versión actual.")
        alembic("stamp", "head")
    alembic("upgrade", "head")


if __name__ == "__main__":
    main()
