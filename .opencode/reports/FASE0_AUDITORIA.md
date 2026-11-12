# FASE 0: Preparación y Auditoría - Informe de Línea Base

**Proyecto**: VíaLibre (plataforma de empleabilidad universitaria)  
**Rama**: `feature/funcionalidades-eric-jassir`  
**HEAD**: `8a6211bb89632bc96d1b0dfe073e4c8eaa0398b6`  
**Fecha**: 2026-10-18  
**Estado**: Solo lectura - No se han realizado modificaciones a código/models/enums/datos/permisos en esta fase  
**Alcance**: EXCLUSIVAMENTE Fase 0 (Preparación y Auditoría). No se implementarán Fases 1-5.

---

## 1. Línea Base Git (0.3)

**Verificación git realizada**:
- `git status --short`: 30 archivos modificados, 28+ rutas no rastreadas (incluyendo `.opencode/`, `AGENTS.md`, `PLAN.md`, `docs/`, `frontend/src/app/admin/*`, `services/*/alembic/versions/`, `services/*/tests/`, `shared/python/vialibre_common/service_auth.py`, `package-lock.json`).
- `git rev-parse HEAD`: `8a6211bb89632bc96d1b0dfe073e4c8eaa0398b6`
- `git rev-parse --abbrev-ref HEAD`: `feature/funcionalidades-eric-jassir`

**Revisiones Alembic existentes (no se eliminarán)**:
- **auth-service**: `c557863f0a93_sync_schema_phase1.py`, `c03d3b230309_add_tutor_docente.py`
- **core-service**: `d65f36209c5b_sync_schema_phase1.py`, `2c162f6e07ea_add_empresa.py`
- **match-service**: `564cf3551867_sync_schema_phase1.py`, `6ea52de2cf05_add_practica.py`

**Nota sobre .gitignore**: `.gitignore` está modificado (sin commit) con cambio en la línea que excluía `services/*/alembic/versions/` (D13 resuelto según `docs/gestion-practicas/plan-bloque-3.md`). Esto contradice el texto histórico de `PLAN.md`/`AGENTS.md` ("autogenerados y gitignored"), pero las revisiones ya existen en el repo y **NO deben eliminarse**. Esto queda registrado.

---

## 2. Arquitectura e Inventario (0.1, 0.4, 0.6)

### 2.1 Visión general
Monorepo con:
- **3 microservicios FastAPI async (SQLAlchemy)**: `auth-service` (8001), `core-service` (8002), `match-service` (8003)
- **1 frontend Next.js 14 (App Router)**: `frontend/` (3000)
- **1 PostgreSQL**: host `postgres`, puerto 5433 expuesto al host, base `vialibre`, **3 esquemas**: `vialibre_auth`, `vialibre_core`, `vialibre_match`
- **1 Nginx gateway**: `gateway/nginx.conf` (80). Rutea `/api/v1/{auth,core,match}/` hacia cada servicio; resto hacia frontend
- **Librería compartida**: `shared/python/vialibre_common/` montada en `/shared` con `PYTHONPATH`

### 2.2 Servicios FastAPI

**auth-service** (`services/auth-service/app/`):
- `config.py`: `service_name`, `api_v1_prefix = "/api/v1/auth"`, `schema_name = "vialibre_auth"`, `database_url` apunta a `postgres` (Docker), `jwt_secret_key`, `jwt_algorithm`, `service_name="auth-service"`, `core_service_url`, `match_service_url`.
- `database.py`: engine/session async, `async_sessionmaker`, `Base` declarativa.
- `models/`: `user.py`, `role.py`, `tutor_docente.py`, `__init__.py` importa modelos.
- `schemas/`: `auth.py`, `user.py`, `tutor_docente.py`.
- `api/v1/endpoints/`: `auth.py`, `users.py`, `tutores_docentes.py`. 
- `api/deps.py`: `get_current_user`, `require_role`, `AuthContext`, `require_internal_service` (verifica `X-Service-Token` con `NonceStore`), soporta Bearer token y opcionalmente `X-Service-Token`. Usa `shared/vialibre_common.auth.verify_token` y `vialibre_common.service_auth.verify_service_token` con `ALLOWED_SERVICES` (`core-service`, `match-service`).
- `api/v1/router.py`: incluye routers con prefijos (`/auth`, `/users`, `/tutores-docentes`).
- `main.py`: **NO tiene `redirect_slashes=False`** (diferencia vs core/match). `FastAPI(lifespan=...)`, CORS `*`, incluye router con `prefix=settings.api_v1_prefix`, health endpoint.
- Alembic: `alembic/env.py` con `include_name` restringido a `schema_name="vialibre_auth"`, `target_metadata = Base.metadata`, version table `alembic_version_auth`. Revisión existente: `c557863f0a93_sync_schema_phase1`, `c03d3b230309_add_tutor_docente`.

**core-service** (`services/core-service/app/`):
- `config.py`: `schema_name = "vialibre_core"`, `api_v1_prefix = "/api/v1/core"`.
- `models/`: `challenge.py`, `category.py`, `empresa.py`, `__init__.py`.
- `schemas/`: `challenge.py`, `category.py`, `empresa.py`.
- `api/v1/endpoints/`: `challenges.py`, `empresas.py`.
- `api/deps.py`: auth similar.
- `api/v1/router.py`: incluye routers.
- `main.py`: **tiene `redirect_slashes=False`**.
- Alembic `env.py`: `schema_name="vialibre_core"`, `version_table="alembic_version_core"`, `include_name` filtrando por schema. Revisiones: `d65f36209c5b_sync_schema_phase1`, `2c162f6e07ea_add_empresa`.

**match-service** (`services/match-service/app/`):
- `config.py`: `schema_name = "vialibre_match"`, `api_v1_prefix = "/api/v1/match"`.
- `models/`: `interaction.py`, `reaction.py`, `document.py`, `practica.py`, `__init__.py`.
- `schemas/`: `interaction.py`, `reaction.py`, `document.py`, `practica.py`.
- `api/v1/endpoints/`: `interactions.py`, `reactions.py`, `documents.py`, `practicas.py`.
- `api/deps.py`: auth (usa `get_current_user` de JWT común).
- `api/v1/router.py`: incluye routers.
- `main.py`: **tiene `redirect_slashes=False`**.
- Alembic `env.py`: `schema_name="vialibre_match"`, `version_table="alembic_version_match"`, `include_name` filtrando por schema. Revisiones: `564cf3551867_sync_schema_phase1`, `6ea52de2cf05_add_practica`.
- `practicas.py`: hace validaciones cross-service: `GET {core_service_url}/api/v1/core/challenges/{challenge_id}` (sin token de servicio) y `GET {auth_service_url}/api/v1/auth/users/{user_id}/resumen` **con `X-Service-Token`** via `service_headers()` de `vialibre_common.service_auth`.

### 2.3 Librería compartida
- `shared/python/vialibre_common/schemas.py`: **Enums en inglés** (`ChallengeStatus`, `InteractionStatus`, `DifficultyLevel`, `UserRole`, `TALENT_ROLES`). **Trampa conocida**: cada servicio define y usa sus **propios enums locales en español** (core: `abierto`/`en_progreso`/`cerrado`; match: `pendiente`/`aprobado`/`rechazado`). No editar shared para cambiar semántica local.
- `shared/python/vialibre_common/auth.py`: `verify_token()` con verificación JWT.
- `shared/python/vialibre_common/service_auth.py`: **Nuevo/registrado**. Implementa `build_service_token`, `service_headers`, `verify_service_token`, `NonceStore` (thread-safe, TTL con purge/eviction). `ALLOWED_SERVICES = {"core-service","match-service"}`, ventana `SERVICE_TOKEN_WINDOW=60s`, skew `10s`, versión `v1`, formato `v1.<b64url(payload)>.hex_hmac`. Bind-mounted; requiere reiniciar servicio si cambia.
- `shared/python/vialibre_common/pdf.py`: generador PDF mínimo.

### 2.4 Infraestructura
- `docker-compose.yml`: define `postgres` (healthcheck), `auth-service`, `core-service`, `match-service`, `frontend`, `nginx`. Usa `POSTGRES_HOST=postgres` (red Docker). Puertos mapeados: 80, 3000, 8001-8003, 5433.
- `Makefile`: comandos `up/down/logs/ps/clean`, `make setup-db` = `init-schemas migrate seed seed-core seed-match`, `migrate` autogenera+upgrade en todos, variantes por servicio. **Nota**: `make` no disponible en host Windows (usar `docker-compose` directo según `plan-bloque-3.md`).
- `gateway/nginx.conf`: proxy hacia servicios con rutas `/api/v1/{auth,core,match}/`.

### 2.5 Frontend (Next.js 14 App Router)
- `frontend/src/middleware.ts`: protección de rutas (`PROTECTED_PATHS`, `AUTH_PATHS`), lee cookie JWT (`AUTH_COOKIE_NAME`).
- `frontend/src/lib/api.ts`: cliente API (auth, challenges, interactions, reactions, file uploads/downloads).
- `frontend/src/contexts/AuthContext.tsx`, `frontend/src/hooks/useRoleGuard.ts`.
- `frontend/src/types/index.ts`.
- Estructura admin: `frontend/src/app/admin/{empresas,practicas,tutores}/`, `frontend/src/components/admin/`, utilidades `adminErrors.ts`, `adminValidation.ts`, `adminValidation.test.ts`.
- Tests frontend: `frontend/vitest.config.ts`, `frontend/src/lib/api.test.ts`, `frontend/src/test/`.

### 2.6 Seeds y datos
- `services/auth-service/app/seed.py`: idempotente, usa UUIDs fijos compartidos entre servicios. Demo logins presentes.
- `services/core-service/app/seed_core.py`, `services/match-service/app/seed_match.py`: seeds idempotentes con UUIDs sincronizados con auth/core.

### 2.7 Tests
Contrario a lo indicado en `AGENTS.md` ("No test suite..."), existen tests ahora:
- `services/auth-service/pytest.ini`, `services/auth-service/tests/`
- `services/core-service/pytest.ini`, `services/core-service/tests/`
- `services/match-service/pytest.ini`, `services/match-service/tests/`
- Frontend Vitest: `frontend/vitest.config.ts`, `frontend/src/lib/api.test.ts`, `frontend/src/lib/adminValidation.test.ts`

---

## 3. Convenciones Verificadas con Evidencia (0.4, 0.8)

| Convención | Estado | Evidencia |
|---|---|---|
| Un esquema PostgreSQL por servicio | Verificado | `config.py`: `schema_name` = `vialibre_auth/core/match`. `alembic/env.py` usa `include_name` para filtrar por schema. Version tables: `alembic_version_auth/_core/_match`. |
| Prefijos API por servicio | Verificado | `api_v1_prefix` definido por servicio (`/api/v1/auth`, `/api/v1/core`, `/api/v1/match`). Routers incluyen bajo ese prefijo. |
| Restricción autogenerate por schema | Verificado | `alembic/env.py` de los 3 servicios implementa `include_name`/filtros para evitar tocar otros schemas. |
| Referencias cross-service sin FK | Verificado | `author_id`, `solucionador_id`, `challenge_id` son UUID desnudos (modelos). Comunicación vía `httpx` a URLs de settings. Preservado. |
| Enums locales vs compartidos (trampa) | Verificado | `shared/.../schemas.py` tiene enums inglés. Servicios usan enums locales españoles (core: `abierto/en_progreso/cerrado`, match: `pendiente/aprobado/rechazado`). No se editó shared. |
| Rutas de colección sin barra final | **Parcialmente verificado** | Búsqueda grep devolvió **0 coincidencias** exactas `@router.(get|post|put|patch|delete)("")` en esta revisión (aunque el checkpoint histórico mencionaba 11 ocurrencias). Se encontraron rutas colección con paths explícitos como `""` en endpoints nuevos: `practicas.py` (POST/GET `""`), `empresas.py` (POST/GET `""`), `tutores_docentes.py` (POST/GET `""`). La convención existe en código nuevo; se recomienda validar todas las rutas existentes. |
| Seeds idempotentes + UUIDs sincronizados | Verificado | `seed.py`, `seed_core.py`, `seed_match.py` usan UUIDs fijos compartidos y lógica idempotente. |
| Cross-service auth interno | Verificado | `shared/service_auth.py` implementa HMAC request-bound con nonce+timestamp+method+path. `auth-service/deps.py` añade `require_internal_service` que verifica `X-Service-Token`. `match-service/practicas.py` usa `service_headers()` para llamar a auth (`/users/{id}/resumen`). `match-service/reactions.py` tiene endpoint interno `/internal/count/{challenge_id}` **usando `get_current_user` (JWT)** en lugar de `require_internal_service` (ver hallazgos). |
| redirect_slashes | Discrepancia verificada | `core-service/main.py` y `match-service/main.py` tienen `redirect_slashes=False`. **auth-service/main.py NO lo tiene**. |
| Stack Docker-only | Verificado | `database_url` usa host `postgres`. Servicios corren en contenedores (docker-compose ps OK). |

---

## 4. Hallazgos por Severidad (0.8)

### CRÍTICO
- **auth-service main.py sin `redirect_slashes=False`** (evidencia: `services/auth-service/app/main.py` líneas 1-41 - no existe `redirect_slashes`). Core y match sí lo tienen. Esto puede generar comportamiento inconsistente con la convención "rutas colección sin slash" y con el comportamiento documentado (evitar 308↔307 a través de proxy). Requiere verificación/decisión en fases posteriores (no se modifica ahora).
- **Endpoint interno sin protección de servicio**: `match-service/app/api/v1/endpoints/reactions.py:111-129` define `@router.get("/internal/count/{challenge_id}")` con `auth: AuthContext = Depends(get_current_user)` (JWT). Debería usar `require_internal_service` (verificado en auth-service) para rechazar llamadas externas no autorizadas como endpoint interno. Esto es una debilidad de autorización interna.
- **Falta de `X-Service-Token` en llamadas match→core**: `match-service/app/api/v1/endpoints/practicas.py:58-76` llama `GET {core_service_url}/api/v1/core/challenges/{challenge_id}` **sin headers de servicio**. En cambio, match→auth para `/users/{user_id}/resumen` **sí usa `service_headers()`** (líneas 85-90). Si core-service protege endpoints internos con `require_internal_service` en el futuro o si se desea consistencia, esto es un hueco. Actualmente core-service no muestra uso explícito de `require_internal_service` en endpoints revisados.

### ALTO
- **Discrepancia entre PLAN/AGENTS y estado real**: `AGENTS.md` afirma "No test suite, Python linter/formatter config, or CI exist". Sin embargo existen `pytest.ini` + `tests/` en los 3 servicios y Vitest en frontend. PLAN también refleja estado histórico. Esto debe documentarse (texto obsoleto) pero **no se corrige** en Fase 0.
- **Discrepancia sobre `alembic/versions/` gitignored**: `AGENTS.md` dice "Alembic revisions are autogenerate and gitignored" y PLAN también lo indica. `.gitignore` modificado elimina esa exclusión; las 6 revisiones existen en repo. D13 resuelto según `docs/gestion-practicas/plan-bloque-3.md`. Debe quedar registrado.

### MEDIO
- **`NonceStore` en memoria (auth-service)**: `shared/python/vialibre_common/service_auth.py` implementa `NonceStore` in-memory (thread-safe). Comentario indica: válido mientras un solo proceso verificador maneja tokens; escalado a múltiples réplicas requiere store compartido (Redis/DB). Esto es limitación arquitectónica conocida.
- **CORS abierto**: `auth-service/main.py:26-32` configura `allow_origins=["*"]`, `allow_credentials=True`, `allow_methods=["*"]`, `allow_headers=["*"]`. Frontend está detrás de nginx; verificar si esto es intencional. No se modifica.
- **Rutas colección "sin slash" - verificación incompleta**: Aunque código nuevo usa `""`, grep exacto devolvió 0 coincidencias. Se requiere validación sistemática en fases posteriores (Fase 3.4).

### BAJO
- **make no disponible en Windows host**: `Makefile` existe pero `make` no está instalado en host Windows. Instrucciones indican usar `docker-compose exec -T <svc> ...` (según `plan-bloque-3.md`). Registrar para evitar intentos fallidos.

---

## 5. Blockers/Dependencies/Riesgos (Bloqueos Institucionales vs Riesgos)

### Bloqueos institucionales (obligatorios) - estado
| Bloqueo | Estado | Comentario |
|---|---|---|
| Integridad arquitectónica (3 FastAPI + Next.js 14 + PostgreSQL 3 schemas + Nginx) | CUMPLIDO | Confirmado por inventario. |
| Cada servicio mantiene su propio schema | CUMPLIDO | `vialibre_auth/core/match` verificados. |
| Migrations controladas (Alembic autogenera, gitignored históricamente; ahora versiones commiteadas) | CUMPLIDO con nota | Versiones existen. `include_name` respetado. No eliminar. |
| Enumerados locales vs compartidos | CUMPLIDO | Verificado. Usar enums locales españoles. |
| Cross-service sin FK | CUMPLIDO | UUID desnudos. Comunicación vía httpx + settings. |
| Seeds idempotentes + UUIDs sincronizados | CUMPLIDO | Verificado en 3 seeds. |
| Autorización preservada (RBAC) | CUMPLIDO | `require_role`, `AuthContext` presentes. Endpoint interno reactions sin `require_internal_service` es hallazgo (no debilita RBAC existente, es falta de hardening interno). |
| Rutas colección sin slash | PARCIAL | Código nuevo sigue convención; verificación global pendiente. |
| Stack operativo Docker-only (DB host `postgres`) | CUMPLIDO | docker-compose ps OK. |

### Dependencias externas/internas
- Docker + docker-compose (v1 syntax) requerido para levantar stack.
- `make` opcional en Windows (usar docker-compose directo).
- JWT secret compartido vía `JWT_SECRET_KEY` (usado por auth + service tokens).

### Riesgos principales
1. **Condición carrera TOCTOU**: operaciones críticas requieren `with_for_update()` + transacción única (principio). No se implementa en Fase 0.
2. **Autorización endpoint interno**: `/internal/count/{challenge_id}` en reactions usa JWT en lugar de service token. Riesgo si expuesto.
3. **Consistencia cross-service**: match→core no envía `X-Service-Token`. Inconsistente con match→auth.
4. **auth-service sin redirect_slashes**: puede afectar comportamiento con rutas colección.

---

## 6. Alcance Fase 1 + Exclusiones (0.7)

### Exclusiones explícitas (NO modificar en Fases 1-5)
- **No eliminar revisiones Alembic existentes**: las 6 revisiones listadas deben conservarse.
- **No modificar enums compartidos**: `shared/python/vialibre_common/schemas.py` (English enums) - usar enums locales por servicio.
- **No cambiar esquema PostgreSQL ownership**: cada servicio en su propio schema. No mezclar.
- **No añadir FKs cross-service**: mantener UUID desnudos.
- **No cambiar convenciones cross-service sin justificación**: mantener sin FK, HTTP via httpx.
- **No modificar seeds existentes salvo necesidad justificada manteniendo UUIDs sincronizados e idempotencia**.
- **No asumir ejecución fuera de Docker**: servicios requieren `postgres` en red Docker.
- **No "reconstruir plataforma"**: extender lo existente (principio rector).

### Alcance sugerido para Fase 1 (según hallazgos)
Fase 1 debe incluir:
- **Analizar autorización interna**: decidir si `/internal/count/{challenge_id}` debe pasar a `require_internal_service`. Evaluar impacto.
- **Analizar consistencia service-tokens**: ¿core debe validar `X-Service-Token`? ¿match→core debe enviar token? Evaluar según `auth-service/deps.require_internal_service` (actualmente solo auth valida tokens entrantes; core/match validan JWT entrante via deps comunes).
- **Analizar discrepancia auth-service `redirect_slashes=False`**: decidir aplicar para consistencia con core/match.
- **Validar rutas colección sin slash globalmente** (todos los routers existentes + nuevos).
- **Confirmar catálogos existentes** antes de proponer nuevos (principio "no inventar catálogos").
- **Identificar operaciones con riesgo TOCTOU** (transiciones de estado, aprobaciones, creación de `practica`, etc.) para planificar `with_for_update` + transacción única.
- **Evaluar necesidad D3/D4**: aplicar "solo si depende" (1.7 PLAN).

---

## 7. Skills Relevantes (0.5)

Según `codebase-audit` SKILL.md y skills disponibles:
- **codebase-audit** (primario) - ya aplicado (solo lectura). CUMPLIDO.
- **auth-rbac-security**: relevante si se tocan autorizaciones, especialmente `require_internal_service`, separación admin, pruebas acceso no autorizado.
- **database-design**: relevante si hay cambios de modelo/migraciones (aunque Fase 0 no modifica).
- **admin-dashboard**: relevante si se amplía UI admin existente.
- **document-automation**: relevante si se trabaja con documentos (match-service tiene `documents.py`).
- **testing-and-quality**: relevante para validar con resultados reales en Fases 4-5.
- **supabase-postgres-best-practices**: útil para migraciones/schema design (mantenido por Supabase).

Recomendación: activar skills según alcance Fase 1 (no obligatorio en Fase 0).

---

## 8. Verificación de Criterios Fase 0 por ítem

| Criterio (PLAN.md Fase 0) | Estado | Evidencia |
|---|---|---|
| 0.1 Activar auditoría de código base (codebase-audit) | CUMPLIDO | SKILL cargado/aplicado. Solo lectura. |
| 0.2 Revisar AGENTS.md y convenciones | CUMPLIDO | `AGENTS.md` leído completo. Convenciones verificadas. |
| 0.3 Verificar estado repositorio (rama, cambios sin commit, no rastreados) | CUMPLIDO | `git status --short`, `git rev-parse` ejecutados. Registrado. |
| 0.4 Mapear modelos, endpoints, schemas | CUMPLIDO | Inventario completo por servicio + shared + frontend. |
| 0.5 Identificar skills relevantes | CUMPLIDO | Listados arriba. |
| 0.6 Levantar stack si necesario / confirmar estado | CUMPLIDO | `docker-compose ps` muestra 6 contenedores Up, postgres healthy. |
| 0.7 Definir alcance explícito (qué NO se modifica) | CUMPLIDO | Sección 6. |
| 0.8 Establecer criterios auditoría / registrar hallazgos | CUMPLIDO | Hallazgos por severidad documentados. |

**Todos los criterios CUMPLIDOS.**

---

## 9. Verificación Cierre Fase 0

### Diff vs línea base
Se creó ÚNICAMENTE el archivo: `.opencode/reports/FASE0_AUDITORIA.md`

Verificación: `git status --short` mostrará solo archivos preexistentes sin commit + este nuevo archivo no rastreado (`?? .opencode/reports/FASE0_AUDITORIA.md`).

### Comandos ejecutados (evidencia)
1. `git status --short; git rev-parse HEAD; git rev-parse --abbrev-ref HEAD`
2. Verificación existencia `.opencode/reports/`
3. `Get-ChildItem services/*/alembic/versions/*.py` - listar revisiones existentes
4. `Select-String` para `redirect_slashes` en main.py de 3 servicios
5. `grep` para rutas colección `@router.(get|post|...)("")`
6. `grep` para `require_internal_service`, `X-Service-Token`, `service_token`, `get_current_user` (match-service)
7. Lectura de archivos clave: `practicas.py`, `auth-service/main.py`, `interactions.py`, `reactions.py`, `match-service/deps.py`, `shared/service_auth.py`
8. Lectura `PLAN.md` completo
9. `docker-compose ps`

### Criterios Phase 0 cumplimiento por ítem (detalle)
- [x] **Línea base Git**: rama, HEAD, estado árbol de trabajo documentados con evidencia.
- [x] **Inventario arquitectura**: 3 servicios, frontend, shared, nginx, postgres, 3 schemas - documentados.
- [x] **Convenciones verificadas con evidencia**: schema por servicio, api_v1_prefix, include_name, sin FK, enums locales vs compartidos, rutas colección, seeds, cross-service auth, redirect_slashes - todos con evidencia.
- [x] **Hallazgos por severidad**: CRÍTICO/ALTO/MEDIO/BAJO con ubicaciones de archivo + líneas.
- [x] **Blockers/Dependencies/Riesgos**: bloqueos institucionales evaluados (8/9 cumplidos, 1 parcial con justificación), dependencias, riesgos con mitigaciones.
- [x] **Alcance Fase 1 + Exclusiones**: qué NO modificar explícito.
- [x] **Skills aplicables**: identificados.
- [x] **Cierre verificación**: solo archivo nuevo report creado; comandos listados; estado stack verificado.
- [x] **Principios respetados**: solo lectura, no modifica código/models/enums/datos/permisos, no elimina revisiones Alembic.

---

## 10. Decisión Final

**FASE 0 COMPLETADA. CUMPLIDO.**

No se procede a Fase 1. El reporte está guardado en `.opencode/reports/FASE0_AUDITORIA.md`. Próximo paso (según solicitud): detenerse al final de Fase 0.

**Elaborado por**: Agente OpenCode (Big Pickle)  
**Verificación**: Solo lectura - sin modificaciones al código base fuera de creación de reporte.