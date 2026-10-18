"""Pruebas del modelo Empresa (Etapa 3.2).

Validan estructura, ausencia de FK hacia User (D4/D11 pendientes), que no se
dupliquen los campos empresariales de User y que la migracion haya creado la
tabla en la base de datos.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from app.config import settings
from app.models.empresa import Empresa

# Motor dedicado a pruebas con NullPool: evita reutilizar conexiones entre los
# distintos event loops que pytest-asyncio crea por cada prueba.
engine = create_async_engine(settings.database_url, poolclass=NullPool)

EXPECTED_COLUMNS = {
    "id",
    "nit",
    "razon_social",
    "sector",
    "representante_legal",
    "contacto_email",
    "contacto_telefono",
    "publicador_user_id",
    "activa",
    "created_at",
    "updated_at",
}


def test_empresa_metadata():
    assert Empresa.__tablename__ == "empresas"
    assert Empresa.__table__.schema == "vialibre_core"


def test_empresa_columns():
    assert set(Empresa.__table__.columns.keys()) == EXPECTED_COLUMNS


def test_empresa_not_nullable_columns():
    not_nullable = {col.name for col in Empresa.__table__.columns if not col.nullable}
    assert not_nullable == {"id", "activa", "created_at", "updated_at"}


def test_empresa_has_no_foreign_keys():
    for col in Empresa.__table__.columns:
        assert not col.foreign_keys, f"{col.name} no debe declarar FK"


def test_empresa_does_not_duplicate_user_business_fields():
    # Regla: no duplicar User.nit_empresa ni User.empresa_nombre.
    assert "nit_empresa" not in Empresa.__table__.columns
    assert "empresa_nombre" not in Empresa.__table__.columns


@pytest.mark.asyncio
async def test_empresas_table_exists_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_schema = 'vialibre_core' AND table_name = 'empresas'"
            )
        )
        names = {row[0] for row in result}
    assert EXPECTED_COLUMNS <= names


@pytest.mark.asyncio
async def test_empresas_column_types_in_db():
    async with engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT column_name, data_type, is_nullable FROM information_schema.columns "
                "WHERE table_schema = 'vialibre_core' AND table_name = 'empresas'"
            )
        )
        rows = {row[0]: (row[1], row[2]) for row in result}
    assert rows["id"] == ("uuid", "NO")
    assert rows["publicador_user_id"] == ("uuid", "YES")
    assert rows["activa"] == ("boolean", "NO")
