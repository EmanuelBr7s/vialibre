"""Fixtures compartidas: sobreescriben la dependencia get_db con un motor
NullPool para que las pruebas sean robustas frente a los event loops por prueba.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.database import get_db
from app.main import app
from tests.helpers import test_engine

TestSession = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


async def _get_test_db():
    async with TestSession() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture(autouse=True)
def override_db():
    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()
