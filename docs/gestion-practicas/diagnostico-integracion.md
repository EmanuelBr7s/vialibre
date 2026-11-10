# Diagnóstico de integración - Bloque 1: Módulo administrativo de prácticas empresariales

> **Estado del entregable:** Única escritura autorizada para el Bloque 1. Este documento es de auditoría (solo lectura/recopilación de hechos). No se ha modificado código, configuración ni base de datos. No se proponen implementaciones.

**Leyenda de evidencias:**
- `[Hecho verificado]` — comprobado directamente en el código/repositorio (se indica `archivo:líneas`).
- `[Inferencia]` — conclusión razonable a partir de los hechos verificados.
- `[Pendiente de verificar]` — requiere confirmación (no evidente con la inspección actual).

## 1. Resumen ejecutivo

[Hecho verificado] VíaLibre es una plataforma de empleabilidad/universitaria (Facultad de Ingeniería, Universidad Libre Seccional Barranquilla). Arquitectura monorepo: 3 microservicios FastAPI (`auth-service`, `core-service`, `match-service`), frontend Next.js 14 (App Router), biblioteca compartida `vialibre_common`, gateway Nginx y una única base PostgreSQL con 3 esquemas. Orquestación vía `docker-compose` y `Makefile`.

[Hecho verificado] Estado actual: el flujo de retos/prácticas/ofertas (feed, detalle, postulaciones, aprobación/desbloqueo de contacto, documentos de práctica, carta de aval) ya existe y está funcionalmente conectado entre servicios (con acoplamientos documentados). El área administrativa (`/admin/dashboard`, `/admin/anuncios`) presenta datos de maqueta (mock/in-memory) y carece de persistencia/servicios backend asociados.

[Hecho verificado] Rama git: `feature/funcionalidades-eric-jassir`. Archivos modificados sin commit (12) e `untracked`: `.opencode/`, `AGENTS.md`, `documents/`, `package-lock.json`, `shared/python/vialibre_common/service_auth.py` (ver `git status`). Migraciones de Alembic generadas pero ignoradas por `.gitignore` (`services/*/alembic/versions/`).

**Conclusión (resumen):** El núcleo de publicación-postulación-contacto está implementado. Las funcionalidades de gestión administrativa institucional (seguimiento de prácticas, registro formal de empresas, formulario de necesidades empresariales, modalidades Creación de Empresa y Homologación, evaluación de prácticas/tutores, informes administrativos reales, control de entrega/revisión/estado documental ampliado) son mayoritariamente inexistentes o parciales. El diagnóstico identifica qué reutilizar, qué carencias existen y dependencias/riesgos para el Bloque 2 (sin diseñar implementación).

## 2. Arquitectura y situación actual verificada

### 2.1 Topología y despliegue
- [Hecho verificado] Microservicios FastAPI: `auth-service` (puerto 8001), `core-service` (8002), `match-service` (8003). Frontend Next.js 14 (3000). Nginx gateway (80). PostgreSQL 16-alpine (host 5433).
- [Hecho verificado] `docker-compose.yml`: servicios en red por defecto. Único `healthcheck` definido en `postgres`. `depends_on` solo espera salud de PostgreSQL (no hay dependencia de salud entre app services). 
- [Hecho verificado] Comandos Make: `make up/down/logs/ps`, `make clean` (borra volumen DB), `make setup-db` (init-schemas+migrate+seed+seed-core+seed-match), `make migrate MSG=...` (autogenerar+upgrade todos o por servicio).
- [Hecho verificado] CMD Dockerfiles: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload` (`services/*/Dockerfile`). **Sin `--workers`** → un worker + reloader en contenedor (1 proceso worker efectivo). Restart de servicio reinicia worker; efecto de reinicio de store de nonces documentado (se pierde estado en memoria).
- [Hecho verificado] `gateway/nginx.conf`: rutas `/api/v1/{auth,core,match}/` → servicios respectivos; resto → frontend. `proxy_http_version 1.1`, `proxy_set_header Upgrade/Connection`, timeouts configurados.
- [Hecho verificado] Frontend `next.config.js`: rewrites `/api/:path*` → `http://nginx:80/api/:path*`. API base `process.env.NEXT_PUBLIC_API_URL || '/api'`.

### 2.2 Configuración de servicios
- [Hecho verificado] Cada servicio tiene `schema_name` y `api_v1_prefix` en `config.py` (`auth`: `vialibre_auth`/`/api/v1/auth`, `core`: `vialibre_core`/`/api/v1/core`, `match`: `vialibre_match`/`/api/v1/match`).
- [Hecho verificado] `database_url` apunta a host `postgres` (red Docker). Los servicios no están pensados para ejecutarse fuera de contenedores.
- [Hecho verificado] Variables: `.env` contiene `JWT_SECRET_KEY=change-me-in-production-use-a-real-secret` (valor por defecto/dev). Seeds usan UUIDs fijos compartidos entre servicios.
- [Hecho verificado] Health endpoints: `/health` en raíz de cada servicio (NO bajo `/api/v1/...`) — ver `app/main.py` de cada servicio.

### 2.3 Base de datos y migraciones
- [Hecho verificado] DB única `vialibre`, 3 esquemas: `vialibre_auth`, `vialibre_core`, `vialibre_match`. Cada servicio dueño de exactamente un esquema.
- [Hecho verificado] Alembic: revisiones autogeneradas y **gitignored** (`.gitignore` incluye `services/*/alembic/versions/`). Tablas `alembic_version_auth/_core/_match`. `env.py` usa `include_name` para restringir autogenerate al esquema propio.
- [Hecho verificado] Al añadir modelos, importarlos en `models/__init__.py` y en `alembic/env.py` (para que autogenerate los detecte).
- [Hecho verificado] Migraciones existentes (sin commit): `c557863f0a93_sync_schema_phase1.py` (auth), `d65f36209c5b_sync_schema_phase1.py` (core), `564cf3551867_sync_schema_phase1.py` (match).
- [Hecho verificado] Seeds idempotentes con UUIDs fijos sincronizados entre servicios. Credenciales demo: `admin@vialibre.edu.co`/`Admin1234`, `contacto@artesaniasllamas.com`/`Publicador1234`, `leonardo@vialibre.edu.co`/`Solucionador1234`, `mariana.castro@vialibre.edu.co`/`Estudiante1234`. Interacción fija `_int(2)=e0000000-0000-0000-0000-000000000002`.
- [Hecho verificado] Sin FKs entre esquemas de distintos servicios (referencias cruzadas son UUIDs puros). Decisión arquitectónica explícita.

### 2.4 Modelo de datos (verificado)
**auth (`vialibre_auth`)** — `services/auth-service/app/models/*.py`:
- `roles` (id, name, description)
- `users` (id, email, password_hash, full_name, role_id FK→roles, is_active, avatar_url, phone, bio, nit_empresa, empresa_nombre, programa_academico, afiliacion_academica, skills JSONB, soft_skills JSONB, linkedin_url, github_url, portfolio_url, ubicacion, semestre, anio_egreso, disponible, cv_filename, cv_size, cv_updated_at, cv_data LargeBinary deferred, created_at, updated_at)

**core (`vialibre_core`)** — `models/challenge.py`, `category.py`:
- `categories` (id, name unique, description, icon)
- `challenges` (id, title, tipo Enum[`reto|practica|empleo`], short_description (>=10), long_description (>=20), category_id FK→categories, author_id UUID (cross-service), status Enum[`abierto|en_progreso|cerrado`] (local servicio), difficulty Enum[`easy|medium|hard`], tags JSONB, budget Numeric, deadline, image_url, modalidad, ubicacion, is_featured, featured_score, created_at, updated_at)

**match (`vialibre_match`)** — `models/interaction.py`, `reaction.py`, `document.py`:
- `interactions` (id, solucionador_id UUID (cross-service), challenge_id UUID (cross-service), status Enum[`pendiente|aprobado|rechazado`] (local), message, contact_unlocked bool, contact_unlocked_at, created_at, updated_at; unique(solucionador_id,challenge_id))
- `reactions` (id, user_id UUID, challenge_id UUID, reaction_type Enum[`like|bookmark`], created_at; unique(user_id,challenge_id,reaction_type))
- `interaction_documents` (id, interaction_id FK→interactions CASCADE, tipo, filename, content_type, size, data LargeBinary deferred, uploaded_at; unique(interaction_id,tipo))

[Hecho verificado] **Discrepancia de enums**: `shared/python/vialibre_common/schemas.py` define enums en inglés (`ChallengeStatus` DRAFT/OPEN/IN_PROGRESS/RESOLVED/CLOSED, `InteractionStatus` PENDING/ACCEPTED/COMPLETED, `DifficultyLevel`) mientras cada servicio usa enums locales en español (`core`: abierto/en_progreso/cerrado; `match`: pendiente/aprobado/rechazado). No son intercambiables.

### 2.5 Autenticación/autorización y seguridad inter-service
- [Hecho verificado] `shared/python/vialibre_common/service_auth.py` (implementado): token interno formato `v1.<b64url(payload)>.<hex_hmac>` con payload `{"s","t","n","m","p"}` (service, ts, nonce, method, path). Funciones `build_service_token`, `service_headers`, `verify_service_token`, excepciones `ServiceTokenError`, `NonceStore` (TTL en memoria, bounded growth, purge), `ALLOWED_SERVICES={"core-service","match-service"}`, ventanas `SERVICE_TOKEN_WINDOW=60`, `SERVICE_TOKEN_SKEW=10`. Header `X-Service-Token`.
- [Hecho verificado] `auth-service/app/api/deps.py`: `_nonce_store` global en memoria, `_verify_internal_request` (valida token interno + nonce único/ventana + método+path), `get_principal`, `require_internal_service` (fail-closed). Verificación atómica conceptualmente (check+insert) con ventana `now-60 <= ts <= now+10` (skew permitido, no uso de `abs` genérico).
- [Hecho verificado] Consumidores con token interno: `core-service/app/api/v1/endpoints/challenges.py::_resolve_author` usa `service_headers(..., "GET", path)` para llamar a `auth GET /users/{id}/resumen` (`auth-service_url`). `match-service/app/api/v1/endpoints/documents.py` y llamadas a auth para obtener info de usuario usan `service_headers` con method+path ligado. `match-service/app/api/v1/endpoints/interactions.py` llama a core para verificar ownership; **ver líneas específicas más abajo (acoplamiento sin token)**.
- [Hecho verificado] Pruebas endurecimiento inter-service: 25/25 PASS (concurrencia 8 hilos → 1 aceptado; TTL purge; bounded growth). Restart: uso#1 200 → uso#2 401 (nonce reutilizado) → restart → uso#3 200 (estado memoria se pierde; límite documentado). Único proceso worker (PID reloader + worker) — multi-proceso no soportado con store en memoria.

### 2.6 Endpoints (inventario verificado)
**Auth (`/api/v1/auth`)** — `services/auth-service/app/api/v1/endpoints/*.py`:
- POST `/register` (público; roles permitidos `PUBLIC_REGISTER_ROLES = {solucionador, egresado, publicador}`; `admin` → 422). Retorna token.
- POST `/login`
- GET `/users/me`
- PATCH `/users/me`, PUT `/users/me/cv`, DELETE `/users/me/cv`
- GET `/users/talent` (restringido a publicador/admin)
- GET `/users/{user_id}/cv` (owner/publicador/admin)
- GET `/users/{user_id}/resumen` (requisito interno de servicio) — protegido por verificación interna/service token según deps
- GET `/users/{user_id}` (owner/publicador/admin; también usado internamente según lógica)

**Core (`/api/v1/core`)** — `services/core-service/app/api/v1/endpoints/challenges.py`:
- POST `/categories` (requiere `ADMIN`) — `challenges.py:89-98`
- GET `/categories` (público) — `102-104`
- POST `""` (colección sin slash) — requiere autenticado y rol `PUBLICADOR` — `113-136`
- GET `""` (listado) — público. Por defecto filtra `status == ABIERTO` salvo `author_id` especificado (devuelve todos los estados) — `139-201`
- **GET `/{challenge_id}` (detalle)** — **SIN dependencia de auth** (`db` únicamente). Retorna 404 si no existe, enriquece con autores vía token interno. **Público** — `204-220`
- PATCH `/{challenge_id}` (autor o ADMIN) — `223-252`
- DELETE `/{challenge_id}` (autor o ADMIN) — `255-277`

**Match (`/api/v1/match`)** — `endpoints/interactions.py`, `documents.py`, `reactions.py`:
- POST `/interactions/apply` (TALENT_ROLES: solucionador/egresado) — `interactions.py:27-63`
- GET `/interactions/challenge/{challenge_id}` (autor del challenge o ADMIN). Verifica propiedad llamando a `core GET /api/v1/core/challenges/{challenge_id}` — `66-114`
- GET `/interactions` (propias, solucionador) — `116-148`
- GET `/interactions/{id}` (owner o ADMIN) — `151-177`
- PATCH `/interactions/{id}/approve` (PUBLICADOR o ADMIN). Verifica propiedad vía core GET — `180-236`
- DELETE `/interactions/{id}` (solamente el solucionador creador) — `239-264`
- GET `/interactions/{id}/contact` (owner/author/admin con contacto desbloqueado). Verifica propiedad vía core GET; obtiene contacto desde auth con token interno — `267-339+`
- GET/PUT/descarga documentos (checklist, subir tipos permitidos, carta aval PDF) — `documents.py` (verificado en Fase 1; funcionamiento correcto)
- POST `/reactions` (autenticado) — `reactions.py:19-47`
- GET `/reactions` (propias) — `50-82`
- DELETE `/reactions/{id}` (propias) — `85-106`
- **GET `/reactions/internal/count/{challenge_id}`** — depende de `get_current_user` (autenticado cualquiera), **no requiere token interno de servicio**. Retorna conteo por tipo opcional — `111-129`

### 2.7 Frontend (Next.js App Router)
- [Hecho verificado] Rutas principales: `/`, `/login`, `/register`, `/feed`, `/feed/[id]`, `/mis-postulaciones`, `/mis-problematicas`, `/talento`, `/perfil/academico`, `/perfil/organizacion`, `/settings`, `/admin/dashboard`, `/admin/anuncios`.
- [Hecho verificado] Middleware `frontend/src/middleware.ts`: protege rutas en `PROTECTED_PATHS` (feed, mis-*, admin/*, perfil/*, settings) y redirige autenticados desde `/login|/register` a `/feed`. **Solo verifica presencia de token/cookie** (`AUTH_COOKIE_NAME`), **no valida roles** (protección de rol es client-side).
- [Hecho verificado] Cliente API `frontend/src/lib/api.ts`: wrapper a `/api/*`. Métodos relevantes: auth, challenges, categories, interactions (apply, list mine, applicants, approve, contact, **getInteraction** línea 320), reactions (**createReaction** 325, **deleteReaction** 332), CV/upload/download, users/talent. **[Hecho verificado] `getInteraction`, `createReaction`, `deleteReaction` no tienen llamadores en frontend** (grep sobre `frontend/src` solo encuentra definiciones en `lib/api.ts`).
- [Hecho verificado] Feed detalle (`app/feed/[id]/page.tsx`): carga challenge (público vía API, requiere auth en página), muestra detalle; para dueño o admin → `ApplicantsSection`; para talento (solucionador/egresado) → `ContactSection`. Para otros roles muestra mensaje informativo.
- [Hecho verificado] Mis postulaciones (`app/mis-postulaciones/page.tsx`): protegido por `useRoleGuard(TALENT_ROLES)`. Enriquecimiento por fila hace llamadas individuales a `getChallenge` para cada interacción. Muestra estado, contacto desbloqueado, documentos de práctica (`PracticeDocuments`) cuando aprobado+práctica.
- [Hecho verificado] Admin Dashboard (`app/admin/dashboard/page.tsx`): **usa datos mock** `ADMIN_KPIS`, `ADMIN_USERS` desde `data/mock.ts`. Toggle `is_active` **solo actualiza estado local** (no llama a API). No hay endpoints backend para gestión de usuarios/KPIs administrativos implementados.
- [Hecho verificado] Admin Anuncios (`app/admin/anuncios/page.tsx`): gestiona anuncio vía `AdvertisementContext` (estado en memoria). `currentAd` inicializado desde `data/ads.ts`. **Sin persistencia** (frontend-only).
- [Hecho verificado] Role guard: `frontend/src/hooks/useRoleGuard.ts` es **client-side únicamente**. No sustituye protección backend.
- [Hecho verificado] Accesibilidad: `AccessibilityPanel` presente (separar palabras/guía lectura) — cumple requisito de accesibilidad mencionado.
- [Hecho verificado] Reacciones: API expone create/delete/list/count interno; **no existe UI de reacciones (like/bookmark)** en frontend (sin llamadores).

## 3. Matriz de análisis funcional

A continuación se mapea cada necesidad identificada (fuente: `documents/transcripcion/transcripcion_unificada_analisis.md` + requisitos del Bloque 1) frente a estado actual, evidencia, carencias, skill futura sugerida, dependencias, riesgos y pruebas a considerar (sin implementación).

| Necesidad funcional | Estado (impl/parcial/inexistente/por verificar) | Evidencia (`archivo:líneas`) | Qué falta | Skill futura | Dependencias | Riesgos | Pruebas sugeridas (sin impl.) |
|---|---|---|---|---|---|---|---|
| 1. Portal empresas: 3 secciones (retos, prácticas, ofertas) | **Implementado** | `challenges.ts` modelos/enums tipo `reto\|practica\|empleo` (`services/core-service/app/models/challenge.py`, `schemas/challenge.py`); listado con filtro `tipo` (`challenges.py:167-170`); feed/frontend diferencia por tipo. | Nada crítico. | — | core-service, frontend feed | Bajo | Verificar filtros por tipo, visibilidad por status. |
| 2. Búsqueda/filtrado de perfiles (HV, skills, etc.) — banco de talento | **Implementado (parcial)** | `auth GET /users/talent` (`services/auth-service/app/api/v1/endpoints/users.py`), página `/talento` (frontend). | Ampliar filtros/campos (bilingüe, programa, semestre, año egreso, ubicación, disponibilidad) según requerimientos administrativos. | database-design / admin-dashboard | auth-service, frontend | Bajo | Filtrado por campos académicos. |
| 3. Gestión de postulaciones con estados + contacto desbloqueado | **Implementado** | `interactions.py` apply/list/approve/contact (`27-339+`); `ContactSection`/`ApplicantsSection`/`mis-postulaciones` muestran aprobación y contacto desbloqueado. | Reportes/seguimiento administrativo (matriz consolidada), histórico, exportación. | testing-and-quality / admin-dashboard | match+core+auth | Bajo | Flujo pendiente→aprobado→contacto. |
| 4. Modalidades: práctica ordinaria, creación de empresa, homologación | **Parcial** | Modelo `Challenge` tiene `modalidad` (`challenges.py/model/schema`), frontend muestra etiqueta (`feed/[id]/page.tsx:94`). Valores/semántica no definidos completamente para creación de empresa/homologación. **Práctica ordinaria** cubierta parcialmente. **Creación de empresa**: inexistente (equipos 2, mini-chartán/sustentación). **Homologación**: inexistente (experiencia ≥1 año, formatos CAWA/CUA/DPS). | Definir catálogo de modalidades (enum/valores), reglas por modalidad, flujos, requisitos documentales específicos. **[Pendiente de verificar]** valores exactos usados. | database-design | core/match, documentos | Medio | Validar reglas diferenciadoras por modalidad. |
| 5. Generación/descarga de cartas | **Parcial** | Solo **carta de aval** PDF: `match/documents.py` endpoint `/interactions/{id}/carta-aval` genera PDF (bytes `application/pdf`, verificado ~3432 bytes en pruebas Fase 1). Plantillas DOCX existen: `documents/FORMATO-CARTA-EMPRESA.docx`, `FORMATO-CARTA-COMPROMISO-PRACTICAS.docx`, `FORMATO-HOJA-de-VIDA-INSTITUCIONAL.docx`. | Faltan **carta de presentación** y **carta de compromiso** (generación/descarga), integración con plantillas DOCX institucionales preservando formato (editable). | document-automation | match-service, shared PDF/lib, plantillas | Medio | Verificar tipos de documento requeridos vs implementados. |
| 6. Accesibilidad (separación palabras, guía lectura) | **Implementado** | `AccessibilityPanel.tsx` + `AccessibilityContext`: opciones `textSpacing` (separar palabras), `readingGuide` (guía de lectura), tamaño fuente, contraste, reducir movimiento, fuente dislexia. Persistencia en localStorage. | Nada. | — | frontend | Bajo | Cumplimiento básico presente. |
| 7. Área de administración / soporte universitario | **Parcial** | `/admin/dashboard` (mock: `ADMIN_KPIS`, `ADMIN_USERS`, toggle solo local), `/admin/anuncios` (in-memory via `AdvertisementContext`, sin persistencia). Guards client-side (`useRoleGuard`). Middleware solo chequea token. **Sin backend admin para gestión real**. | Endpoints/admin APIs, persistencia anuncios, gestión real de usuarios/empresas/prácticas, permisos granulares, RBAC estricto server-side. | admin-dashboard + auth-rbac-security | auth/core/match + frontend | Medio | Proteger rutas admin server-side, validar autorización real. |
| 8. Registro/centralización de empresas, tutores docentes, requisitos, documentación, visitas, evaluación | **Inexistente** | No existen modelos/tablas para `Empresa`, `TutorDocente`, `Visita`, `Evaluacion`, `Requisito`, `DocumentoPlantilla`. `User` tiene campos empresa (`nit_empresa`, `empresa_nombre`) pero **no es registro formal/centralizado de empresas** (vinculado a usuario publicador). | Modelo de entidades institucionales independientes (empresa como entidad, tutores docentes, requisitos por modalidad, visitas de seguimiento, evaluación práctica/tutor). | database-design | auth/core/match (nuevo modelo) | Alto | Mapear cardinalidades (empresa ↔ publicaciones ↔ prácticas). |
| 9. Formulario de necesidades empresariales (captación proactiva) | **Inexistente** | No existe formulario/backend para "necesidades empresariales". `Challenge` es publicación (oferta/reto/práctica) creada por publicador; no captura solicitud proactiva desde/universidad hacia empresas ni flujo de captación. | Entidad `NecesidadEmpresarial` (estado, responsable, seguimiento, origen), formulario, flujo de aprobación/seguimiento administrativo. | database-design + admin-dashboard | nuevo modelo (propietario por definir: core o auth) | Medio | Distinguir "publicación" vs "necesidad empresarial". |
| 10. Seguimiento administrativo estudiantes/tutores (matriz: año, tutor, programa, identificación, nombre, correo, celular, práctica desde 7°, bilingüe) | **Inexistente** | Datos dispersos en `User` (programa_academico, afiliacion_academica, semestre, anio_egreso, phone, email, full_name) pero **falta tutor docente, año/práctica desde 7°, bilingüe, identificación/CI, estado de seguimiento administrativo**. No existe entidad `Practica`/registro de práctica con tutor. | Entidad `Practica` (vincula estudiante, challenge/práctica, empresa, tutor docente, fechas, modalidad, indicadores: bilingüe, práctica desde 7°, año académico). Matriz de seguimiento consolidada. | database-design | definir propietario (core/match) | Alto | Alinear con requerimientos transcript (campos exactos). |
| 11. Control de entrega/revisión/estado de documentos (HV, compromiso, institucional) | **Parcial** | `interaction_documents` soporta tipos y estados implícitos (subido/pendiente). Existe checklist en `documents.py`. Se gestionan documentos de práctica (identidad, matrícula, EPS) y carta aval. Faltan **Hoja de Vida Institucional**, **Formato de Compromiso de Prácticas**, otros por modalidad. No hay flujo de **revisión/aprobación de documentos** (estado revisión/aprobado/rechazado por admin/tutor). | Ampliar catálogo de `tipo` documentos, estados de revisión, bitácora de revisiones, asignación revisor (tutor/admin), fechas límite/entrega. | database-design + document-automation | match-service | Medio | Diferenciar "entregado" vs "revisado/aprobado". |
| 12. Evaluación de prácticas/tutores (visitas, evaluación empresa) | **Inexistente** | No existen entidades `Evaluacion`, `Visita`. Sin formularios de evaluación, calificaciones, actas. | Modelar evaluaciones (empresa→estudiante, tutor→estudiante, autoevaluación), visitas de seguimiento, rúbricas por modalidad. | database-design | nuevo (match/core) | Alto | Definir responsables (tutor docente, coordinación). |
| 13. Informes administrativos (KPIs) | **Parcial** | Dashboard muestra KPIs **mock** (`ADMIN_KPIS` en `data/mock.ts`). No hay endpoints backend agregando datos reales (conteos por estado, postulaciones, prácticas activas, empresas, tutores). | Endpoints de reportes/agregados (solo lectura, con autorización), KPIs reales, exportación (CSV/XLSX) — sin implementar ahora, solo identificar necesidades. | admin-dashboard + testing-and-quality | auth/core/match | Medio | Evitar N+1 en agregados. |
| 14. Gestión documental y cartas (presentación, aval, compromiso) | **Parcial** | Solo carta aval PDF. Plantillas DOCX existen (`documents/FORMATO-*.docx`). Falta generación desde plantillas con datos del sistema, preservar formato, salida editable (DOCX), control de versiones, almacenamiento seguro. | Integración con plantillas institucionales (DOCX), mapeo de variables, generación DOCX/PDF, versionado, bitácora. | document-automation | shared lib, match/core, almacenamiento | Medio | No sobrescribir plantilla; usar generación por documento instanciado. |
| 15. Modalidad Creación de Empresa (equipos 2, mini-chartán/sustentación) | **Inexistente** | Sin entidades específicas (equipo, integrantes, proyecto creación empresa, hitos: mini-chartán/sustentación). | Extensión de modelo (equipo de 2, roles, estado del proceso, fechas de sustentación, acta). | database-design | definir alcance (core/match) | Alto | Requiere reglas de negocio específicas. |
| 16. Homologación (experiencia ≥1 año, formatos CAWA/CUA/DPS) | **Inexistente** | Sin soporte para homologación (documentación específica CAWA/CUA/DPS). | Entidad `ProcesoHomologacion`, tipos de formato, validación requisitos (≥1 año), estados, documentos requeridos. | database-design | match/core | Alto | Ambigüedad terminológica en transcripción (CAWA/CUA/DPS) — `[Pendiente de verificar]` con normativa institucional. |
| 17. Reacciones (likes/bookmarks) — backend vs UI | **Parcial** | Backend completo: POST/GET/DELETE `/reactions`, count interno. **Frontend API expone métodos pero sin llamadores** (`api.ts:325,332` sin usos). **Sin UI**. | Decidir si habilitar funcionalidad o dejar como infraestructura futura. | admin-dashboard (opcional) | match-service, frontend | Bajo | Infra útil pero no requerida para Bloque 1 admin. |

## 4. Inventario de modelos/funcionalidades reutilizables

[Hecho verificado] Elementos listos para reutilizar (sin modificación en este bloque):

| Componente | Ubicación | Uso potencial para prácticas |
|---|---|---|
| `User` (auth) | `services/auth-service/app/models/user.py` | Base para estudiantes, egresados, empresas (publicador), tutores, administrativos. Necesitará extensiones de campos académicos/administrativos (no añadir ahora). |
| `Role` (auth) | `models/role.py` | Roles existentes: PUBLICADOR, SOLUCIONADOR, EGRESADO, ADMIN. Futuro `gestion_practicas`/`proyeccion_social` **NO añadir** en este bloque. |
| `Challenge` (core) | `models/challenge.py` | Reutilizable para retos/prácticas/ofertas. Campo `modalidad` existente; puede extenderse con catálogo para creación empresa/homologación (sin alterar estructura ahora). `tipo` ya cubre clasificación. |
| `Category` (core) | `models/category.py` | Taxonomía reutilizable. |
| `_attach_authors`, `_resolve_author` (core) | `challenges.py:29-84` | Patrón de enriquecimiento cross-service con token interno (reutilizable). |
| `Interaction` (match) | `models/interaction.py` | Reutilizable para postulaciones. Estados `pendiente/aprobado/rechazado`. Útil base para ciclo de vida de práctica. |
| `InteractionDocument` (match) | `models/document.py` | Reutilizable para documentos de práctica (tipos ampliables). Almacena datos binarios diferidos. |
| `Reaction` (match) | `models/reaction.py` | Infra existente (sin UI). |
| Service auth (shared) | `shared/python/vialibre_common/service_auth.py` | Token v1 ligado a método+path+nonce, TTL memoria, fail-closed — base sólida para llamadas internas. |
| Guards/RBAC auth | `auth-service/app/api/deps.py` | Patrones `require_role`, verificación interna — reutilizables. |
| API client/frontend patterns | `frontend/src/lib/api.ts`, middleware, guards | Arquitectura consistente (colecciones sin slash, manejo 204, cookies). |
| Plantillas DOCX | `documents/FORMATO-*.docx` | Base para `document-automation` (sin modificar plantillas existentes). |
| Transcripción requisitos | `documents/transcripcion/transcripcion_unificada_analisis.md` | Fuente de matriz funcional (no reglamento validado). |

## 5. Carencias y necesidades de modelado (sin diseño detallado)

[Inferencia] Basado en sección 3, se identifican **entidades candidatas** a incorporar en fases futuras (sin proponer campos/relaciones detalladas, solo necesidades):

| Entidad candidata | Propósito | Propietario aparente (esquema) | Justificación |
|---|---|---|---|
| `Empresa` | Registro formal/centralizado de empresas (distinto de usuario publicador). Datos de contacto, NIT, sector, representante. | `vialibre_auth` o `vialibre_core` | Empresas pueden tener múltiples publicadores; conviene entidad independiente. Evitar mezclar identidad de usuario con registro institucional. |
| `NecesidadEmpresarial` | Captación proactiva (formulario de necesidades). Estado, origen, responsable seguimiento. | `vialibre_core` | Cercano a `Challenge` (oferta), pero distinto flujo (proactivo vs publicación). |
| `Practica` | Registro de práctica (seguimiento administrativo). Vincula estudiante, challenge, empresa, tutor docente, modalidad, fechas, indicadores (bilingüe, práctica desde 7°, año académico). | `vialibre_match` o `vialibre_core` | Ciclo de vida de práctica cruza postulaciones (`match`) y publicación (`core`). Requiere análisis de propietario. |
| `TutorDocente` | Tutores docentes (identificación, programa, contacto, asignaciones). | `vialibre_auth` | Personas institucionales; puede vincularse a roles o entidad propia. |
| `DocumentoPlantilla` / `PlantillaCarta` | Plantillas institucionales versionadas (DOCX). | `vialibre_core` (o nuevo esquema no necesario) | Configuración del módulo administrativo. |
| `Visita` | Visitas de seguimiento a práctica/empresa. Fechas, responsable, observaciones. | `vialibre_match` | Asociado a práctica/interaction. |
| `Evaluacion` | Evaluaciones (empresa↔estudiante, tutor↔estudiante, autoevaluación), rúbricas. | `vialibre_match` | Vinculado a interacción/práctica y actores. |
| `ProcesoHomologacion` | Homologación (experiencia ≥1 año, CAWA/CUA/DPS). Estados, documentos. | `vialibre_match` | Proceso documental asociado a estudiante. |
| `ProyectoCreacionEmpresa` | Creación de empresa (equipo 2, hitos mini-chartán/sustentación). | `vialibre_core`/`match` | Cruza challenge (modalidad) y equipo. |

[Inferencia] **Regla de propietario**: cada servicio dueño de exactamente un esquema. Cualquier nueva entidad debe asignarse a un único esquema existente (auth/core/match) con justificación, evitando esquemas nuevos. Migraciones siempre aditivas. **No proponer FKs entre esquemas distintos** (mantener UUIDs cruzados).

## 6. Análisis preliminar de acceso y seguridad

[Hecho verificado] Hallazgos de acoplamiento/seguridad relevantes para el diagnóstico:

| Aspecto | Estado | Ubicación | Observación (hecho/inferencia) |
|---|---|---|---|
| `GET /api/v1/core/challenges/{id}` | **Público (sin auth)** | `challenges.py:204-220` | [Hecho verificado] Sin `Depends(get_current_user)`. Usado para verificar propiedad en match (lectura pública del challenge). Adecuado para feed público, pero expone detalles sin auth. |
| Llamada core→auth con token interno | **Correcto** | `_resolve_author` `challenges.py:29-53` | [Hecho verificado] Usa `service_headers` con method+path ligado. Fail-safe (devuelve `{}`). |
| match verifica propiedad vía core | **Correcto (pero sin token de servicio)** | `interactions.py:77-95, 208-226, 292-311` | [Hecho verificado] Llamadas `httpx.AsyncClient().get(f"{settings.core_service_url}/api/v1/core/challenges/{id}")` **sin `X-Service-Token`**. El endpoint core GET `{id}` es **público**, por lo que no requiere token interno. Esto es un **acoplamiento por lectura pública** (no falla por auth). Riesgo menor hoy; si el GET `{id}` pasara a requerir auth interno, estas llamadas romperían. `[Inferencia]` convendría evaluar exigir auth interno en endpoints cross-service críticos (futuro). |
| Reacciones count interno | **Autenticación débil para "interno"** | `reactions.py:111-129` | [Hecho verificado] Usa `Depends(get_current_user)` (cualquier usuario autenticado). Etiquetado como "internal" pero no usa `require_internal_service`/token interno. `[Inferencia]` nombre engañoso; funcionalidad actual requiere auth de usuario (no servicio). Revisar nomenclatura/alcance si se usará entre servicios. |
| Protección admin (frontend) | **Solo client-side** | `middleware.ts` (token), `useRoleGuard` (rol) | [Hecho verificado] Middleware no valida rol. `admin/dashboard` y `admin/anuncios` protegidos por guard client-side únicamente. **Backend no tiene endpoints admin para gestión real** hoy (dashboard mock). Requiere endurecer con RBAC server-side al implementar APIs admin. |
| CORS | `allow_origins=["*"]`, `allow_credentials=True` | `services/*/app/main.py:26-32` | [Hecho verificado] Configuración permisiva. En dev aceptable; producción requiere orígenes restringidos. `[Pendiente de verificar]` entorno destino. |
| Secrets | JWT secret por defecto | `.env` | [Hecho verificado] `JWT_SECRET_KEY=change-me-in-production-use-a-real-secret`. **No commitear secretos**; rotar en producción. |
| Nonce store memoria | Estado volátil | `auth-service/deps.py`, `service_auth.py` | [Hecho verificado] TTL en memoria, bounded growth, purge. Reinicio pierde estado → nonces previos válidos en ventana no se rechazan tras restart (comportamiento documentado). Único worker (no multi-proceso). Fail-closed. |
| Rate limiting/abuso | **No implementado** | — | `[Inferencia]` ausente (no crítico para diagnóstico). Considerar en Bloques posteriores si expone admin. |
| Logging de secretos | **Prohibido** | `service_auth.py`, código | [Hecho verificado] implementación no loguea secretos/tokens/firmas. |

**Recomendación preliminar (sin implementar):** al crear endpoints administrativos reales, aplicar **RBAC server-side estricto** (roles granulares), preferir auth interno para llamadas cross-service sensibles (no solo lectura pública), y mantener principio de mínimo privilegio. Futuro rol `gestion_practicas`/`proyeccion_social` **NO debe añadirse** en este Bloque 1.

## 7. Riesgos, dependencias y preguntas abiertas

### 7.1 Riesgos identificados
- [Inferencia] **Ambigüedad de modalidades (creación empresa/homologación)**: transcripción tiene términos ambiguos (`CAWA/CUA/DPS`, "Submarino", "Velilla/Belilla", "Sigul/Sihul", "mínimo de dos"). Requiere validación con normativa institucional antes de modelar. **Alto**.
- [Inferencia] **Enum mismatch shared vs servicios**: `shared/schemas.py` (inglés) vs locales (español). Genera confusión si se reutiliza shared para validación cross-service. **Medio** (documentado).
- [Hecho verificado] **Nginx cachea IPs upstream**: tras recrear servicios, puede cachear IP antigua → 404 globales. Solución: reiniciar nginx tras recrear servicios (documentado en gotchas). **Bajo/operativo**.
- [Inferencia] **Single worker + reload** (Docker CMD): adecuado para dev; producción requeriría workers múltiples, pero store de nonces en memoria no es compatible con multi-proceso. Decisión arquitectónica a considerar más adelante. **Medio**.
- [Hecho verificado] **Dashboard/admin mock/in-memory**: puede dar falsa impresión de funcionalidad completa si no se aclara. **Bajo** (diagnóstico lo identifica).
- [Inferencia] **EmailStr rechaza dominios `.local`** (gotcha) — afecta validaciones en entorno local si se usan correos `.local`. **Bajo**.

### 7.2 Dependencias entre servicios
- [Hecho verificado] core depende de auth (para enriquecer autores via `/users/{id}/resumen` con token interno).
- [Hecho verificado] match depende de core (verificar propiedad de challenge: GET `/challenges/{id}` — lectura pública; aprobar/contact verifican ownership).
- [Hecho verificado] match depende de auth (obtener contacto de contraparte con token interno; resumen/usuario).
- [Hecho verificado] Frontend depende de nginx/gateway; API base `/api`.
- [Hecho verificado] Sin FKs cross-schema → integridad referencial lógica (solo aplicación).

### 7.3 Preguntas abiertas (para clarificación antes/durante Bloque 2, sin responder ahora)
- `[Pendiente de verificar]` **Catálogo de modalidades**: valores exactos para "creación de empresa" y "homologación" (códigos, etiquetas). Fuente normativa vs transcripción.
- `[Pendiente de verificar]` **Términos ambiguos** (transcripción): confirmar CAWA/CUA/DPS, "Submarino", "Velilla/Belilla", "Sigul/Sihul", "mínimo de dos integrantes".
- `[Pendiente de verificar]` **Ámbito de "necesidades empresariales"**: ¿es formulario interno de captación (proyección social) o auto-reporte empresa? ¿quién lo aprueba?
- `[Pendiente de verificar]** Tutor docente**: ¿es usuario con rol específico, o entidad independiente? ¿requisitos de asignación por práctica?
- `[Pendiente de verificar]** Estados de revisión documental**: más allá de subido, ¿se requiere flujo revisión/aprobado/rechazado con revisor (tutor/coordinación)?
- `[Pendiente de verificar]** Reportes/KPIs**: qué indicadores obligatorios para informes administrativos (matriz de seguimiento). Campos mínimos de la matriz (10): año, tutor, programa, identificación, nombre, correo, celular, práctica desde 7°, bilingüe — confirmar obligatoriedad/tipología.
- `[Pendiente de verificar]** Propietario de nuevas entidades**: `Practica`, `Empresa`, `NecesidadEmpresarial` — asignación óptima entre auth/core/match respetando esquema único por servicio.

## 8. Fases propuestas (sin implementación)

> **Restricción:** No se implementa nada en Bloque 1. Las fases son propuestas para guiar Bloque 2, respetando: sin FKs cross-schema, migraciones aditivas, 1 esquema por servicio, rutas colección sin `/`, rol futuro no añadido aún.

| Fase | Objetivo (planificación) | Áreas involucradas | Skills sugeridas | Entregable de fase (planificación) |
|---|---|---|---|---|
| **Fase 2** | Modelo de datos y migraciones (aditivas). Identificar entidades (Empresa, Practica, TutorDocente, NecesidadEmpresarial, Visita, Evaluacion, ProcesoHomologacion, ProyectoCreacionEmpresa, DocumentoPlantilla). Definir enums/catalogos por modalidad. Asignar propietario por esquema con justificación. | database-design | `database-design` | Diagrama/plan de entidades (sin generar migraciones en Bloque 1), justificación de propietario, convenciones. |
| **Fase 3** | Backend administrativo + endpoints RBAC. Roles/permisos server-side (mínimo privilegio). Endpoints para gestión empresas/prácticas/necesidades/documentación/evaluación. Mantener endpoints existentes inalterados. | backend API, auth | `auth-rbac-security` + `codebase-audit` | Especificación de endpoints (paths, authz, scopes), matriz permisos (sin código). |
| **Fase 4** | Frontend administrativo. Reemplazar mocks de `/admin/dashboard` con datos reales (solo lectura/reportes), `/admin/anuncios` con persistencia, UI consistente (tablas/filtros/formularios/estados/accesibilidad). No romper rutas existentes. | Next.js frontend | `admin-dashboard` | Prototipo de vistas (wireframes lógicos), componentes reutilizables, estados. |
| **Fase 5** | Documentación automática DOCX. Integrar plantillas institucionales (carta presentación, aval, compromiso), preservar formato, generar DOCX editable, autosave/versionado/almacenamiento seguro. | documentos | `document-automation` | Mapeo de variables plantillas → datos, catálogo tipos, estrategia de versionado. |
| **Fase 6** | Modalidades específicas. Soporte Creación de Empresa (equipos 2, hitos) y Homologación (CAWA/CUA/DPS, ≥1 año), formulario Necesidades Empresariales, seguimiento estudiantes/tutores. | modelo+backend+frontend | `database-design` + `admin-dashboard` | Especificación reglas de negocio por modalidad (sin impl.). |
| **Fase 7** | Pruebas y calidad. Pruebas funcionales/integración/seguridad/regresión, verificar persistencia real, documentar resultados. Usar endpoints existentes para smoke tests. | QA | `testing-and-quality` | Plan de pruebas + criterios de aceptación detallados, casos de regresión. |

## 9. Criterios de aceptación preliminares (Bloque 1)

[Hecho verificado] Criterios cumplidos/esperados para este diagnóstico:

- [x] Único archivo creado: `docs/gestion-practicas/diagnostico-integracion.md` (carpeta creada; `docs/` no existía previamente).
- [x] Distingue hechos verificados / inferencias / pendientes de verificar (leyenda usada).
- [x] Incluye Resumen ejecutivo, Arquitectura, Matriz funcional (con necesidad/estado/evidencia/qué falta/skill/dependencias/riesgos/pruebas), Inventario reutilizable, Carencias/necesidades modelado, Análisis acceso/seguridad, Riesgos/deps/preguntas, Fases propuestas, Criterios aceptación, Archivos/evidencias inspeccionados.
- [x] Cita evidencias con `archivo:líneas` (core GET `{id}` `challenges.py:204-220`, reactions count `reactions.py:111-129`, llamadas match→core en `interactions.py:77-95,208-226,292-311`, API client métodos sin uso `api.ts:320,325,332`, admin mocks `app/admin/dashboard/page.tsx`, anuncios in-memory `AdvertisementContext`/`data/ads.ts`, middleware/guards, service_auth, enums, migraciones, etc.).
- [x] Indica servicio propietario aparente por entidad candidata + justificación.
- [x] Reitera: sin FKs cross-schema, 1 esquema por servicio, migraciones aditivas, rutas colección sin `/`, rol futuro `gestion_practicas`/`proyeccion_social` NO añadido.
- [x] Menciona seguimiento administrativo (estudiantes/tutores), control entrega/revisión/estado documentos, registro empresas, formulario necesidades empresariales, postulaciones, modalidades (ordinaria/creación empresa/homologación), gestión documental/cartas, evaluación prácticas/tutores, proyectos/retos, informes administrativos.
- [x] Separa claramente hechos vs inferencias vs pendientes (usado consistentemente).
- [ ] Al finalizar: informar ruta exacta, resumir hallazgos, confirmar cambios con `git status` y `git diff` (se hará tras escritura).

## 10. Archivos y evidencias inspeccionados

[Hecho verificado] Listado de archivos leídos/inspeccionados para este diagnóstico:

**Documentación y skills**
- `docs/gestion-practicas/diagnostico-integracion.md` (creado)
- `documents/transcripcion/transcripcion_unificada_analisis.md` (47928 bytes)
- `documents/FORMATO-CARTA-EMPRESA.docx`, `FORMATO-CARTA-COMPROMISO-PRACTICAS.docx`, `FORMATO-HOJA-de-VIDA-INSTITUCIONAL.docx`
- `.opencode/skills/{codebase-audit,auth-rbac-security,database-design,admin-dashboard,document-automation,testing-and-quality}/SKILL.md`
- `AGENTS.md`

**Shared**
- `shared/python/vialibre_common/service_auth.py`, `schemas.py`, `auth.py`, `pdf_generator.py`

**Auth-service**
- `app/config.py`, `app/main.py`, `app/database.py`, `app/api/deps.py`
- `app/api/v1/endpoints/auth.py`, `users.py`
- `app/schemas/auth.py`, `user.py`, `role.py`
- `app/models/user.py`, `role.py`, `__init__.py`
- `alembic/env.py`, `alembic/versions/c557863f0a93_sync_schema_phase1.py`

**Core-service**
- `app/config.py`, `app/main.py`, `app/database.py`, `app/api/deps.py`
- `app/api/v1/endpoints/challenges.py` (204-220 GET {id} verificado)
- `app/schemas/challenge.py`, `category.py`
- `app/models/challenge.py`, `category.py`, `__init__.py`
- `alembic/env.py`, `alembic/versions/d65f36209c5b_sync_schema_phase1.py`

**Match-service**
- `app/config.py`, `app/main.py`, `app/database.py`, `app/api/deps.py`
- `app/api/v1/endpoints/interactions.py` (77-95,208-226,292-311 llamadas core), `documents.py`, `reactions.py` (111-129 count)
- `app/schemas/match.py`
- `app/models/interaction.py`, `reaction.py`, `document.py`, `__init__.py`
- `alembic/env.py`, `alembic/versions/564cf3551867_sync_schema_phase1.py`

**Frontend**
- `frontend/src/lib/api.ts` (320,325,332 sin llamadores), `types/index.ts`
- `frontend/src/middleware.ts`, `hooks/useRoleGuard.ts`
- Páginas: `app/feed/[id]/page.tsx`, `app/mis-postulaciones/page.tsx`, `app/admin/dashboard/page.tsx`, `app/admin/anuncios/page.tsx`, `app/settings/page.tsx`, `app/talento/page.tsx`, `app/mis-problematicas/page.tsx`, `app/perfil/organizacion/page.tsx`
- Componentes: `components/ApplicantsSection.tsx`, `ContactSection.tsx`, `PracticeDocuments.tsx`, `AccessibilityPanel.tsx`, `Sidebar.tsx`
- Contexts: `contexts/AdvertisementContext.tsx`, `contexts/AuthContext.tsx`, `contexts/AccessibilityContext.tsx`
- Data: `data/mock.ts`, `data/ads.ts`, `data/modules.ts`
- Config: `next.config.js`, `package.json`

**Infra**
- `docker-compose.yml`, `Dockerfile` (cada servicio), `gateway/nginx.conf`, `Makefile`, `.env`, `.env.example`, `.gitignore`

**Scripts temporales (referencia)**: `C:\Users\llama\AppData\Local\Temp\opencode\svc_auth_tests.py`, `fase1_regression.ps1` (no incluidos en repo).

## 11. Conclusión del diagnóstico

[Inferencia] El repositorio presenta una base sólida y bien estructurada (microservicios con esquema propio, shared lib, auth inter-service endurecido con nonce+ventana ligada a método+path, fail-closed). El flujo núcleo (publicación-postulación-aprobación-contacto-documentación práctica) está **implementado y verificado**.

Las principales carencias para el módulo administrativo de prácticas empresariales son **institucionales/modelo de datos** (empresas centralizadas, tutores docentes, práctica como entidad de seguimiento, necesidades empresariales, evaluación/visitas, modalidades creación empresa/homologación) y **backend/admin real** (dashboard actual es mock). El frontend ya cuenta con patrones consistentes y accesibilidad.

**Hallazgos críticos a destacar (hechos):**
1. `core GET /challenges/{id}` es **público** (sin auth) — usado por match sin token de servicio (acoplamiento aceptable hoy).
2. `match/reactions/internal/count/{challenge_id}` usa `get_current_user` (no auth interno de servicio) — nomenclatura "internal" imprecisa.
3. Admin (dashboard/anuncios) **frontend-only/mock/in-memory** — sin persistencia ni APIs backend.
4. Métodos API frontend `getInteraction`, `createReaction`, `deleteReaction` **sin llamadores** (infra no usada).
5. Enums compartidos vs locales presentan **discrepancia inglés/español**.
6. Docker CMD **sin --workers** (1 worker) + store de nonces en memoria (volátil en restart).

**Recomendación:** proceder a **Bloque 2** con foco en `database-design` (entidades + asignación propietario por esquema, aditivo, sin FKs cross-schema) y `auth-rbac-security` + `admin-dashboard` + `document-automation` según fases propuestas, resolviendo preguntas abiertas (7.3) antes de modelar detalladamente las modalidades complejas (creación empresa/homologación).

**Ruta del entregable:** `C:\Users\llama\IdeaProjects\ViaLibre\docs\gestion-practicas\diagnostico-integracion.md`

**Resumen de hallazgos principales:** arquitectura verificada, núcleo implementado reutilizable, carencias concentradas en entidades administrativas/institucionales y APIs admin reales (vs mock), acoplamientos cross-service documentados y seguros con las restricciones actuales, requisitos funcionales mapeados con distinción clara hechos/inferencias/pendientes.
