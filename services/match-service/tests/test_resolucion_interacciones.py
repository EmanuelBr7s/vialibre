"""Pruebas del ciclo de vida de resolucion de interacciones (B3-B.2).

Demuestran:

- Maquina de estados (I2): solo pendiente -> aprobado | rechazado; cualquier
  solicitud posterior sobre una interaccion ya resuelta devuelve 409 sin
  alterar nada.
- Coherencia de contacto (I1): aprobado => contacto desbloqueado con marca
  de tiempo; rechazado => contacto bloqueado y campos de desbloqueo limpios.
- Defensa en profundidad del endpoint de contacto: exige APROBADO ademas del
  flag, por si una fila anomala conservara contact_unlocked=True.
- Autorizacion conservada (I3) y contrato de fallos remotos conservado.
- I4: las llamadas HTTP a core-service ocurren ANTES de adquirir el bloqueo
  de fila (se verifica con la fila bloqueada: la peticion responde 502 sin
  esperar al lock).

Concurrencia REAL contra PostgreSQL (no mocks): una sesion independiente
retiene un SELECT ... FOR UPDATE sin commitear mientras peticiones HTTP
reales (TestClient, hilos propios) intentan resolver la misma interaccion.
La sincronizacion OBSERVA en pg_stat_activity (wait_event_type='Lock') que
las peticiones estan realmente bloqueadas en el FOR UPDATE y solo entonces
libera al observador. Si el bloqueo nunca se observa, la prueba FALLA en
lugar de simular exito. No hay sleeps de esperza ni probabilidades. Las
llamadas a core-service se sustituyen por un transporte falso (no son el
objeto de estas pruebas); la carrera sobre la base de datos es real.
"""

import asyncio
import threading
import time
import uuid
from datetime import datetime

import httpx
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.config import settings
from app.main import app
from app.models.interaction import Interaction, InteractionStatus
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

BASE_URL = "/api/v1/match/interactions"


# ── Transportes falsos (solo para las llamadas a servicios remotos) ──


class _FakeResponse:
    def __init__(self, status_code: int, payload: dict):
        self.status_code = status_code
        self._payload = payload

    def json(self):
        return self._payload


def _core_client(autor: uuid.UUID):
    """Transporte falso: core siempre responde 200 con el autor indicado."""

    class _Client:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def get(self, *args, **kwargs):
            return _FakeResponse(200, {"author_id": str(autor)})

    return _Client


def _contacto_client(autor: uuid.UUID, usuario_contacto: uuid.UUID):
    """Transporte falso para el flujo de contacto completo: core 200 y
    auth 200 con los datos del usuario."""

    class _Client(_core_client(autor)):
        async def get(self, url, *args, **kwargs):
            if str(url).startswith(settings.core_service_url):
                return await super().get(url, *args, **kwargs)
            return _FakeResponse(
                200,
                {
                    "id": str(usuario_contacto),
                    "full_name": "Ana Perez",
                    "email": "ana@example.com",
                    "phone": "3001234567",
                },
            )

    return _Client


class _cliente_transport_error:
    """Transporte falso: toda peticion falla como ConnectError."""

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def get(self, *args, **kwargs):
        raise httpx.ConnectError(
            "core-service no disponible",
            request=httpx.Request("GET", "http://core-service:8000/x"),
        )


# ── Utilidades de base de datos ──


def _crear_interaccion(
    status: InteractionStatus = InteractionStatus.PENDIENTE,
    contact_unlocked: bool = False,
    contact_unlocked_at: datetime | None = None,
) -> uuid.UUID:
    async def _run():
        async with TestSession() as session:
            interaccion = Interaction(
                solucionador_id=uuid.uuid4(),
                challenge_id=uuid.uuid4(),
                status=status,
                contact_unlocked=contact_unlocked,
                contact_unlocked_at=contact_unlocked_at,
            )
            session.add(interaccion)
            await session.commit()
            return interaccion.id

    return asyncio.run(_run())


def _estado(interaccion_id) -> Interaction:
    async def _run():
        async with TestSession() as session:
            return await session.get(Interaction, uuid.UUID(str(interaccion_id)))

    return asyncio.run(_run())


def _limpiar(interaccion_ids) -> None:
    async def _run():
        async with TestSession() as session:
            for iid in interaccion_ids:
                obj = await session.get(Interaction, uuid.UUID(str(iid)))
                if obj is not None:
                    await session.delete(obj)
            await session.commit()

    asyncio.run(_run())


# ── Maquinaria de carrera real (bloqueo de fila observado) ──

_WAIT_LOCK_SQL = text(
    """
    SELECT datname, query
    FROM pg_stat_activity
    WHERE wait_event_type = 'Lock'
    """
)


async def _esperar_bloqueos_for_update(minimo: int, timeout: float = 20.0) -> None:
    """Espera observar en pg_stat_activity `minimo` peticiones realmente
    bloqueadas en SELECT ... FOR UPDATE sobre interactions.

    Patron validado en este entorno: cada sondeo abre una conexion fresca
    (se cierra al salir) y el filtrado se hace en Python. La observacion del
    bloqueo real es la unica garantia de que la carrera se esta reproduciendo;
    si no ocurre, la prueba falla (nunca se afirma exito sin bloqueo real).
    """
    patron = "vialibre_match.interactions"
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        async with TestSession() as probe:
            filas = (await probe.execute(_WAIT_LOCK_SQL)).all()
        encontradas = 0
        for datname, consulta in filas:
            texto = consulta or ""
            if datname == "vialibre" and patron in texto and "FOR UPDATE" in texto:
                encontradas += 1
        if encontradas >= minimo:
            return
        await asyncio.sleep(0.2)
    raise AssertionError(
        f"Nunca se observaron {minimo} peticiones bloqueadas en SELECT ... FOR UPDATE "
        f"sobre {patron}: la carrera no se esta reproduciendo."
    )


def _sostener_bloqueo(interaccion_id, locked: threading.Event, release: threading.Event):
    """Sesion rival: toma el bloqueo de fila SIN commitear y lo retiene hasta
    que el test libera `release`; luego commitea (sin cambios) y libera."""

    async def _run():
        async with TestSession() as session:
            await session.execute(
                select(Interaction)
                .where(Interaction.id == uuid.UUID(str(interaccion_id)))
                .with_for_update()
            )
            locked.set()
            await asyncio.to_thread(release.wait, 60)
            await session.commit()

    asyncio.run(_run())


# ── Secuencial: maquina de estados y coherencia de contacto ──


def test_aprobar_interaccion_pendiente_desbloquea_el_contacto(monkeypatch):
    autor = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(autor))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor)
    iid = _crear_interaccion()
    try:
        response = client.patch(
            f"{BASE_URL}/{iid}/approve",
            json={"status": "aprobado"},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "aprobado"
        assert body["contact_unlocked"] is True
        assert body["contact_unlocked_at"] is not None
        # Estado persistido coherente.
        estado = _estado(iid)
        assert estado.status == InteractionStatus.APROBADO
        assert estado.contact_unlocked is True
        assert estado.contact_unlocked_at is not None
    finally:
        _limpiar([iid])


def test_rechazar_interaccion_pendiente_resetea_el_contacto(monkeypatch):
    # F1: aunque una fila anomala tuviera el contacto desbloqueado, el
    # rechazo limpia los campos de desbloqueo.
    autor = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(autor))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor)
    iid = _crear_interaccion(
        contact_unlocked=True, contact_unlocked_at=datetime.utcnow()
    )
    try:
        response = client.patch(
            f"{BASE_URL}/{iid}/approve",
            json={"status": "rechazado"},
            headers=headers,
        )
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["status"] == "rechazado"
        assert body["contact_unlocked"] is False
        assert body["contact_unlocked_at"] is None
        estado = _estado(iid)
        assert estado.status == InteractionStatus.RECHAZADO
        assert estado.contact_unlocked is False
        assert estado.contact_unlocked_at is None
    finally:
        _limpiar([iid])


def test_rechazar_interaccion_aprobada_devuelve_409_sin_alterar_nada(monkeypatch):
    """Regresion de F3/F1: antes, el rechazo pisaba el estado y dejaba el
    contacto desbloqueado bajo estado rechazado. Ahora es 409 y no se toca
    absolutamente nada."""
    autor = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(autor))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor)
    desbloqueo = datetime.utcnow()
    iid = _crear_interaccion(
        status=InteractionStatus.APROBADO,
        contact_unlocked=True,
        contact_unlocked_at=desbloqueo,
    )
    try:
        response = client.patch(
            f"{BASE_URL}/{iid}/approve",
            json={"status": "rechazado"},
            headers=headers,
        )
        assert response.status_code == 409
        assert (
            response.json()["detail"] == "Interaction has already been resolved"
        )
        estado = _estado(iid)
        assert estado.status == InteractionStatus.APROBADO
        assert estado.contact_unlocked is True
        assert estado.contact_unlocked_at == desbloqueo
    finally:
        _limpiar([iid])


def test_aprobar_interaccion_rechazada_devuelve_409_sin_alterar_nada(monkeypatch):
    autor = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(autor))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor)
    iid = _crear_interaccion(status=InteractionStatus.RECHAZADO)
    try:
        response = client.patch(
            f"{BASE_URL}/{iid}/approve",
            json={"status": "aprobado"},
            headers=headers,
        )
        assert response.status_code == 409
        assert (
            response.json()["detail"] == "Interaction has already been resolved"
        )
        estado = _estado(iid)
        assert estado.status == InteractionStatus.RECHAZADO
        assert estado.contact_unlocked is False
        assert estado.contact_unlocked_at is None
    finally:
        _limpiar([iid])


def test_objetivo_pendiente_no_es_transicion_valida(monkeypatch):
    """I2: la unica transicion exitosa desde pendiente es hacia aprobado o
    rechazado; pedir pendiente de nuevo no es una transicion."""
    autor = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(autor))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor)
    iid = _crear_interaccion()
    try:
        response = client.patch(
            f"{BASE_URL}/{iid}/approve",
            json={"status": "pendiente"},
            headers=headers,
        )
        assert response.status_code == 409
        assert (
            response.json()["detail"] == "Invalid interaction status transition"
        )
        estado = _estado(iid)
        assert estado.status == InteractionStatus.PENDIENTE
    finally:
        _limpiar([iid])


# ── Secuencial: defensa en profundidad del endpoint de contacto ──


def test_contacto_de_interaccion_rechazada_con_flag_en_true_se_deniega():
    # Fila anomala: rechazada pero con contact_unlocked=True (el estado que
    # el bug F1 podia producir). El endpoint exige APROBADO: 403 sin llegar
    # a llamar a ningun servicio remoto (el chequeo ocurre antes).
    iid = _crear_interaccion(
        status=InteractionStatus.RECHAZADO, contact_unlocked=True
    )
    headers = auth_headers(UserRole.ADMIN)
    try:
        response = client.get(f"{BASE_URL}/{iid}/contact", headers=headers)
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "Contact information is not unlocked yet"
        )
        # El 403 (y no un 502 de core) prueba que el chequeo es previo.
        assert "core-service" not in response.text
        assert "http://" not in response.text
    finally:
        _limpiar([iid])


def test_contacto_de_interaccion_pendiente_con_flag_en_true_se_deniega():
    iid = _crear_interaccion(
        status=InteractionStatus.PENDIENTE, contact_unlocked=True
    )
    headers = auth_headers(UserRole.ADMIN)
    try:
        response = client.get(f"{BASE_URL}/{iid}/contact", headers=headers)
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "Contact information is not unlocked yet"
        )
    finally:
        _limpiar([iid])


def test_contacto_aprobado_permite_acceso_al_solucionador_autorizado(monkeypatch):
    autor = uuid.uuid4()
    iid = _crear_interaccion(
        status=InteractionStatus.APROBADO, contact_unlocked=True
    )
    interaccion = _estado(iid)
    monkeypatch.setattr(httpx, "AsyncClient", _contacto_client(autor, uuid.uuid4()))
    headers = auth_headers(UserRole.SOLUCIONADOR, sub=interaccion.solucionador_id)
    try:
        response = client.get(f"{BASE_URL}/{iid}/contact", headers=headers)
        assert response.status_code == 200, response.text
        body = response.json()
        assert body["full_name"] == "Ana Perez"
        assert body["email"] == "ana@example.com"
    finally:
        _limpiar([iid])


# ── Secuencial: autorizacion conservada (I3) ──


def test_aprobar_como_solucionador_devuelve_403():
    iid = _crear_interaccion()
    headers = auth_headers(UserRole.SOLUCIONADOR)
    try:
        response = client.patch(
            f"{BASE_URL}/{iid}/approve",
            json={"status": "aprobado"},
            headers=headers,
        )
        assert response.status_code == 403
        assert (
            response.json()["detail"] == "Solo las empresas y el administrador pueden resolver postulaciones"
        )
        # La autorizacion ocurre antes de cualquier llamada o bloqueo.
        assert _estado(iid).status == InteractionStatus.PENDIENTE
    finally:
        _limpiar([iid])


def test_publicador_no_autor_recibe_403(monkeypatch):
    autor_solicitante = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(uuid.uuid4()))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor_solicitante)
    iid = _crear_interaccion()
    try:
        response = client.patch(
            f"{BASE_URL}/{iid}/approve",
            json={"status": "aprobado"},
            headers=headers,
        )
        assert response.status_code == 403
        assert (
            response.json()["detail"]
            == "Only the challenge author can approve interactions"
        )
        assert _estado(iid).status == InteractionStatus.PENDIENTE
    finally:
        _limpiar([iid])


# ── Contrato de fallos remotos + I4: HTTP antes del bloqueo ──


def test_fallo_remoto_devuelve_502_incluso_con_fila_bloqueada(monkeypatch):
    """I4 y requisito 10 a la vez: con la fila bloqueada por otra sesion,
    una peticion de aprobacion con core caido responde 502 SIN esperar al
    bloqueo (la llamada HTTP es previa al lock). Si el orden regresara
    (lock antes de HTTP), la peticion quedaria bloqueada y esta prueba
    fallaria por timeout en el join."""
    iid = _crear_interaccion()
    monkeypatch.setattr(httpx, "AsyncClient", _cliente_transport_error)
    headers = auth_headers(UserRole.PUBLICADOR)
    locked, release = threading.Event(), threading.Event()
    holder = threading.Thread(
        target=_sostener_bloqueo, args=(iid, locked, release)
    )
    holder.start()
    respuestas: dict = {}
    try:
        assert locked.wait(15), "el holder nunca tomo el bloqueo de fila"

        def _correr():
            respuestas["r"] = client.patch(
                f"{BASE_URL}/{iid}/approve",
                json={"status": "aprobado"},
                headers=headers,
            )

        hilo = threading.Thread(target=_correr)
        hilo.start()
        hilo.join(15)
        assert not hilo.is_alive(), (
            "la peticion quedo bloqueada en el lock de fila antes de completar "
            "la llamada a core: I4 violada"
        )
        assert respuestas["r"].status_code == 502
        assert (
            respuestas["r"].json()["detail"]
            == "Could not verify challenge ownership"
        )
        assert "core-service" not in respuestas["r"].text
        assert _estado(iid).status == InteractionStatus.PENDIENTE
    finally:
        release.set()
        holder.join(60)
        _limpiar([iid])


# ── Concurrencia REAL contra PostgreSQL ──


def test_resolucion_concurrente_produce_exactamente_una_transicion(monkeypatch):
    """Dos peticiones reales (aprobar y rechazar) sobre la misma interaccion
    mientras una sesion ajena retiene el bloqueo de fila. Se observa que
    AMBAS peticiones quedan realmente bloqueadas en el FOR UPDATE antes de
    liberar; despues exactamente una obtiene 200 y la otra 409. No depende
    de cual de las dos gane."""
    autor = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(autor))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor)
    iid = _crear_interaccion()

    locked, release = threading.Event(), threading.Event()
    holder = threading.Thread(
        target=_sostener_bloqueo, args=(iid, locked, release)
    )
    holder.start()
    respuestas: dict = {}
    try:
        assert locked.wait(15), "el holder nunca tomo el bloqueo de fila"

        def _correr(nombre: str, estado_objetivo: str):
            respuestas[nombre] = client.patch(
                f"{BASE_URL}/{iid}/approve",
                json={"status": estado_objetivo},
                headers=headers,
            )

        hilo_aprobar = threading.Thread(
            target=_correr, args=("aprobar", "aprobado")
        )
        hilo_rechazar = threading.Thread(
            target=_correr, args=("rechazar", "rechazado")
        )
        hilo_aprobar.start()
        hilo_rechazar.start()

        # Ambas peticiones deben estar REALMENTE bloqueadas en el lock fila.
        asyncio.run(_esperar_bloqueos_for_update(minimo=2))
        release.set()
        hilo_aprobar.join(60)
        hilo_rechazar.join(60)
        assert "aprobar" in respuestas and "rechazar" in respuestas, (
            "alguna peticion concurrente no finalizo"
        )

        assert {respuestas["aprobar"].status_code,
                respuestas["rechazar"].status_code} == {200, 409}, (
            respuestas["aprobar"].text,
            respuestas["rechazar"].text,
        )
        perdedora = (
            respuestas["aprobar"]
            if respuestas["aprobar"].status_code == 409
            else respuestas["rechazar"]
        )
        assert (
            perdedora.json()["detail"]
            == "Interaction has already been resolved"
        )

        # Estado final persistido: una sola transicion y ninguna combinacion
        # invalida de status / contact_unlocked / contact_unlocked_at.
        estado = _estado(iid)
        assert estado.status in (
            InteractionStatus.APROBADO,
            InteractionStatus.RECHAZADO,
        )
        if estado.status == InteractionStatus.APROBADO:
            assert estado.contact_unlocked is True
            assert estado.contact_unlocked_at is not None
        else:
            assert estado.contact_unlocked is False
            assert estado.contact_unlocked_at is None
        # El estado persistido coincide con la peticion que gano.
        ganadora = (
            respuestas["aprobar"]
            if respuestas["aprobar"].status_code == 200
            else respuestas["rechazar"]
        )
        assert estado.status.value == ganadora.json()["status"]
    finally:
        release.set()
        holder.join(60)
        _limpiar([iid])


def test_bloqueo_de_una_interaccion_no_impide_otra_independiente(monkeypatch):
    """El bloqueo de fila de una interaccion no debe impedir resolver otra
    interaccion distinta de forma concurrente (sin bloqueos globales)."""
    autor = uuid.uuid4()
    monkeypatch.setattr(httpx, "AsyncClient", _core_client(autor))
    headers = auth_headers(UserRole.PUBLICADOR, sub=autor)
    iid_x = _crear_interaccion()
    iid_y = _crear_interaccion()

    locked, release = threading.Event(), threading.Event()
    holder = threading.Thread(
        target=_sostener_bloqueo, args=(iid_x, locked, release)
    )
    holder.start()
    respuestas: dict = {}
    try:
        assert locked.wait(15), "el holder nunca tomo el bloqueo de fila"

        def _correr_x():
            respuestas["x"] = client.patch(
                f"{BASE_URL}/{iid_x}/approve",
                json={"status": "aprobado"},
                headers=headers,
            )

        hilo_x = threading.Thread(target=_correr_x)
        hilo_x.start()
        # La peticion sobre X esta realmente bloqueada en su FOR UPDATE.
        asyncio.run(_esperar_bloqueos_for_update(minimo=1))

        # Mientras X esta bloqueada, resolver Y funciona sin esperar.
        resp_y = client.patch(
            f"{BASE_URL}/{iid_y}/approve",
            json={"status": "aprobado"},
            headers=headers,
        )
        assert resp_y.status_code == 200, resp_y.text
        # X sigue bloqueada (el holder no libero): no pudo terminar antes.
        assert hilo_x.is_alive(), (
            "la peticion sobre X no estaba realmente bloqueada"
        )

        release.set()
        hilo_x.join(60)
        assert "x" in respuestas, "la peticion sobre X no finalizo"
        assert respuestas["x"].status_code == 200, respuestas["x"].text

        # Ambas filas resueltas de forma coherente e independiente.
        estado_x = _estado(iid_x)
        estado_y = _estado(iid_y)
        for estado in (estado_x, estado_y):
            assert estado.status == InteractionStatus.APROBADO
            assert estado.contact_unlocked is True
            assert estado.contact_unlocked_at is not None
    finally:
        release.set()
        holder.join(60)
        _limpiar([iid_x, iid_y])
