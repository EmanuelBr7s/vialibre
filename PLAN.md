# PLAN FINAL INTEGRADO - VíaLibre

## Índice

1. [Principios](#principios)
2. [Bloqueos Institucionales](#bloqueos-institucionales)
3. [Fase 0: Preparación y Auditoría](#fase-0-preparación-y-auditoría)
4. [Fase 1: Análisis y Alcance](#fase-1-análisis-y-alcance)
5. [Fase 2: Diseño Arquitectónico](#fase-2-diseño-arquitectónico)
6. [Fase 3: Implementación Controlada](#fase-3-implementación-controlada)
7. [Fase 4: Validación y Pruebas](#fase-4-validación-y-pruebas)
8. [Fase 5: Cierre, Documentación y Entrega](#fase-5-cierre-documentación-y-entrega)
9. [Paralelizable vs Serie](#paralelizable-vs-serie)
10. [Riesgos + Mitigaciones](#riesgos--mitigaciones)
11. [Criterios Globales de Aceptación](#criterios-globales-de-aceptación)
12. [Acta de Omisión](#acta-de-omisión)
13. [Regla Resumen](#regla-resumen)

---

## Principios

La aplicación de este plan debe seguir estrictamente los siguientes principios rectores:

### Seguridad y Concurrencia
- **TOCTOU con `with_for_update` + transacción única**: Toda operación de modificación sobre recursos que puedan ser accedidos concurrentemente debe utilizar bloqueos a nivel de fila (`SELECT ... FOR UPDATE`) dentro de una única transacción, eliminando la ventana de tiempo entre verificación y actualización (Time-of-Check to Time-of-Use).
- **Transacción única**: Las operaciones relacionadas que constituyen una unidad atómica deben ejecutarse dentro de una única transacción para garantizar consistencia y rollback automático ante fallos.

### Integridad de Datos y Contratos
- **No reutilizar `UserUpdate`**: Los esquemas, DTOs o modelos de actualización deben ser específicos para cada contexto de uso. No se reutilizarán esquemas genéricos cuando el dominio exige semánticas distintas.
- **No inventar catálogos**: No se crearán catálogos, enums o valores hardcodeados no existentes en el sistema. Solo se utilizarán los ya definidos en el código base (locales por servicio y compartidos cuando corresponda).
- **Conservar históricos**: No se eliminarán ni sobrescribirán datos históricos sin justificación explícita y trazable. Todo cambio debe preservar la auditabilidad y la integridad de los registros existentes.
- **Preservar permisos/contratos**: Cualquier modificación debe preservar los contratos de API existentes, la semántica de permisos (RBAC) y los acuerdos establecidos entre servicios. No se romperán interfaces públicas sin evaluación explícita.

### Semántica y Correctitud
- **Si solo COUNT → rechazar**: Las operaciones que únicamente consultan conteos no deben desencadenar cambios de estado. Si una funcionalidad requiere modificar estado, debe operar sobre entidades concretas, no sobre agregados aislados sin contexto.
- **Separación acción admin**: Las acciones administrativas deben estar claramente separadas del flujo operativo/usuario. Se debe mantener una distinción explícita entre endpoints, lógica y autorización para operaciones admin vs. no-admin.
- **KPIs simulados marcados**: Cualquier KPI, métrica o dato presentado como resultado que sea simulado (mock), estimado o no derivado directamente de datos persistidos debe estar **marcado explícitamente** como tal en la documentación, respuestas API y UI cuando sea visible al usuario o en reportes.
- **D3/D4 solo si depende**: Las decisiones o entregables D3 (diseño detallado) y D4 (implementación detallada/plan técnico) solo se elaborarán cuando existan dependencias técnicas que lo justifiquen y tras la validación de su necesidad en D2/D1. No se generarán por defecto.

### API y Flujo de Aplicación
- **Rutas colección sin slash**: Las rutas de colección deben registrarse **sin barra diagonal final** (ej. `@router.post("")`, `@router.get("")`). Esto evita los loops de redirección 308↔307 a través del proxy de Nginx/Next.js, conforme a la convención establecida en el proyecto.
- **F5 acta de omisión si vacía**: En la Fase 5 (Cierre), si no existen hallazgos, pendientes u omisiones relevantes, se debe generar un **Acta de Omisión** explícita que documente esta circunstancia. Si existe información relevante, debe registrarse en el acta correspondiente.

---

## Bloqueos Institucionales

Estos elementos son bloqueantes y **no pueden** omitirse antes de avanzar entre fases críticas:

- [ ] **Integridad arquitectónica**: Confirmación de alineación con la arquitectura monorepo (3 microservicios FastAPI + Next.js 14 + PostgreSQL 3 esquemas + Nginx). Cualquier desviación requiere justificación documentada.
- [ ] **Cumplimiento de esquemas**: Cada servicio mantiene su propio schema (`vialibre_auth`, `vialibre_core`, `vialibre_match`). No se permite mezclar o asumir acceso cruzado a esquemas ajenos.
- [ ] **Migrations controladas**: Alembic autogenera revisiones (gitignored). Se debe ejecutar migración (`make migrate-<svc>`) únicamente tras validación del cambio de modelo, con `include_name` respetado por servicio.
- [ ] **Enumerados locales**: Respetar la distinción entre enums compartidos (`shared/...`) y **enums locales por servicio** (trampa conocida: editar enum local, no el compartido). Verificación obligatoria.
- [ ] **Cross-service sin FK**: Referencias entre servicios son UUIDs desnudos, **sin constraints FK**. Esto debe preservarse. Comunicación vía `httpx` con URLs de settings.
- [ ] **Seeds idempotentes y UUIDs sincronizados**: Cualquier cambio a seeds debe mantener idempotencia y la sincronización de UUIDs fijos entre servicios (auth/core/match).
- [ ] **Autorización preservada**: Verificación obligatoria de no debilitar RBAC/permisos existentes. Acciones admin separadas y probadas contra accesos no autorizados.
- [ ] **Rutas colección sin slash**: Validación de convención en todos los routers nuevos/modificados.
- [ ] **Stack operativo**: Reconocimiento de que servicios no corren fuera de Docker (DB host `postgres`). Cambios que asuman ejecución host-only deben descartarse.

---

## Fase 0: Preparación y Auditoría

**Objetivo**: Obtener línea base, evitar reconstruir plataforma y establecer contexto completo antes de modificar código.

### Checklist

- [ ] **0.1 Activar auditoría de código base**: Cargar/considerar `codebase-audit` (SKILL) para mapear los 3 microservicios, frontend Next.js 14, librería compartida, schemas y comandos existentes.
- [ ] **0.2 Revisar AGENTS.md y convenciones**: Leer `AGENTS.md`, layout, comandos Make/docker-compose, gotchas y skills locales. Confirmar entendimiento.
- [ ] **0.3 Verificar estado del repositorio**: Comprobar rama, cambios sin commit, archivos no rastreados. Documentar estado limpio o con trabajo existente.
- [ ] **0.4 Mapear modelos, endpoints y schemas**: Identificar entidades, enums (locales vs compartidos), rutas existentes (verificar colección sin slash), middlewares/autorización.
- [ ] **0.5 Identificar skills relevantes**: Evaluar necesidad de activar skills adicionales (auth-rbac-security, database-design, admin-dashboard, document-automation, testing-and-quality) según alcance.
- [ ] **0.6 Levantar stack si necesario**: Confirmar `make up`/estado servicios. No asumir ejecución fuera de contenedores.
- [ ] **0.7 Definir alcance explícito**: Delimitar qué NO se modifica (áreas fuera de alcance) para prevenir scope creep.
- [ ] **0.8 Establecer criterios de auditoría**: Registrar hallazgos (lectura, no destructiva). Todo hallazgo debe quedar documentado.

**Salida esperada**: Inventario de código base, convenciones confirmadas, alcance acordado, skills activados si procede.

---

## Fase 1: Análisis y Alcance

**Objetivo**: Analizar requerimientos, validar contra principios y definir alcance detallado sin inventar catálogos.

### Checklist

- [ ] **1.1 Descomposición de requerimientos**: Desglosar necesidades en entidades, operaciones (CRUD), flujos, roles/permisos y casos borde.
- [ ] **1.2 Validación de catálogos**: Verificar que valores/estados existen. **No inventar catálogos**. Si no existen → documentar omisión o requerir extensión justificada.
- [ ] **1.3 Identificar referencias cruzadas**: Mapear UUIDs entre servicios, dependencias entre auth/core/match. Confirmar sin FKs.
- [ ] **1.4 Análisis de concurrencia**: Identificar operaciones con riesgo TOCTOU (transiciones de estado, asignaciones, conteos con efectos). Definir necesidad de `with_for_update`.
- [ ] **1.5 Separación admin**: Determinar qué acciones son admin-only. Diseñar separación explícita (rutas, authZ).
- [ ] **1.6 Evaluar KPIs**: Identificar métricas. Marcar si serán **simulados** (con justificación). Si solo COUNT → rechazar para cambios de estado.
- [ ] **1.7 D3/D4 justificados**: Evaluar si diseño/implementación detallada requiere D3/D4. Aplicar **solo si depende**. Registrar decisión.
- [ ] **1.8 Impacto en históricos y contratos**: Confirmar que no rompe contratos/permisos. **Conservar históricos**. No reutilizar `UserUpdate` si requiere semántica distinta.
- [ ] **1.9 Rutas colección**: Planificar endpoints de colección **sin slash**. Documentar convención.
- [ ] **1.10 Definir criterios de aceptación**: Especificar verificables, incluyendo pruebas de autorización (acceso no autorizado debe fallar).

**Salida esperada**: Alcance validado, matriz de riesgos, decisiones D3/D4 (o acta de no-necesidad), criterios de aceptación por funcionalidad.

---

## Fase 2: Diseño Arquitectónico

**Objetivo**: Diseñar cambios coherentes con plataforma existente, respetando bloqueos institucionales.

### Checklist

- [ ] **2.1 Diseño a nivel servicio**: Especificar cambios por servicio (auth/core/match). Cada uno en su schema. Preservar ownership.
- [ ] **2.2 Modelo de datos**: Si hay cambios de esquema → seguir `database-design`. Reutilizar entidades, evitar duplicidades, mantener integridad. Planificar migración Alembic (autogenerada). Importar modelos en `models/__init__.py` y considerar `alembic/env.py` (restricción por schema).
- [ ] **2.3 Esquemas/API**: Diseñar Pydantic schemas coherentes. **No reutilizar UserUpdate**. Mantener contratos existentes. Preservar backward compatibility cuando aplique.
- [ ] **2.4 TOCTOU + transacción única**: Para operaciones críticas, especificar patrón: `with_for_update` + `db.begin()`/transacción única. Documentar filas bloqueadas y orden para evitar deadlocks.
- [ ] **2.5 Autorización RBAC**: Diseñar permisos mínimos (least privilege). **Separación acción admin** explícita. Probar accesos no autorizados. Ver auth-rbac-security.
- [ ] **2.6 Cross-service**: Si hay llamadas entre servicios → HTTP vía `httpx` con settings. Referencias UUID desnudas, **sin FK**. No asumir acceso a otro schema.
- [ ] **2.7 Frontend (Next.js 14)**: Si afecta UI admin → seguir `admin-dashboard`. Consistente con estructura App Router, `@/*`, middleware auth, API client `lib/api.ts`. Preservar cookies/JWT.
- [ ] **2.8 Documentación/plantillas**: Si implica DOCX/PDF → `document-automation`, conservar formato, editable, versionado/autoguardado si aplica.
- [ ] **2.9 Seeds**: Si afectan seeds → mantener idempotencia, UUIDs sincronizados. No romper referencias existentes.
- [ ] **2.10 Diseño de pruebas**: Plan de validación (funcional, integración, seguridad, regresión). Incluir verificación de persistencia real de datos. Preparar para testing-and-quality.

**Salida esperada**: Diseño arquitectónico validado, plan de migración, especificación TOCTOU/transacciones, diseño de autorización y plan de pruebas.

---

## Fase 3: Implementación Controlada

**Objetivo**: Implementar cambios aplicando principios estrictamente, con modificaciones pequeñas y verificables.

### Checklist

- [ ] **3.1 Seguir convenciones de código**: Coherente con estilo, naming, patrones del código circundante. Investigar archivos desconocidos antes de modificar/borrar.
- [ ] **3.2 Aplicar TOCTOU correctamente**: Usar `with_for_update()` en queries de filas a modificar, dentro de **transacción única**. Evitar múltiples transacciones donde deba ser atómica. Orden de bloqueos definido.
- [ ] **3.3 Respetar esquemas DTOs**: Crear schemas específicos cuando cambie semántica. **No reutilizar UserUpdate**. Mantener contratos.
- [ ] **3.4 Endpoints colección sin slash**: Registrar con `@router.post("")`, `@router.get("")` etc., sin `/` final. Validar rutas.
- [ ] **3.5 Lógica de negocio correcta**: **Si solo COUNT → rechazar** cambios de estado. Operar sobre entidades concretas. Validar reglas de dominio.
- [ ] **3.6 Autorización aplicada**: Verificar dependencias/authZ, **separación acción admin**. Probar paths no autorizados.
- [ ] **3.7 Preservar históricos**: No borrar históricos. Soft delete si aplica (con justificación). Mantener trazabilidad.
- [ ] **3.8 Enums correctos**: Usar enums locales del servicio (no compartidos) donde corresponda. Verificar no editar shared incorrectamente.
- [ ] **3.9 Shared lib**: Si cambia `shared/python/...`, recordar que es bind-mounted (reiniciar servicio). Si cambia `requirements*.txt` → `make build`.
- [ ] **3.10 Migraciones**: Tras cambios de modelos: asegurar import en `models/__init__.py`. Ejecutar `make migrate-<svc>` con MSG descriptivo. Revisar revisión autogenerada (gitignored) antes de aplicar upgrade. Respetar `include_name`.
- [ ] **3.11 Seeds y datos**: Mantener idempotencia, UUIDs sincronizados. No corromper referencias cross-service.
- [ ] **3.12 KPIs simulados**: Marcar explícitamente cualquier KPI simulado en código/docs/respuestas donde sea visible.
- [ ] **3.13 Cambios atómicos y verificables**: Commits lógicos, pequeños. Documentar decisiones no obvias inline cuando corresponda.

**Salida esperada**: Implementación que cumple principios, migraciones validadas, rutas con convención correcta, TOCTOU aplicado.

---

## Fase 4: Validación y Pruebas

**Objetivo**: Verificar funcionalidad, seguridad, persistencia y regresión con resultados reales documentados.

### Checklist

- [ ] **4.1 Preparar entorno de pruebas**: Stack levantado (`make up`). Servicios saludables. DB con schemas/migraciones aplicadas.
- [ ] **4.2 Pruebas funcionales**: Ejecutar casos de uso principales. Verificar flujos felices y casos borde.
- [ ] **4.3 Pruebas de integración**: Validar interacciones entre servicios si aplican (HTTP cross-service). Verificar referencias UUID funcionan.
- [ ] **4.4 Pruebas de seguridad y autorización**: **Obligatorio** — accesos no autorizados deben ser rechazados. Probar admin vs no-admin, roles insuficientes. Ver auth-rbac-security.
- [ ] **4.5 Pruebas de concurrencia (TOCTOU)**: Simular accesos concurrentes sobre operaciones con `with_for_update`. Verificar que bloqueos previenen condición de carrera. Documentar escenarios probados.
- [ ] **4.6 Verificar persistencia real**: Confirmar datos se **guardan realmente** en DB (no solo respuesta). Consultar tablas/schemas correspondientes.
- [ ] **4.7 Regresión**: Verificar funcionalidades existentes no se rompen (contratos, permisos, rutas). Revisar endpoints afectados.
- [ ] **4.8 Validación de convenciones**: Confirmar rutas colección **sin slash** (no generan 308↔307). Probar a través de proxy Nginx/Next.js si aplica.
- [ ] **4.9 Validación de migraciones**: `alembic upgrade head` funciona, `include_name` correcto (no toca otros schemas). Version tables correctas.
- [ ] **4.10 Seeds**: Ejecutar/validar idempotencia si tocados.
- [ ] **4.11 Frontend**: Si UI cambia, `npm run lint` en frontend. Probar flujo auth/middleware, API calls.
- [ ] **4.12 Documentar resultados reales**: **testing-and-quality** — registrar resultados concretos (casos, entradas, salidas, estado DB, HTTP codes). No dejar como "teórico".
- [ ] **4.13 Verificar KPIs marcados**: Confirmar simulados están explícitamente marcados donde visibles.

**Salida esperada**: Reporte de pruebas con resultados reales, validación de seguridad/concurrencia, checks de regresión aprobados.

---

## Fase 5: Cierre, Documentación y Entrega

**Objetivo**: Cerrar formalmente, documentar omisiones, asegurar trazabilidad y dejar estado limpio.

### Checklist

- [ ] **5.1 Consolidar hallazgos**: Recopilar cambios, decisiones, trade-offs, justificaciones (especialmente D3/D4, KPIs simulados, TOCTOU).
- [ ] **5.2 Acta de Omisión (F5)**: Aplicar **F5 acta de omisión si vacía**. Si no hay hallazgos/pendientes relevantes → generar **Acta de Omisión** explícita documentando esta circunstancia. Si hay elementos relevantes → registrarlos en acta correspondiente.
- [ ] **5.3 Documentación actualizada**: Actualizar README/AGENTS.md relevantes si cambian convenciones, comandos o arquitectura. No inventar si no aplica.
- [ ] **5.4 Revisar bloqueos institucionales**: Verificar todos los bloqueos marcados como cumplidos. Cerrar checklist.
- [ ] **5.5 Validación final de principios**: Confirmar cumplimiento de todos los principios (TOCTOU+transacción única, no reutilizar UserUpdate, si solo COUNT→rechazar, no inventar catálogos, conservar históricos, rutas sin slash, preservar permisos/contratos, KPIs simulados marcados, separación acción admin, D3/D4 solo si depende).
- [ ] **5.6 Estado git**: Revisar cambios, staging apropiado. Mensajes de commit descriptivos, atómicos si procede.
- [ ] **5.7 Limpieza y verificación stack**: Estado servicios coherente. No dejar procesos inesperados. Volúmenes/DB intactos salvo cambios planeados.
- [ ] **5.8 Entrega/entregables**: Confirmar todo solicitado está completo (PLAN.md creado según especificación). Verificar estructura completa.
- [ ] **5.9 Cierre formal**: Registrar conclusión y próximos pasos si existen (solo si relevantes). No crear tareas inventadas.

**Salida esperada**: Acta de Omisión (conforme F5), documentación actualizada si aplica, cambios commiteados adecuadamente, validación completa de principios y bloqueos.

---

## Paralelizable vs Serie

| Actividades | Paralelizable | Serie | Notas |
|---|---|---|---|
| **0.1–0.5 Auditoría y skills** | **Sí** | | Lectura de archivos, mapeo, identificación skills. Sin modificaciones DB/código. |
| **0.6 Levantar stack** | | **Sí** (bloquea tests/ejecución) | Requiere orden: stack up antes de validar migraciones/servicios. |
| **1.1–1.10 Análisis y alcance** | **Sí** | | Análisis conceptual, sin cambios destructivos. Puede paralelizar con lectura. |
| **2.1–2.10 Diseño** | Parcial | **Serie (validación)** | Diseño por servicio puede solaparse, pero validación bloqueos institucionales debe ser secuencial antes de implementación. |
| **3.1–3.6 Núcleo implementación** | | **Sí (ordenado)** | TOCTOU+transacción única, modelos→schemas→endpoints→authZ: mejor serie para evitar inconsistencias. |
| **3.7–3.13 Detalles (migraciones, seeds, shared)** | Parcial | **Serie con checkpoints** | Migraciones tras modelos (serie). Shared build requiere orden. KPIs marcados durante implementación. |
| **4.1–4.2 Funcionales** | **Sí** | | Pruebas independientes por endpoint/flujo. |
| **4.3–4.6 Integración/seguridad/persistencia/concurrencia** | Parcial | **Serie crítica** | Seguridad (4.4) y concurrencia TOCTOU (4.5) **no paralelizables entre sí** como validación final; deben ejecutarse tras funcionales. Persistencia (4.6) verifica estado real. |
| **4.7–4.13 Regresión y validación** | **Sí** | | Verificaciones complementarias, tras críticas aprobadas. |
| **5.1–5.9 Cierre** | Parcial | **Serie (bloqueo entrega)** | Acta de Omisión (5.2) y validación final principios/bloqueos (5.5) deben ser secuenciales y completas antes de cierre. |

**Regla**: Lectura/auditoría/análisis/diseño conceptual pueden paralelizarse. **Implementación ordenada, validación crítica (seguridad + concurrencia TOCTOU) en serie**. Cierre siempre secuencial y verificable.

---

## Riesgos + Mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación | Responsable/Validación |
|---|---|---|---|---|
| **Violación TOCTOU** (condición carrera) | Media | Alto | Usar `with_for_update` + transacción única. Orden de bloqueos definido, pruebas concurrentes (4.5). | Implementación + Pruebas (F3–F4) |
| **Romper contratos/permisos** | Baja-Media | Alto | Preservar contratos, separación admin, pruebas no autorizados obligatorias (4.4). No debilitar RBAC. | Diseño (F2) + Seguridad (F4) |
| **Inventar catálogos/enums** | Media | Medio-Alto | Validar contra existentes (1.2). Usar solo locales/compartidos correctos. Documentar omisión si no existen. | Análisis (F1) + Implementación (F3) |
| **Corromper históricos** | Baja | Alto | **Conservar históricos**. Soft delete justificado. Nunca sobrescribir sin trazabilidad. | F2–F3 |
| **Migrations destructivas** | Media | Alto | Alembic autogenerado, revisar antes aplicar. Respetar `include_name` (no toca otros schemas). Probar upgrade head. | F3 (3.10) + F4 (4.9) |
| **Loop 308↔307 rutas colección** | Baja | Medio | Rutas **sin slash** (`@router.post("")`). Validar en proxy Nginx/Next.js (4.8). | F3 (3.4) + F4 (4.8) |
| **UUIDs cross-service inconsistentes** | Baja | Alto | Mantener seeds idempotentes con UUIDs fijos sincronizados. Referencias sin FK (preservar). | F2 (2.9) + F3 (3.11) |
| **No marcar KPIs simulados** | Media | Medio | Marcar explícito donde visible (3.12, 4.13). Revisar en cierre (5.5). | Implementación + Cierre |
| **D3/D4 innecesarios** | Media | Bajo | Aplicar **solo si depende** (1.7). Registrar decisión/acta de no-necesidad. | F1 |
| **Reutilizar UserUpdate incorrectamente** | Media | Medio | Prohibido. Crear schemas específicos (2.3, 3.3). | Diseño + Implementación |
| **Ejecutar fuera Docker** | Baja | Alto | Servicios requieren host `postgres` (docker network). No asumir host-only. Stack via Make/docker-compose. | Bloqueos + F0.6 |

---

## Criterios Globales de Aceptación

Un entregable/implementación se considera **ACEPTADO** únicamente cuando se cumplan **TODOS** los puntos siguientes:

- [ ] **Principios cumplidos**: Verificación completa del bloque de Principios (sección 1). Todos aplicados y documentados.
- [ ] **Bloqueos institucionales**: 100% cumplidos (sección 2). Sin excepciones sin justificación escrita.
- [ ] **Fases completadas**: Checklists F0–F5 completos, con evidencias cuando corresponda.
- [ ] **TOCTOU + transacción única**: Aplicado donde hay riesgo de concurrencia. Pruebas concurrentes (4.5) aprobadas con resultados documentados.
- [ ] **Seguridad**: Pruebas de autorización (4.4) aprobadas — **accesos no autorizados rechazados**. Separación acción admin verificada.
- **Integridad datos**: Persistencia real verificada (4.6). Históricos **conservados**. No reutilizado `UserUpdate` indebidamente.
- [ ] **Contratos preservados**: Permisos/contratos intactos. No se inventaron catálogos. Solo valores existentes.
- [ ] **Convenciones API**: Rutas colección **sin slash** validadas (4.8). Sin loops de redirección.
- [ ] **Migraciones correctas**: Alembic upgrade head OK, `include_name` respetado, no afecta otros schemas (4.9).
- [ ] **Seeds coherentes**: Idempotentes, UUIDs sincronizados si modificados (4.10).
- [ ] **KPIs simulados**: Marcados explícitamente donde visibles (4.13). Ningún KPI simulado no marcado.
- [ ] **Pruebas con resultados reales**: Reporte documentado (testing-and-quality), no teórico.
- [ ] **Acta de Omisión**: Generada conforme F5 (5.2) — explícita si vacía.
- [ ] **D3/D4 justificados**: Si usados, justificación registrada (1.7). Si no, acta de no-necesidad.
- [ ] **Stack/Docker**: Validado en entorno dockerizado. Convenciones AGENTS.md respetadas.
- [ ] **Sin código inventado no necesario**: Solo lo requerido por alcance. No reconstrucción de plataforma.

---

## Acta de Omisión

**Fecha**: [Registrar fecha de cierre de Fase 5]

**Referencia**: PLAN FINAL INTEGRADO - VíaLibre

**Sección aplicable**: Fase 5 - Acta de Omisión (F5 acta de omisión si vacía)

### Estado de Hallazgos

Tras la ejecución completa de las fases F0–F4, conforme a los principios y bloqueos institucionales establecidos, se declara lo siguiente:

- **Hallazgos relevantes**: [ ] Sí  [ ] No
- **Pendientes abiertos**: [ ] Sí  [ ] No
- **Omisiones técnicas relevantes**: [ ] Sí  [ ] No
- **Excepciones solicitadas**: [ ] Sí  [ ] No

### Declaración (caso "vacía")

En caso de marcar **No** en todos los ítems anteriores:  
*"Se deja constancia de que, al cierre de la Fase 5, no existen hallazgos relevantes, pendientes abiertos, omisiones técnicas relevantes ni excepciones que requieran registro. Por ello, se emite la presente **Acta de Omisión** conforme al principio 'F5 acta de omisión si vacía'."*

### Detalle (caso con elementos relevantes)

En caso de marcar **Sí** en algún ítem: Registrar detalle completo (descripción, ubicación, impacto, mitigación, estado de cierre previsto o justificación de aceptación con riesgo controlado).

**Elaborado por**: [Subagente/Autor]  
**Revisado/Validado por**: [Destinatario/Supervisor]  
**Firma/Registro**: [Fecha y referencia]

---

## Regla Resumen

**Aplicación inquebrantable de este plan:**

1. **TOCTOU** → `with_for_update` + **transacción única** (siempre que exista riesgo de concurrencia).
2. **Contratos** → **No reutilizar `UserUpdate`**. Crear schemas específicos por contexto.
3. **Semántica** → **Si solo COUNT → rechazar** cambios de estado. Operar sobre entidades concretas.
4. **Integridad** → **No inventar catálogos**. Usar solo existentes. **Conservar históricos**. **Preservar permisos/contratos**.
5. **Separación** → **Separación acción admin** explícita (rutas, authZ, pruebas).
6. **Trazabilidad** → **KPIs simulados marcados** explícitamente donde visibles.
7. **API** → **Rutas colección sin slash** (`@router.post("")`).
8. **Justificación** → **D3/D4 solo si depende**. Registrar decisión.
9. **Cierre** → **F5 acta de omisión si vacía** (obligatorio). Resultados de pruebas **reales y documentados**.
10. **Principio rector**: Extender la plataforma existente, **no reconstruirla**. Respetar todos los bloqueos institucionales en todo momento.

---

*Fin del PLAN FINAL INTEGRADO*