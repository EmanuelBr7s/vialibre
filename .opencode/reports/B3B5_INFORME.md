# Informe B3-B.5 — Cierre de rutas de error (filtros de listado y transporte en documentos)

Fecha: 2026-10-18 · Rama `feature/funcionalidades-eric-jassir` (HEAD `8a6211b`, sin staging)
Bloque: exclusivamente el alcance autorizado en B3-B.5. Sin migraciones, sin cambios de modelos/enums/esquemas/seeds/permisos, sin reconstrucciones ni reinicios de contenedores, sin staging ni commits, sin `git add`/`reset`/`checkout`/limpieza.

---

## 1. Estado de Git (inicial y final)

| Momento | Rama / HEAD | Staging | Working tree |
|---|---|---|---|
| Inicial | `feature/funcionalidades-eric-jassir` / `8a6211b` | vacío | 34 modificados + 39 no rastreados = 73 entradas |
| Final | `feature/funcionalidades-eric-jassir` / `8a6211b` | vacío (`git diff --cached --stat` sin salida) | 73 entradas (los 3 ficheros de código ya estaban en el conjunto modificado; los 3 ficheros de prueba nuevos caen dentro de directorios ya no rastreados `services/*/tests/`, por lo que no añaden líneas al porcelain) |

- **HEAD no se movió** y **no se hizo ningún `git add` ni commit**.
- Todo el trabajo preexistente (modificado y no rastreado) se conserva íntegro; no se restauró, revirtió ni sobrescribió nada.

## 2. Archivos modificados por este bloque

### Código de servicio (3 ediciones localizadas, aditivas)

| Archivo | Cambio |
|---|---|
| `services/core-service/app/api/v1/endpoints/challenges.py` | Import de `DifficultyLevel`; `status_filter: str \| None` → `ChallengeStatus \| None`; `difficulty: str \| None` → `DifficultyLevel \| None` (+comentario justificativo). |
| `services/match-service/app/api/v1/endpoints/interactions.py` | `list_my_interactions`: `status_filter: str \| None` → `InteractionStatus \| None` (+comentario). |
| `services/match-service/app/api/v1/endpoints/documents.py` | `_fetch_json`: `try/except httpx.HTTPError → HTTP 502` con `detail` estático (mismo texto del contrato no-200 existente). Sin otros cambios. |

### Pruebas nuevas

| Archivo | Contenido |
|---|---|
| `services/core-service/tests/test_filtros_listados.py` (nuevo) | 16 casos: `status` inválido ×5 y `difficulty` inválida ×4 → 422; sin fugas internas; valores válidos filtran; filtros combinados + paginación; paginación inválida sigue 422; listado por defecto sigue mostrando solo abiertos; `status`+`author_id`. |
| `services/match-service/tests/test_filtros_listados.py` (nuevo) | 10 casos: `status` inválido ×5 → 422; sin fugas; sin token sigue 401/403; valores válidos filtran mis postulaciones; sobre de paginación intacto; paginación inválida sigue 422. |
| `services/match-service/tests/test_documentos_transporte.py` (nuevo) | 9 casos: unidad de `_fetch_json` (conexión rechazada **real** `127.0.0.1:9` → 502, timeout → 502, no-200 → 502, error de programación **no** enmascarado) y endpoints (`listar documentos` con core caído/timeout → 502; respuesta válida conserva el 200 con `aplica/completos/requeridos`; 403 sin permiso intacto; `carta-aval` con auth caído → 502 sin filtrar detalles). |

No se modificó ningún otro archivo. No se tocaron modelos, enums, esquemas, migraciones, seeds, permisos, frontend, gateway ni configuración.

## 3. Cambios realizados y justificación técnica

**A-1 · Filtros `status`/`difficulty` → 500 (core y match).** Los parámetros se declaraban como cadena libre y se comparaban contra columnas `Enum` nativas (`Challenge.status`/`Challenge.difficulty`, `Interaction.status`). Un valor fuera del enum hacía que SQLAlchemy/PostgreSQL lanzara una excepción sin manejar → **500**. Se tipean los parámetros con los **enums locales del modelo** (el mismo patrón que ya usaba `tipo: ChallengeTipo`), de modo que FastAPI valida en la capa de entrada y devuelve **422** sin filtrar detalles internos. No cambia ninguna regla de negocio ni la autorización; los valores válidos, los filtros combinados, el orden y la paginación quedan idénticos. No se inventó ningún catálogo: se reutilizan los enums existentes.

**A-2 · `documents._fetch_json` sin manejo de errores de transporte → 500.** La función tenía `timeout=5.0` pero no capturaba `httpx.HTTPError`; una conexión rechazada o timeout de core/auth propagaba hasta un 500 (no hay handlers globales en `main.py`). Se envuelve la llamada en `try/except httpx.HTTPError` y se devuelve **502** con el `detail` estático que ya usaba la ruta de no-200 (`No se pudo consultar un servicio relacionado`). Se captura **solo** `httpx.HTTPError`: un error de programación continúa propagando (no se enmascara). No se exponen URL, host, token ni el mensaje de la excepción.

## 4. Pruebas ejecutadas y resultados reales

Todas dentro de los contenedores en marcha (stack ya levantado; **sin** reconstruir ni reiniciar nada), contra la PostgreSQL real:

```
docker-compose exec -T core-service pytest -q tests/test_filtros_listados.py        -> 16 passed (1.41 s)
docker-compose exec -T match-service pytest -q tests/test_filtros_listados.py \
                                              tests/test_documentos_transporte.py   -> 19 passed (1.74 s)
docker-compose exec -T match-service pytest -q                                      -> 90 passed (13.88 s)
docker-compose exec -T core-service  pytest -q                                      -> 57 passed (5.78 s)
docker-compose exec -T auth-service  pytest -q                                      -> 30 passed (1.91 s)
npm run lint (frontend/)                                                            -> ✔ No ESLint warnings or errors
npx vitest run (frontend/)                                                          -> 5 files, 45 passed
```

**Comprobación en vivo del cambio de comportamiento** (solo lectura, servicio en marcha con `uvicorn --reload`):

| Petición | Antes (auditoría de cierre) | Ahora |
|---|---|---|
| `GET :8002/api/v1/core/challenges?status=no_existente` | 500 | **422** |
| `GET :8002/api/v1/core/challenges?difficulty=garbage` | 500 | **422** |
| `GET :8002/api/v1/core/challenges?tipo=garbage` | 422 | **422** (sin cambios) |
| `GET :8002/api/v1/core/challenges?status=abierto` | 200 | **200** |
| `GET :8002/api/v1/core/challenges?difficulty=easy` | 200 | **200** |

Ninguna prueba fue omitida; no hubo fallos de infraestructura ni de configuración.

## 5. Comparación con la línea base

| Suite | Línea base | Resultado real | Diferencia |
|---|---|---|---|
| match-service | 71 passed | **90 passed** | +19 (10 filtros + 9 documentos), todas nuevas |
| core-service | 41 passed | **57 passed** | +16 (filtros de challenges) |
| auth-service | 30 passed | **30 passed** | sin cambios (servicio no tocado; control) |
| Vitest (frontend) | 45 passed | **45 passed** | sin cambios (frontend no tocado; control) |
| `npm run lint` | limpio | **limpio** | sin cambios |

Ninguna prueba previa cambió de resultado: todas las diferencias quedan explicadas por los 35 casos nuevos.

## 6. Contratos HTTP antes y después

| Endpoint | Entrada | Antes | Después |
|---|---|---|---|
| `GET /core/challenges?status=…` | valor fuera del enum | 500 | **422** |
| `GET /core/challenges?difficulty=…` | valor fuera del enum | 500 | **422** |
| `GET /core/challenges?status=…` | valor válido / sin filtro | 200 | 200 (idéntico) |
| `GET /core/challenges?difficulty=…` | valor válido / sin filtro | 200 | 200 (idéntico) |
| `GET /core/challenges?tipo=…` | inválido / válido | 422 / 200 | 422 / 200 (sin cambios) |
| `GET /match/interactions?status=…` | valor fuera del enum | 500 | **422** |
| `GET /match/interactions?status=…` | valor válido / sin filtro | 200 | 200 (idéntico) |
| `GET/PUT /match/interactions/{id}/documentos…` | core/auth caído o timeout | 500 | **502** (`No se pudo consultar un servicio relacionado`) |
| `GET /match/interactions/{id}/documentos…` | core responde 200 | 200 | 200 (idéntico) |
| `GET /match/interactions/{id}/documentos…` | core responde no-200 | 502 | 502 (idéntico) |
| `GET /match/interactions/{id}/carta-aval` | auth caído | 500 | **502** (idéntico detail estático) |

Autorización, transiciones de estado, paginación, orden y códigos de éxito no cambiaron. El único cambio de contrato es en la ruta de error (500 → 422/502), que es precisamente el objetivo del bloque.

## 7. Riesgos residuales y hallazgos fuera de alcance

**Riesgos residuales del bloque**
1. `?status=` (cadena vacía) pasa de "sin filtro" (200) a **422**, por coherencia con `tipo` y con la regla "valor inválido → 422". No hay ningún llamador del frontend que envíe la cadena vacía (verificado: `admin/practicas` usa `['abierto','en_progreso','cerrado']`; `ContactSection` llama sin parámetros; `mis-postulaciones` solo envía `limit`).
2. La validación de los nuevos filtros depende de los enums locales; si un enum cambiara de valores, el 422 los reflejaría automáticamente (sin acción manual).
3. En `documents.py` solo se captura `httpx.HTTPError`; cualquier otro fallo (p. ej. JSON inválido en un 200) sigue propagando, según lo autorizado.

**Hallazgos fuera de alcance (documentados, NO corregidos)**
- Validación de existencia de challenge en `reactions.py` (A-3 del diagnóstico): sigue sin validar.
- `category_id` inválido en `POST /challenges` → 500 (B-1 del diagnóstico): sigue igual.
- F5.1b (elegibilidad por estado del reto), máquina de estados de challenges, B3-B.3/D6 (borrado de interacciones con práctica formalizada y estado requerido en `create_practica`), política de borrado de challenges con interacciones: intactos, pendientes de decisión.
- KPIs simulados del dashboard admin sin marca visible y modo mock del frontend: sin cambios (fase UX/UI).
- `delete_interaction` sin guarda de estado (B-4 del diagnóstico): sin cambios.

## 8. Confirmación explícita

- **No** se ejecutaron migraciones ni se modificaron modelos, enums, esquemas, seeds ni permisos.
- **No** se reconstruyó ninguna imagen ni se reinició ningún contenedor; las suites corrieron en los contenedores ya levantados.
- **No** se hizo `git add`, staging, commit, cambio de rama ni limpieza del árbol; `git diff --cached` sigue vacío y HEAD sigue en `8a6211b`.
- El trabajo preexistente (modificado y no rastreado) permanece intacto.

---

> **B3-B.5 concluido.** Todos los criterios de aceptación del bloque se cumplen: filtros inválidos → 422 (verificado en vivo), transporte caído en documentos → 502 sin fugas, suites ≥ línea base (match 90, core 57, auth 30), lint limpio, vitest 45, sin migraciones ni reinicios, sin staging ni commits.
