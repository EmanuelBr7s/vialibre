"""Pruebas de concurrencia de Practica (B3-B.4, F5.3).

Reproducen con PostgreSQL real la carrera entre dos actualizaciones
parciales de fechas que, sin bloqueo de fila, pueden persistir la
combinacion invalida `fecha_fin < fecha_inicio`, violando la invariante
que el propio servicio exige en operacion secuencial.

Sincronizacion determinista: eventos (threading.Event) inyectados sobre
`_get_practica_or_404` — la solicitud A se detiene DENTRO del endpoint
justo despues de su lectura; la solicitud B se lanza a continuacion y se
ESPERA su senal mas unica de dos formas observables:

- pre-fix: B completa su lectura (senal `b_leido`);
- post-fix: B queda bloqueada en su `SELECT ... FOR UPDATE` sobre
  `vialibre_match.practicas`, observado en pg_stat_activity con una
  conexion fresca por sondeo (wait_event_type='Lock').

Solo entonces se libera A. Si ninguna senal llega, la prueba FALLA en
lugar de asumir exito. No hay sleeps de esperanza: los unicos sleep son
el ritmo de sondeo.

Intercalaciones reproducidas (una por prueba de carrera), con la prueba
del orden de adquisicion del lock en ambos sentidos:

- "fin-primero": A lee (None, None) -> B lee y escribe `fecha_inicio` ->
  se libera A -> A escribe `fecha_fin` con su lectura stale.
  Con la correccion: A toma el lock primero, B queda bloqueada en su
  lectura, A escribe y commitea y B relee la fila vigente -> 422.
- "inicio-primero": misma estructura con los envios intercambiados.

En ambos ordenes se verifica la invariante sobre la FILA PERSISTIDA,
no solo sobre los codigos HTTP: es el resultado en base de datos el que
demuestra (o refuta) la correccion.
"""

import asyncio
import threading
import time
import uuid
from datetime import date

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.api.v1.endpoints import practicas as practicas_module
from app.main import app
from app.models.interaction import Interaction
from app.models.practica import Practica
from tests.helpers import TestSession, auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

PRACTICAS_URL = "/api/v1/match/practicas"

ADMIN_ID = uuid.uuid4()

_WAIT_LOCK_SQL = text(
    """
    SELECT pid, datname, query
    FROM pg_stat_activity
    WHERE wait_event_type = 'Lock'
    """
)


# ── Fixtures de datos y limpieza ──


def _create_interaction() -> dict:
    async def _run():
        async with TestSession() as session:
            interaction = Interaction(
                solucionador_id=uuid.uuid4(),
                challenge_id=uuid.uuid4(),
            )
            session.add(interaction)
            await session.commit()
            return {"id": str(interaction.id)}

    return asyncio.run(_run())


def _create_practica() -> tuple[str, str]:
    """Crea interaccion + practica sin fechas; devuelve (practica_id, interaction_id)."""
    interaction = _create_interaction()
    headers = auth_headers(UserRole.ADMIN, sub=ADMIN_ID)
    response = client.post(
        PRACTICAS_URL, json={"interaction_id": interaction["id"]}, headers=headers
    )
    assert response.status_code == 201, response.text
    return response.json()["id"], interaction["id"]


def _cleanup(practica_ids=None, interaction_ids=None):
    async def _run():
        async with TestSession() as session:
            for pid in practica_ids or []:
                obj = await session.get(Practica, uuid.UUID(pid))
                if obj is not None:
                    await session.delete(obj)
            for iid in interaction_ids or []:
                obj = await session.get(Interaction, uuid.UUID(iid))
                if obj is not None:
                    await session.delete(obj)
            await session.commit()

    asyncio.run(_run())


def _assert_invariante(fila: dict) -> None:
    """La invariante obligatoria: si ambas fechas existen, fin >= inicio."""
    inicio, fin = fila.get("fecha_inicio"), fila.get("fecha_fin")
    assert not (inicio and fin and fin < inicio), (
        "La fila persistida viola la invariante fecha_fin >= fecha_inicio: "
        f"fecha_inicio={inicio}, fecha_fin={fin}"
    )


# ── Maquinaria de carrera real ──


async def _esperar_listo_o_bloqueo(b_leido: threading.Event, timeout: float = 20.0) -> str:
    """Espera a que B haya leido la fila (carrera sin lock) o a observar su
    `SELECT ... FOR UPDATE` bloqueado en pg_stat_activity (carrera con lock).

    Devuelve cual de las dos senales ocurrio. Si ninguna llega antes del
    timeout, la prueba falla: sin senal no hay carrera que afirmar.
    """
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if b_leido.is_set():
            return "lectura-completa"
        async with TestSession() as probe:
            filas = (await probe.execute(_WAIT_LOCK_SQL)).all()
        for _pid, datname, consulta in filas:
            if (
                datname == "vialibre"
                and "FOR UPDATE" in (consulta or "")
                and "practicas" in (consulta or "")
            ):
                return "bloqueo-observado"
        await asyncio.sleep(0.2)
    raise AssertionError(
        "La solicitud B nunca llego a su lectura ni aparecio bloqueada en "
        "pg_stat_activity: la carrera no se esta reproduciendo."
    )


def _instalar_barrera(monkeypatch) -> dict:
    """Intercepta `_get_practica_or_404`: la PRIMERA llamada (A) se detiene
    tras su lectura hasta `liberar_a`; la SEGUNDA (B) anuncia su entrada y
    su lectura. Las llamadas posteriores pasan sin barrera."""
    original = practicas_module._get_practica_or_404
    estado = {
        "n": 0,
        "a_leido": threading.Event(),
        "liberar_a": threading.Event(),
        "b_entrando": threading.Event(),
        "b_leido": threading.Event(),
    }

    async def _con_barrera(*args, **kwargs):
        idx = estado["n"]
        estado["n"] += 1
        if idx == 0:  # solicitud A
            practica = await original(*args, **kwargs)
            estado["a_leido"].set()
            liberado = await asyncio.to_thread(estado["liberar_a"].wait, 60)
            assert liberado, "La solicitud A nunca fue liberada por la prueba"
            return practica
        if idx == 1:  # solicitud B
            estado["b_entrando"].set()
            practica = await original(*args, **kwargs)
            estado["b_leido"].set()
            return practica
        return await original(*args, **kwargs)

    monkeypatch.setattr(practicas_module, "_get_practica_or_404", _con_barrera)
    return estado


def _solicitud(resultados: dict, clave: str, practica_id: str, envio: dict, headers: dict):
    """Lanza un PATCH real en hilo propio y captura respuesta o excepcion."""

    def _run():
        try:
            resultados[clave] = client.patch(
                f"{PRACTICAS_URL}/{practica_id}", json=envio, headers=headers
            )
        except Exception as exc:  # pragma: no cover - solo fallas de sincronizacion
            resultados[clave] = exc

    hilo = threading.Thread(target=_run)
    hilo.start()
    return hilo


def _respuesta(resultados: dict, clave: str):
    r = resultados.get(clave)
    assert r is not None, f"La solicitud {clave} nunca termino"
    assert not isinstance(r, Exception), f"La solicitud {clave} fallo: {r!r}"
    return r


def _reproducir_carrera(monkeypatch, primer_envio: dict, segundo_envio: dict) -> dict:
    """Ejecuta la carrera completa. El orden de adquisicion lo fija la
    prueba: A arranca y confirma su lectura ANTES de lanzar B."""
    practica_id, interaction_id = _create_practica()
    headers = auth_headers(UserRole.ADMIN, sub=ADMIN_ID)
    url_id = practica_id
    resultados: dict = {}
    try:
        barrera = _instalar_barrera(monkeypatch)

        hilo_a = _solicitud(resultados, "primera", url_id, primer_envio, headers)
        assert barrera["a_leido"].wait(60), "La solicitud A nunca llego a su lectura"

        hilo_b = _solicitud(resultados, "segunda", url_id, segundo_envio, headers)
        senal = asyncio.run(_esperar_listo_o_bloqueo(barrera["b_leido"]))
        barrera["liberar_a"].set()

        hilo_a.join(60)
        hilo_b.join(60)
        assert not hilo_a.is_alive() and not hilo_b.is_alive(), (
            "Las solicitudes concurrentes no terminaron"
        )

        fila = client.get(f"{PRACTICAS_URL}/{practica_id}", headers=headers)
        assert fila.status_code == 200, fila.text
        return {
            "primera": _respuesta(resultados, "primera"),
            "segunda": _respuesta(resultados, "segunda"),
            "senal": senal,
            "fila": fila.json(),
        }
    finally:
        _cleanup([practica_id], [interaction_id])


# ── Secuencial (contrato previo a la carrera) ──


def test_update_secuencial_rechaza_fecha_fin_anterior():
    practica_id, interaction_id = _create_practica()
    headers = auth_headers(UserRole.ADMIN, sub=ADMIN_ID)
    try:
        inicio = client.patch(
            f"{PRACTICAS_URL}/{practica_id}",
            json={"fecha_inicio": date(2026, 6, 1).isoformat()},
            headers=headers,
        )
        assert inicio.status_code == 200, inicio.text

        rechazo = client.patch(
            f"{PRACTICAS_URL}/{practica_id}",
            json={"fecha_fin": date(2026, 1, 15).isoformat()},
            headers=headers,
        )
        assert rechazo.status_code == 422, rechazo.text
        assert rechazo.json()["detail"] == "fecha_fin no puede ser anterior a fecha_inicio"

        # La fecha rechazada no se persistio.
        fila = client.get(f"{PRACTICAS_URL}/{practica_id}", headers=headers).json()
        assert fila["fecha_inicio"] == date(2026, 6, 1).isoformat()
        assert fila["fecha_fin"] is None
        _assert_invariante(fila)
    finally:
        _cleanup([practica_id], [interaction_id])


def test_update_secuencial_acepta_y_persiste_par_valido():
    practica_id, interaction_id = _create_practica()
    headers = auth_headers(UserRole.ADMIN, sub=ADMIN_ID)
    try:
        primero = client.patch(
            f"{PRACTICAS_URL}/{practica_id}",
            json={"fecha_inicio": date(2026, 3, 1).isoformat()},
            headers=headers,
        )
        assert primero.status_code == 200, primero.text
        segundo = client.patch(
            f"{PRACTICAS_URL}/{practica_id}",
            json={"fecha_fin": date(2026, 6, 30).isoformat()},
            headers=headers,
        )
        assert segundo.status_code == 200, segundo.text

        fila = client.get(f"{PRACTICAS_URL}/{practica_id}", headers=headers).json()
        assert fila["fecha_inicio"] == date(2026, 3, 1).isoformat()
        assert fila["fecha_fin"] == date(2026, 6, 30).isoformat()
        _assert_invariante(fila)
    finally:
        _cleanup([practica_id], [interaction_id])


def test_update_practica_requiere_autenticacion():
    response = client.patch(
        f"{PRACTICAS_URL}/{uuid.uuid4()}", json={"estado_administrativo": "x"}
    )
    assert response.status_code == 401


def test_update_practica_prohibida_para_no_admin():
    practica_id, interaction_id = _create_practica()
    try:
        headers = auth_headers(UserRole.PUBLICADOR)
        response = client.patch(
            f"{PRACTICAS_URL}/{practica_id}",
            json={"estado_administrativo": "x"},
            headers=headers,
        )
        assert response.status_code == 403
    finally:
        _cleanup([practica_id], [interaction_id])


# ── Carrera real: ambos ordenes de adquisicion ──


def test_carrera_fechas_con_fin_primero_no_persiste_incoherencia(monkeypatch):
    """Orden de llegada: A envia `fecha_fin`, B envia `fecha_inicio`.

    Pre-fix ambas leen (None, None), ambas persisten (200) y la fila final
    queda `fecha_fin < fecha_inicio` -> la prueba FALLA (defecto demostrado).
    Post-fix A toma el lock primero, B se observa bloqueada en su lectura y,
    al relecturar contra la fila ya escrita, su envio es rechazado con 422.
    """
    resultado = _reproducir_carrera(
        monkeypatch,
        primer_envio={"fecha_fin": date(2026, 1, 15).isoformat()},
        segundo_envio={"fecha_inicio": date(2026, 3, 1).isoformat()},
    )
    _assert_invariante(resultado["fila"])
    assert resultado["primera"].status_code == 200, resultado["primera"].text
    assert resultado["segunda"].status_code == 422, resultado["segunda"].text
    assert resultado["fila"]["fecha_fin"] == date(2026, 1, 15).isoformat()


def test_carrera_fechas_con_inicio_primero_no_persiste_incoherencia(monkeypatch):
    """Orden de llegada: A envia `fecha_inicio`, B envia `fecha_fin`.

    Cubre el sentido contrario de adquisicion del lock. Pre-fix ambas leen
    (None, None), ambas persisten y la fila final viola la invariante ->
    la prueba FALLA. Post-fix B relee el `fecha_inicio` ya commiteado y su
    `fecha_fin` anterior es rechazado con 422.
    """
    resultado = _reproducir_carrera(
        monkeypatch,
        primer_envio={"fecha_inicio": date(2026, 3, 1).isoformat()},
        segundo_envio={"fecha_fin": date(2026, 1, 15).isoformat()},
    )
    _assert_invariante(resultado["fila"])
    assert resultado["primera"].status_code == 200, resultado["primera"].text
    assert resultado["segunda"].status_code == 422, resultado["segunda"].text
    assert resultado["fila"]["fecha_inicio"] == date(2026, 3, 1).isoformat()


def test_edicion_concurrente_de_campos_distintos_conserva_ambos(monkeypatch):
    """No regresividad del bloqueo: dos PATCH de campos distintos sobre la
    misma practica siguen persistiendo AMBOS cambios (serializacion corta,
    sin llamadas HTTP bajo el lock)."""
    practica_id, interaction_id = _create_practica()
    headers = auth_headers(UserRole.ADMIN, sub=ADMIN_ID)
    nuevo_estado = "en_revision"
    nueva_empresa = str(uuid.uuid4())
    try:
        barrera = _instalar_barrera(monkeypatch)
        resultados: dict = {}

        hilo_a = _solicitud(
            resultados, "primera", practica_id, {"estado_administrativo": nuevo_estado}, headers
        )
        assert barrera["a_leido"].wait(60), "La solicitud A nunca llego a su lectura"
        hilo_b = _solicitud(
            resultados, "segunda", practica_id, {"empresa_id": nueva_empresa}, headers
        )
        assert barrera["b_entrando"].wait(60), "La solicitud B nunca arranco"
        barrera["liberar_a"].set()

        hilo_a.join(60)
        hilo_b.join(60)
        assert not hilo_a.is_alive() and not hilo_b.is_alive()

        assert _respuesta(resultados, "primera").status_code == 200
        assert _respuesta(resultados, "segunda").status_code == 200

        fila = client.get(f"{PRACTICAS_URL}/{practica_id}", headers=headers)
        assert fila.status_code == 200, fila.text
        assert fila.json()["estado_administrativo"] == nuevo_estado
        assert fila.json()["empresa_id"] == nueva_empresa
    finally:
        _cleanup([practica_id], [interaction_id])
