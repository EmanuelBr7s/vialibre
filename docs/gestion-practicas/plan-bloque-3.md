# Plan del Bloque 3 — Módulo de gestión de prácticas empresariales
> **Estado:** Bloque 3 autorizado por el usuario. Este documento registra las decisiones y los resultados reales de las etapas **3.1 (Preparación técnica)**, **3.2 (Modelo y persistencia)** y **3.3 (Backend)**, ya ejecutadas. La Etapa 3.3 **no** incluye frontend.

## A. Alcance de la Etapa 3.1
Preparación técnica sin cambios de esquema ni de dominio:

1. Verificación de salud de los tres servicios (antes y después).
2. Armar el arnés de pruebas automatizadas (pytest + pytest-asyncio + httpx).
3. Documentar el bloqueo de migraciones (D13) y la distribución de entidades acordada.

En la Etapa 3.1 no se generaron migraciones ni se alteraron las revisiones existentes. **D13 se resolvió después** (ver sección D): se autorizó y aplicó el cambio en `.gitignore`, habilitando la Etapa 3.2 (modelo y persistencia).

## B. Distribución de entidades seleccionada
Decisión adoptada para esta implementación (pendiente de revisión arquitectónica definitiva en D11, no es una norma institucional verificada):

| Entidad propuesta | Servicio / esquema |
|---|---|
| `TutorDocente` | `auth-service` / `vialibre_auth` (tutores) |
| `Empresa` | `core-service` / `vialibre_core` (empresa) |
| `Practica` | `match-service` / `vialibre_match` (práctica) |
| `PracticaDocumento` | `match-service` / `vialibre_match` (documentos) |
| `DocumentoRevision` | `match-service` / `vialibre_match` (documentos) |

- Las referencias entre servicios siguen siendo UUID con validación en la capa de aplicación. No se crean claves foráneas entre esquemas.
- D11 continúa **[Pendiente de confirmar]**; esta distribución no debe tratarse como aprobación arquitectónica definitiva.

## C. D6 — decisión adoptada para esta implementación
Se adopta, exclusivamente para mayor claridad de la implementación de este bloque:

- La formalización es un **acto explícito** (acción administrativa o de enlace); aprobar una `Interaction` **no** crea automáticamente una `Practica`.
- **Máximo una `Practica` por `Interaction`** (unicidad sobre `interaction_id`).

**D6 no es una norma institucional verificada.** Es una decisión técnica provisional adoptada para esta implementación y debe confirmarse con la autoridad correspondiente antes de considerarse definitiva.

## D. D13 — versionado de migraciones (**resuelto**)
- Estado inicial: `.gitignore:41` excluía `services/*/alembic/versions/` y las tres revisiones `*_sync_schema_phase1.py` no estaban versionadas.
- **Resolución (autorizada por el usuario, en una tarea posterior a 3.1):** se modificó únicamente la regla de `.gitignore` que excluía las revisiones de Alembic, dejando de ignorarlas para versionar las migraciones en Git. En esa tarea no se alteró ninguna revisión existente, no se generaron migraciones y no se agregaron archivos al índice ni se crearon commits.
- Inspección previa satisfactoria: una revisión por servicio (`auth` = `c557863f0a93`, `core` = `d65f36209c5b`, `match` = `564cf3551867`), cada una con `down_revision = None` (raíz y head), coincidentes con la tabla `alembic_version_*` de la base de datos.
- **Consecuencia:** la Etapa 3.2 (modelo y persistencia) queda habilitada.

### Flujo de migración vigente (referencia, no ejecutado)
```
make migrate-auth    # docker-compose exec auth-service  alembic revision --autogenerate -m "$(MSG)" + upgrade head
make migrate-core
make migrate-match
```
`MSG` por defecto es `initial_schema`. Cada servicio usa su propia tabla de versión (`alembic_version_auth/_core/_match`) y su `include_name` restringe la autogeneración a su esquema.

## E. Arnés de pruebas (ejecutado)
- Dependencias añadidas a los `requirements.txt` de los tres servicios: `pytest>=8.0.0,<9.0.0` y `pytest-asyncio>=0.23.0,<1.0.0`. `httpx` ya proviene de `shared/python/requirements-common.txt`.
- **`httpx` se usa indirectamente**: `fastapi.testclient.TestClient` (sobre Starlette) lo emplea para ejercitar la aplicación ASGI en proceso. No se añadió `httpx2`.
- **Las dependencias de pruebas quedan incorporadas a las imágenes de runtime** (no hay Dockerfile multi-etapa en el repositorio; se priorizó la simplicidad). Requiere `make build` tras cambiarlas.
- Montajes de `tests/` y `pytest.ini` por servicio en `docker-compose.yml`, siguiendo la convención de bind-mount existente.
- Comandos: `make test`, `make test-auth`, `make test-core`, `make test-match` (usan `docker-compose exec -T <svc> pytest -q`).

### Pruebas implementadas
`services/{auth,core,match}-service/tests/test_health.py` — dos pruebas reales por servicio contra `GET /health` de la app ASGI:
- `test_health_ok`: código 200, `status == "healthy"` y `service` correcto.
- `test_health_is_json`: `content-type` es JSON.

### Resultados reales de ejecución
| Comando | Resultado |
|---|---|
| `docker-compose exec -T auth-service pytest -q` | **2 passed**, 2 warnings, exit 0 |
| `docker-compose exec -T core-service pytest -q` | **2 passed**, 1 warning, exit 0 |
| `docker-compose exec -T match-service pytest -q` | **2 passed**, 1 warning, exit 0 |

> Nota de entorno: `make` **no está disponible** en el host Windows actual; los comandos se ejecutaron de forma equivalente con `docker-compose exec -T <svc> pytest -q`, que es exactamente lo que invocan los objetivos del Makefile.
>
> Los warnings provienen de dependencias externas: `StarletteDeprecationWarning` (httpx con `starlette.testclient`) y, en auth, `DeprecationWarning: 'crypt'` de `passlib`. No son fallos.

### Verificación de salud (antes y después)
| Servicio | URL | Antes | Después |
|---|---|---|---|
| auth-service | `http://localhost:8001/health` | `{"service":"auth-service","status":"healthy"}` | `{"service":"auth-service","status":"healthy"}` |
| core-service | `http://localhost:8002/health` | `{"service":"core-service","status":"healthy"}` | `{"service":"core-service","status":"healthy"}` |
| match-service | `http://localhost:8003/health` | `{"service":"match-service","status":"healthy"}` | `{"service":"match-service","status":"healthy"}` |

## F. Archivos modificados en la Etapa 3.1
- `services/auth-service/requirements.txt` — deps de prueba
- `services/core-service/requirements.txt` — deps de prueba
- `services/match-service/requirements.txt` — deps de prueba
- `services/auth-service/pytest.ini` *(nuevo)*
- `services/core-service/pytest.ini` *(nuevo)*
- `services/match-service/pytest.ini` *(nuevo)*
- `services/auth-service/tests/__init__.py` *(nuevo)*
- `services/auth-service/tests/test_health.py` *(nuevo)*
- `services/core-service/tests/__init__.py` *(nuevo)*
- `services/core-service/tests/test_health.py` *(nuevo)*
- `services/match-service/tests/__init__.py` *(nuevo)*
- `services/match-service/tests/test_health.py` *(nuevo)*
- `docker-compose.yml` — montajes de `tests/` y `pytest.ini`
- `Makefile` — objetivos `test`, `test-auth`, `test-core`, `test-match`
- `docs/gestion-practicas/plan-bloque-3.md` *(nuevo, este documento)*

### No modificado en la Etapa 3.1
`services/*/alembic/versions/`, `models/`, `schemas/`, `api/`, `frontend/` y los archivos ya modificados por trabajo previo (12 archivos rastreados más directorios sin rastrear). El `.gitignore` se modificó después, al resolver D13 (ver sección D).

## G. Decisiones pendientes para etapas siguientes
- **D13:** política de versionado de migraciones — **resuelto** (las revisiones de Alembic se versionan en Git; `.gitignore` actualizado).
- **D6:** confirmación institucional de la formalización explícita y de la unicidad 1:1 (adoptada provisionalmente aquí).
- **D11:** propiedad definitiva de entidades y contratos de validación entre servicios.
- **D1, D3, D4, D7, D14:** modalidades/tipos, identidad del tutor, relación `Empresa`–`User`, estados documentales y almacenamiento de archivos.    
- **D9, D2, D8, D10, D12:** alcance posterior (equipos, homologación, seguimiento, KPI).

**Límite:** las secciones A–G corresponden a la Etapa 3.1 (su límite original). Las Etapas 3.2 y 3.3 se registran en H e I. **La Etapa 3.4 (frontend) no se inicia sin autorización expresa.**

## H. Etapa 3.2 — Modelo y persistencia (ejecutada)
Implementación del modelo ORM y las migraciones `create_table` de las tres entidades, conforme a la distribución de la sección B y a las restricciones de nulabilidad adoptadas (solo PK `NOT NULL`; booleanos con valor por defecto documentado; `created_at`/`updated_at` `NOT NULL` con `utcnow`; el resto anulable; única restricción `UNIQUE` = `uq_practica_interaction`; sin enums ni catálogos; **sin claves foráneas**, ni siquiera dentro del mismo esquema).

### Modelos creados
| Entidad | Servicio | Archivo | Esquema / tabla |
|---|---|---|---|
| `TutorDocente` | auth | `services/auth-service/app/models/tutor_docente.py` | `vialibre_auth` / `tutores_docentes` |
| `Empresa` | core | `services/core-service/app/models/empresa.py` | `vialibre_core` / `empresas` |
| `Practica` | match | `services/match-service/app/models/practica.py` | `vialibre_match` / `practicas` |

`Practica` define `UniqueConstraint("interaction_id", name="uq_practica_interaction")`. Cada modelo se registró en el `models/__init__.py` **y** en el `alembic/env.py` de su servicio para que la autogeneración lo detecte.

### Migraciones generadas y aplicadas
| Servicio | Revisión (nueva) | `down_revision` (existente, intacta) |
|---|---|---|
| auth | `c03d3b230309_add_tutor_docente` | `c557863f0a93` |
| core | `2c162f6e07ea_add_empresa` | `d65f36209c5b` |
| match | `6ea52de2cf05_add_practica` | `564cf3551867` |

Solo contienen `op.create_table(...)`. No se modificó ninguna revisión preexistente.

### Pruebas de modelo (`tests/test_models.py` por servicio)
| Servicio | Resultado |
|---|---|
| auth | **7 passed** |
| core | **7 passed** |
| match | **8 passed** |
| **Total** | **22 passed** |

### Verificación de esquema (arranque en frío)
`alembic check` en los tres servicios → `No new upgrade operations detected.` (exit 0), confirmando que los modelos coinciden con la base migrada.

### Integridad de revisiones preexistentes (SHA-256, sin cambios)
| Revisión | SHA-256 |
|---|---|
| auth `c557863f0a93` | `0C0AAC64E5637773CAE69CD719B1C5F7DBA9F09F5C24AEEA31EC83C3C52D1740` |
| core `d65f36209c5b` | `936106CFA0B3B974885A71B4161D536E9160BB681ADB348F2C4F710D4585DB58` |
| match `564cf3551867` | `D592E4F2E3CB5ED9E1E7FCF2E3633FC932328488120EE18B9F615B8CD175A309` |

### Git (Etapa 3.2)
Sin commits, sin `git add`. Las tres revisiones nuevas quedaron sin rastrear; los cambios rastreados previos se conservaron.

## I. Etapa 3.3 — Backend: esquemas, lógica, endpoints y pruebas (ejecutada)
Implementación de esquemas Pydantic, lógica de negocio, endpoints y pruebas backend para `TutorDocente` (auth), `Empresa` (core) y `Practica` (match). **No** se implementaron `PracticaDocumento`, `DocumentoRevision` ni `ProyectoIntegrante`, ni se inventaron catálogos o reglas institucionales pendientes.

### Autorización
Todos los endpoints de gestión (`POST`/`GET` colección/`GET {id}`/`PATCH`) exigen `require_role(UserRole.ADMIN)`. No se crearon roles ni permisos nuevos. Denegación por defecto: sin token → **401**; rol distinto de `admin` → **403**.

### Validación de referencias entre servicios (sin claves foráneas)
| Campo | Mecanismo existente | Resultado |
|---|---|---|
| `Empresa.publicador_user_id` | auth interno `GET /api/v1/auth/users/{id}/resumen` (token de servicio) | 404→**400**, otro no-200→**502** |
| `Practica.challenge_id` (si el cliente lo envía) | core público `GET /api/v1/core/challenges/{id}` | 404→**400**, otro no-200→**502** |
| `Practica.solucionador_id` (si el cliente lo envía) | auth interno `.../users/{id}/resumen` | 404→**400**, otro no-200→**502** |
| `TutorDocente.user_id` | comprobación local de existencia en `vialibre_auth` | inexistente→**400** |
| `Practica.empresa_id` / `tutor_docente_id` | **sin mecanismo de consulta interna existente** | **no validado — bloqueo documentado** (D3/D4/D11) |

> `empresa_id` y `tutor_docente_id` de `Practica` **no** se validan entre servicios porque hoy no existe un endpoint interno que permita comprobar su existencia sin debilitar el control de acceso. Se documenta el bloqueo en lugar de aceptar referencias inválidas silenciosamente.

### Reglas de negocio de `Practica` (D6 provisional)
- `interaction_id` obligatorio e inexistente → **404**.
- Máximo una `Practica` por `interaction_id`; duplicado → **409**.
- `challenge_id`/`solucionador_id` se derivan de la `Interaction` cuando el cliente no los envía.
- `created_by` = `sub` del admin autenticado; `fecha_formalizacion` = `utcnow()`.
- `fecha_fin` anterior a `fecha_inicio` → **422**.
- `PATCH` no permite cambiar `interaction_id` ni las referencias derivadas.

### Convención de correo
`core-service` no incluye `email-validator` y ningún esquema suyo usa `EmailStr`; por consistencia, `Empresa.contacto_email` se define como `str` (máx. 255). Los correos de identidad siguen validándose con `EmailStr` en `auth-service`.

### Archivos creados/modificados
- auth: `app/schemas/tutor_docente.py`, `app/api/v1/endpoints/tutores_docentes.py`, `app/api/v1/router.py` (prefijo `/tutores-docentes`).
- core: `app/schemas/empresa.py`, `app/api/v1/endpoints/empresas.py`, `app/api/v1/router.py` (prefijo `/empresas`).
- match: `app/schemas/practica.py`, `app/api/v1/endpoints/practicas.py`, `app/api/v1/router.py` (prefijo `/practicas`).
- pruebas: `services/{auth,core,match}-service/tests/{helpers.py,conftest.py}` y `test_endpoints_{tutores,empresas,practicas}.py`.

Las rutas de colección se registran sin barra final (`@router.post("")`), conforme a la convención del repositorio.

### Resultados reales de ejecución
| Servicio | `test_health.py` | `test_models.py` | `test_endpoints_*.py` | Total |
|---|---|---|---|---|
| auth | 2 | 7 | 10 | **19 passed** |
| core | 2 | 7 | 9 | **18 passed** |
| match | 2 | 8 | 11 | **21 passed** |
| **Total** | 6 | 22 | 30 | **58 passed** |

Las pruebas de endpoint cubren autenticación (401), autorización (403), validación (400/422), errores (404/409/502 cuando aplica), persistencia real y limpieza. La base de datos se verificó sin residuos de prueba (`empresas`, `tutores_docentes`, `practicas` en 0 tras la ejecución).

**Notas de infraestructura de pruebas:** los tests usan un motor `NullPool` y un `conftest.py` que sobreescribe `get_db`, evitando el error de `asyncpg` "got Future attached to a different loop" (pytest-asyncio crea un loop por prueba). Los tokens de prueba se firman con `jose` (la librería compartida solo verifica). Se cambió `HTTP_422_UNPROCESSABLE_ENTITY` por `HTTP_422_UNPROCESSABLE_CONTENT` para evitar el aviso de deprecación.

### Verificación (Etapa 3.3)
- `alembic check` en auth, core y match → `No new upgrade operations detected.` (exit 0).
- SHA-256 de las revisiones preexistentes sin cambios (mismos valores de la sección H).
- Git: **sin commits y sin `git add`**; archivos nuevos sin rastrear; cambios rastreados previos preservados.
- Salud de los tres servicios: `{"service":"<svc>-service","status":"healthy"}`.

## J. Etapa 3.4 — Frontend (ejecutada y verificada)

### Resumen
Se han implementado las tres pantallas administrativas para la gestión de tutores docentes, empresas y prácticas formalizadas, junto con componentes compartidos, navegación y pruebas unitarias. La verificación se ha completado contra la pila real con los escenarios 401/403/201→409/422, se ha limpiado la única práctica creada durante la prueba y se han ejecutado las verificaciones estáticas y de build del frontend.

### Funcionalidades y archivos creados o modificados

**Componentes compartidos (`frontend/src/components/admin/`)**
- `AdminShell.tsx`, `EmptyState.tsx`, `FormField.tsx`, `ListPagination.tsx`, `ListSkeleton.tsx`, `ReferenceSelect.tsx`, `StatusAlert.tsx` — bloques reutilizables para las tres pantallas administrativas. `ReferenceSelect` exporta `ReferenceOption` y `UNVERIFIED_REFERENCE_NOTICE` (la interfaz no verifica referencias cruzadas; véase limitación).

**Páginas administrativas (`frontend/src/app/admin/{tutores,empresas,practicas}/`)**
- `page.tsx`, `loading.tsx` en cada módulo. Las páginas incluyen formularios de alta/edición, filtros, paginación, manejo de estados (carga, vacío, error) y acción de formalización de prácticas.

**Lógica, tipos y errores**
- `frontend/src/types/index.ts` — se añadieron los tipos `AdminTutorDocente*`, `AdminEmpresa*`, `AdminPractica*` y tipos de respuesta/listado.
- `frontend/src/lib/api.ts` — añadido `ApiError extends Error { status: number }`, `toError()` (retorna `ApiError`), `buildQuery()`, y métodos CRUD para tutores docentes, empresas y prácticas (`list*/get*/create*/update*`). Se mantiene `AUTH_COOKIE_NAME`, `request()` y los exports existentes (default y `api`).
- `frontend/src/lib/adminValidation.ts` — validadores compartidos (email, UUID, fechas y validación de práctica). `frontend/src/lib/adminErrors.ts` — helpers `errorMessage` e `isStatus`.
- `frontend/src/components/UserDropdown.tsx` — añadido acceso a `Tutores Docentes`, `Empresas` y `Prácticas Formalizadas` para usuarios con rol `admin`.

**Configuración y pruebas (frontend)**
- `frontend/.eslintrc.json`, `frontend/vitest.config.ts`, `frontend/src/test/setup.ts`, `frontend/package.json` (scripts + devDeps para Vitest/RTL), `frontend/package-lock.json` actualizado (modificado pero **no staged**). `frontend/tsconfig.tsbuildinfo` actualizado (no staged).
- Pruebas Vitest nuevas: `frontend/src/lib/api.test.ts`, `frontend/src/lib/adminValidation.test.ts`, `frontend/src/components/admin/ReferenceSelect.test.tsx`, `frontend/src/app/admin/tutores/page.test.tsx`, `frontend/src/app/admin/practicas/page.test.tsx`.

### Configuración de Vitest, dependencias y lockfile
- Vitest 2.1.x con entorno `jsdom`, globals desactivados, setup en `src/test/setup.ts`. No se añadieron dependencias de Playwright (prueba interactiva en navegador marcada como **pendiente**).
- Dependencias de desarrollo añadidas en `frontend/package.json` para soporte de pruebas (vitest, @testing-library/*, jsdom, etc.); `package-lock.json` refleja el cambio (sin `git add`).
- ESLint existente (`.eslintrc.json`) mantenido sin añadir nuevas reglas.

### Resultados reales de lint, TypeScript, build y pruebas
- **Vitest (unitarias)**: `npx vitest run` → **45 passed** (5 archivos), sin fallos. (Confirmado en ejecución real.)
- **Lint**: `npx next lint` → **sin warnings ni errores**.
- **TypeScript**: `npx tsc --noEmit` → **sin errores**.
- **Build (Next.js 14.2.5)**: `npm run build` → **compilado exitosamente**, **19 páginas estáticas generadas** incluyendo `/admin/tutores`, `/admin/empresas` y `/admin/practicas`.

### Infraestructura: nginx (upstreams obsoletos)
Se detectó que `vialibre-nginx-1` llevaba ~10h levantado mientras `auth-service`/`core-service`/`match-service` se habían recreado ~5h antes, provocando resolución DNS obsoleta (auth/match devolvían 404 vía gateway). Se ejecutó **`docker-compose restart nginx`** (únicamente infraestructura) y se verificó que:
- `POST http://localhost/api/v1/auth/login` → **200**
- `GET http://localhost/api/v1/auth/tutores-docentes` → **401**
- `GET http://localhost/api/v1/core/empresas` → **401**
- `GET http://localhost/api/v1/match/practicas` → **401**

### Escenarios de integración (ejecutados contra gateway real `:80`)
| Escenario | Descripción | Estado | Código HTTP / Resultado |
|---|---|---|---|
| A (401) | Sin token: GET `/auth/tutores-docentes`, `/core/empresas`, `/match/practicas` | **Ejecutado / Aprobado** | **401** en los tres (detalle: `Not authenticated`). |
| B (403) | Token con rol `publicador` (`contacto@artesaniasllamas.com`): GET a las tres colecciones | **Ejecutado / Aprobado** | **403** en los tres (detalle: `No tiene permisos suficientes para esta operación`). |
| C (201 → 409) | `POST /api/v1/match/practicas` con `{interaction_id: e0000000-0000-0000-0000-000000000001}` (admin) → 201; repetir mismo body → 409 | **Ejecutado / Aprobado** | **201** → `created_id = 8b9f7ee5-04b9-40de-8a3f-2dbd47e034af`; **409** → `Ya existe una practica formalizada para esta interaccion`. Fila creada limpiada transaccionalmente (paso 4). |
| D (422) | `POST /api/v1/match/practicas` con fechas invertidas (`fecha_inicio > fecha_fin`) | **Ejecutado / Aprobado** | **422** → `fecha_fin no puede ser anterior a fecha_inicio`. No se persistió ninguna práctica. |
| E (protección rutas admin frontend) | `/admin/tutores`, `/admin/empresas`, `/admin/practicas` sin cookie → 307 a `/login`; con cookie `vialibre_token` (admin) → 200 | **Ejecutado / Aprobado** | 307/307/307 sin auth; 200/200/200 con auth (verificado tras reinicio de `frontend`). |

**Notas sobre respuestas HTTP**: los cuerpos de error/éxito se registraron durante la ejecución (401/403/409/422) y los códigos coinciden con la lógica backend documentada.

### Limpieza realizada (exacta, transaccional)
- Se identificó el `id` exacto de la práctica creada en C1: `8b9f7ee5-04b9-40de-8a3f-2dbd47e034af`, `interaction_id = e0000000-0000-0000-0000-000000000001`, `created_by = 00000000-0000-0000-0000-000000000001`.
- Se ejecutó `BEGIN; DELETE FROM vialibre_match.practicas WHERE id = '<ID_EXACTO>' RETURNING id, interaction_id;` — `RETURNING` devolvió exactamente 1 fila; se hizo `COMMIT`. Si hubiera sido distinto, se habría ejecutado `ROLLBACK`.
- No se usaron filtros amplios. No se creó endpoint DELETE. No se modificó backend.
- Conteos (valores reales): inicial `practicas=0, empresas=0, tutores=0`; tras limpieza `practicas=0, empresas=0, tutores=0` (restaurados al valor de referencia).
- Se verificó que las interacciones utilizadas (`e0000000-...-0001`, `e0000000-...-0002`) permanecen inalteradas.

### Verificación UI/componentes
Las pruebas de Vitest (`page.test.tsx` de tutores y prácticas) cubren estados de carga/vacío, validación cliente, éxito (recarga listado), y presentación de errores 409/422 desde backend. No se ha realizado una prueba interactiva en navegador (falta automatización headless) — **marcada como pendiente**.

### Limitaciones de las referencias `empresa_id` y `tutor_docente_id`
- La interfaz ofrece campos/selecciones para `empresa_id` y `tutor_docente_id` (Referencia no verificada). El backend **no valida** su existencia entre servicios (no existe endpoint interno adecuado para comprobarlas sin debilitar el control de acceso). 
- Esto significa que enviar un UUID inexistente no producirá 400/502 por esa referencia en el flujo actual — la consistencia queda documentada como bloqueo (D3/D4/D11) y la UI muestra `UNVERIFIED_REFERENCE_NOTICE`. No se ha modificado el backend.

### Estado final de Git
- Rama: `feature/funcionalidades-eric-jassir` (up to date con origin). HEAD `8a6211b`.
- Archivos modificados (rastreados): `.gitignore`, `Makefile`, `docker-compose.yml`, `frontend/package-lock.json`, `frontend/package.json`, `frontend/src/components/ApplicantsSection.tsx`, `frontend/src/components/UserDropdown.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/index.ts`, `frontend/tsconfig.tsbuildinfo`, y múltiples archivos bajo `services/*` (auth/core/match) — **todos preservados**.
- Archivos nuevos (sin seguimiento): `.opencode/`, `AGENTS.md`, `docs/`, `documents/`, `frontend/.eslintrc.json`, rutas/admin, componentes/admin, `frontend/src/lib/adminErrors.ts`, `frontend/src/lib/adminValidation*.ts`, `frontend/src/lib/api.test.ts`, `frontend/src/test/`, `frontend/vitest.config.ts`, `package-lock.json` (raíz), `services/*/alembic/versions/*` (revisiones nuevas 3.2), endpoints/modelos/schemas/tests para tutores/empresas/prácticas, `shared/python/vialibre_common/service_auth.py`.
- **Sin `git add` ni commits**. La revisión `c03d3b230309` (auth), `2c162f6e07ea` (core), `6ea52de2cf05` (match) continúan sin rastrear. Cambios preexistentes conservados.

### Verificaciones ejecutadas (resumen)
- Gateway reiniciado y verificado (login 200 + 3x401). 
- Escenarios 401/403/201→409/422 ejecutados y aprobados. 
- Frontend: 45/45 pruebas Vitest aprobadas; `next lint` OK; `tsc --noEmit` OK; `next build` OK (19 páginas). 
- Limpieza transaccional exacta; conteos restaurados a 0; interacciones intactas.
- Documentación actualizada sin perder secciones A–I.

### Bloqueos / pendientes
- **Prueba interactiva manual en navegador**: pendiente por ausencia de automatización headless.
- **D1/D2/D3/D4/D8/D9/D10/D11/D12/D14**: permanecen pendientes (ninguno resuelto en esta etapa). `empresa_id`/`tutor_docente_id` sin validación entre servicios (D3/D4/D11) — documentado.
- **Gateway nginx**: se resolvió reiniciando (infra). No se modificó `gateway/nginx.conf`.

## K. Etapa 3.5 — Pruebas integrales y regresión

Pruebas integrales, de regresión y de limpieza sobre la pila real (nginx `:80`), sin cambios de código, modelos, API, permisos ni migraciones. No se inició la Etapa 3.6.

### Pruebas de backend por servicio
| Servicio | Aprobadas | Fallidas | Omitidas |
|---|---|---|---|
| auth-service | 19 | 0 | 0 |
| core-service | 18 | 0 | 0 |
| match-service | 21 | 0 | 0 |
| **Total** | **58** | **0** | **0** |

Los tres servicios respondieron `status: healthy` en `/health`. Los únicos warnings reportados fueron las deprecaciones conocidas de `passlib` (`crypt`) y de `starlette.testclient`.

### Frontend
| Comando | Resultado |
|---|---|
| `npx vitest run` | **45 aprobadas, 0 fallidas** (5 archivos) |
| `npm run lint` | sin advertencias ni errores |
| `npx tsc --noEmit` | sin errores |
| `npm run build` | **19 páginas generadas**, incluidas `/admin/tutores`, `/admin/empresas` y `/admin/practicas` |

### Integración HTTP mediante nginx
- **Sin token:** HTTP **401** en las tres colecciones administrativas (`/api/v1/auth/tutores-docentes`, `/api/v1/core/empresas`, `/api/v1/match/practicas`).
- **Token con rol no administrador (`publicador`):** HTTP **403** en las tres colecciones.
- **Tutores docentes:** creación **201**, consulta/listado **200**, edición **200** y lectura posterior **200**.
- **Empresas:** creación **201**, listado **200**, consulta **200** y edición **200**.
- **Prácticas:** creación **201**, consulta/listado **200**, `PATCH` **200** y lectura posterior **200**; duplicado **409**; fechas invertidas **422** sin persistencia de fila.
- **Rutas de frontend** `/admin/tutores`, `/admin/empresas` y `/admin/practicas`: HTTP **307** sin cookie y HTTP **200** con cookie de administrador.
- Nginx no presentó errores de upstream durante esta etapa.

### Migraciones e integridad
- `alembic check` en auth, core y match → `No new upgrade operations detected.`
- SHA-256 de las tres revisiones preexistentes sin cambios: auth `c557863f0a93` = `0C0AAC64E5637773CAE69CD719B1C5F7DBA9F09F5C24AEEA31EC83C3C52D1740`; core `d65f36209c5b` = `936106CFA0B3B974885A71B4161D536E9160BB681ADB348F2C4F710D4585DB58`; match `564cf3551867` = `D592E4F2E3CB5ED9E1E7FCF2E3633FC932328488120EE18B9F615B8CD175A309` (valores ya consignados en la sección H).
- Cero claves foráneas entre esquemas/servicios.
- `practicas` conserva la clave primaria y la restricción única `uq_practica_interaction`; no tiene claves foráneas.
- Las claves foráneas preexistentes dentro de sus respectivos esquemas permanecen intactas (`users→roles`, `challenges→category`, `interaction_documents→interactions`).

### Limpieza de los datos de prueba
Se eliminaron únicamente las filas creadas por las pruebas, mediante transacciones controladas, claves primarias exactas y `RETURNING`, comprobando que cada operación eliminó exactamente una fila.

| Tabla | Inicial | Final |
|---|---|---|
| `vialibre_match.practicas` | 0 | 0 |
| `vialibre_core.empresas` | 0 | 0 |
| `vialibre_auth.tutores_docentes` | 0 | 0 |

El primer intento de limpieza mediante un script `psql` con `\gset`/`\if` falló (la sentencia no devolvió filas para `\gset`) y la transacción **revirtió sin daño**, dejando las filas intactas. La limpieza posterior con `DELETE ... WHERE id = '<ID_EXACTO>' RETURNING id` (una sentencia por fila) sí se verificó: exactamente una fila eliminada por operación y conteos restaurados a su valor inicial 0.

### Cobertura y limitaciones
- Las pruebas de frontend cubren cliente API, errores HTTP, estado vacío, estado de error, validaciones y presentación de errores de creación/edición.
- No existe todavía una aserción específica para el estado inicial de carga de `ListSkeleton`.
- `middleware.ts` no dispone de pruebas unitarias; la protección de las rutas se verificó mediante HTTP.
- La prueba interactiva en navegador sigue pendiente por ausencia de automatización headless.
- `Practica.empresa_id` y `Practica.tutor_docente_id` continúan sin validación de existencia entre servicios por los bloqueos D3/D4/D11.
- Las decisiones institucionales pendientes continúan pendientes; esta etapa no las resuelve.

### Estado de Git
- HEAD permanece en `8a6211b`.
- No se hicieron commits ni se añadió ningún archivo a staging.
- Los cambios anteriores se conservaron.
- La documentación de K y la reorganización de J son las únicas modificaciones nuevas de esta tarea (confirmado comparando el `git status`/`git diff` iniciales con los finales).

## L. Etapa 3.6 — Validación final y cierre

Validación final del Bloque 3 sobre la pila real, sin cambios de código, modelos, API, permisos ni migraciones y sin iniciar un Bloque 4. Esta sección no convierte verificaciones históricas en ejecuciones actuales: todos los resultados citados aquí se re-ejecutaron en esta etapa.

### Alcance auditado
- Entidades implementadas: `TutorDocente` (auth-service / `vialibre_auth`), `Empresa` (core-service / `vialibre_core`) y `Practica` (match-service / `vialibre_match`).
- Fuera de alcance confirmado: `PracticaDocumento`, `DocumentoRevision` y `ProyectoIntegrante` no existen en el código (solo figuran en documentos de diseño). Verificado por búsqueda: sin modelo, esquema, endpoint ni migración.
- Se revisaron modelos, esquemas Pydantic, endpoints, autorización, componentes administrativos, pruebas y migraciones, y se contrastaron contra las secciones A–K.

### Pruebas ejecutadas y resultados reales

**Backend (`docker-compose exec -T <svc> pytest -q`)**
| Servicio | Resultado | Warnings |
|---|---|---|
| auth-service | **19 passed**, exit 0 | 2 (`passlib crypt`, `starlette.testclient`) |
| core-service | **18 passed**, exit 0 | 1 (`starlette.testclient`) |
| match-service | **21 passed**, exit 0 | 1 (`starlette.testclient`) |
| **Total** | **58 passed / 0 fallidas / 0 omitidas** | deprecaciones conocidas, no fallos |

Coincide con la cifra histórica (58) de I y K.

**Salud de servicios**: `/health` → **200** en auth (8001), core (8002) y match (8003), `status: healthy` en los tres.

**Alembic (`docker-compose exec -T <svc> alembic check`)**: `No new upgrade operations detected.` (exit 0) en auth, core y match.

**Frontend (desde `frontend/`)**
| Comando | Resultado |
|---|---|
| `npx vitest run` | **45 passed** (5 archivos), exit 0 |
| `npm run lint` | `No ESLint warnings or errors` |
| `npx tsc --noEmit` | sin errores, exit 0 |
| `npm run build` | **Compiled successfully**, **19 páginas**, incluye `/admin/tutores`, `/admin/empresas`, `/admin/practicas` |

Coincide con la cifra histórica (45) de J y K. Sin dependencias nuevas ni Playwright.

**Integración HTTP vía gateway nginx (`:80`)**
| Escenario | Resultado observado |
|---|---|
| Sin token en las tres colecciones admin | **401 / 401 / 401** |
| Token de rol `publicador` (no admin) | **403 / 403 / 403** |
| `/admin/tutores`, `/admin/empresas`, `/admin/practicas` sin cookie | **307 / 307 / 307** |
| Mismas rutas con cookie de administrador | **200 / 200 / 200** |

### Matriz resumida de aceptación

**A. Arquitectura y persistencia**
| Criterio | Estado | Evidencia |
|---|---|---|
| `TutorDocente`→auth, `Empresa`→core, `Practica`→match | **Aceptado** | modelos, migraciones y `__table_args__` |
| Sin claves foráneas entre esquemas/servicios | **Aceptado** | consulta a `information_schema` → 0 filas |
| Se conserva `uq_practica_interaction` | **Aceptado** | `pg_constraint` en `practicas`: `practicas_pkey`(p) + `uq_practica_interaction`(u), sin FK |
| Cadena de migraciones correcta y revisiones previas intactas | **Aceptado** | `down_revision` nuevas → revisiones previas; `alembic_version_*` en heads nuevos; SHA-256 previos sin cambios |
| Modelos y esquema de BD sincronizados | **Aceptado** | `alembic check` ×3 limpio |

**B. Seguridad y autorización**
| Criterio | Estado | Evidencia |
|---|---|---|
| Endpoints de gestión exigen rol `admin` | **Aceptado** | `require_role(UserRole.ADMIN)` en los 4 endpoints de cada colección |
| 401/403 documentados y coherentes | **Aceptado** | re-ejecutados: 401×3 y 403×3 |
| El frontend no sustituye la autorización del backend | **Aceptado** | middleware solo comprueba presencia de cookie; `useRoleGuard` es UX; el backend deniega |
| Sin roles, permisos ni vías alternativas nuevas | **Aceptado** | `shared/python/vialibre_common/schemas.py` sin cambios (`UserRole` ya incluía `ADMIN`) |
| Protección de `/admin/tutores`, `/admin/empresas`, `/admin/practicas` | **Aceptado** | 307 sin cookie / 200 con cookie admin |

**C. Reglas de negocio de prácticas**
| Criterio | Estado | Evidencia |
|---|---|---|
| Formalización explícita (aprobar una interacción no crea práctica) | **Aceptado** | solo `POST /practicas` crea; no existe creación automática en el flujo de `Interaction` |
| Máximo una práctica por interacción | **Aceptado** | `uq_practica_interaction` + comprobación previa → 409 |
| Duplicado → 409 | **Aceptado** | código de conflicto explícito |
| `fecha_fin` < `fecha_inicio` → 422 | **Aceptado** | `_validate_dates` (`HTTP_422_UNPROCESSABLE_CONTENT`) en create y update |
| Referencias derivadas de la interacción | **Aceptado** | `challenge_id`/`solucionador_id` tomados de la `Interaction` si no se envían |
| `empresa_id`/`tutor_docente_id` no presentadas como verificadas | **Aceptado** | la UI muestra `UNVERIFIED_REFERENCE_NOTICE`; ver limitación abajo |

**D. Frontend**
| Criterio | Estado | Evidencia |
|---|---|---|
| Coherencia formularios/tipos ↔ esquemas del backend | **Aceptado** | `PracticaCreate/Update`, `TutorDocente*`, `Empresa*` coinciden con `app/schemas/*` |
| CRUD de las tres entidades | **Aceptado** | métodos `list*/get*/create*/update*` en `api.ts` y páginas correspondientes |
| Paginación, filtros, formularios y estados | **Aceptado** | `ListPagination`, filtros (`estado`/`activa`/`activo`), `ListSkeleton`/`EmptyState`/`StatusAlert` |
| Manejo de 401/403/409/422 | **Aceptado** | `ApiError.status` + `isStatus`/`errorMessage`; 401 → `clearToken()` + `/login`; 409/422 se muestran en el formulario |
| Aviso de asociaciones no verificadas | **Aceptado** | `ReferenceSelect` (`notice`) |
| Navegación admin y control de sesión | **Aceptado** | `UserDropdown` (case `admin`) + `useRoleGuard('admin')` |
| Prueba interactiva real de navegador | **Pendiente** | sin automatización headless; no se simula |

### Estado de las migraciones y la integridad referencial
- Revisiones nuevas: auth `c03d3b230309`, core `2c162f6e07ea`, match `6ea52de2cf05`; `alembic_version_auth/_core/_match` apuntan a ellas.
- Revisiones preexistentes intactas (SHA-256 verificados en esta etapa):
  | Revisión | SHA-256 |
  |---|---|
  | auth `c557863f0a93` | `0C0AAC64E5637773CAE69CD719B1C5F7DBA9F09F5C24AEEA31EC83C3C52D1740` |
  | core `d65f36209c5b` | `936106CFA0B3B974885A71B4161D536E9160BB681ADB348F2C4F710D4585DB58` |
  | match `564cf3551867` | `D592E4F2E3CB5ED9E1E7FCF2E3633FC932328488120EE18B9F615B8CD175A309` |
- Cero claves foráneas entre esquemas/servicios. `practicas` conserva su PK y `uq_practica_interaction`, sin claves foráneas.
- Conteos reales: `vialibre_match.practicas`=0, `vialibre_core.empresas`=0, `vialibre_auth.tutores_docentes`=0 (sin residuos de prueba).

### Decisiones y riesgos pendientes

| ID | Asunto | Clasificación |
|---|---|---|
| D13 | Versionado de migraciones | **Resuelto y verificado** |
| D6 | Formalización explícita y unicidad 1:1 | Implementación técnica **verificada**; **confirmación institucional pendiente** (no bloquea el funcionamiento actual) |
| D1 | Modalidades y catálogos | Pendiente — no bloquea (`modalidad`/`tipo_practica` como texto libre) |
| D2 | Terminología CAWA/CUA/DPS | Pendiente — no bloquea (no implementado) |
| D3 | Modelo e identidad del tutor | Pendiente — bloqueante para validar `tutor_docente_id` entre servicios y para fijar la relación `TutorDocente`–`User` |
| D4 | Relación `Empresa`–`User` | Pendiente — no bloquea (hoy `publicador_user_id` se valida por endpoint interno); relación definitiva por confirmar |
| D7 | Estados y revisión documental | Pendiente — bloqueante para gestión/revisión documental (fuera del alcance) |
| D8 | Reglas de homologación | Pendiente — no bloquea (fuera del alcance) |
| D9 | Integrantes y equipos | Pendiente — bloqueante para `ProyectoIntegrante` (fuera del alcance) |
| D10 | Matriz de seguimiento | Pendiente — no bloquea (fuera del alcance) |
| D11 | Propiedad de datos y contratos entre servicios | Pendiente — condiciona la distribución definitiva y la validación entre servicios (D3/D4) |
| D12 | Indicadores | Pendiente — no bloquea (fuera del alcance) |
| D14 | Almacenamiento documental | Pendiente — bloqueante para almacenamiento documental (fuera del alcance) |

Ninguna implementación técnica se interpreta como resolución de una decisión institucional.

### Limitación de las referencias `empresa_id` y `tutor_docente_id`
- El backend **no valida la existencia** de `Practica.empresa_id` ni de `Practica.tutor_docente_id` (no existe endpoint interno adecuado sin debilitar el control de acceso). Enviar un UUID inexistente no produce 400/502 por esa referencia.
- La interfaz no las presenta como verificadas: `ReferenceSelect` muestra `UNVERIFIED_REFERENCE_NOTICE` y avisa si el valor guardado no está entre las opciones.
- Queda como bloqueo documentado D3/D4/D11; no se improvisó una solución dentro de esta etapa.

### Estado de la prueba interactiva en navegador
Sigue **pendiente** por ausencia de automatización headless (no se instaló Playwright ni se simularon pruebas de navegador). La cobertura de componentes y páginas se realizó con Vitest (45 pruebas) y verificación HTTP, que **no equivalen** a una prueba interactiva real.

### Clasificación final del cierre
**Cierre condicionado.**

- **Aceptado (verificado en esta etapa):** arquitectura y propiedad de entidades, ausencia de claves foráneas entre esquemas, `uq_practica_interaction`, sincronización modelos↔BD y cadena de migraciones; autorización `admin-only` de los 12 endpoints de gestión (401/403); reglas de negocio de `Practica` (formalización explícita, unicidad, 409, 422, referencias derivadas); coherencia formularios/tipos↔esquemas; `vitest`/`lint`/`tsc`/`build` y protección de rutas admin.
- **Condicional (no aceptable todavía de forma plena):**
  1. **Validación interactiva en navegador** pendiente (requiere validación manual o herramienta headless, no disponible en el entorno).
  2. **Validación de existencia entre servicios** de `empresa_id`/`tutor_docente_id` pendiente de decisión externa (D3/D4/D11): hoy son referencias lógicas no verificadas, con aviso explícito en la UI.
- **Justificación:** no existe defecto reproducible de seguridad, persistencia, integridad ni funcionalidad dentro del alcance implementado; las pruebas esenciales pasan y la documentación no contradice el código. Las limitaciones señaladas son explícitas y acotadas, por lo que el cierre se otorga **condicionado** y no "aprobado" en plenitud.

### Recomendaciones para el siguiente trabajo (sin iniciarlo)
1. Incorporar una **prueba interactiva en navegador** (p. ej. Playwright) para los flujos de alta/edición y formalización antes de un cierre pleno.
2. Diseñar el **contrato interno** (endpoint seguro) que permita validar `empresa_id` y `tutor_docente_id` al formalizar, y resolver D3/D4/D11 de forma conjunta.
3. Confirmar institucionalmente **D6** (formalización explícita y unicidad 1:1) para dejar de tratarla como decisión provisional.
4. Abordar la **gestión documental** (`PracticaDocumento`/`DocumentoRevision`, D7/D14) como bloque propio, con su modelo de estados y almacenamiento.
5. Añadir aserciones para el estado de carga (`ListSkeleton`) y pruebas unitarias del `middleware` de Next.js.
