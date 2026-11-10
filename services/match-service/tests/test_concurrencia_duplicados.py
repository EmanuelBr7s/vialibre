"""Pruebas de duplicados concurrentes (B3-B.1).

Distingue explicitamente dos niveles de evidencia:

- UNIDAD (IntegrityError simulado): verifica la clasificacion del traductor
  de errores. NO demuestra ninguna carrera; solo prueba la traduccion.
- CONCURRENCIA REAL (PostgreSQL): una sesion independiente mantiene una
  insercion SIN commitear mientras una peticion HTTP real (TestClient, en
  hilo propio) intenta insertar el mismo registro. La peticion concurrente
  queda bloqueada de verdad por el indice unico; la sincronizacion OBSERVA
  ese bloqueo en pg_stat_activity (wait_event_type='Lock') y solo entonces
  libera al rival. Si el INSERT nunca se bloquea, la prueba FALLA en lugar
  de simular exito. No hay sleeps de esperanza ni probabilidades.
"""

import asyncio
import threading
import time
import uuid

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError

from app.api.duplicates import raise_duplicate_conflict
from app.main import app
from app.models.document import InteractionDocument
from app.models.interaction import Interaction, InteractionStatus
from app.models.practica import Practica
from app.models.reaction import Reaction, ReactionType
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

APPLY_URL = "/api/v1/match/interactions/apply"
PRACTICAS_URL = "/api/v1/match/practicas"
REACTIONS_URL = "/api/v1/match/reactions"
DOCUMENTOS_URL = "/api/v1/match/interactions"


# ── Maquinaria de carrera real ──

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
        "El INSERT concurrente nunca quedo bloqueado por la restriccion unica: "
        "la carrera no se esta reproduciendo."
    )


def _sostener_insercion(insert_coro, inserted: threading.Event, release: threading.Event):
    """Sesion rival: inserta sin commitear y mantiene la transaccion abierta
    hasta que el test libera `release`; luego commitea (la carrera se resuelve
    contra la fila ya confirmada)."""

    async def _run():
        async with TestSession() as session:
            await insert_coro(session)
            inserted.set()
            await asyncio.to_thread(release.wait, 60)
            await session.commit()

    asyncio.run(_run())


def _ejecutar_carrera(insert_coro, patron: str, peticion):
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
        asyncio.run(_esperar_insert_bloqueado(patron))
        release.set()
        post.join(60)
        assert "response" in holder, "la peticion concurrente no finalizo"
        return holder["response"]
    finally:
        release.set()
        rival.join(60)


# ── Limpieza ──


def _limpiar(interaction_ids=(), practica_ids=(), reaction_ids=(), documento_ids=()):
    async def _run():
        async with TestSession() as session:
            for did in documento_ids:
                obj = await session.get(InteractionDocument, uuid.UUID(did))
                if obj is not None:
                    await session.delete(obj)
            for pid in practica_ids:
                obj = await session.get(Practica, uuid.UUID(pid))
                if obj is not None:
                    await session.delete(obj)
            for rid in reaction_ids:
                obj = await session.get(Reaction, uuid.UUID(rid))
                if obj is not None:
                    await session.delete(obj)
            for iid in interaction_ids:
                obj = await session.get(Interaction, uuid.UUID(iid))
                if obj is not None:
                    await session.delete(obj)
            await session.commit()

    asyncio.run(_run())


# ── UNIDAD: clasificador con IntegrityError simulado (NO demuestra carrera) ──


def _integrity(mensaje: str) -> IntegrityError:
    return IntegrityError("INSERT INTO simulado", {}, Exception(mensaje))


def test_clasificador_reconoce_su_restriccion_unica():
    exc = _integrity(
        'duplicate key value violates unique constraint "uq_solucionador_challenge"'
    )
    with pytest.raises(HTTPException) as info:
        raise_duplicate_conflict(
            exc, constraint="uq_solucionador_challenge", detail="duplicado"
        )
    assert info.value.status_code == 409
    assert info.value.detail == "duplicado"


def test_clasificador_no_confunde_otra_violacion_de_integridad():
    # Otra restriccion unica (nombre distinto): NO es el duplicado del endpoint.
    otra_unica = _integrity(
        'duplicate key value violates unique constraint "users_pkey"'
    )
    assert (
        raise_duplicate_conflict(
            otra_unica, constraint="uq_solucionador_challenge", detail="dup"
        )
        is None
    )
    # Violaicon NOT NULL: tampoco es duplicado.
    not_null = _integrity(
        'null value in column "status" violates not-null constraint'
    )
    assert (
        raise_duplicate_conflict(
            not_null, constraint="uq_solucionador_challenge", detail="dup"
        )
        is None
    )
    # Violacion de clave foranea: tampoco es duplicado.
    fk = _integrity(
        'insert or update on table "x" violates foreign key constraint'
    )
    assert (
        raise_duplicate_conflict(
            fk, constraint="uq_solucionador_challenge", detail="dup"
        )
        is None
    )


# ── Ciclo de vida de sesion tras gestionar el error ──


def test_sesion_sigue_usable_tras_rollback_de_duplicado():
    async def _run():
        solucionador, challenge = uuid.uuid4(), uuid.uuid4()
        async with TestSession() as session:
            session.add(Interaction(solucionador_id=solucionador, challenge_id=challenge))
            await session.commit()
            # Duplicado -> IntegrityError -> rollback -> sesion sigue viva.
            session.add(Interaction(solucionador_id=solucionador, challenge_id=challenge))
            with pytest.raises(IntegrityError):
                await session.flush()
            await session.rollback()
            fila = (
                await session.execute(
                    select(Interaction).where(
                        Interaction.solucionador_id == solucionador,
                        Interaction.challenge_id == challenge,
                    )
                )
            ).scalar_one_or_none()
            assert fila is not None
            # Escritura posterior valida en la misma sesion.
            session.add(
                Interaction(solucionador_id=uuid.uuid4(), challenge_id=challenge)
            )
            await session.flush()
            await session.rollback()

    asyncio.run(_run())


# ── Contratos secuenciales (se conservan) ──


def test_apply_duplicado_secuencial_devuelve_409(monkeypatch):
    # Adaptacion B3-B.4/F5.1: apply valida ahora la existencia del reto en
    # core-service; el transporte falso de 200 hace que el reto "exista" para
    # no alterar el contrato secuencial que aqui se fija (201 -> 409). El
    # chequeo local de duplicado sigue respondiendo antes de cualquier llamada
    # remota.
    monkeypatch.setattr(httpx, "AsyncClient", _cliente_reto_practica)
    solucionador, challenge = uuid.uuid4(), uuid.uuid4()
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=solucionador)
    payload = {"challenge_id": str(challenge), "message": "primera"}
    try:
        primero = client.post(APPLY_URL, json=payload, headers=headers)
        assert primero.status_code == 201  # contrato de exito sin cambios
        segundo = client.post(APPLY_URL, json=payload, headers=headers)
        assert segundo.status_code == 409
        assert segundo.json()["detail"] == "You already applied to this challenge"
        assert "constraint" not in segundo.text.lower()
    finally:
        async def _run():
            async with TestSession() as session:
                result = await session.execute(
                    select(Interaction).where(
                        Interaction.solucionador_id == solucionador
                    )
                )
                for row in result.scalars():
                    await session.delete(row)
                await session.commit()

        asyncio.run(_run())


def test_apply_sin_token_sigue_devolviendo_401():
    assert (
        client.post(APPLY_URL, json={"challenge_id": str(uuid.uuid4())}).status_code
        == 401
    )


def test_reaccion_duplicada_secuencial_devuelve_409():
    usuario, challenge = uuid.uuid4(), uuid.uuid4()
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=usuario)
    payload = {"challenge_id": str(challenge), "reaction_type": "like"}
    reaction_id = None
    try:
        primero = client.post(REACTIONS_URL, json=payload, headers=headers)
        assert primero.status_code == 201
        reaction_id = primero.json()["id"]
        segundo = client.post(REACTIONS_URL, json=payload, headers=headers)
        assert segundo.status_code == 409
        assert (
            segundo.json()["detail"]
            == "You already have a like reaction for this challenge"
        )
    finally:
        _limpiar(reaction_ids=[reaction_id] if reaction_id else [])


def test_documento_secuencial_se_reemplaza(monkeypatch):
    """El upsert secuencial reemplaza el documento (contrato sin cambios):
    un segundo PUT con el mismo tipo devuelve 200 y el nuevo contenido, no 409."""
    solucionador = uuid.uuid4()
    interaccion = _crear_interaccion_aprobada(solucionador)
    monkeypatch.setattr(httpx, "AsyncClient", _cliente_reto_practica)
    try:
        primero = _subir_documento(interaccion, solucionador, nombre="primero.pdf")
        assert primero.status_code == 200
        assert primero.json()["filename"] == "primero.pdf"
        segundo = _subir_documento(interaccion, solucionador, nombre="segundo.pdf")
        assert segundo.status_code == 200  # reemplazo, no 409
        assert segundo.json()["filename"] == "segundo.pdf"
        assert segundo.json()["tipo"] == "documento_identidad"
        assert segundo.json()["size"] == primero.json()["size"]
    finally:
        async def _run():
            async with TestSession() as session:
                result = await session.execute(
                    select(InteractionDocument).where(
                        InteractionDocument.interaction_id == interaccion.id
                    )
                )
                for row in result.scalars():
                    await session.delete(row)
                await session.commit()

        asyncio.run(_run())
        _limpiar(interaction_ids=[str(interaccion.id)])


# ── Utilidades de documentos ──


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


class _cliente_reto_practica:
    """Transporte falso: el reto consultado es una practica."""

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        return _FakeResponse(200, {"author_id": str(uuid.uuid4()), "tipo": "practica"})


def _crear_interaccion_aprobada(solucionador: uuid.UUID) -> Interaction:
    async def _run():
        async with TestSession() as session:
            interaccion = Interaction(
                solucionador_id=solucionador,
                challenge_id=uuid.uuid4(),
                status=InteractionStatus.APROBADO,
            )
            session.add(interaccion)
            await session.commit()
            return interaccion

    return asyncio.run(_run())


def _subir_documento(
    interaccion: Interaction, solucionador: uuid.UUID, nombre: str = "doc.pdf"
):
    return client.put(
        f"{DOCUMENTOS_URL}/{interaccion.id}/documentos/documento_identidad",
        files={"file": (nombre, b"%PDF-1.4\ncontenido", "application/pdf")},
        headers=auth_headers(UserRole.SOLUCIONADOR, sub=solucionador),
    )


# ── CONCURRENCIA REAL contra PostgreSQL ──


def test_apply_duplicado_concurrente_devuelve_409(monkeypatch):
    # Adaptacion B3-B.4/F5.1: el reto remoto pasa a existir via transporte
    # falso de 200 para que la peticion alcance el INSERT y la carrera real
    # contra el indice unico de PostgreSQL se reproduzca tal cual. Solo se
    # stubbea la EXISTENCIA del reto: el bloqueo observado en
    # pg_stat_activity, la sesion rival sin commitear y las aserciones de
    # 409 permanecen intactos.
    monkeypatch.setattr(httpx, "AsyncClient", _cliente_reto_practica)
    solucionador, challenge = uuid.uuid4(), uuid.uuid4()

    async def rival_insert(session):
        session.add(Interaction(solucionador_id=solucionador, challenge_id=challenge))
        await session.flush()

    def peticion():
        return client.post(
            APPLY_URL,
            json={"challenge_id": str(challenge), "message": "concurrente"},
            headers=auth_headers(UserRole.SOLUCIONADOR, sub=solucionador),
        )

    try:
        response = _ejecutar_carrera(
            rival_insert, "INSERT INTO vialibre_match.interactions", peticion
        )
        assert response.status_code == 409
        assert response.json()["detail"] == "You already applied to this challenge"
        # La respuesta no filtra SQL ni restricciones internas.
        assert "constraint" not in response.text.lower()
        # La sesion del servicio sigue operativa tras el 409: otra aplica
        # distinta termina en 201.
        otro = client.post(
            APPLY_URL,
            json={"challenge_id": str(uuid.uuid4())},
            headers=auth_headers(UserRole.SOLUCIONADOR, sub=solucionador),
        )
        assert otro.status_code == 201
    finally:
        async def _run():
            async with TestSession() as session:
                result = await session.execute(
                    select(Interaction).where(Interaction.solucionador_id == solucionador)
                )
                for row in result.scalars():
                    await session.delete(row)
                await session.commit()

        asyncio.run(_run())


def test_practica_duplicada_concurrente_devuelve_409():
    headers = auth_headers(UserRole.ADMIN)
    solucionador = uuid.uuid4()

    async def _crear_interaccion():
        async with TestSession() as session:
            interaccion = Interaction(
                solucionador_id=solucionador, challenge_id=uuid.uuid4()
            )
            session.add(interaccion)
            await session.commit()
            return interaccion

    interaccion = asyncio.run(_crear_interaccion())

    async def rival_insert(session):
        session.add(Practica(interaction_id=interaccion.id, created_by=uuid.uuid4()))
        await session.flush()

    def peticion():
        return client.post(
            PRACTICAS_URL, json={"interaction_id": str(interaccion.id)}, headers=headers
        )

    practica_id = None
    try:
        response = _ejecutar_carrera(
            rival_insert, "INSERT INTO vialibre_match.practicas", peticion
        )
        assert response.status_code == 409
        assert (
            response.json()["detail"]
            == "Ya existe una practica formalizada para esta interaccion"
        )

        async def _pid():
            async with TestSession() as session:
                result = await session.execute(
                    select(Practica).where(Practica.interaction_id == interaccion.id)
                )
                fila = result.scalar_one_or_none()
                return str(fila.id) if fila else None

        practica_id = asyncio.run(_pid())
    finally:
        _limpiar(
            practica_ids=[practica_id] if practica_id else [],
            interaction_ids=[str(interaccion.id)],
        )


def test_reaccion_duplicada_concurrente_devuelve_409():
    usuario, challenge = uuid.uuid4(), uuid.uuid4()

    async def rival_insert(session):
        session.add(
            Reaction(
                user_id=usuario, challenge_id=challenge, reaction_type=ReactionType.LIKE
            )
        )
        await session.flush()

    def peticion():
        return client.post(
            REACTIONS_URL,
            json={"challenge_id": str(challenge), "reaction_type": "like"},
            headers=auth_headers(UserRole.SOLUCIONADOR, sub=usuario),
        )

    reaction_id = None
    try:
        response = _ejecutar_carrera(
            rival_insert, "INSERT INTO vialibre_match.reactions", peticion
        )
        assert response.status_code == 409
        assert (
            response.json()["detail"]
            == "You already have a like reaction for this challenge"
        )

        async def _rid():
            async with TestSession() as session:
                result = await session.execute(
                    select(Reaction).where(
                        Reaction.user_id == usuario,
                        Reaction.challenge_id == challenge,
                        Reaction.reaction_type == ReactionType.LIKE,
                    )
                )
                fila = result.scalar_one_or_none()
                return str(fila.id) if fila else None

        reaction_id = asyncio.run(_rid())
    finally:
        _limpiar(reaction_ids=[reaction_id] if reaction_id else [])


def test_documento_duplicado_concurrente_devuelve_409(monkeypatch):
    solucionador = uuid.uuid4()
    interaccion = _crear_interaccion_aprobada(solucionador)
    monkeypatch.setattr(httpx, "AsyncClient", _cliente_reto_practica)
    interaccion_id = interaccion.id

    async def rival_insert(session):
        session.add(
            InteractionDocument(
                interaction_id=interaccion_id,
                tipo="documento_identidad",
                filename="rival.pdf",
                content_type="application/pdf",
                size=12,
                data=b"%PDF-rival",
            )
        )
        await session.flush()

    def peticion():
        return _subir_documento(interaccion, solucionador)

    documento_id = None
    try:
        response = _ejecutar_carrera(
            rival_insert,
            "INSERT INTO vialibre_match.interaction_documents",
            peticion,
        )
        assert response.status_code == 409
        assert (
            response.json()["detail"]
            == "El documento fue cargado por otra solicitud; intentalo de nuevo"
        )

        async def _did():
            async with TestSession() as session:
                result = await session.execute(
                    select(InteractionDocument).where(
                        InteractionDocument.interaction_id == interaccion_id,
                        InteractionDocument.tipo == "documento_identidad",
                    )
                )
                fila = result.scalar_one_or_none()
                return str(fila.id) if fila else None

        documento_id = asyncio.run(_did())
    finally:
        _limpiar(
            documento_ids=[documento_id] if documento_id else [],
            interaction_ids=[str(interaccion_id)],
        )
