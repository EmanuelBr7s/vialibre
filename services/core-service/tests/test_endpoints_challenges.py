"""Pruebas de caracterizacion de los endpoints de retos (B3-B.4, F5.2).

Fijan el comportamiento ACTUAL de core-service sobre `Challenge`: roles,
codigos HTTP, filtros del listado y campos admitidos. No implementan ni
asumen una maquina de estados de transiciones: cualquier regla de ciclo
de vida de retos es una decision institucional pendiente y estas pruebas
solo deben cambiarse cuando esa decision exista.

Se ejecutan contra el stack real (auth-service accesible en la red docker
para la resolucion de autores) y cada reto creado se limpia via DELETE API.
"""

import uuid

from fastapi.testclient import TestClient

from app.main import app
from tests.helpers import auth_headers
from vialibre_common.schemas import UserRole

client = TestClient(app)

BASE = "/api/v1/core/challenges"

VALID_PAYLOAD = {
    "title": "Reto de caracterizacion F5",
    "short_description": "Descripcion corta para caracterizacion.",
    "long_description": "Descripcion larga con mas de veinte caracteres.",
}


def _create(headers: dict | None = None, **extra) -> tuple[dict, dict]:
    """Crea un reto valido y devuelve (respuesta, headers de su autor)."""
    headers = headers or auth_headers(UserRole.PUBLICADOR)
    response = client.post(BASE, json={**VALID_PAYLOAD, **extra}, headers=headers)
    assert response.status_code == 201, response.text
    return response.json(), headers


def _cleanup(challenge_id: str, headers: dict) -> None:
    response = client.delete(f"{BASE}/{challenge_id}", headers=headers)
    assert response.status_code in (204, 404), response.text


# ── Listado (endpoint publico, sin autenticacion) ──


def test_list_is_public_and_returns_envelope():
    response = client.get(BASE)
    assert response.status_code == 200
    body = response.json()
    assert {"challenges", "total", "skip", "limit"} <= set(body)
    assert body["skip"] == 0
    assert body["limit"] == 20


def test_list_default_hides_non_abierto_and_author_filter_returns_all_statuses():
    """El listado por defecto solo muestra `abierto`; filtrando por autor
    (publicaciones de una empresa) se devuelven todos los estados."""
    challenge, headers = _create()
    try:
        author_id = challenge["author_id"]
        patch = client.patch(
            f"{BASE}/{challenge['id']}", json={"status": "cerrado"}, headers=headers
        )
        assert patch.status_code == 200, patch.text

        por_defecto = client.get(BASE, params={"limit": 100})
        assert por_defecto.status_code == 200
        assert challenge["id"] not in {c["id"] for c in por_defecto.json()["challenges"]}

        cerrados = client.get(BASE, params={"status": "cerrado", "limit": 100})
        assert cerrados.status_code == 200
        assert challenge["id"] in {c["id"] for c in cerrados.json()["challenges"]}

        por_autor = client.get(BASE, params={"author_id": author_id, "limit": 100})
        assert por_autor.status_code == 200
        assert challenge["id"] in {c["id"] for c in por_autor.json()["challenges"]}
    finally:
        _cleanup(challenge["id"], headers)


def test_list_filter_by_tipo_and_invalid_tipo_rejected():
    challenge, headers = _create(tipo="empleo")
    try:
        author_id = challenge["author_id"]
        empleos = client.get(
            BASE, params={"tipo": "empleo", "author_id": author_id, "limit": 100}
        )
        assert empleos.status_code == 200
        assert challenge["id"] in {c["id"] for c in empleos.json()["challenges"]}

        retos = client.get(
            BASE, params={"tipo": "reto", "author_id": author_id, "limit": 100}
        )
        assert retos.status_code == 200
        assert challenge["id"] not in {c["id"] for c in retos.json()["challenges"]}

        invalido = client.get(BASE, params={"tipo": "hotel"})
        assert invalido.status_code == 422
    finally:
        _cleanup(challenge["id"], headers)


def test_list_limit_bounds_are_rejected():
    assert client.get(BASE, params={"limit": 0}).status_code == 422
    assert client.get(BASE, params={"limit": 101}).status_code == 422
    assert client.get(BASE, params={"skip": -1}).status_code == 422


# ── Creacion ──


def test_create_requires_auth():
    assert client.post(BASE, json=VALID_PAYLOAD).status_code == 401


def test_create_restricted_to_publicador():
    for role in (UserRole.ADMIN, UserRole.SOLUCIONADOR, UserRole.EGRESADO):
        response = client.post(BASE, json=VALID_PAYLOAD, headers=auth_headers(role))
        assert response.status_code == 403, response.text
        assert response.json()["detail"] == "Only publicadores can create challenges"


def test_create_returns_201_with_defaults_and_echoed_fields():
    sub = uuid.uuid4()
    headers = auth_headers(UserRole.PUBLICADOR, sub=sub)
    response = client.post(BASE, json=VALID_PAYLOAD, headers=headers)
    assert response.status_code == 201, response.text
    body = response.json()
    try:
        assert body["author_id"] == str(sub)
        # Estado inicial: todos los retos nacen `abierto` (no existe campo
        # `status` en ChallengeCreate).
        assert body["status"] == "abierto"
        assert body["tipo"] == "reto"
        assert body["is_featured"] is False
        assert body["title"] == VALID_PAYLOAD["title"]
        # Campos resueltos contra auth-service: siempre presentes (opcionales).
        assert "author_name" in body
        assert "empresa_nombre" in body
    finally:
        _cleanup(body["id"], headers)


def test_create_rejects_short_fields_with_422():
    headers = auth_headers(UserRole.PUBLICADOR)
    response = client.post(BASE, json={**VALID_PAYLOAD, "title": "abc"}, headers=headers)
    assert response.status_code == 422


def test_create_rejects_invalid_enum_fields_with_422():
    headers = auth_headers(UserRole.PUBLICADOR)
    response = client.post(
        BASE, json={**VALID_PAYLOAD, "difficulty": "imposible"}, headers=headers
    )
    assert response.status_code == 422
    response = client.post(BASE, json={**VALID_PAYLOAD, "tipo": "hotel"}, headers=headers)
    assert response.status_code == 422


# ── Lectura ──


def test_get_is_public_and_returns_challenge():
    challenge, headers = _create()
    try:
        response = client.get(f"{BASE}/{challenge['id']}")  # sin token
        assert response.status_code == 200
        assert response.json()["id"] == challenge["id"]
        assert response.json()["status"] == "abierto"
    finally:
        _cleanup(challenge["id"], headers)


def test_get_unknown_challenge_returns_404():
    response = client.get(f"{BASE}/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Challenge not found"


# ── Actualizacion (PATCH) ──


def test_patch_requires_auth():
    response = client.patch(
        f"{BASE}/{uuid.uuid4()}", json={"title": "Titulo valido para patch"}
    )
    assert response.status_code == 401


def test_patch_author_can_change_status_without_state_machine():
    """Caracterizacion: NO hay maquina de estados. El autor transiciona
    libremente entre abierto, en_progreso y cerrado en cualquier direccion.
    Si algun dia se define un flujo institucional, este test debera cambiar."""
    challenge, headers = _create()
    try:
        for nuevo_estado in ("en_progreso", "cerrado", "abierto"):
            response = client.patch(
                f"{BASE}/{challenge['id']}",
                json={"status": nuevo_estado},
                headers=headers,
            )
            assert response.status_code == 200, response.text
            assert response.json()["status"] == nuevo_estado
    finally:
        _cleanup(challenge["id"], headers)


def test_patch_admin_can_update_challenge_of_others():
    challenge, headers_autor = _create()
    try:
        admin = auth_headers(UserRole.ADMIN)
        update = client.patch(
            f"{BASE}/{challenge['id']}", json={"status": "cerrado"}, headers=admin
        )
        assert update.status_code == 200, update.text
        assert update.json()["status"] == "cerrado"
    finally:
        _cleanup(challenge["id"], headers_autor)


def test_patch_non_author_publicador_is_forbidden():
    challenge, headers_autor = _create()
    try:
        intruso = auth_headers(UserRole.PUBLICADOR)  # sub distinto al autor
        update = client.patch(
            f"{BASE}/{challenge['id']}", json={"status": "cerrado"}, headers=intruso
        )
        assert update.status_code == 403
        assert update.json()["detail"] == "Not authorized to update this challenge"
        # El reto no fue alterado.
        assert client.get(f"{BASE}/{challenge['id']}").json()["status"] == "abierto"
    finally:
        _cleanup(challenge["id"], headers_autor)


def test_patch_unknown_challenge_returns_404():
    response = client.patch(
        f"{BASE}/{uuid.uuid4()}", json={"status": "cerrado"}, headers=auth_headers(UserRole.ADMIN)
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Challenge not found"


def test_patch_invalid_status_returns_422():
    challenge, headers = _create()
    try:
        response = client.patch(
            f"{BASE}/{challenge['id']}", json={"status": "finalizado"}, headers=headers
        )
        assert response.status_code == 422
    finally:
        _cleanup(challenge["id"], headers)


def test_patch_without_status_preserves_status():
    challenge, headers = _create()
    try:
        cerrar = client.patch(
            f"{BASE}/{challenge['id']}", json={"status": "cerrado"}, headers=headers
        )
        assert cerrar.status_code == 200

        update = client.patch(
            f"{BASE}/{challenge['id']}",
            json={"title": "Titulo revisado despues de cerrar"},
            headers=headers,
        )
        assert update.status_code == 200, update.text
        assert update.json()["title"] == "Titulo revisado despues de cerrar"
        assert update.json()["status"] == "cerrado"
    finally:
        _cleanup(challenge["id"], headers)


def test_patch_ignores_fields_not_present_in_schema():
    """Caracterizacion: `author_id`, `is_featured` y `featured_score` no
    pertenecen a `ChallengeUpdate`; se ignoran sin error y sin cambios."""
    challenge, headers = _create()
    try:
        response = client.patch(
            f"{BASE}/{challenge['id']}",
            json={
                "author_id": str(uuid.uuid4()),
                "is_featured": True,
                "featured_score": 99,
            },
            headers=headers,
        )
        assert response.status_code == 200, response.text
        assert response.json()["author_id"] == challenge["author_id"]
        assert response.json()["is_featured"] is False
    finally:
        _cleanup(challenge["id"], headers)


# ── Borrado ──


def test_delete_requires_auth():
    assert client.delete(f"{BASE}/{uuid.uuid4()}").status_code == 401


def test_delete_by_author_then_challenge_is_gone():
    challenge, headers = _create()
    delete = client.delete(f"{BASE}/{challenge['id']}", headers=headers)
    assert delete.status_code == 204
    assert client.get(f"{BASE}/{challenge['id']}").status_code == 404
    # Borrar dos veces -> 404.
    assert client.delete(f"{BASE}/{challenge['id']}", headers=headers).status_code == 404


def test_delete_non_author_is_forbidden():
    challenge, headers_autor = _create()
    try:
        intruso = auth_headers(UserRole.PUBLICADOR)
        delete = client.delete(f"{BASE}/{challenge['id']}", headers=intruso)
        assert delete.status_code == 403
        assert delete.json()["detail"] == "Not authorized to delete this challenge"
        # El reto sigue existiendo.
        assert client.get(f"{BASE}/{challenge['id']}").status_code == 200
    finally:
        _cleanup(challenge["id"], headers_autor)


def test_delete_by_admin():
    challenge, headers = _create()
    try:
        admin = auth_headers(UserRole.ADMIN)
        delete = client.delete(f"{BASE}/{challenge['id']}", headers=admin)
        assert delete.status_code == 204
        assert client.get(f"{BASE}/{challenge['id']}").status_code == 404
    finally:
        _cleanup(challenge["id"], headers)
