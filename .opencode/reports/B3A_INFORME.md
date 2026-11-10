# B3-A — Informe final: correcciones acotadas de robustez

**Bloque:** B3-A (autorizado expresamente; único bloque ejecutado — no se inició B3-B ni ninguna otra parte de la Fase 3).
**Fecha:** 2026-10-18 · **Rama:** `feature/funcionalidades-eric-jassir` (HEAD `8a6211b`)

---

## 1. Archivos modificados y motivo

| Archivo | Estado | Cambio y motivo |
|---|---|---|
| `services/auth-service/app/main.py` | Modificado (antes limpio) | Añadido `redirect_slashes=False` al constructor de `FastAPI` con el mismo comentario justificativo de core/match. Elimina el bucle 307 latente en la colección `POST/GET /api/v1/auth/tutores-docentes` (rutas `""` en `tutores_docentes.py:51,65`), cuyo 307 apuntaría al host interno del gateway. |
| `services/match-service/app/api/v1/endpoints/interactions.py` | Modificado (ya tenía cambios preexistentes) | Las 3 llamadas a **core-service** (listado de postulantes, `approve`, `contact`) pasan de `httpx.AsyncClient()` sin `timeout` y sin `try/except` a `httpx.AsyncClient(timeout=5.0)` + `except httpx.HTTPError → HTTP 502`, siguiendo el patrón ya existente en `practicas.py:56-75,83-95` y `empresas.py`. Detalle: **no se filtran URLs internas ni mensajes de excepción** (details estáticos ya existentes). La llamada a **auth-service** del bloque de contacto (línea 344, `.../users/{contact_id}` con service token) queda **intacta** por estar fuera del alcance autorizado (ver riesgos residuales). |
| `services/match-service/app/api/v1/endpoints/reactions.py` | Modificado (ya tenía cambios preexistentes) | Solo comentario de decisión sobre `GET /reactions/internal/count/{challenge_id}` (ver §5). **Cero cambios funcionales.** |
| `services/match-service/tests/test_endpoints_interactions.py` | Nuevo | 8 pruebas focalizadas de conversión a 502, conservación de contrato y no enmascaramiento de errores de programación. |
| `services/auth-service/tests/test_redirect_slashes.py` | Nuevo | 6 pruebas de ausencia de redirecciones en rutas de colección y resolución de rutas existentes. |

### Detalle del cambio de comportamiento justificado (interactions.py)

| Llamada | Antes | Después |
|---|---|---|
| core responde **404** (listado postulantes) | 404 `Challenge not found` | **404 igual** (contrato preservado) |
| core responde **otro no-200** (listado postulantes) | 404 `Challenge not found` | **502** `Could not verify challenge` *(conversión justificada: es un fallo de dependencia, no un "no encontrado")* |
| core responde **cualquier no-200** (approve) | 502 | **502 igual** (contrato preservado) |
| core responde **cualquier no-200** (contact) | 502 | **502 igual** (contrato preservado) |
| **timeout / caída de core** (las 3) | Excepción `httpx` → **500** | **502** con detail estático |

## 2. Pruebas ejecutadas y resultados exactos

### Automatizadas (dentro de los contenedores, como el Makefile)

| Comando | Resultado |
|---|---|
| `docker-compose exec -T auth-service pytest -q` | **25 passed**, 2 warnings, 1.02 s (incluye las 6 nuevas `test_redirect_slashes.py`) |
| `docker-compose exec -T match-service pytest -q` | **29 passed**, 1 warning, 3.04 s (incluye las 8 nuevas `test_endpoints_interactions.py`) |
| `docker-compose exec -T core-service pytest -q` (regresión, servicio no modificado) | **18 passed**, 1 warning, 0.94 s |
| `npm run lint` en `frontend/` | **✔ No ESLint warnings or errors** (sin cambios frontend; se ejecuta por ser el único lint configurado) |

Pruebas nuevas de match (todas con `httpx` 0.28.1 verificado en el contenedor):
transport error → 502 (applicants/approve/contact), timeout (`ReadTimeout`) → 502, core 404 → 404 (contrato), core 500 → 502, y `test_programming_error_is_not_masked_as_502` (un `ValueError` **propaga** en lugar de convertirse en 502: solo se captura `httpx.HTTPError`).

No existe linter/formatter de Python configurado en el proyecto (AGENTS.md): la validación de sintaxis/import la aporta la propia ejecución de pytest.

### Comprobaciones en vivo (servicios ya levantados; sin reconstruir nada)

**Impacto evaluado previamente a los reinicios:** `docker-compose restart` de `auth-service` y `match-service` no reconstruye imágenes ni toca volúmenes (`pgdata` intacto, `postgres`/`nginx`/`frontend`/`core` sin tocar); ambos servicios son stateless (JWT sin sesiones server-side); el código llega por bind-mount. Única consecuencia: ~1–2 s de indisponibilidad. Reinicio ejecutado y verificado con salud posterior.

| Comprobación | Resultado |
|---|---|
| `GET :8001/health`, `:8002/health`, `:8003/health` | **200 / 200 / 200** |
| `GET :8001/api/v1/auth/tutores-docentes/` (con slash) | **404**, **sin header `Location`** (antes: 307 → bucle potencial) |
| `GET :8001/api/v1/auth/tutores-docentes` (sin slash) | **401** (ruta resuelve y pide auth) |
| `GET :80/api/v1/auth/tutores-docentes` vía **nginx** | **401** con `Server: nginx` (cadena gateway→auth intacta) |
| `POST :80/api/v1/auth/tutores-docentes` sin token (vía nginx, `Invoke-RestMethod`) | **401** (colección POST resuelve sin redirección) |
| `POST :80/api/v1/auth/login` con `{}` vía nginx | **422** (ruta login operativa; validación sin DB) |
| `GET :8003/api/v1/match/interactions` y vía nginx | **401 / 401** (match opera tras el reinicio) |

No se pudo verificar la cadena completa a través de `:3000` (Next.js): ver hallazgo preexistente en §6.

## 3. Criterios de aceptación

| Criterio | Estado | Evidencia |
|---|---|---|
| `auth-service` declara `redirect_slashes=False` | ✅ Cumplido | `main.py` (constructor de `FastAPI`), verificado en vivo (404 sin `Location`) |
| Llamadas a core en alcance con `timeout` explícito y manejo de `httpx.HTTPError` | ✅ Cumplido | `interactions.py` líneas 78/82, 222/226, 312/316 |
| Errores de dependencia → HTTP 502 coherente con el proyecto | ✅ Cumplido | Patrón idéntico a `practicas.py`; 8 pruebas nuevas |
| `/internal/count` sin cambios funcionales y decisión documentada | ✅ Cumplido | Comentario en `reactions.py` + §5 de este informe |
| Pruebas pertinentes pasan; fallos ajenos identificados por separado | ✅ Cumplido | 25 + 29 + 18 passed; único hallazgo ajeno: modo mock del frontend (§6) |
| Sin cambios en modelos, migraciones, enums, permisos ni datos | ✅ Cumplido | Ninguna migración ejecutada; ningún modelo/schema/enum/permiso tocado; `make migrate*` no ejecutado |

## 4. Cambios preexistentes preservados

- El repositorio arrancaba con **30 ficheros modificados y 28+ no rastreados** (trabajo sin commitear de fases/etapas anteriores). No se revirtió, sobrescribió ni eliminó ninguno.
- `interactions.py` y `reactions.py` **ya estaban modificados** antes de B3-A: mis ediciones son aditivas y localizadas (bloques httpx y un comentario); el resto de su contenido preexistente quedó intacto.
- Los directorios `services/*/tests/` y `services/*/alembic/versions/` siguen siendo no rastreados tal como estaban; los dos archivos de test nuevos se añadieron dentro de los primeros.
- No se modificó `frontend/`, `gateway/`, `shared/`, `.env`, `docker-compose.yml` ni `Makefile`.

## 5. Decisión documentada: `GET /reactions/internal/count/{challenge_id}`

**Decisión: mantener sin cambios** (ni migración a service token, ni eliminación), con registro en:
1. Comentario sobre la definición en `reactions.py` (§1).
2. Este informe.

**Fundamento (evidencia de B3_01, Duda 2/H4):** el endpoint existe (`reactions.py:111`), está registrado bajo `/reactions` y es expuesto por el gateway, pero tiene **cero llamadores** en todo el repositorio (frontend, gateway y servicios). Autenticación actual: `get_current_user` (JWT de usuario), no `require_internal_service`. Migrarlo a `X-Service-Token` obligaría a portar el dependency `require_internal_service` a match-service para servir a nadie; eliminarlo rompería un contrato HTTP expuesto sin sustituír consumo. La nomenclatura `/internal` con auth JWT queda registrada como imprecisa. Revisar si aparece un consumidor cross-service real o en una fase de limpieza.

## 6. Riesgos residuales y hallazgos ajenos

**Riesgos residuales del bloque:**
1. **Llamada a auth-service sin timeout** en `interactions.py:344` (`GET /users/{contact_id}/contact`, la 4ª llamada del archivo): si auth-service no responde, la petición puede colgar indefinidamente. Está **fuera del alcance autorizado** en B3-A (solo se autorizó core-service) → propongo incluirla en el siguiente bloque si se aprueba.
2. **Contrato de approve/contact:** core devolviendo 404 (challenge inexistente) sigue mapeándose a 502 (comportamiento preexistente preservado deliberadamente; distinguirlo 404→404 sería un cambio de contrato).
3. El frontend, core, nginx y postgres **no se reiniciaron**; auth y match operan con el nuevo código. Un `docker-compose restart` posterior del entorno mantiene los cambios (bind-mount).

**Hallazgo preexistente detectado durante la verificación en vivo (ajeno a B3-A, NO modificado):**
- El contenedor de frontend sirve `/app/.env.local` **horneado en la imagen** con `NEXT_PUBLIC_API_MOCK=true` (no bind-mounteado). En esas condiciones, `next.config.js` (versión de la imagen, con lógica `MOCK_MODE` que difiere del `next.config.js` del working tree) devuelve **rewrites vacías**: toda petición a `:3000/api/*` cae en el 404 de Next (visible en `docker logs frontend`: `POST /api/v1/auth/login 404` anteriores a este bloque). La conectividad de red es correcta (`fetch` desde dentro del frontend a `http://nginx:80/api/...` → 401). Esto no es regresión de B3-A (rutas ajenas como `/api/v1/match/interactions` dan igual 404 por `:3000`) y su arreglo (rebuild del contenedor de frontend con `MOCK=false` o `.env.local` distinto) queda **fuera de alcance y pendiente de autorización**.
- Nota metodológica: los cortes `curl.exe --data-raw '{...}'` desde PowerShell 5.1 pierden las comillas embebidas (provocan un 422 `json_invalid` espurio); las verificaciones de POST se hicieron con `Invoke-RestMethod` y el cuerpo llegó correcto (401).

## 7. Estado Git

- **Sin staging ni commit**: `git diff --cached` vacío tras el bloque.
- Ficheros en working tree: los 3 modificados + los directorios/tests descritos en §1 y §4.
- No se ejecutó `make clean`, `make build`, `make migrate*`, ni se detuvo/recreó ningún servicio (solo `restart` de auth y match, autorizado implícitamente por el criterio de comprobaciones en vivo y con impacto evaluado en §2).

---

> **B3-A concluido.** No se autoriza ni se ejecuta ningún bloque posterior (B3-B TOCTOU, B3-C RBAC, etc.) sin aprobación expresa.
