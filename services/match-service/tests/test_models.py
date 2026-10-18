"""Pruebas del modelo Practica (Etapa 3.2).

Validan estructura, ausencia de FK entre servicios, la unicidad adoptada (D6:
maximo una Practica por Interaction) y que la migracion haya creado la tabla
con su restriccion en la base de datos.
"""

import pytest
from sqlalchemy import UniqueConstraint, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.models.practica import Practica

# Motor dedicado a pruebas con NullPool: evita reutilizar conexiones entre los
# distintos event loops que pytest-asyncio crea por cada prueba.
engine = create_async_engine(settings.database_url, poolclass=NullPool)

EXPECTED_COLUMNS = {
    "id",
    "challenge_id",
    "interaction_id",
    "solucionador_id",
    "empresa_id",
    "tutor_docente_id",
    "created_by",
    "estado_administrativo",
    "modalidad",
    "tipo_practica",
    "duracion_horas",
    "fecha_inicio",
    "fecha_fin",
    "anio_academico",
    "periodo_academico",
    "bilingue",
    "observaciones_institucionales",
    "fecha_formalizacion",
    "created_at",
    "updated_at",
}


def test_practica_metadata():
    assert Practica.__tablename__ == "practicas"
    assert Practica.__table__.schema == "vialibre_match"


def test_practica_columns():
    assert set(Practica.__table__.columns.keys()) == EXPECTED_COLUMNS


def test_practica_not_nullable_columns():
    not_nullable = {
        col.name for col in Practica.__table__.columns if not col.nullable
    }
    assert not_nullable == {"id", "bilingue", "created_at", "updated_at"}


def test_practica_has_no_foreign_keys():
    for col in Practica.__table__.columns:
        assert not col.foreign_keys, f"{col.name} no debe declarar FK"


def test_practica_unique_interaction_constraint_defined():
    names = {
        c.name
        for c in Practica.__table__.constraints
        if isinstance(c, UniqueConstraint)
    }
    assert "uq_practica_interaction" in names


@pytest.mark.asyncio
async def test_practicas_table_exists_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'vialibre_match' AND table_name = 'practicas'"
            )
        )
        names = {row[0] for row in result}
    assert EXPECTED_COLUMNS <= names


@pytest.mark.asyncio
async def test_practicas_unique_interaction_constraint_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT con.conname FROM pg_constraint con "
                "JOIN pg_class rel ON rel.oid = con.conrelid "
                "JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace "
                "WHERE nsp.nspname = 'vialibre_match' AND rel.relname = 'practicas' "
                "AND con.contype = 'u'"
            )
        )
        names = {row[0] for row in result}
    assert "uq_practica_interaction" in names


@pytest.mark.asyncio
async def test_practicas_no_foreign_keys_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT con.conname FROM pg_constraint con "
                "JOIN pg_class rel ON rel.oid = con.conrelid "
                "JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace "
                "WHERE nsp.nspname = 'vialibre_match' AND rel.relname = 'practicas' "
                "AND con.contype = 'f'"
            )
        )
        assert result.fetchall() == []
