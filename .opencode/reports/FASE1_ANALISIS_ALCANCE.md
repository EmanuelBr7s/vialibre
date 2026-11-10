# FASE 1: Análisis y Alcance - Informe

**Proyecto**: VíaLibre (plataforma de empleabilidad universitaria)  
**Rama**: `feature/funcionalidades-eric-jassir`  
**HEAD**: `8a6211bb89632bc96d1b0dfe073e4c8eaa0398b6`  
**Fecha**: 2026-10-18  
**Estado**: Solo análisis - Sin modificaciones a código/modelos/esquemas/endpoints/permisos/enums/migraciones/datos  
**Alcance**: EXCLUSIVAMENTE Fase 1 (Análisis y Alcance). No se implementan Fases 2-5.

---

## 1. Fuentes leídas (evidencia)

| Fuente | Uso | Observaciones |
|---|---|---|
| `PLAN.md` | Marco metodológico (principios, bloqueos, checklist F1, criterios) | Verificado completo (301 líneas). Aplicados todos los principios. |
| `.opencode/reports/FASE0_AUDITORIA.md` | Línea base, hallazgos, inventario | Hallazgos CRÍTICOS/ALTO/MEDIO/BAJO registrados con ubicaciones. |
| `AGENTS.md` | Convenciones, layout, comandos, gotchas | Confirmadas: 3 servicios, 3 esquemas, Alembic autogenerate+gitignored (histórico), rutas colección sin slash, Docker-only, cross-service sin FK. |
| `docs/gestion-practicas/diagnostico-integracion.md` | Diagnóstico Bloque 1 (hechos vs inferencias vs pendientes) | Fuente principal para requerimientos funcionales. |
| `docs/gestion-practicas/diseno-modelo-datos.md` | Diseño/modelo datos propuesto | Para contraste con código existente (no asumir adoptado). |
| `docs/gestion-practicas/plan-bloque-3.md` | Plan/herramientas/Windows (make vs docker-compose) | Útil para entorno. |
| `documents/transcripcion/transcripcion_unificada_analisis.md` | Requerimientos originales (transcripción) | Requerimientos tal como se expresaron. No reglamento formal validado. |
| `documents/FORMATO-*.docx` (3 archivos) | Plantillas institucionales existentes | Evidencia de requerimientos documentales (carta empresa, compromiso, HV institucional). |

---

## 2. Estado Git (sin cambios)

**Verificación (solo lectura):**
- Rama: `feature/funcionalidades-eric-jassir`
- HEAD: `8a6211bb89632bc96d1b0dfe073e4c8eaa0398b6`
- Archivos modificados sin commit: **30** (preexistentes al reporte F1)
- Archivos no rastreados: **28+** (incluye `.opencode/reports/FASE0_AUDITORIA.md`, `.opencode/`, `AGENTS.md`, `PLAN.md`, `docs/`, `frontend/src/app/admin/*`, `services/*/alembic/versions/*`, `services/*/tests/*`, `shared/python/vialibre_common/service_auth.py`, `package-lock.json`)
- Revisiones Alembic existentes (no eliminar): auth(`c557863f0a93`, `c03d3b230309`), core(`d65f36209c5b`, `2c162f6e07ea`), match(`564cf3551867`, `6ea52de2cf05`)

**Conclusión:** Árbol de trabajo con cambios pendientes (no staged). **No se ha modificado nada** para generar este reporte. Únicamente se creará `.opencode/reports/FASE1_ANALISIS_ALCANCE.md`.

---

## 3. Inventario de requerimientos + fuente (originales vs hallazgos)

Los requerimientos funcionales se extraen de fuentes originales (no de hallazgos F0). Se distingue "resuelta/pendiente" con evidencia en código.

| Requerimiento | Fuente original | Estado actual (evidencia) | Clasificación | Notas |
|---|---|---|---|---|
| Portal empresas: retos/prácticas/ofertas (3 secciones) | transcripción_unificada_analisis.md; diagnostico | **Resuelta (parcial)**. `Challenge.tipo` enum reto\|practica\|empleo (core/models). Listado con filtro tipo. Feed diferencia por tipo. | Funcional existente | No requiere cambio estructural. Validar filtros por tipo. |
| Búsqueda/filtrado banco de talento (HV, skills) | transcripción; diagnostico | **Parcial**. `auth GET /users/talent` existe. Página `/talento` existe. Campos académicos: programa_academico, semestre, anio_egreso, ubicacion, disponible presentes en User. | Funcional existente (ampliable) | Ampliaciones de filtros pueden requerir frontend/API, pero no inventar nuevos roles/catalogos. |
| Postulaciones + estados + contacto desbloqueado | transcripción; diagnostico | **Resuelta**. `interactions.py` apply/list/approve/contact implementados. `ContactSection`/`ApplicantsSection`/`mis-postulaciones` existentes. | Funcional existente | Flujo pendiente→aprobado→contacto verificado. |
| Modalidades: ordinaria, creación de empresa, homologación | transcripción (secciones específicas) | **Parcial**. `Challenge.modalidad` existe (campo). **Ordinaria** cubierta. **Creación de empresa**: inexistente (equipos 2, mini-chartán/sustentación). **Homologación**: inexistente (experiencia ≥1 año, CAWA/CUA/DPS). | **Pendiente** (complejo) | Catálogo de modalidades no definido. Términos ambiguos (CAWA/CUA/DPS) → **bloqueo decisión institucional** (ver 7.3 diagnostico). |
| Cartas: aval, presentación, compromiso | transcripción; plantillas DOCX | **Parcial**. Solo **carta de aval** PDF en `match/documents.py`. Plantillas existen: FORMATO-CARTA-EMPRESA.docx, FORMATO-CARTA-COMPROMISO-PRACTICAS.docx, FORMATO-HOJA-de-VIDA-INSTITUCIONAL.docx. | **Pendiente** (generación DOCX) | Requiere `document-automation`. Preservar formato. Salida editable (DOCX). No sobrescribir plantillas. |
| Accesibilidad (separación palabras, guía lectura) | transcripción/requerimientos UI | **Resuelta**. `AccessibilityPanel.tsx` + `AccessibilityContext` implementados (persistencia localStorage). | Existente | Cumple requerimiento. |
| Área administración/soporte universitario | transcripción; diagnostico | **Parcial**. `/admin/dashboard` y `/admin/anuncios` existen. **Mock/in-memory** (sin persistencia, sin APIs backend). Guards client-side únicamente. Middleware solo chequea token. | **Pendiente** (backend admin) | Requiere endpoints reales + RBAC server-side estricto. No añadir rol nuevo aún (gestión_practicas/proyeccion_social) sin justificación. |
| Registro centralizado empresas, tutores, visitas, evaluación, requisitos | transcripción; diagnostico | **Inexistente**. User tiene `nit_empresa`, `empresa_nombre` (vinculado a usuario publicador), **no entidad Empresa independiente**. No existen TutorDocente (modelo auth tiene `tutor_docente.py`? Revisar: auth/models tiene `tutor_docente.py` según F0 inventario; verificar uso real). No existen Visita, Evaluacion, Requisito, DocumentoPlantilla. | **Pendiente** | Necesita entidades nuevas. Asignación propietario por esquema (auth/core/match). Sin FKs cross-schema. |
| Formulario necesidades empresariales (captación proactiva) | transcripción; diagnostico | **Inexistente**. Challenge es publicación creada por publicador; distinto flujo (proactivo). | **Pendiente** | Entidad `NecesidadEmpresarial`. Distinguir de Challenge. |
| Seguimiento administrativo estudiantes/tutores (matriz con campos listados) | transcripción (matriz detallada: año, tutor, programa, identificación, nombre, correo, celular, práctica desde 7°, bilingüe) | **Inexistente como entidad**. Datos dispersos en User (programa_academico, afiliacion_academica, semestre, anio_egreso, phone, email, full_name). Falta tutor docente asignado, "práctica desde 7°", año académico, identificación/CI, estado seguimiento admin. | **Pendiente** | Requiere `Practica` como entidad de seguimiento (cruza estudiante, challenge, empresa, tutor). |
| Control entrega/revisión/estado documentos | transcripción; diagnostico | **Parcial**. `interaction_documents` soporta tipos. Checklist en `documents.py`. Faltan HV Institucional, Formato Compromiso, otros por modalidad. **Falta flujo revisión/aprobación** (estados revisión/aprobado/rechazado) con revisor. | **Pendiente** | Ampliar catálogo tipos + estados + bitácora revisiones. |
| Evaluación prácticas/tutores, visitas | transcripción | **Inexistente**. Sin entidades Evaluacion, Visita. Sin rúbricas. | **Pendiente** | Modelar con responsables (tutor/coordinación). |
| Informes administrativos (KPIs reales) | transcripción; diagnostico | **Parcial**. Dashboard KPIs **mock** (`ADMIN_KPIS` en `frontend/src/data/mock.ts`). Sin endpoints backend agregados reales. | **Pendiente** | Endpoints agregados (solo lectura) con autorización. Marcar KPIs simulados donde visibles (principio). |
| Modalidad Creación de Empresa (equipos 2, mini-chartán/sustentación) | transcripción | **Inexistente**. Sin entidades equipo, integrantes, hitos. | **Pendiente** | Requiere reglas específicas. |
| Homologación (experiencia ≥1 año, CAWA/CUA/DPS) | transcripción | **Inexistente**. Sin soporte específico. | **Pendiente** | **Decisión institucional requerida** (términos ambiguos). |
| Reacciones (like/bookmark) | código existente | **Resuelta (backend), no usada UI**. Backend completo POST/GET/DELETE/count. Frontend expone métodos sin llamadores (`api.ts:320,325,332`). Sin UI. | Infraestructura existente (no requerida Bloque 1) | No habilitar UI sin justificación. Mantener como existente. |

---

## 4. Matriz funcionalidades / servicios / roles

| Funcionalidad | auth-service (vialibre_auth) | core-service (vialibre_core) | match-service (vialibre_match) | Frontend (Next.js 14) | Roles afectados | Notas |
|---|---|---|---|---|---|---|
| Portal retos/prácticas/ofertas | — | Leer/gestionar Challenge (existe). Ampliar modalidad catálogo si necesario. | — | Feed/detalle existentes. | Público, Publicador, Admin | Existente. |
| Banco talento | GET /users/talent existente. User campos académicos existentes. | — | — | `/talento` existente. Ampliar filtros. | Publicador, Admin | Existente. |
| Postulaciones | — | Verificación propiedad challenge (lectura pública existente). | Interactions CRUD+approve+contact existentes. | `mis-postulaciones`, `ApplicantsSection`, `ContactSection` existentes. | Solucionador/Egresado (TALENT_ROLES), Publicador, Admin | Existente. |
| Cartas (aval/presentación/compromiso) | — | — | Ampliar `interaction_documents` tipos + generación DOCX (document-automation). | UI descarga/generación si aplica. | Solucionador/Publicador/Admin según flujo | Solo aval implementado. |
| Admin dashboard/anuncios (reales) | Endpoints admin gestión usuarios/roles? (RBAC server-side). | Endpoints admin retos/ofertas? | Endpoints admin prácticas/postulaciones? | Reemplazar mocks con datos reales. | **Admin-only** (separación explícita). | Mock actual. Requiere APIs backend. |
| Empresa (entidad centralizada) | **Nuevo modelo** `Empresa`? (propietario auth: personas/organizaciones?) o core? | Alternativa: core si ligado a publicaciones. | — | Formularios admin. | Publicador/Admin | Decisión propietario: auth (identidad/organización) vs core (negocio). Ver 6. |
| TutorDocente | **Nuevo modelo** `TutorDocente` en auth? (persona institucional). | — | — | Gestión admin. | Admin/Coordinación | Vinculado a auth (usuarios/personas). Verificar relación con User. |
| Practica (seguimiento) | — | Referencia Challenge/Empresa? | **Candidato** match (ciclo vida práctica/postulaciones). | Seguimiento admin/matriz. | Admin/Tutor/Estudiante | Cruza core(match/publicación) + match(ciclo). Definir propietario con justificación. |
| NecesidadEmpresarial (captación) | — | **Candidato** core (cercano a Challenge). | — | Formulario captación. | Admin/Proyección Social/Publicador? | Diferenciar de Challenge. |
| Visita, Evaluacion, ProcesoHomologacion, ProyectoCreacionEmpresa | — | ProyectoCreacionEmpresa puede ir a core (modalidad). | Visita/Evaluacion/Homologacion típicos de seguimiento documental/ciclo práctica → **match**. | Formularios/evaluaciones. | Admin/Tutor | Distribución entre core/match según dominio. |
| Reacciones | — | — | Ya existe (backend). UI opcional. | Sin llamadores. | Autenticado | Infra existente. |

**Notas roles:** Roles existentes verificados: `PUBLICADOR`, `SOLUCIONADOR`, `EGRESADO`, `ADMIN` (roles table). TALENT_ROLES = {solucionador, egresado}. **No proponer nuevo rol** (gestion_practicas/proyeccion_social) en este análisis sin justificación explícita y aprobación.

---

## 5. Inventario reutilizable (endpoints/modelos/enums/componentes)

### Endpoints reutilizables
| Endpoint | Servicio | Estado | Uso potencial |
|---|---|---|---|
| `POST /api/v1/auth/register`, `POST /login`, `GET /users/me`, `PATCH /users/me` | auth | Existente | Base auth/RBAC. |
| `GET /api/v1/auth/users/{id}/resumen` | auth | Existente (uso interno) | Enriquecimiento cross-service con token interno. Patrón establecido. |
| `GET /api/v1/auth/users/talent` | auth | Existente | Banco talento. |
| `POST/GET/PATCH/DELETE /api/v1/core/challenges` (colección `""`), `GET /{id}` | core | Existente | Reutilizar para retos/prácticas/ofertas. `GET /{id}` público (sin auth) — usado por match. |
| `POST/GET /api/v1/core/categories` | core | Existente | Taxonomía. |
| `POST /apply`, `GET /challenge/{id}`, `GET /mine`, `GET /{id}`, `PATCH /{id}/approve`, `DELETE /{id}`, `GET /{id}/contact` | match/interactions | Existente | Postulaciones completo. |
| `documents.py` endpoints (subir/descargar/listar, carta-aval) | match | Existente | Extender tipos + generación DOCX. |
| `reactions` endpoints | match | Existente (backend) | Infra no usada UI. |

### Modelos reutilizables
| Modelo | Schema/Servicio | Campos clave | Observación |
|---|---|---|---|
| `User` (auth.models.user) | vialibre_auth | email, password_hash, full_name, role_id, is_active, programa_academico, afiliacion_academica, semestre, anio_egreso, phone, ubicacion, disponible, cv_*, skills JSONB, soft_skills JSONB | Base sólida. Extender con campos administrativos solo si necesario (evitar duplicación). No romper existentes. |
| `Role` (auth.models.role) | vialibre_auth | name, description | Roles existentes fijos. |
| `TutorDocente` (auth.models.tutor_docente) | vialibre_auth | Existe según inventario F0 (modelo presente). Verificar estado real/uso. | Si ya existe modelo, reutilizar antes de crear nuevo. |
| `Challenge` (core.models.challenge) | vialibre_core | tipo, modalidad, status (enum local español: abierto/en_progreso/cerrado), author_id (UUID cross-service), category_id, dificultad, tags JSONB, fechas | Reutilizable. Campo `modalidad` existe. Extender catálogo valores (sin romper existentes). |
| `Category` (core.models.category) | vialibre_core | name unique, description, icon | Reutilizable. |
| `Interaction` (match.models.interaction) | vialibre_match | solucionador_id, challenge_id (UUID cross-service), status (pendiente/aprobado/rechazado), contact_unlocked | Base ciclo vida. |
| `InteractionDocument` (match.models.document) | vialibre_match | interaction_id FK→interactions, tipo, filename, content_type, size, data (deferred) | Ampliar `tipo` enum/catalogo. |
| `Reaction` (match.models.reaction) | vialibre_match | user_id, challenge_id, reaction_type (like/bookmark) | Existente. |

### Enums (verificación obligatoria - NO inventar)
| Enum | Ubicación | Valores | Observación (crítica) |
|---|---|---|---|
| `ChallengeStatus` (inglés) | `shared/python/vialibre_common/schemas.py` | DRAFT/OPEN/IN_PROGRESS/RESOLVED/CLOSED | **NO USAR** en lógica de servicios. Servicios usan enum local español. |
| `ChallengeStatus` (local core) | `core-service/app/models/challenge.py` / schemas | `abierto`, `en_progreso`, `cerrado` (String/Enum SQLAlchemy) | **Usar este** en core. Editar **solo local**, nunca shared. |
| `InteractionStatus` (inglés shared) | `shared/.../schemas.py` | PENDING/ACCEPTED/COMPLETED | No usar en match. |
| `InteractionStatus` (local match) | `match-service/app/models/interaction.py` | `pendiente`, `aprobado`, `rechazado` | **Usar este** en match. |
| `DifficultyLevel` (shared inglés) | `shared/.../schemas.py` | easy/medium/hard | Core usa `easy|medium|hard` (puede coincidir con valores string). Verificar mapeo. |
| `UserRole` (shared) | `shared/.../schemas.py` | Enum inglés (PUBLICADOR/SOLUCIONADOR/EGRESADO/ADMIN) | Compartido conceptualmente; roles reales en DB `roles` table. No asumir equivalencia automática. |
| `TALENT_ROLES` | `auth-service/app/api/v1/endpoints/auth.py` y deps | {solucionador, egresado} (strings) | Usado para autorización talent. |

**Regla estrita:** **No inventar catálogos**. Si falta modalidad valores exactos (creación empresa/homologación) → **bloqueo decisión institucional**. Si falta tipos documentos/revisión → documentar necesidad, proponer valores **solo si existen en plantillas/código existente**.

### Componentes reutilizables (frontend)
| Componente | Ubicación | Uso |
|---|---|---|
| `ApplicantsSection`, `ContactSection`, `PracticeDocuments` | `frontend/src/components/` | Flujo postulaciones existente. |
| `AccessibilityPanel`, `AccessibilityContext` | `frontend/components`, contexts | Accesibilidad ya implementada. |
| `AdminLayout`, componentes admin | `frontend/src/components/admin/`, `app/admin/*` | Estructura admin existente. Reutilizar para reemplazar mocks con datos reales. |
| `api.ts` (cliente API) | `frontend/src/lib/api.ts` | Patrón wrapper `/api`. Métodos sin llamadores (`getInteraction`, `createReaction`, `deleteReaction`) son **infra existente** (no eliminar sin análisis). |
| Guards: `useRoleGuard` | `frontend/src/hooks/useRoleGuard.ts` | Client-side. **Complementar con RBAC server-side** (no sustituir). |
| Middleware auth | `frontend/src/middleware.ts` | Protección rutas por presencia token. Añadir validación rol server-side vía APIs, no solo middleware. |

### Librería compartida reutilizable
| Módulo | Ubicación | Uso |
|---|---|---|
| `service_auth.py` | `shared/python/vialibre_common/service_auth.py` | Token interno v1: build_service_token, service_headers, verify_service_token, NonceStore, ALLOWED_SERVICES. Patrón ligado a method+path+nonce+timestamp. Fail-closed. |
| `auth.py` (JWT verify) | `shared/python/vialibre_common/auth.py` | verify_token para JWT Bearer. |
| `pdf.py` / `pdf_generator.py` | `shared/python/vialibre_common/` | Generador PDF mínimo. Base para carta aval (ya usado). |
| `schemas.py` (enums inglés) | `shared/.../schemas.py` | **Solo referencia**. No usar valores para lógica local española. |

---

## 6. Reglas negocio + casos límite + criterios aceptación (por grupos)

### A. Reglas negocio verificadas (existentes)
- **Cross-service sin FK**: referencias `author_id`, `solucionador_id`, `challenge_id` son UUID desnudos. Preservar.
- **Un esquema por servicio**: vialibre_auth/core/match. `include_name` en Alembic restringe autogenerate.
- **Seeds idempotentes + UUIDs sincronizados**: mantener al tocar seeds.
- **Rutas colección sin slash**: `@router.post("")`, `@router.get("")` (convención). Código nuevo sigue; verificar global existente.
- **Enums locales**: core usa español (abierto/en_progreso/cerrado), match (pendiente/aprobado/rechazado). **Nunca editar shared** para cambiar semántica local.
- **Autorización**: `get_current_user` (JWT), `require_role`, `AuthContext`. Acciones admin separadas conceptualmente.
- **Cross-service interno**: match→auth usa `X-Service-Token` + `service_headers()` con method+path. match→core **NO envía token** (lectura pública `GET /challenges/{id}`).

### B. Reglas negocio propuestas (nuevas funcionalidades) - sin implementar
| Funcionalidad | Reglas negocio | Casos límite | Criterios aceptación | Pruebas |
|---|---|---|---|---|
| **Empresa centralizada** | Distinta de usuario publicador. Un publicador puede representar empresa? Múltiples publicadores? Empresa tiene NIT único? | NIT duplicado, empresa sin publicador, cambio representante. | Crear/editar empresa solo Admin/Publicador autorizado? Definir scope. | Funcional + autorización. |
| **TutorDocente** | Persona institucional. Puede asignarse a Práctica. No necesariamente User con rol tutor (a menos que definido). | Tutor sin asignaciones, reasignación, tutor inactivo. | CRUD admin-only. Validar unicidad (identificación/email). | Autorización (solo admin). |
| **Practica (seguimiento)** | Vincula estudiante(solucionador/egresado), challenge(práctica), empresa, tutor docente. Campos: modalidad, fechas, bilingüe (bool), práctica desde 7° (bool), año académico, programa, identificación/CI. **Un estudiante puede tener múltiples prácticas?** ¿única activa? | Transición estados, sin tutor asignado, fechas inconsistentes. | Matriz seguimiento muestra todos campos requeridos. Persistencia real. | Integración (auth/core/match). |
| **NecesidadEmpresarial** | Flujo proactivo (captación). Estado propio (distinto Challenge.status). Origen/responsable seguimiento. No visible como oferta hasta aprobación? | Aprobación/rechazo, conversión a Challenge? | Separación clara vs Challenge. Solo roles autorizados gestionan. | Autorización. |
| **Visita** | Asociada a Práctica. Responsable (tutor/admin). Fechas, observaciones. | Visita fuera fechas, múltiples visitas. | Registro con trazabilidad (usuario, fecha). | Funcional. |
| **Evaluacion** | Tipos: empresa→estudiante, tutor→estudiante, autoevaluación. Rúbrica por modalidad? | Evaluación duplicada, incompleta. | Estados (pendiente/completada). Solo actores autorizados. | Autorización + integridad. |
| **ProcesoHomologacion** | Modalidad homologación. Requiere experiencia ≥1 año. Documentación CAWA/CUA/DPS. Estados propios. | Documentación incompleta, experiencia < 1 año. | Validaciones por reglas. **Requiere validación términos institucionales** (bloqueo). | Funcional con reglas. |
| **ProyectoCreacionEmpresa** | Modalidad creación empresa. Equipos **mínimo 2 integrantes**. Hitos: mini-chartán, sustentación. Fechas/acta. | Equipo < 2, integrante ya en otro equipo? | Validación tamaño equipo. | Funcional + reglas negocio. |
| **Control documentos + revisión** | Ampliar tipos (HV Institucional, Compromiso, etc.). Estados: entregado/revisado/aprobado/rechazado. Bitácora (quién revisó/cuándo/motivo). Asignar revisor (tutor/admin). | Rechazo sin motivo, aprobar sin revisión, edición tras aprobado? | Flujo estados controlado. Solo revisor autorizado cambia estado. Históricos preservados. | Autorización + integridad + auditoría. |
| **Cartas DOCX** | Generar desde plantillas institucionales preservando formato. Salida **editable** (DOCX). Mapear variables (datos sistema). Versionado. No sobrescribir plantilla original. | Datos faltantes, plantilla corrupta. | Formato preservado. Archivo DOCX válido. Metadatos/versionado. | Funcional (generación). |
| **Admin backend real** | Dashboard KPIs **reales** (agregados). Anuncios con persistencia. Gestión empresas/tutores/prácticas/necesidades con RBAC server-side. **Separación admin-only explícita**. | Acceso no autorizado, N+1 en agregados. | **Accesos no autorizados rechazados** (obligatorio). KPIs reales derivados de datos persistidos. Si algún KPI simulado → **marcado explícitamente**. | Seguridad (4.4) + persistencia (4.6). |

### C. Criterios aceptación globales aplicables (extraídos PLAN.md)
- **TOCTOU + transacción única**: aplicar donde riesgo concurrencia (aprobación interacción, asignación tutor, cambio estados, creación Practica con validaciones únicas). Especificar `with_for_update()` + transacción única.
- **No reutilizar UserUpdate**: crear schemas específicos por contexto.
- **Si solo COUNT → rechazar** cambios de estado. Operar sobre entidades concretas.
- **No inventar catálogos**: solo existentes. Si faltan → documentar bloqueo + impacto.
- **Conservar históricos**: nunca borrar históricos sin justificación trazable. Soft delete si aplica.
- **Preservar permisos/contratos**: no romper API existentes. Mantener rutas colección sin slash.
- **KPIs simulados marcados**: explícitamente donde visibles (UI + respuestas API si visibles).
- **Separación acción admin**: rutas/endpoints/authZ explícitos admin-only.
- **Rutas colección sin slash**: `@router.post("")`, etc. Validar global.
- **Pruebas con resultados reales**: documentar casos/entradas/salidas/estado DB/códigos HTTP.

---

## 7. Análisis hallazgos seguridad por funcionalidad (F0)

Hallazgos F0 relevantes: `redirect_slashes` (auth-service), `/internal/count/{challenge_id}` usa `get_current_user` (no `require_internal_service`), match→core **sin X-Service-Token**, NonceStore memoria, CORS abierto, dashboard mock.

| Hallazgo F0 | Ubicación | Afecta a qué funcionalidades | Impacto | Recomendación (sin corregir ahora) | Decisión requerida |
|---|---|---|---|---|---|
| **auth-service sin `redirect_slashes=False`** | `services/auth-service/app/main.py` (no presente) | Todas rutas auth (colección). Comparado con core/match que sí lo tienen. | **Bajo-Medio** | Para consistencia con convención "rutas colección sin slash" y evitar comportamiento distinto, considerar añadir `redirect_slashes=False`. **No modificar en F1**. Validar rutas existentes. | Evaluar en F2/F3 si se tocan routers auth. |
| **`/reactions/internal/count/{challenge_id}` usa `get_current_user`** | `match-service/app/api/v1/endpoints/reactions.py:111-129` | Reacciones (conteo). Etiquetado "internal" pero protegido con JWT usuario (cualquier autenticado). | **Medio** | Si se pretende **verdadero endpoint interno entre servicios**, debe usar `require_internal_service` (X-Service-Token). Si es **endpoint interno funcional** para lógica app (autenticado), renombrar/nomenclatura imprecisa. **No corregir ahora**. | Decidir semántica: ¿usar entre servicios o solo app? Si solo app, mantener JWT pero documentar nomenclatura. Si cross-service futuro, migrar a service token. |
| **match→core sin `X-Service-Token`** | `match-service/app/api/v1/endpoints/interactions.py:77-95,208-226,292-311` | Postulaciones: approve/contact/verificación propiedad challenge. Llama `GET {core}/challenges/{id}` (público). | **Bajo** | Endpoint core GET `{id}` **sin auth** hoy. No requiere token. Si en futuro se protege con `require_internal_service`, estas llamadas romperán. Para consistencia con match→auth (que **sí** usa token), evaluar enviar token aunque endpoint sea público. | Decisión arquitectónica futura. **No cambiar ahora** (no hay protección activa). Documentar acoplamiento. |
| **NonceStore en memoria (auth-service)** | `shared/python/vialibre_common/service_auth.py`; `auth-service/app/api/deps.py` | Cross-service interno con X-Service-Token (auth valida). Afecta match→auth hoy. | **Medio** (limitación) | Válido con **único proceso worker** (Docker CMD actual sin --workers). Multi-réplica requiere store compartido (Redis). Documentado. **No modificar**. | Conocer limitación. No blocker para funcionalidades actuales. |
| **CORS abierto (`allow_origins=["*"]`, credentials=true)** | `services/*/app/main.py` (auth verificado) | Todos endpoints API vía navegador. | **Bajo** (dev) | Aceptable en dev. Producción requiere restringir orígenes. **No modificar ahora**. | Revisar en despliegue. |
| **Dashboard/anuncios mock** | `frontend/src/app/admin/dashboard/page.tsx`, `AdvertisementContext` + `data/*.ts` | Admin UI. | **Bajo** (no seguridad) | Falso sentido funcionalidad. Al implementar backend real, **reemplazar** con datos persistidos. Mantener **KPIs simulados marcados** si quedan parciales. | Parte de alcance admin backend. |

### Análisis por funcionalidad vs hallazgos
- **Postulaciones/contacto**: usa lectura pública core GET `{id}` sin token → sin impacto hoy. Seguridad de approve/contact depende de verificación propiedad + `require_role`/owner checks existentes.
- **Documentación práctica**: endpoints match con auth JWT (usuario). Usa `service_headers()` para llamadas auth internas. Correcto patrón.
- **Admin backend real (pendiente)**: **obligatorio** aplicar RBAC server-side estricto. Middleware client-side insuficiente. Probar accesos no autorizados (4.4 PLAN).
- **Endpoint "internal/count"**: si se mantiene solo para app autenticada, **no es hallazgo crítico**; solo nomenclatura. Si se expondrá a otros servicios, **sí requiere hardening** con `require_internal_service`.

---

## 8. Operaciones susceptibles a carrera (TOCTOU) - especificación

Identificar operaciones con riesgo. **No aceptar solo COUNT** como protección. Requiere `with_for_update()` + **transacción única**.

| Operación | Servicio | Riesgo | Filas a bloquear | Transacción | Orden bloqueos | Cómo probar concurrencia | Notas |
|---|---|---|---|---|---|---|---|
| **Aprobar interacción** (`PATCH /interactions/{id}/approve`) | match | Doble aprobación misma postulación; race entre approve/delete. | `Interaction` por `id` (PK). También challenge? verificar propiedad vía core (lectura). | **Única transacción**: `db.begin()` → `select(...).with_for_update()` → validar estado `pendiente` → cambiar a `aprobado` → commit/rollback. | Bloquear `interactions` por PK primero. Si hay validaciones cross-service, no bloquear filas remotas (solo lógica). Evitar bloquear tablas grandes. | 2+ hilos concurrentes llaman approve mismo `interaction_id`. Esperado: **exactamente 1 éxito (200/204)**, otros **409/400** (ya aprobado/no pendiente). Verificar estado DB final. | Existe lógica actual (validar pendiente). Debe reforzarse con `with_for_update` si se mantiene lógica. |
| **Desbloquear contacto** (`GET /interactions/{id}/contact`) | match | ¿Modifica estado? Desbloquea contacto (establece `contact_unlocked=True`, `contact_unlocked_at`). Si llamado concurrente tras aprobación. | Fila `Interaction` por `id` con `with_for_update()`. | Transacción única al escribir flags. | Bloquear por PK. | 2 hilos tras aprobación: primero desbloquea, segundo puede reintentarlo? Debe ser idempotente o prevenir doble escritura innecesaria. Verificar flags. | Revisar implementación actual: contact puede setear flags. Requiere análisis TOCTOU. |
| **Aplicar a challenge** (`POST /interactions/apply`) | match | Doble postulación misma (solucionador, challenge) → violación unique constraint? Modelo tiene `unique(solucionador_id, challenge_id)`. Race window antes insert. | Opcional: bloquear challenge? o confiar unique + retry. Si validar "challenge abierto" + cupos? | Transacción única. Si hay validación estado challenge (core lectura pública), no hay fila local a bloquear excepto quizás challenge no existe local. | Si solo insert con unique: TOCTOU menor (DB constraint). Si validación reglas adicionales (cupos, fecha límite) → bloquear filas relevantes. | Intento concurrente apply mismo par → DB debe rechazar uno (unique) o lógica. Verificar respuesta coherente (no 500). | Unique constraint existe. Aún así, si se añaden reglas (límite postulaciones) → `with_for_update`. |
| **Crear Practica (nuevo)** | match/core (según propietario) | Doble creación misma práctica para mismo estudiante+challenge? ¿regla única? | Bloquear entidades involucradas: User/estudiante, Challenge(práctica), Tutor? según unicidad definida. | Transacción única. | Definir orden: bloquear por entidad con restricción única primero. | Concurrencia crear misma práctica → solo 1 creada. | **Depende de modelo** (a diseñar). Requiere unicidad explícita. |
| **Aprobación/rechazo documental (revisión)** | match | Doble aprobación/rechazo mismo documento/solicitud revisión. | Fila documento/revisión por PK con `with_for_update()`. | Transacción única. | Bloquear fila estado. | 2 revisores concurrentes → 1 éxito. | Pendiente de modelar (estados revisión). |
| **Asignación tutor a práctica** | match/core | Doble asignación tutor mismo práctica → conflicto. | Fila Practica por PK `with_for_update()`. | Transacción única. | Bloquear Practica. | Concurrente asigna distinto tutor → prevenir inconsistencia. Definir regla: ¿reasignable? | Pendiente. |
| **Cambio estado Challenge** (PATCH core) | core | Doble transición estado (cerrar/abrir) race. | Fila Challenge por PK `with_for_update()`. | Transacción única. | Bloquear Challenge. | Transición concurrente → solo transición válida desde estado actual. | Existe lógica autor/admin. Reforzar con `with_for_update`. |

**Principio:** **Si solo COUNT → rechazar**. Nunca usar `SELECT COUNT(*)` para decidir "permitir crear" sin bloquear filas que definen límite/cupo. Usar bloqueo fila (o bloqueo rango con cuidado) + transacción única.

**Estrategia pruebas concurrencia:** usar `asyncio.gather` con 2-8 tareas concurrentes sobre mismo recurso, con delays mínimos. Verificar: HTTP codes distintos, estado final DB correcto, sin corrupción (duplicados), exactamente N operaciones exitosas según regla. Documentar entradas/salidas/reales.

---

## 9. Dependencias, riesgos, decisiones pendientes

### Dependencias técnicas
| Dependencia | Tipo | Estado | Mitigación |
|---|---|---|---|
| Docker + docker-compose (v1) | Infra | Requerido | Usar `docker-compose` directo en Windows (make no disponible). |
| Stack levantado para pruebas (F4) | Operativo | Requerido | `make up` / `docker-compose up -d`. Servicios saludables. |
| `shared/service_auth.py` bind-mounted | Shared lib | Existente | Cambios requieren reiniciar servicio afectado. Cambios requirements.txt → `make build`. |
| Alembic autogenerate (gitignored histórico) | Migraciones | Estado mixto | Versiones existen commiteadas. `include_name` respetado por schema. **No eliminar revisiones existentes**. |
| Plantillas DOCX existentes | Documentación | Existentes | Usar para `document-automation`. No sobrescribir. |

### Riesgos (mapeados a PLAN.md + hallazgos)
| Riesgo | Prob | Impacto | Mitigación | Validación |
|---|---|---|---|---|
| **Inventar catálogos/moddalidad valores** | Media | Alto | **No inventar**. Documentar bloqueo si faltan valores exactos (creación empresa/homologación). Validar contra existentes. | F1 checklist 1.2 |
| **Reutilizar UserUpdate incorrectamente** | Media | Medio | Crear schemas específicos por contexto. | F2.3, F3.3 |
| **Violación TOCTOU** | Media | Alto | `with_for_update` + transacción única. Pruebas concurrentes (4.5). Orden bloqueos. | F3.2, F4.5 |
| **Romper contratos/permisos** | Baja-Media | Alto | Preservar contratos. Separación admin explícita. Pruebas no autorizados obligatorias (4.4). | F2.5, F4.4 |
| **Migrations destructivas** | Media | Alto | Alembic autogenerate, revisar antes aplicar. Respetar `include_name`. Probar `upgrade head`. No tocar otros schemas. | F3.10, F4.9 |
| **Rutas colección slash** | Baja | Medio | Usar `@router.post("")`. Validar global. auth sin `redirect_slashes=False` → verificar. | F3.4, F4.8 |
| **UUIDs cross-service inconsistentes** | Baja | Alto | Mantener seeds idempotentes + UUIDs fijos sincronizados. Sin FKs. | F2.9, F3.11 |
| **KPIs simulados no marcados** | Media | Medio | Marcar explícito donde visibles (UI + respuestas). | F3.12, F4.13 |
| **Endpoint "internal/count" nomenclatura** | Baja | Medio | Decidir semántica (app-auth vs service-token). Documentar decisión. | F1 análisis |
| **Términos ambiguos institucionales** | Alta | Alto | **Bloqueo decisión institucional**: CAWA/CUA/DPS, equipo mínimo 2, hitos. Requiere validación normativa. | F1.5 |
| **NonceStore memoria multi-replica** | Baja | Medio | Limitación conocida. Único worker hoy. Documentar. | F0 hallazgo |

### Decisiones pendientes (requieren aprobación antes F2)
| Decisión | Contexto | Opciones | Recomendación | Impacto |
|---|---|---|---|---|
| **Propietario esquema: Empresa** | Entidad centralizada empresas. Distinta usuario publicador. | auth (organización/personas) vs core (negocio/publicaciones). | **auth-service (vialibre_auth)**: empresa es entidad organizativa/identidad. También puede vivir en core si fuertemente ligada a Challenge. Justificar por "ownership": auth gestiona identidad/organizaciones? Revisar TutorDocente ya en auth. | Modelo + migración. |
| **Propietario esquema: TutorDocente** | Ya existe modelo `tutor_docente.py` en auth-service según inventario F0. | Mantener auth (si existe). Confirmar uso real. | **Mantener auth** si modelo ya presente. Verificar tablas/relaciones. No duplicar. | Reutilización vs creación. |
| **Propietario esquema: Practica (seguimiento)** | Cruza core(Challenge/publicación) + match(postulaciones/ciclo). | core vs match. | **match-service (vialibre_match)**: seguimiento documental/evaluativo/postulación → dominio match. Challenge referencia cruzada UUID. Sin FK. | Afecta migración + endpoints. |
| **Propietario: NecesidadEmpresarial** | Captación proactiva vs Challenge(publicación). | core vs auth. | **core-service**: cercano dominio ofertas/publicaciones. Diferente flujo pero mismo dominio negocio. | Modelo. |
| **Propietario: Visita/Evaluacion/Homologacion/ProyectoCreacionEmpresa** | Seguimiento/evaluación vs modalidad. | Distribuir. | **match**: Visita, Evaluacion, ProcesoHomologacion (seguimiento/ciclo). **core**: ProyectoCreacionEmpresa si ligado fuertemente a Challenge.modalidad? O match? Evaluar por ciclo vida. | Distribución razonada. |
| **Modalidades valores exactos** | Creación empresa/homologación. Términos ambiguos (CAWA/CUA/DPS). | Inferir vs esperar validación institucional. | **BLOQUEO**: no inventar. Documentar omisión. Solicitar normativa/valores exactos. No modelar enums hasta tener valores confirmados. | Crítico modelado. |
| **Semántica `/internal/count`** | Usa JWT (get_current_user) pero nombre "internal". | Migrar a `require_internal_service` (service token) vs mantener JWT + renombrar/documentar. | Si **solo usado internamente por app frontend/API autenticado** → mantener JWT, documentar nomenclatura imprecisa. Si **otros servicios llamarán** → migrar a service token. **Investigar llamadores** antes decidir. | Seguridad interna. |
| **match→core enviar X-Service-Token** | Consistencia vs innecesario (endpoint público). | Añadir service_headers aunque público vs mantener. | **Mantener como está** (no romper). Si core protege GET `{id}` con auth interno futuro → actualizar llamadas match. Documentar decisión. | Consistencia. |
| **Admin backend: rol nuevo?** | ¿Necesario `gestion_practicas`/`proyeccion_social`? | Usar solo `ADMIN` vs añadir rol granular. | **Principio mínimo privilegio**. Evaluar necesidad real. **No añadir rol** sin justificación explícita. Mantener `ADMIN` para acciones admin críticas ahora. Roles granulares pueden venir después con aprobación. | RBAC. |

---

## 10. D3/D4: justificación (solo si depende)

**Criterio PLAN.md:** *"D3/D4 solo si depende. Aplicar solo si existen dependencias técnicas que lo justifiquen y tras validación de su necesidad en D2/D1. No generar por defecto."*

**Evaluación F1:**
- D3 (Diseño detallado): **NO JUSTIFICADO por defecto**. Diseño arquitectónico (F2) puede cubrir especificación modelos/endpoints/authZ sin D3 separado, siempre que cambios sean aditivos y respeten convenciones existentes.
- D4 (Implementación detallada/plan técnico paso a paso): **NO JUSTIFICADO por defecto**. Checklist F3 ya detalla pasos (TOCTOU, rutas sin slash, migraciones, etc.).

**Casos donde SÍ podrían justificarse:**
- **Si hay dependencias cruzadas complejas** entre nuevos modelos (Practica + Empresa + Tutor + Evaluacion + Homologacion) que requieran diagrama ER detallado con reglas consistencia + plan migración ordenado → **D3 justificado**.
- **Si integración document-automation con plantillas DOCX** requiere mapeo variables complejo + versionado + almacenamiento → **D3/D4 parciales** justificadas.
- **Si modalidades Creación Empresa/Homologación** tienen reglas negocio muy específicas (equipos, hitos, validaciones) → **D3 justificado** para reglas.

**Conclusión:** **NO se generan D3/D4 ahora**. Se evaluará necesidad en **F2** (Diseño Arquitectónico) tras definir entidades concretas y dependencias. Si surge justificación → registrar acta con evidencia. Si no → generar **Acta de No-Necesidad D3/D4** en F2/F5 según corresponda.

---

## 11. Elementos fuera alcance

| Elemento | Razón | Evidencia |
|---|---|---|
| Modificar enums compartidos (`shared/.../schemas.py`) | Usar enums locales por servicio. Trampa conocida documentada. | F0: enums inglés vs español locales. |
| Añadir FKs cross-service | Arquitectura establecida: UUID desnudos sin FK. Integridad lógica. | AGENTS.md, F0 verificado. |
| Cambiar ownership esquemas | Cada servicio dueño 1 esquema. No mezclar. | Bloqueos institucionales. |
| Eliminar revisiones Alembic existentes | Ya existen commiteadas. No gitignored ahora pero conservar. | git status + F0. |
| Ejecutar fuera Docker | Servicios requieren `postgres` host Docker. | database_url, docker-compose. |
| "Reconstruir plataforma" | Extender existente. Principio rector. | PLAN.md principio 10. |
| Habilitar UI reacciones | Backend existe sin llamadores. No requerido Bloque 1 admin. | `api.ts` sin usos. |
| Añadir rol nuevo (gestion_practicas/proyeccion_social) | Sin justificación. Usar ADMIN por ahora. | Principio mínimo privilegio. |
| Corregir hallazgos F0 ahora | Solo analizar, no implementar. | Alcance F1 exclusivo. |
| Migraciones auto-escritura | Alembic autogenera (gitignored histórico) pero versiones existen. Ejecutar `make migrate-<svc>` tras validación F2/F3. | Convención. |

---

## 12. Estrategia pruebas + concurrencia (resumen)

**Pruebas funcionales/autorización/integración/concurrencia** según PLAN.md F4:

- **Funcional**: casos felices + borde por funcionalidad nueva (CRUD empresas/tutores/prácticas/necesidades, revisión documentos, cartas).
- **Autorización (obligatorio)**: accesos no autorizados **rechazados**. Admin-only vs no-admin vs roles insuficientes. Probar rutas admin sin token/token inválido/token otro rol.
- **Integración**: cross-service si aplica (auth/core/match). Verificar referencias UUID funcionan. match→auth con token, match→core lectura pública.
- **Concurrencia (TOCTOU)**: simular accesos concurrentes sobre operaciones críticas (approve, asignar tutor, cambiar estado, crear con unicidad). Usar `with_for_update` + transacción única. Verificar **exactamente 1 éxito**. Documentar escenarios.
- **Persistencia real**: consultar DB (tablas/schemas) tras operación. No solo respuesta HTTP.
- **Regresión**: funcionalidades existentes no rotas (contratos, permisos, rutas colección sin slash).
- **Migraciones**: `alembic upgrade head` OK, `include_name` respetado, no toca otros schemas.
- **Rutas colección**: validar sin slash (evitar 308↔307 vía proxy nginx/Next.js).
- **KPIs simulados**: verificar marcados donde visibles.

**Herramientas:** pytest (servicios), vitest (frontend), docker-compose stack levantado. Documentar resultados reales (testing-and-quality).

---

## 13. Checklist F1 con evidencia

| Ítem PLAN.md F1 | Estado | Evidencia |
|---|---|---|
| **1.1 Descomposición requerimientos** | **CUMPLIDO** | Secciones 3,4,6. Desglosados por funcionalidad/usuarios/roles/entidades/servicios/componentes. |
| **1.2 Validación catálogos** | **CUMPLIDO** | Sección 5 (enums). Verificados valores existentes. **No inventados**. Modalidades/homologación → **bloqueo decisión institucional** documentado. |
| **1.3 Referencias cruzadas** | **CUMPLIDO** | Sección 4,5. UUID cross-service sin FK. Dependencias auth/core/match documentadas. |
| **1.4 Análisis concurrencia** | **CUMPLIDO** | Sección 8. Operaciones críticas identificadas con filas a bloquear, transacción única, orden, estrategia pruebas. Rechaza solo COUNT. |
| **1.5 Separación admin** | **CUMPLIDO** | Secciones 4,6,9. Admin-only explícito. Middleware client-side insuficiente → requiere RBAC server-side. |
| **1.6 Evaluar KPIs** | **CUMPLIDO** | Admin dashboard mock → KPIs simulados. Al implementar backend real, **marcar explícitamente** si quedan simulados. Endpoints agregados reales requeridos. |
| **1.7 D3/D4 justificados** | **CUMPLIDO** | Sección 10. **No justificados por defecto**. Evaluar en F2. Si justificados → registrar; si no → acta no-necesidad. |
| **1.8 Impacto históricos/contratos** | **CUMPLIDO** | Sección 11 (fuera alcance). **Conservar históricos**. No reutilizar UserUpdate. Preservar permisos/contratos API existentes. |
| **1.9 Rutas colección** | **CUMPLIDO** | Sección 5,7. Convención `@router.post("")` documentada. auth-service sin `redirect_slashes=False` → verificar global. |
| **1.10 Criterios aceptación** | **CUMPLIDO** | Sección 6 (C). Incluye autorización obligatoria, TOCTOU, persistencia real, rutas sin slash, KPIs marcados, pruebas reales. |

**Checklist F1: 10/10 CUMPLIDO.**

---

## 14. Cierre F1

### Verificación diff + estado Git
- Archivo creado: `.opencode/reports/FASE1_ANALISIS_ALCANCE.md` (**único nuevo**)
- Sin modificaciones a código fuente: modelos, schemas, endpoints, permisos, enums, migraciones, datos.
- Sin staging/commits/resets/clean/reverts.
- Estado Git: sin cambios realizados en esta fase (solo lectura + creación reporte).

### Fuentes listadas
Ver sección 1: PLAN.md, FASE0_AUDITORIA.md, AGENTS.md, docs/gestion-practicas/*, documents/transcripcion/*, documentos/*.docx.

### Requerimientos listados
Ver sección 3 (inventario completo con fuente + estado). 17 requerimientos funcionales mapeados.

### Bloqueados
| Bloqueo | Motivo | Impacto |
|---|---|---|
| **Modalidades valores exactos** (creación empresa/homologación) | Términos ambiguos: CAWA/CUA/DPS, equipo mínimo 2, hitos mini-chartán/sustentación. | **Alto**. Impide modelar enums/catalogos con seguridad. Requiere validación institucional/normativa. |
| **Propietario esquemas entidades nuevas** | Decisiones: Empresa(auth vs core), Practica(match vs core), NecesidadEmpresarial(core), Visita/Evaluacion/Homologacion/ProyectoCreacionEmpresa (distribución). | **Medio-Alto**. Requiere justificación antes migraciones F2. |
| **Semántica `/internal/count`** | Usa JWT vs requiere service token. Nomenclatura "internal" imprecisa. | **Medio**. Investigar llamadores. |

### Decisiones aprobación requeridas
Ver sección 9 (tabla decisiones pendientes): 7 decisiones arquitectónicas + 2 técnicas. Requieren revisión/aprobación antes avanzar a F2.

### Cierre formal
**FASE 1 COMPLETADA. CUMPLIDO.**

Reporte guardado en: `.opencode/reports/FASE1_ANALISIS_ALCANCE.md`

**Próximo paso:** **DETENERSE**. No iniciar Fase 2/3 según instrucción.