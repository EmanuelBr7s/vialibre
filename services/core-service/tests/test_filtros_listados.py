"""Pruebas de regresion del bloque B3-B.5: filtros del listado de retos.

Antes de este bloque, `status` y `difficulty` se declaraban como cadena libre y
se comparaban contra columnas Enum de SQLAlchemy: un valor fuera del enum
producia HTTP 500 (excepcion de conversion sin manejar). Ahora ambos filtros se
tipean con los enums locales del modelo (igual que `tipo`), por lo que un valor
invalido produce 422 de validacion y los valores validos conservan su
comportamiento (filtran, se combinan, respetan la paginacion y el orden).

Se ejecutan contra el stack real (el listado es publico) y cada reto creado se
limpia via DELETE API.
"""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from tests.helpers import auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

BASE = "/api/v1/core/challenges"

VALID_PAYLOAD = {
    "title": "Reto de filtros B3-B.5",
    "short_description": "Descripcion corta para pruebas de filtros.",
    "long_description": "Descripcion larga con mas de veinte caracteres.",
}

STATUS_INVALIDOS = ["no_existente", "ABIERTO", "en-progreso", "", "0"]
DIFFICULTY_INVALIDOS = ["imposible", "EASY", "facil", ""]


def _create(headers: dict | None = None, **extra) -> tuple[dict, dict]:
    headers = headers or auth_headers(UserRole.PUBLICADOR)
    response = client.post(BASE, json={**VALID_PAYLOAD, **extra}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json(), headers


def _cleanup(challenge_id: str, headers: dict) -> None:
    response = client.delete(f"{BASE}/{challenge_id}", headers=headers)
    assert response.status_code in (204, 404), response.text


# ── Valores invalidos: 422 (antes: 500) ──


@pytest.mark.parametrize("valor", STATUS_INVALIDOS)
def test_status_invalido_devuelve_422(valor):
    response = client.get(BASE, params={"status": valor})
    assert response.status_code == 422, response.text


@pytest.mark.parametrize("valor", DIFFICULTY_INVALIDOS)
def test_difficulty_invalida_devuelve_422(valor):
    response = client.get(BASE, params={"difficulty": valor})
    assert response.status_code == 422, response.text


def test_422_no_filtra_detalles_internos():
    """El error de validacion no expone enums internos ni trazas."""
    response = client.get(BASE, params={"status": "no_existente"})
    assert response.status_code == 422
    texto = response.text.lower()
    for fuga in ("traceback", "sqlalchemy", "lookuperror", "psycopg", "select "):
        assert fuga not in texto, f"fuga interna en la respuesta: {fuga}"


# ── Valores validos: comportamiento intacto ──


def test_status_valido_devuelve_200_y_filtra_por_estado():
    challenge, headers = _create()
    try:
        patch = client.patch(
            f"{BASE}/{challenge['id']}", json={"status": "cerrado"}, headers=headers
        )
        assert patch.status_code == 200, patch.text

        por_cerrado = client.get(BASE, params={"status": "cerrado", "limit": 100})
        assert por_cerrado.status_code == 200
        ids = {c["id"] for c in por_cerrado.json()["challenges"]}
        assert challenge["id"] in ids
        assert all(c["status"] == "cerrado" for c in por_cerrado.json()["challenges"])

        por_abierto = client.get(BASE, params={"status": "abierto", "limit": 100})
        assert por_abierto.status_code == 200
        assert challenge["id"] not in {c["id"] for c in por_abierto.json()["challenges"]}
    finally:
        _cleanup(challenge["id"], headers)


def test_difficulty_valida_devuelve_200_y_filtra_por_nivel():
    challenge, headers = _create(difficulty="easy")
    try:
        response = client.get(BASE, params={"difficulty": "easy", "limit": 100})
        assert response.status_code == 200
        ids = {c["id"] for c in response.json()["challenges"]}
        assert challenge["id"] in ids
    finally:
        _cleanup(challenge["id"], headers)


def test_filtros_combinados_y_paginacion_intactos():
    """Combinar filtros validos sigue devolviendo el sobre de paginacion."""
    response = client.get(
        BASE,
        params={
            "status": "abierto",
            "difficulty": "medium",
            "tipo": "reto",
            "skip": 0,
            "limit": 1,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert {"challenges", "total", "skip", "limit"} <= set(body)
    assert body["skip"] == 0
    assert body["limit"] == 1
    assert len(body["challenges"]) <= 1


def test_paginacion_invalida_sigue_siendo_422():
    """Contrato preexistente de validacion de paginacion, sin cambios."""
    assert client.get(BASE, params={"limit": 0}).status_code == 422
    assert client.get(BASE, params={"skip": -1}).status_code == 422
    assert client.get(BASE, params={"limit": 101}).status_code == 422


def test_listado_por_defecto_sigue_mostrando_solo_abiertos():
    """Regresion: el filtro por defecto (sin status) no cambio."""
    response = client.get(BASE, params={"limit": 100})
    assert response.status_code == 200
    assert all(c["status"] == "abierto" for c in response.json()["challenges"])


def test_filtro_status_combinado_con_author_id_sigue_devolviendo_todos():
    """Con author_id y status explicito se respeta el filtro enviado."""
    challenge, headers = _create()
    try:
        author_id = challenge["author_id"]
        patch = client.patch(
            f"{BASE}/{challenge['id']}", json={"status": "en_progreso"}, headers=headers
        )
        assert patch.status_code == 200, patch.text

        response = client.get(
            BASE,
            params={"author_id": author_id, "status": "en_progreso", "limit": 100},
        )
        assert response.status_code == 200
        filas = response.json()["challenges"]
        assert challenge["id"] in {c["id"] for c in filas}
        assert all(c["status"] == "en_progreso" for c in filas)
        assert all(c["author_id"] == author_id for c in filas)
    finally:
        _cleanup(challenge["id"], headers)
