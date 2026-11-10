"""Pruebas focalizadas del bloque B3-A: redirect_slashes=False en auth-service.

Verifican que las rutas de coleccion no emiten redirecciones 307/308 (que el
proxy de Next.js convertiria en bucles hacia el host interno del gateway) y
que las rutas existentes siguen resolviendo normalmente.
"""

from fastapi.testclient import TestClient

from app.main import app

# follow_redirects=False para poder observar un 307 si llegara a existir.
client = TestClient(app, follow_redirects=False)

COLLECTION = "/api/v1/auth/tutores-docentes"


def test_health_still_works():
    assert client.get("/health").status_code == 200


def test_collection_without_slash_still_matches():
    # La ruta existe y exige autenticacion (401), no redirige.
    assert client.get(COLLECTION).status_code == 401


def test_collection_get_with_trailing_slash_does_not_redirect():
    response = client.get(f"{COLLECTION}/")
    assert response.status_code == 404
    assert "location" not in response.headers


def test_collection_post_with_trailing_slash_does_not_redirect():
    response = client.post(f"{COLLECTION}/", json={"nombres": "Ana"})
    assert response.status_code == 404
    assert "location" not in response.headers


def test_login_route_still_matches():
    # Validacion de payload sin tocar la base de datos: la ruta resuelve.
    assert client.post("/api/v1/auth/login", json={}).status_code == 422


def test_talent_route_with_trailing_slash_does_not_redirect():
    response = client.get("/api/v1/auth/users/talent/")
    assert response.status_code == 404
    assert "location" not in response.headers
