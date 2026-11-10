# B3-A.1 — Informe final: robustez de la llamada restante a auth-service

**Bloque:** B3-A.1 (autorizado expresamente; no se inició B3-A.2, B3-B ni ninguna otra parte de la Fase 3).
**Fecha:** 2026-10-18 · **Rama:** `feature/funcionalidades-eric-jassir` (HEAD `8a6211b`)
**Predecesor:** `.opencode/reports/B3A_INFORME.md` (B3-A concluido).

---

## 1. Archivo modificado y motivo

| Archivo | Estado | Cambio y motivo |
|---|---|---|
| `services/match-service/app/api/v1/endpoints/interactions.py` | Modificado (ya venía modificado desde B3-A y fases previas) | El bloque restante del endpoint `GET /{interaction_id}/contact` que consulta **auth-service** (`GET {auth_service_url}/api/v1/auth/users/{contact_id}` con `X-Service-Token`) pasaba de `httpx.AsyncClient()` sin `timeout` y sin `try/except` a `httpx.AsyncClient(timeout=5.0)` + `except httpx.HTTPError → HTTP 502`. Patrón idéntico al de las otras 3 llamadas del mismo archivo (B3-A) y al de `practicas.py:83-95`. Detalle estático reutilizado: `"Could not fetch user information"` (el ya usado por este mismo bloque para respuestas no-200). |
| `services/match-service/tests/test_endpoints_interactions.py` | Extendido (creado en B3-A, no rastreado) | +6 pruebas focalizadas (§3). `_FakeResponse` admite ahora payload opcional (retrocompatible) y se añade la fábrica `_contact_client()` que distingue comportamiento por URL (core vs auth). |

### Comportamiento antes/después (bloque de contacto → auth-service)

| Escenario | Antes | Después |
|---|---|---|
| auth responde **200** | `ContactInfo` con datos del usuario | **Igual** (contrato preservado) |
| auth responde **cualquier no-200** | 502 `Could not fetch user information` | **Igual** (contrato preservado) |
| **timeout / caída de auth** | Excepción `httpx` → **500** | **502** con detail estático |
| Autorización (403) y 404 de interacción | Se evalúan antes de la llamada a auth | **Sin cambios** (verificado por test) |
| Excepción de programación | Propagaba (500) | **Sigue propagando** (solo se captura `httpx.HTTPError`) |

Tras el cambio, las **4** llamadas HTTP de `interactions.py` quedan uniformadas (líneas 78, 222, 312 y 345): todas con `timeout=5.0` y `except httpx.HTTPError → 502`.

## 2. Pruebas ejecutadas: actual vs línea base histórica

| Suite / control | Línea base (B3-A, histórico) | **Resultado actual (B3-A.1)** | Variación |
|---|---|---|---|
| `docker-compose exec -T match-service pytest -q` | 29 passed (3.04 s) | **35 passed**, 1 warning, 3.50 s | **+6** (las nuevas de este bloque) |
| `docker-compose exec -T auth-service pytest -q` | 25 passed (1.02 s) | **25 passed**, 2 warnings, 1.06 s | Sin cambios (control; servicio no tocado) |
| `docker-compose exec -T core-service pytest -q` | 18 passed (0.94 s) | **18 passed**, 1 warning, 1.03 s | Sin cambios (control; servicio no tocado) |
| `npm run lint` (frontend) | limpio | **✔ No ESLint warnings or errors** | Sin cambios (frontend no tocado) |

No existe linter de Python configurado (AGENTS.md); la validación de sintaxis/import la aporta pytest (importa el módulo modificado en cada ejecución).

## 3. Pruebas nuevas (6, todas en match-service)

| Prueba | Demuestra |
|---|---|
| `test_contact_auth_transport_error_returns_502` | `ConnectError` de auth → **502** con detail estático; sin fugas (`auth-service` ni `http://` en la respuesta) |
| `test_contact_auth_timeout_returns_502` | `ReadTimeout` de auth → **502**; el mensaje de timeout no llega al cliente |
| `test_contact_auth_valid_response_succeeds` | **Contrato de éxito intacto**: 200 con `user_id`, `full_name`, `email`, `phone` correctos |
| `test_contact_auth_error_keeps_502_contract` | no-200 de auth → **502** con el mismo detail preexistente |
| `test_contact_unauthorized_still_403_before_auth_call` | La autorización (403) se evalúa **antes** de llamar a auth: el registro de URLs prueba que jamás se consultó `auth_service_url` |
| `test_contact_auth_programming_error_is_not_masked` | Un `ValueError` dentro del bloque **propaga** en lugar de convertirse en 502 |

El doble de cobertura se consigue con `_contact_client()`, que responde a core (200 + `author_id`) y simula el comportamiento deseado contra auth según URL.

## 4. Criterios de aceptación

| Criterio | Estado |
|---|---|
| Timeout explícito de 5 s en la llamada a auth-service | ✅ `interactions.py:345` |
| `httpx.HTTPError` → 502 con detail estático | ✅ Línea 352, detail `"Could not fetch user information"` |
| Errores de programación no enmascarados | ✅ Test `..._programming_error_is_not_masked` |
| Comportamiento funcional ajeno al fallo de dependencia intacto | ✅ Tests de éxito (200) y autorización (403 previo) |
| Pruebas nuevas y pertinentes pasan | ✅ 35 passed en match; controles auth/core/lint sin regresión |
| Informe distingue resultados actuales de la línea base | ✅ §2 |
| No se inició B3-A.2 ni B3-B | ✅ Solo se ejecutó lo autorizado en este bloque |

## 5. Conservación de trabajo preexistente y estado Git

- Sin staging ni commit: `git diff --cached` vacío tras el bloque.
- Las únicas huellas en el working tree son `services/match-service/app/api/v1/endpoints/interactions.py` (M, edición aditiva) y el fichero de tests (dentro del directorio no rastreado `services/match-service/tests/`).
- No se tocaron modelos, esquemas, migraciones, enums, permisos, roles, datos, frontend, gateway, Docker ni `.env`; no se ejecutaron migraciones ni builds.

## 6. Notas y riesgos residuales

1. **Sin reinicio de contenedores (restricción del bloque):** el proceso `uvicorn` de match-service en marcha sirve todavía el código cargado en su último reinicio (post-B3-A). El nuevo manejo de la 4ª llamada está validado por pytest (que importa el bind-mount en frío) y quedará activo en el servicio con el próximo `docker-compose restart match-service` o reinicio del entorno. **Ninguna llamada depende del cambio para seguir funcionando**: el comportamiento en vivo solo difiere si auth-service se cae o supera 5 s (antes: colgue/500 → ahora: 502).
2. No se detectó necesidad de modificar otra ruta, alterar un contrato funcional ni reiniciar servicios para cumplir el objetivo → no hubo que detenerse por ampliación de alcance.
3. Queda agotado el inventario de llamadas HTTP de `interactions.py`; la asimetría conocida `match → core sin X-Service-Token` (patrón aceptado, FASE2) y el modo mock horneado en la imagen de frontend (§6 del informe B3-A) siguen pendientes y **fuera** de este bloque.

---

> **B3-A.1 concluido.** No se autoriza ni se ejecuta ningún bloque posterior sin aprobación expresa.
