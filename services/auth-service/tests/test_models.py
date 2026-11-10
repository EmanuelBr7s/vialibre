"""Pruebas del modelo TutorDocente (Etapa 3.2).

Validan estructura, ausencia de FK/relacion (D3 pendiente) y que la migracion
haya creado la tabla en la base de datos.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.models.tutor_docente import TutorDocente

# Motor dedicado a pruebas con NullPool: evita reutilizar conexiones entre los
# distintos event loops que pytest-asyncio crea por cada prueba.
engine = create_async_engine(settings.database_url, poolclass=NullPool)

EXPECTED_COLUMNS = {
    "id",
    "identificacion",
    "nombres",
    "apellidos",
    "email",
    "telefono",
    "programa_academico",
    "user_id",
    "activo",
    "created_at",
    "updated_at",
}


def test_tutor_docente_metadata():
    assert TutorDocente.__tablename__ == "tutores_docentes"
    assert TutorDocente.__table__.schema == "vialibre_auth"


def test_tutor_docente_columns():
    assert set(TutorDocente.__table__.columns.keys()) == EXPECTED_COLUMNS


def test_tutor_docente_not_nullable_columns():
    not_nullable = {col.name for col in TutorDocente.__table__.columns if not col.nullable}
    assert not_nullable == {"id", "activo", "created_at", "updated_at"}


def test_tutor_docente_has_no_foreign_keys():
    for col in TutorDocente.__table__.columns:
        assert not col.foreign_keys, f"{col.name} no debe declarar FK"


def test_tutor_docente_has_no_relationship():
    # D3 pendiente: no se modela la relacion con User.
    assert list(TutorDocente.__mapper__.relationships) == []


@pytest.mark.asyncio
async def test_tutores_docentes_table_exists_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'vialibre_auth' AND table_name = 'tutores_docentes'"
            )
        )
        names = {row[0] for row in result}
    assert EXPECTED_COLUMNS <= names


@pytest.mark.asyncio
async def test_tutores_docentes_column_types_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                "WHERE table_schema = 'vialibre_auth' AND table_name = 'tutores_docentes'"
            )
        )
        rows = {row[0]: (row[1], row[2]) for row in result}
    assert rows["id"] == ("uuid", "NO")
    assert rows["user_id"] == ("uuid", "YES")
    assert rows["activo"] == ("boolean", "NO")
