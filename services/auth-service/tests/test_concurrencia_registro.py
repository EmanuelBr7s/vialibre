"""Pruebas de duplicados concurrentes en registro (B3-B.1).

Distingue explicitamente dos niveles de evidencia:

- UNIDAD (IntegrityError simulado): verifica la clasificacion del traductor
  de errores. NO demuestra ninguna carrera; solo prueba la traduccion.
- CONCURRENCIA REAL (PostgreSQL): una sesion independiente mantiene un usuario
  con el correo SIN commitear mientras un POST /api/v1/auth/register real
  (TestClient, en hilo propio) intenta registrar el mismo correo. La peticion
  queda bloqueada de verdad por el indice unico ix_vialibre_auth_users_email;
  la sincronizacion OBSERVA ese bloqueo en pg_stat_activity
  (wait_event_type='Lock') y solo entonces libera al rival. Si el INSERT nunca
  se bloquea, la prueba FALLA en lugar de simular exito.
"""

import asyncio
import threading
import time
import uuid

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.api.duplicates import raise_duplicate_conflict
from app.main import app
from app.models.role import Role
from app.models.user import User
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

REGISTER_URL = "/api/v1/auth/register"

_CONSTRAINT = "ix_vialibre_auth_users_email"
_DUPLICADO = "Email already registered"


# ── Maquinaria de carrera real (espejo de match-service; cada servicio es
# propietario de su codigo de pruebas) ──

_WAIT_LOCK_SQL = text(
    """
    SELECT pid, datname, state, wait_event_type, query
    FROM pg_stat_activity
    WHERE wait_event_type = 'Lock'
    """
)


async def _esperar_insert_bloqueado(patron: str, timeout: float = 20.0) -> None:
    """Espera a observar en pg_stat_activity el INSERT concurrente bloqueado.

    Patrion validado empiricamente contra este entorno: cada sondeo abre una
    conexion fresca (se cierra al salir) y el filtrado se hace en Python. La
    observacion del bloqueo real es la unica garantia de que la carrera se
    esta reproduciendo; si no ocurre, la prueba falla (nunca se afirma exito
    sin bloqueo real).
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        async with TestSession() as probe:
            filas = (await probe.execute(_WAIT_LOCK_SQL)).all()
        for _pid, datname, _state, _we, consulta in filas:
            if datname == "vialibre" and patron in (consulta or ""):
                return
        await asyncio.sleep(0.2)
    raise AssertionError(
        "El INSERT concurrente nunca quedo bloqueado por el indice unico: "
        "la carrera no se esta reproduciendo."
    )


def _sostener_insercion(insert_coro, inserted: threading.Event, release: threading.Event):
    """Sesion rival: inserta sin commitear y mantiene la transaccion abierta
    hasta que el test libera `release`; luego commitea."""

    async def _run():
        async with TestSession() as session:
            await insert_coro(session)
            inserted.set()
            await asyncio.to_thread(release.wait, 60)
            await session.commit()

    asyncio.run(_run())


def _ejecutar_carrera(insert_coro, patron_sql: str, peticion):
    """Coordina la carrera: rival inserta y retiene; la peticion real corre en
    su hilo; se observa el bloqueo real; se libera al rival; se devuelve la
    respuesta HTTP."""
    inserted, release = threading.Event(), threading.Event()
    rival = threading.Thread(
        target=_sostener_insercion, args=(insert_coro, inserted, release)
    )
    rival.start()
    try:
        assert inserted.wait(15), "el rival nunca llego a insertar"
        holder: dict = {}

        def _correr():
            holder["response"] = peticion()

        post = threading.Thread(target=_correr)
        post.start()
        asyncio.run(_esperar_insert_bloqueado(patron_sql))
        release.set()
        post.join(60)
        assert "response" in holder, "la peticion concurrente no finalizo"
        return holder["response"]
    finally:
        release.set()
        rival.join(60)


# ── Limpieza ──


def _limpiar_usuarios(*emails: str) -> None:
    async def _run():
        async with TestSession() as session:
            result = await session.execute(select(User).where(User.email.in_(emails)))
            for row in result.scalars():
                await session.delete(row)
            await session.commit()

    asyncio.run(_run())


# ── UNIDAD: clasificador con IntegrityError simulado (NO demuestra carrera) ──


def _integrity(mensaje: str) -> IntegrityError:
    return IntegrityError("INSERT INTO simulado", {}, Exception(mensaje))


def test_clasificador_reconoce_email_duplicado():
    exc = _integrity(
        f'duplicate key value violates unique constraint "{_CONSTRAINT}"'
    )
    with pytest.raises(HTTPException) as info:
        raise_duplicate_conflict(exc, constraint=_CONSTRAINT, detail=_DUPLICADO)
    assert info.value.status_code == 409
    assert info.value.detail == _DUPLICADO


def test_clasificador_no_confunde_otra_violacion_de_integridad():
    # Otra restriccion unica (nombre distinto): NO es el correo duplicado.
    otra_unica = _integrity(
        'duplicate key value violates unique constraint "users_pkey"'
    )
    assert (
        raise_duplicate_conflict(otra_unica, constraint=_CONSTRAINT, detail=_DUPLICADO)
        is None
    )
    # Violaicon NOT NULL: tampoco es duplicado.
    not_null = _integrity(
        'null value in column "full_name" violates not-null constraint'
    )
    assert (
        raise_duplicate_conflict(not_null, constraint=_CONSTRAINT, detail=_DUPLICADO)
        is None
    )


# ── Contratos secuenciales y de autorizacion (se conservan) ──


def test_registro_duplicado_secuencial_devuelve_409():
    email = f"dup-secuencial-{uuid.uuid4().hex[:12]}@example.com"
    payload = {
        "email": email,
        "password": "Secreto123",
        "full_name": "Registro Secuencial",
        "role": "solucionador",
        "programa_academico": "Ingeniería de Sistemas",
    }
    try:
        primero = client.post(REGISTER_URL, json=payload)
        assert primero.status_code == 201  # contrato de exito sin cambios
        assert "access_token" in primero.json()
        segundo = client.post(REGISTER_URL, json=payload)
        assert segundo.status_code == 409
        assert segundo.json()["detail"] == _DUPLICADO
        assert "constraint" not in segundo.text.lower()
    finally:
        _limpiar_usuarios(email)


def test_registro_rol_privado_sigue_rechazado():
    """La capa de autorizacion no cambia: el registro publico no admite admin
    (rechazo en validacion de esquema, HTTP 422)."""
    response = client.post(
        REGISTER_URL,
        json={
            "email": f"admin-intento-{uuid.uuid4().hex[:12]}@example.com",
            "password": "Secreto123",
            "full_name": "Intento Admin",
            "role": "admin",
        },
    )
    assert response.status_code == 422


# ── CONCURRENCIA REAL contra PostgreSQL ──


def test_registro_duplicado_concurrente_devuelve_409():
    email = f"dup-concurrente-{uuid.uuid4().hex[:12]}@example.com"

    async def rival_insert(session):
        rol = (
            await session.execute(
                select(Role).where(Role.name == UserRole.SOLUCIONADOR.value)
            )
        ).scalar_one()
        session.add(
            User(
                email=email,
                password_hash="x",
                full_name="Rival Concurrente",
                role_id=rol.id,
            )
        )
        await session.flush()

    def peticion():
        return client.post(
            REGISTER_URL,
            json={
                "email": email,
                "password": "Secreto123",
                "full_name": "Registro Concurrente",
                "role": "solucionador",
                "programa_academico": "Ingeniería de Sistemas",
            },
        )

    otro_email = f"post-carrera-{uuid.uuid4().hex[:12]}@example.com"
    try:
        response = _ejecutar_carrera(
            rival_insert, "INSERT INTO vialibre_auth.users", peticion
        )
        assert response.status_code == 409
        assert response.json()["detail"] == _DUPLICADO
        # La respuesta no filtra SQL ni restricciones internas.
        assert "constraint" not in response.text.lower()

        # El servicio sigue operativo tras el 409: un registro con otro correo
        # termina en 201 (la sesion se recicla correctamente).
        otro = client.post(
            REGISTER_URL,
            json={
                "email": otro_email,
                "password": "Secreto123",
                "full_name": "Post Carrera",
                "role": "solucionador",
                "programa_academico": "Ingeniería de Sistemas",
            },
        )
        assert otro.status_code == 201
        assert "access_token" in otro.json()
    finally:
        _limpiar_usuarios(email, otro_email)
