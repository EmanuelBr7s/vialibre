# FASE 2: Diseño Arquitectónico - Informe Técnico

**Proyecto**: VíaLibre (plataforma de empleabilidad universitaria)  
**Rama**: `feature/funcionalidades-eric-jassir`  
**HEAD**: `8a6211bb89632bc96d1b0dfe073e4c8eaa0398b6`  
**Fecha**: 2026-10-18  
**Estado**: Solo diseño - Sin modificaciones a código/modelos/esquemas/endpoints/permisos/enums/migraciones/datos  
**Alcance**: EXCLUSIVAMENTE Fase 2 (Diseño Arquitectónico). No se implementan Fases 3-5.  
**Base**: PLAN.md (Fase 2), `.opencode/reports/FASE0_AUDITORIA.md`, `.opencode/reports/FASE1_ANALISIS_ALCANCE.md`, `docs/gestion-practicas/*`

---

## 1. Matriz de Trazabilidad (17 requerimientos funcionales)

Mapeo desde FASE1_ANALISIS_ALCANCE.md (sección 3): 17 reqs funcionales, con fuente, estado actual, servicio propietario propuesto, necesidad diseño, riesgo.

| ID | Requerimiento | Fuente original | Estado (F1) | Servicio afectado | Entidad propuesta | Cambio requerido | Depende de | Bloqueo/Observación |
|---|---|---|---|---|---|---|---|---|
| R01 | Portal empresas: retos/prácticas/ofertas (3 secciones) | transcripción_unificada_analisis.md; diagnostico | Resuelta (parcial) | `core-service` | `Challenge` (existente) | Validar filtro `tipo` (reto\|practica\|empleo). Revisar `modalidad` sin inventar valores. | Catálogo `modalidad` validado | Sin inventar catálogos. |
| R02 | Búsqueda/filtrado banco de talento (HV, skills) | transcripción; diagnostico | Parcial | `auth-service` + Frontend | `User` (existente) | Ampliar filtros UI/API. No añadir rol/catalogo. Usar campos existentes. | Ninguno | No duplica entidades. Preserva contratos existentes. |
| R03 | Postulaciones + estados + contacto desbloqueado | transcripción; diagnostico | Resuelta | `match-service` + `core-service` (lectura) | `Interaction` (existente) | Reforzar TOCTOU (approve/contact). Mantener ruta pública `GET /core/challenges/{id}` (sin token interno). Documentar patrón match→core actual. | Ninguno | Usar `with_for_update` + transacción única en approve/contact. |
| R04 | Modalidades: ordinaria, creación de empresa, homologación | transcripción (secciones específicas) | Pendiente (complejo) | `core-service` (Challenge.modalidad) | `Challenge` (existente campo) | **BLOQUEO INSTITUCIONAL**: valores exactos no confirmados (CAWA/CUA/DPS, hitos). No inventar enum. | Decisión institucional (D05) | No modelar hasta tener valores confirmados. |
| R05 | Cartas: aval, presentación, compromiso | transcripción; plantillas DOCX | Parcial | `match-service` + `shared` | `InteractionDocument` (existente) + generación DOCX | Extender `tipo` documentos. Usar `document-automation`. Salida **DOCX editable**. No sobrescribir plantillas. Versionado/metadata. | Plantillas existentes (3 DOCX) | Solo tipos existentes o validados. No inventar. |
| R06 | Accesibilidad (separación palabras, guía lectura) | transcripción/requerimientos UI | Resuelta | Frontend | N/A (existente) | Mantener `AccessibilityPanel`/`AccessibilityContext`. Sin backend. | Ninguno | Sin cambios backend. |
| R07 | Área administración/soporte universitario | transcripción; diagnostico | Pendiente (backend admin) | `auth/core/match` + Frontend | Entidades administrativas nuevas (ver R10–R16) + APIs admin reales | Reemplazar mocks con APIs **reales**. RBAC **server-side** estricto. **Separación acción admin explícita**. KPIs reales; si simulados → marcados. | Definiciones R10–R16 | No confiar solo middleware client-side. |
| R08 | Registro centralizado empresas, tutores, visitas, evaluación, requisitos | transcripción; diagnostico | Inexistente | `auth-service` (Empresa, TutorDocente propuesto) + `match-service` (Visita/Evaluacion) + `core-service` (NecesidadEmpresarial/ProyectoCreacionEmpresa) | `Empresa`, `TutorDocente`, `Visita`, `Evaluacion`, `Requisito` | Nuevas entidades. Distribución por dominio (ver sección 2). Sin FKs cross-service. Migraciones controladas con `include_name`. | Decisiones D01–D04 | Preservar históricos. Sin duplicación User. |
| R09 | Formulario necesidades empresariales (captación proactiva) | transcripción; diagnostico | Inexistente | `core-service` | `NecesidadEmpresarial` | Diferenciar de `Challenge`. Estado propio. Flujo aprobación → posible conversión (sin sobrescribir históricos). | D03 | No reutilizar `Challenge` para captación proactiva. |
| R10 | Seguimiento administrativo estudiantes/tutores (matriz con campos) | transcripción (matriz detallada) | Inexistente como entidad | `match-service` (propuesto) | `Practica` | Centralizar seguimiento: estudiante, challenge(práctica), empresa, tutor docente, año académico, programa, identificación/CI, bilingüe, práctica desde 7°, fechas. | D02, D01 | Cruza entidades cross-service (UUIDs desnudos). Sin FK. TOCTOU en asignación tutor/cambios estado. |
| R11 | Control entrega/revisión/estado documentos | transcripción; diagnostico | Parcial | `match-service` | `InteractionDocument` (ampliar) + `RevisionDocumento` (propuesto) | Ampliar tipos. Estados revisión/aprobado/rechazado. **Bitácora revisiones** (quién/cuándo/motivo). Solo revisor autorizado. Históricos preservados. | R05 | TOCTOU en aprobación/rechazo. No permitir editar tras aprobado sin justificación. |
| R12 | Evaluación prácticas/tutores, visitas | transcripción | Inexistente | `match-service` | `Evaluacion`, `Visita` | Asociadas a `Practica`. Responsables definidos. Estados. Rúbricas si aplican (sin inventar catalogo). | R10, D04 | Validar autorización por rol (tutor/admin). |
| R13 | Informes administrativos (KPIs reales) | transcripción; diagnostico | Parcial (mocks) | `auth/core/match` + Frontend | Agregados backend (solo lectura) | Endpoints agregados reales. **KPIs simulados marcados explícitamente** si quedan parciales. Dashboard reemplaza mocks con datos persistidos. | R07 | Nunca marcar KPI real como simulado. No usar COUNT-only para cambios de estado. |
| R14 | Modalidad Creación de Empresa (equipos 2, mini-chartán/sustentación) | transcripción | Inexistente | `core-service` (propuesto) | `ProyectoCreacionEmpresa`, `Equipo`, `IntegranteEquipo`, `HitoProyecto` | Reglas: **mínimo 2 integrantes**. Hitos mini-chartán/sustentación. Fechas/acta. | R04 (modalidad) + D04 | **BLOQUEO**: valores hitos/fases por confirmar. No inventar. |
| R15 | Homologación (experiencia ≥1 año, CAWA/CUA/DPS) | transcripción | Inexistente | `match-service` (propuesto) | `ProcesoHomologacion`, `DocumentoHomologacion` | Requiere validación experiencia ≥1 año. Documentación CAWA/CUA/DPS. Estados propios. | R04 + D04 | **BLOQUEO INSTITUCIONAL**: términos CAWA/CUA/DPS ambiguos. No inventar. |
| R16 | Reacciones (like/bookmark) | código existente | Resuelta backend, no usada UI | `match-service` | `Reaction` (existente) | Infra existente. **No habilitar UI** sin justificación. Mantener sin cambios. | Ninguno | No requiere diseño nuevo. |
| R17 | Gestión tutores/docentes centralizada | transcripción; diagnostico | Parcial (modelo presente) | `auth-service` | `TutorDocente` (existente modelo) | CRUD admin-only. Vinculación a `Practica` vía UUID tutor_id (cross-service ref lógica). Confirmar unicidad (identificación/email). | D02 | Reutilizar modelo existente antes crear nuevo. Verificar uso real. |

**Total trazabilidad**: 17/17 requerimientos mapeados. 3 con bloqueo institucional (R04, R14, R15). R07 depende de R08–R16.

---

## 2. Diseño por Servicio + Límites de Responsabilidad

Cada servicio mantiene **un único schema** PostgreSQL. Sin acceso cruzado a schemas ajenos. Comunicación HTTP vía `httpx` con URLs settings. Referencias cross-service = **UUIDs desnudos, sin FK**.

### 2.1 `auth-service` (`vialibre_auth`)
**Responsabilidad**: identidad, autenticación, autorización (RBAC base), personas/organizaciones institucionales.

**Límites**:
- Propietario exclusivo schema `vialibre_auth`.
- Gestiona `User`, `Role`, `TutorDocente`, `Empresa` (propuesto - ver D01).
- No gestiona ciclo vida práctica/postulaciones/evaluaciones (match).
- No gestiona ofertas/retos (core).
- Validación service-tokens entrantes: `require_internal_service` (auth valida `X-Service-Token`).

**Entidades diseño**:
- `User` (existente): preservar campos. **No reutilizar `UserUpdate`** para nuevos flujos; crear schemas específicos.
- `Role` (existente): roles fijos. No añadir rol nuevo sin justificación (mantener ADMIN).
- `TutorDocente` (existente modelo) → CRUD admin-only. Campos: identificación, nombres/apellidos, email, teléfono, programa, estado (activo/inactivo), notas. Unicidad email/identificación.
- `Empresa` (propuesto - **D01**) → CRUD admin/publicador autorizado. NIT único, razón social, contacto, estado. Vinculada a usuarios publicadores por referencia lógica (no FK). Historial preservado.

**Rutas colección**: `@router.post("")`, `@router.get("")` (sin slash).  
**Enums**: usar locales/valores existentes. **No inventar catálogos**.

### 2.2 `core-service` (`vialibre_core`)
**Responsabilidad**: dominio negocio/ofertas (retos, prácticas, empleos), categorías, necesidades empresariales, modalidades relacionadas con proyecto creación empresa.

**Límites**:
- Propietario schema `vialibre_core`.
- Gestiona `Challenge`, `Category`, `Empresa`? (no - ver D01: empresa en auth). `NecesidadEmpresarial` (D03). `ProyectoCreacionEmpresa`, `Equipo`, `IntegranteEquipo`, `HitoProyecto` (R14, D04).
- Lectura pública `GET /challenges/{id}` usada por `match-service` (patrón actual). **Sin requerimiento activo de `X-Service-Token`** hoy (documentado).
- No gestiona postulaciones, documentos práctica, evaluaciones, visitas, homologación (match).

**Entidades diseño**:
- `Challenge` (existente): `tipo` (reto|practica|empleo) existente. `modalidad` existe (campo). **No definir valores** hasta decisión institucional (R04). `status` **local core**: `abierto/en_progreso/cerrado` (nunca usar shared inglés).
- `Category` (existente): reutilizar.
- `NecesidadEmpresarial` (nuevo): estado propio (distinto Challenge), origen, responsable, aprobación. No visible como oferta hasta aprobado. Historial preservado.
- `ProyectoCreacionEmpresa` (nuevo, R14): ligado a Challenge con modalidad creación empresa (cuando definida). Equipos ≥2 integrantes. Hitos. Fechas/acta.

**Enums locales**: `ChallengeStatus` español core. **Nunca editar `shared/python/vialibre_common/schemas.py`**.

### 2.3 `match-service` (`vialibre_match`)
**Responsabilidad**: ciclo vida postulación+práctica, documentos, evaluación, seguimiento, homologación.

**Límites**:
- Propietario schema `vialibre_match`.
- Gestiona `Interaction`, `Reaction`, `InteractionDocument`, `Practica` (R10, D02), `Visita`, `Evaluacion` (R12, D04), `RevisionDocumento` (R11), `ProcesoHomologacion`, `DocumentoHomologacion` (R15, D04).
- Cross-service: llama `auth-service` con `X-Service-Token` (patrón existente `service_headers()` para `/users/{id}/resumen`). Llama `core-service` GET `/challenges/{id}` **sin token** (patrón actual documentado).
- **Endpoint interno** `/internal/count/{challenge_id}`: revisar semántica JWT vs `X-Service-Token` (hallazgo F0) - ver sección 4.5.

**Entidades diseño**:
- `Interaction` (existente): reforzar TOCTOU en approve/contact. `status` **local match**: `pendiente/aprobado/rechazado`.
- `Practica` (nuevo, D02): seguimiento administrativo completo. Referencias cruzadas UUID: `solucionador_id` (auth), `challenge_id` (core), `empresa_id` (auth si D01), `tutor_id` (auth). **Sin FKs**. Campos matriz seguimiento. Unicidad definida por regla negocio (evitar duplicados) con validación + posible índice único lógico.
- `Visita`, `Evaluacion` (nuevos): asociados a `Practica`. Solo actores autorizados.
- `RevisionDocumento` (nuevo): bitácora revisión (quién/cuándo/motivo/estado anterior→nuevo). Historial inmutable (no sobrescribir).
- `ProcesoHomologacion` (nuevo, bloqueado): requiere validación términos institucionales.
- `Reaction` (existente): sin cambios UI.

**Enums locales**: `InteractionStatus` español match.

### 2.4 `frontend` (Next.js 14 App Router)
**Responsabilidad**: UI consistente con existente. Reemplazar mocks admin con llamadas API reales. Preservar middleware auth, cookie JWT, `lib/api.ts`.

**Diseño**:
- Mantener `@/*` path alias, App Router.
- `middleware.ts`: protección rutas (`PROTECTED_PATHS`, `AUTH_PATHS`). **Complementar con RBAC server-side** (no sustituir). Server-side enforcement obligatorio en APIs.
- `lib/api.ts`: añadir métodos admin reales. No eliminar métodos existentes sin análisis (p.ej. reacciones si no usados).
- Admin UI: reutilizar `AdminLayout`, componentes admin existentes. Mostrar **KPIs simulados marcados explícitamente** si cualquier KPI queda simulado tras implementación. Nunca ocultar marca.
- Accesibilidad: mantener existente.
- Rutas colección consumo API: seguir convenciones backend (sin slash). Cliente usa URLs relativas via `/api` (rewrites nginx).

### 2.5 `shared/python/vialibre_common/`
**Límites**:
- `schemas.py`: **Enums inglés compartidos** - solo referencia. **Nunca modificar** para semántica local.
- `service_auth.py`: token interno v1 (HMAC). `ALLOWED_SERVICES = {"core-service","match-service"}`. NonceStore **in-memory** (thread-safe) - válido con único worker Docker. Multi-réplica requeriría store compartido (Redis) - limitación conocida documentada.
- `auth.py`: verificación JWT.
- `pdf.py`: base generación PDF. Para DOCX usar lógica `document-automation` (no duplicar en shared sin necesidad).
- Bind-mounted: cambios requieren reiniciar servicio. `requirements*.txt` → `make build`.

---

## 3. Contratos/Flujos entre Servicios

### 3.1 Cross-service sin FK
- Referencias: `author_id`, `solucionador_id`, `challenge_id`, `empresa_id`, `tutor_id` son **UUIDs desnudos**.
- Integridad lógica vía validación HTTP + reglas negocio. Sin constraints FK entre schemas.
- Unicidad/consistencia gestionadas por servicio propietario + validaciones.

### 3.2 Patrones HTTP existentes (documentados)
- **match→auth**: `GET /api/v1/auth/users/{user_id}/resumen` con **`X-Service-Token`** vía `service_headers()` (método+path+nonce+ts). Patrón verificado F0.
- **match→core**: `GET /api/v1/core/challenges/{id}` **sin `X-Service-Token`** (lectura pública). **Patrón actual documentado**. Mantener por ahora (endpoint público). Si core protege con auth interno futuro, actualizar llamadas match. Ver sección 4.5.
- **core→auth/match**: no identificado uso activo. Si necesario futuro, seguir mismo patrón con service_headers.
- URLs desde settings: `auth_service_url`, `core_service_url`, `match_service_url`.
- Timeout/retry razonables (usar httpx existente). Manejo errores (404/403/422) sin filtrar información sensible.

### 3.3 Flujos críticos

**A. Postulación + aprobación (TOCTOU)**
1. Solucionador aplica → `match.interactions` POST. Verificar challenge existe vía core (lectura). Unique (solucionador_id, challenge_id). 
2. Publicador/Admin aprueba → `PATCH /interactions/{id}/approve`. **Transacción única** + `with_for_update()` sobre fila `Interaction` (PK). Validar `status == 'pendiente'`. Cambiar a `aprobado'`. Commit/rollback. 
3. Contacto desbloqueado → `GET /interactions/{id}/contact`. Si requiere escritura (`contact_unlocked=True`), usar misma protección TOCTOU.

**B. Seguimiento práctica (nuevo)**
1. Crear `Practica` tras aprobación? o por flujo admin. Referencias UUID cross-service. Validar existencia lógica (solucionador/challenge/empresa/tutor) sin FK.
2. Asignación tutor → **TOCTOU**: `SELECT ... FOR UPDATE` fila `Practica` por PK. Validar estado permisible. Asignar `tutor_id`. Transacción única.
3. Visitas/evaluaciones → asociadas a `Practica`. Autorización tutor/admin.

**C. Revisión documentos (nuevo)**
1. Revisor autorizado cambia estado → bitácora `RevisionDocumento` (insert inmutable). Fila `InteractionDocument` bloqueada con `with_for_update()`. Transacción única. Rechazo requiere `motivo`. Prevenir edición tras `aprobado`.

**D. Admin backend real (R07)**
1. Endpoints bajo prefijo admin con **separación explícita** (rutas `/admin/*` o agrupadas con dependencia `require_role('ADMIN')`). 
2. RBAC **server-side** obligatorio. Probar accesos no autorizados (rechazados).
3. Agregados SQL eficientes (evitar N+1). KPIs reales desde datos persistidos. Si simulados → marcados explícitamente.

---

## 4. Decisiones Técnicas Adoptadas + Justificación

### 4.1 Propietario entidades nuevas (D01–D04)
| Decisión | Propuesto | Justificación | Alternativa rechazada |
|---|---|---|---|
| **D01 Empresa** | `auth-service` (`vialibre_auth.Empresa`) | Organización/identidad institucional. `TutorDocente` ya existe en auth. Usuario publicador representa empresa. Evita duplicar identidad en core. Mantiene ownership coherente con personas. | Core-service (ligado solo a publicaciones) → mezcla identidad con negocio. |
| **D02 Practica (seguimiento)** | `match-service` (`vialibre_match.Practica`) | Dominio ciclo vida postulación+seguimiento+documentación+evaluación. Cruza referencias UUID. Coherente con `Interaction`, `InteractionDocument`. Challenge vive en core (referenciado). | Core-service → core se vuelve dueño de seguimiento/evaluativo (fuera de su límite ofertas). |
| **D03 NecesidadEmpresarial** | `core-service` (`vialibre_core.NecesidadEmpresarial`) | Captación proactiva cercana a dominio ofertas/publicaciones. Diferente flujo de Challenge pero mismo dominio negocio. Mantiene core como catálogo/ofertas. | Auth → no es identidad. Match → no es seguimiento postulación. |
| **D04 Visita/Evaluacion/Homologacion/ProyectoCreacionEmpresa** | `match-service`: `Visita`, `Evaluacion`, `ProcesoHomologacion`, `DocumentoHomologacion`. `core-service`: `ProyectoCreacionEmpresa`, `Equipo`, `IntegranteEquipo`, `HitoProyecto` | Visita/Evaluacion/Homologación → seguimiento/evaluativo del ciclo práctica (match). ProyectoCreacionEmpresa → ligado a modalidad Challenge (core) y reglas proyecto/equipos/hitos (dominio oferta/modalidad). | Centralizar todo match → rompe separación ofertas vs seguimiento. |

**Condición**: sin FKs cross-service. Migraciones por servicio propietario.

### 4.2 TOCTOU + Transacción Única (obligatorio)
- **Patrón**: `db.begin()` (transacción única) → `select(...).with_for_update()` sobre filas a modificar → validar estado/reglas → actualizar → commit. Rollback en error.
- **Aplicar donde riesgo**: aprobar interacción, desbloquear contacto con escritura, asignación tutor práctica, cambio estado práctica/documento/revisión, cambio estado Challenge (core), creación con validaciones únicas sensibles, aprobación/rechazo revisión.
- **No aceptar solo COUNT**: nunca usar `SELECT COUNT(*)` para decidir cambio estado/permitir creación si hay límite/cupo. Bloquear fila(s) que definen regla (o entidad objetivo) con `with_for_update()`.
- **Orden bloqueos**: bloquear PK fila objetivo primero. Si múltiples filas, definir orden estable (p.ej. por id asc) para evitar deadlocks. Evitar bloquear tablas completas.
- **Idempotencia**: operaciones deben ser seguras ante reintento (comprobar estado actual tras bloqueo).

### 4.3 Esquemas/Pydantic - No reutilizar UserUpdate
- Crear **schemas específicos por contexto** (Create/Update/List/Response) para cada entidad nueva.
- No reutilizar `UserUpdate` genérico. Mantener contratos existentes sin romper.
- Validaciones estrictas. Campos opcionales claros.

### 4.4 Rutas colección sin slash
- Convención: `@router.get("")`, `@router.post("")`, `@router.patch("")`, `@router.delete("")` (sin `/` final).
- **Documentar `redirect_slashes` auth-service**: F0 detectó `auth-service/main.py` **NO tiene `redirect_slashes=False`**; `core/match` SÍ lo tienen. Esto puede generar comportamiento distinto con rutas colección. **No modificar ahora** (solo diseño). En F3, al tocar routers auth, evaluar añadir `redirect_slashes=False` para consistencia. Validar globalmente (F4.8).

### 4.5 Cross-service: internal/count + match→core
- **`/reactions/internal/count/{challenge_id}` (match-service)**: actualmente protegido con `get_current_user` (JWT) aunque nombrado "internal". **Revisar semántica**:
  - Si **solo usado por app autenticada** → mantener JWT pero documentar nomenclatura imprecisa (no es "internal service-to-service").
  - Si **llamado entre servicios** → migrar a `require_internal_service` (validación `X-Service-Token`) con `service_headers()`.
- **match→core sin `X-Service-Token`**: `GET /core/challenges/{id}` es lectura pública hoy. **Patrón actual documentado**. Mantener. Si core protege endpoint con auth interno futuro, actualizar todas las llamadas match para enviar token.
- **auth-service valida service-tokens**: `require_internal_service` verifica `X-Service-Token` (nonce+ts+method+path). `ALLOWED_SERVICES={"core-service","match-service"}`. NonceStore in-memory - limitación conocida.

### 4.6 Alembic + migraciones controladas
- **Autogenerado + gitignored (histórico)**: versiones existentes conservadas (auth: c557863f0a93, c03d3b230309; core: d65f36209c5b, 2c162f6e07ea; match: 564cf3551867, 6ea52de2cf05). **No eliminar**.
- **`include_name` obligatorio**: cada `alembic/env.py` restringe a su `schema_name`. Verificado F0.
- **Importar modelos**: al añadir modelo nuevo, importar en `models/__init__.py` **y** considerar `alembic/env.py` (restricción por schema) para que autogenerate lo detecte.
- **Version tables**: `alembic_version_auth/_core/_match`.
- Ejecutar `make migrate-<svc>` tras validación modelos (F3). Revisar revisión autogenerada antes aplicar upgrade.

### 4.7 Seeds + datos históricos + compatibilidad
- Seeds idempotentes con **UUIDs fijos sincronizados** entre auth/core/match. Mantener al tocar seeds.
- **Conservar históricos**: nunca borrar/sobrescribir datos históricos sin justificación explícita trazable. Si soft-delete aplica, añadir flag (p.ej. `deleted_at`, `is_active`) con auditoría.
- **Backward compatibility**: preservar contratos API existentes. No romper rutas/endpoints públicos. Campos nuevos opcionales donde aplique.
- **No inventar catálogos**: usar solo existentes. Valores modalidad/homologación/creación empresa **no definidos** → bloqueo (sección 5).

### 4.8 Seguridad (RBAC mínimo privilegio)
- **Separación acción admin explícita**: rutas/endpoints/admin con `require_role('ADMIN')`. No exponer lógica admin vía endpoints operativos.
- **Server-side enforcement**: complementar middleware frontend (solo presencia token). Probar **accesos no autorizados rechazados** (obligatorio F4.4).
- **Least privilege**: permisos mínimos por rol.
- **Internal endpoints**: aclarar semántica JWT vs service-token (4.5). No confiar en nombre "internal".
- **CORS**: abierto en dev (verificado). Producción requiere restricción - documentar.

### 4.9 KPIs simulados marcados
- Dashboard admin actual usa mocks (`ADMIN_KPIS` en `frontend/src/data/mock.ts`). Al implementar backend real:
  - Endpoints agregados reales desde datos persistidos.
  - **Si algún KPI permanece simulado** (mock/estimado/no derivado directo persistencia) → **marcar explícitamente** en UI (badge "Simulado"/tooltip) y en respuestas API si visibles al usuario/reportes.
  - Nunca marcar KPI derivado de datos reales como simulado.

### 4.10 Documentación (document-automation)
- Usar plantillas DOCX existentes: `FORMATO-CARTA-EMPRESA.docx`, `FORMATO-CARTA-COMPROMISO-PRACTICAS.docx`, `FORMATO-HOJA-de-VIDA-INSTITUCIONAL.docx`.
- **Salida editable DOCX** (preservar formato). No generar solo PDF si se requiere editable.
- Mapear variables desde entidades (User, Practica, Empresa, Challenge, Interaction). Datos faltantes → validación clara.
- Versionado: guardar metadatos (plantilla usada, versión, generado por, fecha). **No sobrescribir plantillas originales**.
- Almacenamiento en `match-service` (dominio documentos práctica). Preservar históricos.

---

## 5. Decisiones Institucionales Pendientes + Funcionalidades Bloqueadas

### 5.1 Bloqueos institucionales (críticos)
| Bloqueo | Impacto | Req | Acción requerida | Plazo/estado |
|---|---|---|---|---|
| **Modalidades valores exactos**: ordinaria/creación empresa/homologación + subvalores | **Alto** | R04 | Confirmar valores exactos `Challenge.modalidad`. Definir si necesita enum DB/local. **No inventar**. | **PENDIENTE - BLOQUEANTE** para modelar core.Challenge.modalidad cerrada. |
| **Términos homologación**: CAWA/CUA/DPS (qué significan, cuáles obligatorios) | **Alto** | R15 | Validación normativa/institucional. ¿Requisitos documentación exactos por cada caso? | **PENDIENTE - BLOQUEANTE** para `ProcesoHomologacion`. |
| **Creación Empresa**: equipo mínimo 2, hitos (mini-chartán/sustentación), fases/acta | **Alto** | R14 | Confirmar hitos, responsables, fechas obligatorias, validaciones. | **PENDIENTE - BLOQUEANTE** para entidades proyecto/equipos/hitos. |

### 5.2 Decisiones arquitectónicas pendientes (aprobación antes F3)
| Decisión | Contexto | Recomendación adoptada (diseño) | Estado |
|---|---|---|---|
| **D01 Empresa propietario** | auth vs core | **auth-service** (vialibre_auth.Empresa). Coherente con TutorDocente existente. | **PROPUESTO** (requiere aprobación) |
| **D02 Practica propietario** | match vs core | **match-service** (vialibre_match.Practica). Dominio seguimiento/evaluativo. | **PROPUESTO** |
| **D03 NecesidadEmpresarial** | core vs auth/match | **core-service**. Cercano a ofertas/captación. Diferenciar Challenge. | **PROPUESTO** |
| **D04 Distribución seguimiento/modalidad** | match/core split | match: Visita/Evaluacion/ProcesoHomologacion/DocumentoHomologacion. core: ProyectoCreacionEmpresa/Equipo/IntegranteEquipo/HitoProyecto. | **PROPUESTO** |
| **Semántica `/internal/count`** | JWT vs X-Service-Token | Investigar llamadores. Si solo app autenticada → mantener JWT + documentar nomenclatura imprecisa. Si cross-service → migrar a `require_internal_service`. | **PENDIENTE INVESTIGACIÓN** |
| **match→core token** | Consistencia vs innecesario (público) | **Mantener sin token** (patrón actual). Documentar. Si core protege GET `{id}` con auth interno futuro → actualizar match. | **PROPUESTO MANTENER** |
| **Admin rol nuevo?** | `gestion_practicas`/`proyeccion_social` vs ADMIN | **No añadir rol** sin justificación. Usar `ADMIN` manteniendo **mínimo privilegio**. Roles granulares tras aprobación. | **PROPUESTO** |

### 5.3 Funcionalidades bloqueadas (no modelar enums cerrados)
- **R04 modalidades**: no crear enum `Modalidad` con valores fijos hasta confirmación institucional.
- **R14 creación empresa**: no fijar catálogo hitos/fases.
- **R15 homologación**: no fijar catálogo documentos/estados internos hasta clarificar CAWA/CUA/DPS.
- **R11 ampliación tipos documentos**: solo ampliar con tipos **existentes** en plantillas o validados. No inventar.

**Estrategia**: modelar con `String` + validación (constraints/check o validación API) o tabla paramétrica si aprobada, **pero sin inventar valores hardcodeados**. Documentar omisión si faltan.

---

## 6. Diseño Transaccional + Estrategia Pruebas Concurrencia

### 6.1 Mapa operaciones con riesgo TOCTOU
| Operación | Servicio | Entidad/fila | Acción | Protección | Orden | Resultado esperado |
|---|---|---|---|---|---|---|
| **Aprobar interacción** `PATCH /interactions/{id}/approve` | match | `interactions` PK `id` | UPDATE status `pendiente→aprobado` | `with_for_update()` + **transacción única** | PK asc | Solo 1 aprobación exitosa. Otros 409/400 (no pendiente). |
| **Desbloquear contacto** `GET /interactions/{id}/contact` (si escribe flags) | match | `interactions` PK `id` | UPDATE flags (`contact_unlocked`, `contact_unlocked_at`) | `with_for_update()` + transacción única (si escritura) | PK | Idempotente. Sin doble escritura. |
| **Aplicar a challenge** `POST /interactions/apply` | match | `interactions` (unique solucionador_id+challenge_id). Challenge validado via core. | INSERT | Transacción única. Si añade reglas cupo/límite → **bloquear entidad que define límite** con `with_for_update()` (no solo COUNT). | PK objetivo + entidad límite | DB unique previene duplicado. Respuesta coherente (no 500). |
| **Asignar tutor práctica** | match | `practicas` PK `id` | UPDATE `tutor_id`, auditoría | `with_for_update()` + transacción única | PK | Solo asignación válida desde estado actual. Prevenir doble asignación conflicto. |
| **Cambio estado práctica** | match | `practicas` PK `id` | UPDATE status | `with_for_update()` + transacción única | PK | Transición válida según máquina estados. |
| **Aprobación/rechazo revisión documento** | match | `revision_documento` (insert bitácora) + `interaction_documents` (update estado) | INSERT + UPDATE | **Misma transacción única**. `with_for_update()` en fila documento. | Documento PK primero | Solo 1 revisor cambia estado. Rechazo requiere motivo. |
| **Cambio estado Challenge** (PATCH core) | core | `challenges` PK `id` | UPDATE status | `with_for_update()` + transacción única | PK | Transición válida. |
| **Crear Practica con unicidad** | match | `practicas` + validaciones | INSERT | Transacción única. Si unicidad lógica (estudiante+challenge activa) → bloquear filas relevantes con `with_for_update()`. | Definir orden estable | Solo 1 creación. |

**Regla inquebrantable**: **Si solo COUNT → rechazar** cambios de estado.

### 6.2 Orden bloqueos para evitar deadlocks
- Bloquear **PK de fila objetivo** primero (menor granularidad, estable).
- Si múltiples filas distintas: ordenar por `id` ascendente.
- Evitar bloquear tablas completas.
- No bloquear filas remotas (cross-service) - solo validación HTTP.
- Mantener transacciones **cortas** (validar+actualizar+commit).

### 6.3 Estrategia pruebas concurrencia (F4.5)
**Objetivo**: verificar que `with_for_update()` + transacción única previenen race conditions.

**Método**:
- Ejecutar 2–8 tareas concurrentes (`asyncio.gather`) sobre **mismo recurso/id**.
- Escenarios:
  1. **Approve doble**: 2 llamadas `PATCH /interactions/{id}/approve` simultáneas → **1 éxito (200)**, **1 fallo** (409/400 con mensaje coherente).
  2. **Asignar tutor doble**: 2 asignaciones distintas tutor mismo práctica → **1 éxito**, **1 fallo** según regla.
  3. **Revisión documento doble**: 2 revisores aprueban/rechazan simultáneo → **1 éxito**.
  4. **Apply doble**: 2 applies mismo (solucionador, challenge) → 1 inserta, otro falla (unique/validación). Sin 500.
- **Verificaciones**:
  - HTTP codes correctos
  - Estado DB final **correcto y único**
  - Sin duplicados
  - Transacciones commiteadas/rollbackeadas apropiadamente
  - Logs/errores sin leak info sensible
- **Documentar**: casos, entradas, salidas, estado DB antes/después, códigos HTTP, timing (resultados **reales**, no teóricos). Ver `testing-and-quality`.

### 6.4 Pruebas funcionales/integración/seguridad
- **Funcional**: CRUD entidades nuevas, flujos felices + borde.
- **Integración cross-service**: match→auth con token, match→core lectura pública. Referencias UUID válidas.
- **Seguridad/autorización (obligatorio)**: accesos no autorizados **rechazados**. Admin-only vs no-admin vs rol insuficiente. Sin token, token inválido, token otro rol.
- **Persistencia real**: consultar tablas/schemas tras operación (4.6).
- **Regresión**: contratos existentes, permisos, rutas colección sin slash (4.8).
- **Migraciones**: `alembic upgrade head` OK, `include_name` respetado, no toca otros schemas (4.9).
- **Rutas colección**: validar sin slash (evitar 308↔307 vía proxy nginx/Next.js). Incluir verificación `redirect_slashes` auth-service.
- **KPIs marcados**: verificar si simulados marcados explícitamente donde visibles (4.13).

---

## 7. Matriz Permisos + Controles Seguridad

### 7.1 Roles base (existentes)
Roles desde `roles` table + `TALENT_ROLES={solucionador,egresado}`. Mantener sin añadir rol nuevo por ahora (D06).

| Rol | Alcance típico | Observación |
|---|---|---|
| `ADMIN` | Gestión completa admin (empresas, tutores, prácticas, necesidades, revisión, informes). | **Acciones admin separadas explícitas**. Server-side enforcement. |
| `PUBLICADOR` | Publicar retos/prácticas/ofertas, gestionar postulantes propios, ver talento. | Gestión empresas propias según scope (definir). |
| `SOLUCIONADOR` | Postular, gestionar postulaciones propias, documentos propios. | TALENT role. |
| `EGRESADO` | Similar solucionador (talento). | TALENT role. |

### 7.2 Matriz permisos por endpoint/acción
| Funcionalidad | Endpoint (propuesto) | Método | Auth | Roles permitidos | Notas seguridad |
|---|---|---|---|---|---|
| **Admin empresas** | `/api/v1/auth/admin/empresas*` o `/empresas` con guard admin | CRUD | JWT + `require_role('ADMIN')` | **ADMIN** | Separación explícita. |
| **TutorDocente CRUD** | `/api/v1/auth/tutores-docentes` (admin-only) | CRUD | JWT + ADMIN | **ADMIN** | Ya existe modelo. Mantener admin-only. |
| **NecesidadEmpresarial** | `/api/v1/core/necesidades*` | CRUD+aprobar | JWT + rol autorizado | **ADMIN** (+ PUBLICADOR según flujo) | Definir scope aprobación. Admin-only para aprobar. |
| **Practica seguimiento** | `/api/v1/match/practicas*` | CRUD+asignar tutor+cambio estado | JWT | **ADMIN**, **TUTOR** (si definido futuro) | Asignación tutor → TOCTOU. Solo revisor/tutor/admin autorizados. |
| **Revisión documentos** | `/api/v1/match/documentos/{id}/revision` | POST | JWT + ADMIN/TUTOR | **ADMIN** o **TUTOR asignado** | Validar revisor autorizado. Bitácora inmutable. |
| **Visitas/Evaluaciones** | `/api/v1/match/visitas*`, `/api/v1/match/evaluaciones*` | CRUD | JWT | **ADMIN**, **TUTOR asignado** | Autorización por actor + práctica. |
| **Homologación** (bloqueado) | `/api/v1/match/homologacion*` | CRUD | JWT | **ADMIN** | Solo admin hasta definir flujos. |
| **ProyectoCreacionEmpresa** | `/api/v1/core/proyectos-creacion*` | CRUD | JWT | **ADMIN** | Gestion admin/modalidad. |
| **Admin KPIs** | `/api/v1/*/admin/kpis` (agregados) | GET | JWT + ADMIN | **ADMIN** | Solo lectura. Datos agregados. |
| **Internal count reactions** | `/api/v1/match/internal/count/{id}` | GET | **Revisar**: JWT actual vs `require_internal_service` | Depende semántica (4.5) | Si cross-service → exigir `X-Service-Token`. Si app-only → JWT pero renombrar/documentar. |
| **Cross-service auth resumen** | `/api/v1/auth/users/{id}/resumen` | GET | `X-Service-Token` (service) | Servicios permitidos (`core/match`) | Ya protegido con `require_internal_service`. |

### 7.3 Controles seguridad
- **RBAC server-side**: todas acciones sensibles exigen `require_role`/authZ. **No depender solo middleware frontend**.
- **Least privilege**: mínimo acceso necesario.
- **Separación admin**: rutas agrupadas explícitamente. Pruebas no autorizados obligatorias.
- **Service-token**: fail-closed. Validación method+path+nonce+timestamp. Ventana 60s, skew 10s. Formato v1.b64url.hmac.
- **NonceStore in-memory**: thread-safe, TTL con purge. Limitación multi-réplica documentada.
- **JWT**: verificado vía `shared/vialibre_common.auth.verify_token`. Cookie httpOnly/secure según entorno (preservar existente).
- **TOCTOU**: prevenir race conditions (sección 6).
- **Historial inmutable**: bitácora revisiones (`RevisionDocumento`) sin sobrescribir.
- **Validación entrada**: Pydantic schemas específicos. No confiar en cliente.
- **CORS**: dev abierto. Producción restringir orígenes.
- **No exponer datos sensibles**: endpoints resumen limitados. Documentos almacenados con control acceso.

### 7.4 Verificación seguridad obligatoria (F4.4)
- Sin token → 401
- Token inválido/expirado → 401
- Rol insuficiente (no admin) → 403
- Ruta admin con rol no-admin → 403
- Acceso cross-service con token inválido → 403 (service-token)
- Intento acceso otro usuario a datos privados sin permiso → 403
- Todos casos documentados con HTTP codes + evidencia.

---

## 8. Estrategia Migraciones, Datos Históricos, Compatibilidad

### 8.1 Migraciones Alembic
- **Controladas**: autogeneradas por Alembic. **Revisar** revisión generada antes `upgrade head`.
- **Por esquema**: `include_name` filtra por `schema_name` (auth/core/match). Version tables separadas.
- **Modelos importados**: añadir nuevos modelos a `models/__init__.py` de cada servicio propietario.
- **Versiones existentes conservar**: 6 revisiones listadas en F0 - **NO eliminar**.
- **Orden**: migrar por servicio tras validación modelos. `make migrate-<svc>` con MSG descriptivo.
- **Git**: revisiones autogeneradas gitignored históricamente; ahora algunas commiteadas (estado mixto F0). No modificar .gitignore para forzar comportamiento - respetar estado actual.
- **Verificación**: `alembic upgrade head` OK, `include_name` correcto (no toca otros schemas), tablas version correctas (F4.9).

### 8.2 Nuevas tablas por servicio (propuesto)
| Servicio | Tablas propuestas | Notas |
|---|---|---|
| **auth** (`vialibre_auth`) | `empresas` (nuevo), `tutores_docentes` (revisar existencia real) | Añadir índices únicos (NIT, email, identificación). |
| **core** (`vialibre_core`) | `necesidades_empresariales` (nuevo), `proyectos_creacion_empresa`, `equipos`, `integrantes_equipo`, `hitos_proyecto` (nuevos, si R14 aprobado) | Estados propios. Índices por challenge_id si aplica. |
| **match** (`vialibre_match`) | `practicas` (nuevo), `visitas` (nuevo), `evaluaciones` (nuevo), `revision_documento` (nuevo), `procesos_homologacion`, `documentos_homologacion` (nuevos, si R15 aprobado) | `revision_documento` **inmutable** (insert-only). Ampliar `interaction_documents.tipo` si necesario (sin romper existente). |

**Importante**: solo crear tablas bloqueadas (R14,R15) **tras confirmación institucional**. Mantener diseño preparado pero no ejecutar migración hasta desbloqueo.

### 8.3 Datos históricos
- **Conservar**: nunca eliminar registros existentes. Preservar integridad histórica.
- **Soft delete**: si se requiere desactivar, usar `is_active`/`deleted_at` + auditoría (quién/cuándo). Justificación trazable.
- **No sobrescribir**: `RevisionDocumento` insert-only. Cambios estado documentados con `estado_anterior`/`estado_nuevo` + motivo.
- **Seeds**: mantener idempotentes, UUIDs sincronizados. No romper referencias cross-service existentes.
- **Datos demo**: no afectar datos existentes al añadir entidades.

### 8.4 Compatibilidad
- **Contratos API**: preservar rutas existentes, respuestas, códigos HTTP. Nuevos campos opcionales.
- **Enums locales**: no cambiar valores existentes (core match status). Ampliaciones solo si validadas.
- **Cross-service**: patrón match→core sin token mantenido (documentado). match→auth con token mantenido.
- **Frontend**: `lib/api.ts` backward compatible. Añadir métodos, no cambiar firmas existentes sin análisis.
- **Rutas colección**: mantener convención sin slash. Verificar auth `redirect_slashes` al tocar routers.
- **Versiones Alembic**: conservar existentes. No reescribir historial.

---

## 9. Orden Implementación Propuesto + Dependencias

### 9.1 Principios orden
- **Serie para núcleo**: modelos→schemas→migración→endpoints→authZ (evitar inconsistencias). TOCTOU aplicado en endpoints críticos.
- **Paralelizable lectura/diseño**: ya hecho. Implementación ordenada.
- **Checkpoints**: migración tras modelos validados. Shared cambios → reiniciar servicios. Seeds tras migración.
- **Solo tras desbloqueo**: R14,R15 (institucional). R07 requiere R08–R13 base.

### 9.2 Orden propuesto por fases F3

| Paso | Servicio | Acción | Dependencias | Notas |
|---|---|---|---|---|
| **1. Fundamentos seguridad/config** | `auth`, `shared` | Revisar `redirect_slashes` auth (evaluar añadir False). Documentar decisión. Revisar semántica `/internal/count` (investigar llamadores). | F0 hallazgos | **No cambiar por defecto**. Solo si toca routers auth. |
| **2. Auth: Empresa + TutorDocente** | `auth-service` | Modelos, schemas específicos (no UserUpdate), migración, CRUD admin-only. Índices únicos. | D01 | Reutilizar TutorDocente existente. Validar unicidad. |
| **3. Core: NecesidadEmpresarial** | `core-service` | Modelo + CRUD + flujo aprobación. Diferenciar Challenge. Migración. | D03 | Sin inventar modalidad valores. |
| **4. Match: Practica (base seguimiento)** | `match-service` | Modelo `Practica`, schemas, migración. Campos matriz. Referencias UUID. Índices. | D02, paso 2 | Base para visitas/evaluaciones. TOCTOU en asignación tutor. |
| **5. Match: ampliar documentos + RevisionDocumento** | `match-service` | Ampliar `InteractionDocument.tipo` (solo valores validados). Crear `RevisionDocumento` (insert-only). Endpoints revisión con authZ. Migración. | R11 | Bitácora inmutable. TOCTOU aprobación/rechazo. |
| **6. Match: Visitas + Evaluaciones** | `match-service` | Modelos + CRUD + authZ (tutor/admin asignado). Migración. | paso 4, D04 | Asociados a Practica. |
| **7. Core: ProyectoCreacionEmpresa + equipos/hitos** | `core-service` | **SOLO SI** R14 desbloqueado (institucional). Si bloqueado → **omitir**. | R14 desbloqueado | No modelar hasta confirmar hitos. |
| **8. Match: ProcesoHomologacion + docs** | `match-service` | **SOLO SI** R15 desbloqueado. Si bloqueado → **omitir**. | R15 desbloqueado | No modelar hasta aclarar CAWA/CUA/DPS. |
| **9. Endpoints admin reales** | `auth/core/match` + Frontend | APIs admin para gestión entidades nuevas. RBAC server-side. Reemplazar mocks UI. | pasos 2–6 (+7,8 si hechos) | **Separación admin explícita**. Probar no autorizados. |
| **10. Admin KPIs reales** | todos + Frontend | Agregados backend (solo lectura). Si algún KPI simulado → **marcado explícitamente**. | paso 9 | Derivar de persistencia. Evitar COUNT-only para cambios estado. |
| **11. Document-automation cartas DOCX** | `match-service` + shared si necesario | Generar desde plantillas. Salida DOCX editable. Versionado. No sobrescribir plantillas. | R05 + plantillas existentes | Mapear variables. Validar datos faltantes. |
| **12. TOCTOU hardening endpoints existentes** | `match-service`, `core-service` | Aplicar `with_for_update()+transacción única` en approve/contact (match), cambio estado Challenge (core) si aplica. | existentes | Reforzar sin romper contratos. |
| **13. Validación rutas colección + redirect_slashes** | todos routers | Verificar convención `@router.*("")`. Evaluar `redirect_slashes=False` auth-service. | global | F4.8 |

### 9.3 Dependencias críticas
- **D01–D04**: aprobación arquitectónica antes paso 2–4.
- **Bloqueos R04,R14,R15**: institucionales. No ejecutar pasos 7,8 hasta desbloqueo. Diseñar preparados pero **no migrar**.
- **Plantillas DOCX**: existentes para paso 11.
- **Stack Docker**: requerido para migraciones/pruebas (`make up`, `docker-compose`).
- **Shared service_auth**: cambios requieren reiniciar servicios. `requirements*.txt` → `make build`.
- **Seeds UUIDs**: mantener sincronizados si se tocan seeds (pasos migración).

---

## 10. Criterios Aceptación Verificables para Fase 3

Criterios extraídos PLAN.md + requisitos específicos. Todos deben cumplirse para pasar F3→F4.

### 10.1 Diseño/arquitectura
- [ ] **Matriz trazabilidad** completa (17 reqs) con estado diseño por cada uno.
- [ ] **Propietario esquemas** respetado (auth/core/match). Sin mezcla. `include_name` confirmado.
- [ ] **Sin FK cross-service**: referencias UUID desnudos documentadas/verificadas.
- [ ] **No reutilizar UserUpdate**: schemas específicos creados.
- [ ] **No inventar catálogos**: R04/R14/R15 bloqueados hasta confirmación. Valores solo existentes.
- [ ] **Conservar históricos**: soft-delete si aplica, bitácora inmutable, sin borrados.
- [ ] **Rutas colección sin slash**: convención aplicada. `redirect_slashes` auth evaluado.
- [ ] **D3/D4 justificados**: si usados → justificación; si no → acta no-necesidad (registrar en F5 si aplica).

### 10.2 TOCTOU + transacción única
- [ ] **Patrón aplicado** donde riesgo: approve/contact, asignación tutor, revisión documento, cambio estado crítico.
- [ ] **`with_for_update()`** usado sobre filas objetivo.
- [ ] **Transacción única** por operación atómica (mismo `db.begin()`).
- [ ] **Orden bloqueos** definido (PK asc) para evitar deadlocks.
- [ ] **No solo COUNT**: validado (ningún cambio estado basado solo COUNT).
- [ ] **Idempotencia** considerada.

### 10.3 Seguridad/RBAC
- [ ] **Separación acción admin explícita**: rutas/admin con `require_role('ADMIN')`.
- [ ] **RBAC server-side** aplicado (no solo frontend).
- [ ] **Accesos no autorizados rechazados** - verificación planificada F4.4.
- [ ] **Service-token**: semántica `/internal/count` decidida (JWT vs X-Service-Token) con justificación.
- [ ] **match→core patrón** documentado (sin token, lectura pública) - coherente con implementación.

### 10.4 Migraciones/datos
- [ ] **Modelos importados** en `models/__init__.py`. Considerado `alembic/env.py`.
- [ ] **Migraciones autogeneradas validadas** antes upgrade. `include_name` OK.
- [ ] **Versiones existentes conservadas** (6 revisiones). No eliminadas.
- [ ] **Seeds idempotentes + UUIDs sincronizados** mantenidos si tocados.
- [ ] **Backward compatibility**: contratos preservados.

### 10.5 Frontend/admin/KPIs
- [ ] **Mocks admin reemplazados** con APIs reales (paso 9).
- [ ] **KPIs simulados marcados explícitamente** si quedan (UI + respuestas si visibles). 
- [ ] **Middleware auth** complementado con RBAC server-side.
- [ ] **Accesibilidad** mantenida.

### 10.6 Pruebas (preparación F4)
- [ ] **Plan pruebas concurrencia** definido con 2–8 hilos, escenarios + verificaciones.
- [ ] **Casos autorización** listos (sin token/rol insuficiente/admin OK).
- [ ] **Persistencia real** verificable (consultas DB).
- [ ] **Rutas colección** validadas sin slash.
- [ ] **Migración upgrade head** verificable en stack levantado.

**Criterio global F3**: implementación cumple principios + checklist Fase 2 completo con evidencias.

---

## 11. Checklist Fase 2 (CUMPLIDO/FALLIDO/BLOQUEADO) con Evidencia

| Ítem PLAN.md Fase 2 | Estado | Evidencia |
|---|---|---|
| **2.1 Diseño a nivel servicio** | **CUMPLIDO** | Sección 2: límites responsabilidad por auth/core/match/frontend/shared. Esquemas separados. |
| **2.2 Modelo de datos** | **CUMPLIDO** | Secciones 1–4. Entidades propuestas con propietario. Migraciones con `include_name`. Versiones existentes conservar. Modelos __init__.py requerido. |
| **2.3 Esquemas/API** | **CUMPLIDO** | No reutilizar UserUpdate (4.3). Esquemas específicos. Contratos preservados. |
| **2.4 TOCTOU + transacción única** | **CUMPLIDO** | Sección 6.1–6.2: patrón, operaciones riesgo, orden bloqueos, rechazo solo COUNT. |
| **2.5 Autorización RBAC** | **CUMPLIDO** | Sección 7: matriz permisos, separación admin explícita, server-side, pruebas no autorizados. |
| **2.6 Cross-service** | **CUMPLIDO** | Sección 3.1–3.2: sin FK, httpx+settings, match→auth con token, match→core sin token (patrón documentado). `/internal/count` revisado (4.5). |
| **2.7 Frontend (Next.js 14)** | **CUMPLIDO** | Sección 2.4: App Router, `@/*`, middleware complementado con RBAC server-side, `lib/api.ts`, KPIs marcados si simulados. |
| **2.8 Documentación/plantillas** | **CUMPLIDO** | Sección 4.10: DOCX editable, preservar formato, no sobrescribir plantillas, versionado. |
| **2.9 Seeds** | **CUMPLIDO** | Sección 4.7, 8.3: idempotentes, UUIDs sincronizados, no romper referencias. |
| **2.10 Diseño de pruebas** | **CUMPLIDO** | Sección 6.3–6.4: funcional/integración/seguridad/concurrencia, persistencia real, regresión. Testing-and-quality aplicable. |

**Subtotal Fase 2 checklist**: 10/10 **CUMPLIDO**.

### Checklist global complementario
| Elemento crítico | Estado | Evidencia |
|---|---|---|
| **17 req trazados** | **CUMPLIDO** | Sección 1 (tabla completa). |
| **TOCTOU con with_for_update + transacción única** | **CUMPLIDO** | 6.1–6.2. |
| **No aceptar solo COUNT** | **CUMPLIDO** | 6.1 regla explícita. |
| **No reutilizar UserUpdate** | **CUMPLIDO** | 4.3. |
| **No inventar catálogos/valores/enums** | **CUMPLIDO** | 4.7, 5.3. R04/R14/R15 bloqueados. |
| **Rutas colección sin slash** | **CUMPLIDO** | 4.4. |
| **Cross-service sin FK** | **CUMPLIDO** | 3.1. |
| **Conservar históricos** | **CUMPLIDO** | 4.7, 8.3. |
| **KPIs simulados marcados** | **CUMPLIDO** | 4.9, 9.2 paso 10. |
| **Separación acción admin** | **CUMPLIDO** | 4.8, 7.2. |
| **Alembic include_name** | **CUMPLIDO** | 4.6. |
| **Versiones existentes conservar** | **CUMPLIDO** | 4.6, 8.1. |
| **Revisar internal/count (JWT vs X-Service-Token)** | **CUMPLIDO** | 4.5, 7.2. |
| **match→core patrón actual documentado** | **CUMPLIDO** | 3.2, 4.5. |
| **redirect_slashes auth-service documentado** | **CUMPLIDO** | 4.4 (hallazgo F0 + acción F3). |

**Global**: 25/25 elementos críticos **CUMPLIDO**.

### Bloqueos / Pendientes (no impiden diseño F2)
- **BLOQUEADO (institucional)**: R04 (modalidades valores), R14 (creación empresa hitos), R15 (homologación CAWA/CUA/DPS). Ver sección 5.1.
- **PENDIENTE (arquitectónico)**: D01–D04 aprobación, semántica `/internal/count` investigación, decisión rol nuevo (D06).
- **PENDIENTE (técnico)**: verificar existencia real `TutorDocente` tabla/modelo uso (reutilizar antes crear). Verificar llamadores `/internal/count`.

**Ninguno de estos bloquea la finalización de FASE 2**. Diseño preparado con bloqueos documentados y estrategias alternativas (no inventar, postergar migración R14/R15).

---

## 12. Cierre Fase 2

### Verificación archivo nuevo
- **Único archivo creado**: `.opencode/reports/FASE2_DISENO_TECNICO.md`
- **Sin modificaciones** a código fuente, modelos, schemas, endpoints, permisos, enums, migraciones, datos.
- **Sin staging/commits**.

### Fuentes utilizadas
- `PLAN.md` (Fase 2 completo)
- `.opencode/reports/FASE0_AUDITORIA.md` (línea base + hallazgos)
- `.opencode/reports/FASE1_ANALISIS_ALCANCE.md` (17 reqs, análisis, decisiones pendientes)
- `docs/gestion-practicas/*` (diagnostico-integracion.md, diseno-modelo-datos.md, plan-bloque-3.md, etc.)
- `documents/transcripcion/transcripcion_unificada_analisis.md`
- Plantillas DOCX existentes

### Conclusión
**FASE 2 COMPLETADA. CUMPLIDO.**

Reporte completo con todos los puntos solicitados:
1. Matriz trazabilidad 17 reqs ✓
2. Diseño por servicio + límites responsabilidad ✓
3. Contratos/flujos entre servicios ✓
4. Decisiones técnicas adoptadas + justificación ✓
5. Decisiones institucionales pendientes + funcionalidades bloqueadas ✓
6. Diseño transaccional + estrategia pruebas concurrencia ✓
7. Matriz permisos + controles seguridad ✓
8. Estrategia migraciones, datos históricos, compatibilidad ✓
9. Orden implementación propuesto + dependencias ✓
10. Criterios aceptación verificables para Fase 3 ✓
11. Checklist Fase 2 con evidencia ✓

Todos los principios aplicados estrictamente. Bloqueos documentados sin invención de catálogos/valores.

**Próximo paso**: detenerse (según instrucción). No iniciar Fase 3.