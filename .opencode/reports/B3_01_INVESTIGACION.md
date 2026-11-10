# B3.01 — INVESTIGACIÓN (Plan Mode)

**Objetivo:** resolver con evidencia concreta las 6 dudas de la Fase 3.
**Modo:** Plan Mode — **solo lectura**. Ningún archivo del código fuente fue modificado,
no se creó ninguna migración, no se levantó ningún servicio. Este informe es el único artefacto generado.

**Fecha:** 2026-10-18 · **Alcance:** repositorio completo (`services/`, `shared/`, `frontend/`, `gateway/`, `docs/`)

---

## Índice de dudas

| # | Duda | Veredicto |
|---|------|-----------|
| 1 | ¿Existe `TutorDocente`? | **SÍ — ya existe** (modelo + endpoints + UI + tests) |
| 2 | ¿Existe `/internal/count`? ¿Quién lo llama? | **SÍ existe — CERO llamadores** (código muerto) |
| 3 | ¿Existe `X-Service-Token` / infra de service token? | **SÍ — infra completa y operativa** |
| 4 | ¿`redirect_slashes` está en los 3 servicios? | **NO — solo core y match; auth-service NO** |
| 5 | ¿`NecesidadEmpresarial` vs `Challenge`? | **`NecesidadEmpresarial` NO existe** (solo en docs) |
| 6 | ¿Fronteras cross-service consistentes? | **SÍ — patrón uniforme, con 1 asimetría documentada** |

---

## Duda 1 — TutorDocente / tutor docente / docencia

**Patrón usado:** `TutorDocente|tutor_docente|tutores_docentes|tutor.*docente`
**Existencia: SÍ** — entidad plenamente implementada y ya operativa.

### Evidencia (backend — auth-service, propietario del esquema `vialibre_auth`)

| Artefacto | Ruta | Línea(s) |
|-----------|------|----------|
| Modelo | `services/auth-service/app/models/tutor_docente.py` | 10–37 |
| Tabla / esquema | ídem | 22–23 → `__tablename__ = "tutores_docentes"`, `schema = "vialibre_auth"` |
| Export en `models/__init__.py` | `services/auth-service/app/models/__init__.py` | 3, 5 |
| Import en `alembic/env.py` (autogenerate ve el modelo) | `services/auth-service/alembic/env.py` | 11 |
| Migración creada | `services/auth-service/alembic/versions/c03d3b230309_add_tutor_docente.py` | 1, 22, 42 |
| Schemas (Create/Update/Response/List) | `services/auth-service/app/schemas/tutor_docente.py` | 8, 25, 38, 54–55 |
| Endpoints | `services/auth-service/app/api/v1/endpoints/tutores_docentes.py` | 51 (POST `""`), 65 (GET `""`), 93 (GET `/{tutor_id}`), 104 (PATCH `/{tutor_id}`) |
| Registro de rutas | `services/auth-service/app/api/v1/router.py` | 3, 10 → `prefix="/tutores-docentes"` |

### Evidencia (cross-service y frontend)

| Artefacto | Ruta | Línea(s) |
|-----------|------|----------|
| Referencia lógica desde match | `services/match-service/app/models/practica.py` | 39 → `tutor_docente_id = Column(UUID, nullable=True)  # auth-service` |
| Schemas de práctica | `services/match-service/app/schemas/practica.py` | 18, 26, 47, 66 |
| Columna en migración de práctica | `services/match-service/alembic/versions/6ea52de2cf05_add_practica.py` | 28 |
| UI admin (CRUD) | `frontend/src/app/admin/tutores/page.tsx` + `page.test.tsx` | test.tsx:5, 10–11, 28, 53–54, 95 |
| API client | `frontend/src/lib/api.ts` | 363–369 → `listTutoresDocentes` |
| Referencia en UI de prácticas | `frontend/src/app/admin/practicas/page.tsx` | 320, 357, 369, 703 |
| Tipos TS | `frontend/src/types/index.ts` | 325, 347, 362 |
| Tests backend | `services/auth-service/tests/test_models.py` | 1, 13, 34–77 |
| Tests endpoints | `services/auth-service/tests/test_endpoints_tutores.py` | 1, 37 |

### Hallazgos

1. **No hay que crear nada.** `TutorDocente` existe como entidad independiente en `vialibre_auth.tutores_docentes`
   con CRUD completo y UI de administración funcional. Cualquier plan que proponga "crear el modelo TutorDocente"
   está desactualizado respecto al código.
2. **Decisión D3/D11 sigue abierta y está documentada en el propio código:**
   `tutor_docente.py:15–19` — *"D3 y D11 siguen [Pendiente de confirmar]. Por eso no se decide si el tutor es
   una entidad independiente o un perfil/rol de `User`: `user_id` es solo una referencia lógica como UUID puro,
   sin clave foránea ni relación ORM hacia `User`, aunque ambas entidades convivan en el mismo esquema."*
   → `user_id` (línea 33) es `nullable=True` **sin FK ni relationship, pese a estar en el mismo esquema**.
3. **Falta `DELETE`.** Los endpoints son POST / GET / GET / PATCH. No hay borrado lógico ni físico.
   Para "eliminación" sólo existe el flag `activo` (línea 34) filtrado en el listado (`tutores_docentes.py:76`).
4. **No se imponen unicidades** (`identificacion`, `email` son libres) — deliberado, ver docstring.
5. Las pruebas en `test_models.py:48–55` **afirman explícitamente** que el modelo NO tiene FKs ni relaciones
   (`test_tutor_docente_has_no_foreign_keys`, `test_tutor_docente_has_no_relationship`). Si en B3.02 se añade
   la FK hacia `User`, **esos tests rompen** y hay que actualizarlos.

### Respuesta
**Reutilizar.** No crear. Ajustar/extendel solo lo que haga falta (p. ej. `DELETE`, o la relación con `User`
cuando D3 se confirme), y sincronizar los tests que hoy blindan la ausencia de FK.

---

## Duda 2 — `/internal/count` · `internal_count` · `internal`

**Patrón usado:** `internal/count|/internal/|internal_count`
**Existencia: SÍ existe el endpoint — pero tiene CERO llamadores en todo el repositorio.**

### Evidencia

**Definición única:**

| Ruta | Línea |
|------|-------|
| `services/match-service/app/api/v1/endpoints/reactions.py` | 111 |

```
@router.get("/internal/count/{challenge_id}")
async def count_reactions(
    challenge_id: uuid.UUID,
    reaction_type: ReactionType | None = None,
    auth: AuthContext = Depends(get_current_user),   # ← JWT de usuario, NO service token
    db: AsyncSession = Depends(get_db),
):
```

**Registro de ruta:** `services/match-service/app/api/v1/router.py:9`
→ `router.include_router(reactions.router, prefix="/reactions")`
**Ruta efectiva:** `GET /api/v1/match/reactions/internal/count/{challenge_id}`

### Búsqueda exhaustiva de llamadores — resultado NEGATIVO

| Dónde se buscó | Coincidencias |
|----------------|---------------|
| `frontend/src/**` (texto literal `internal/count`, `reactions/internal`, `count`) | **0** |
| `services/**` (todos los `*.py`) | **1** — sólo la propia definición |
| `gateway/nginx.conf` (`internal`) | **0** |
| Repo completo, fuera de `node_modules`/`.next` | **0** llamadores |

**Confirmación cruzada:** el conteo que la app realmente consume es otro endpoint distinto.

| Frontend | Backend |
|----------|---------|
| `frontend/src/lib/api.ts:332` → `getChallengeApplicants(challengeId)` | `services/match-service/app/api/v1/endpoints/interactions.py:66` → `@router.get("/challenge/{challenge_id}")` |
| usado en `frontend/src/app/mis-problematicas/page.tsx:33–40` (`Promise.all` de conteos) | devuelve `ChallengeApplicantsResponse` con `total` |

Ninguna llamada a `/reactions/internal/count/` en ningún punto del código.

### Hallazgos

1. **Es código muerto.** Definido, registrado, expuesto por el gateway — y sin ningún consumidor.
2. **Protegido con `get_current_user` (JWT de usuario), no con `require_internal_service`.**
   Cualquier usuario autenticado puede contarlo, pese al prefijo `/internal/`.
3. `require_internal_service` **sólo existe en auth-service** (`services/auth-service/app/api/deps.py:131`)
   y se usa en **un único endpoint**: `services/auth-service/app/api/v1/endpoints/users.py:223`
   (`GET /{user_id}/resumen`). `core-service` y `match-service` **no tienen** ese dependency.
4. Riesgo real **bajo**: no está roto, no filtra datos sensibles (sólo conteos), y nadie lo llama.

### Respuesta
**No migrar a `X-Service-Token`.** Migrarlo obligaría a inventar una infraestructura de `require_internal_service`
en `match-service` para servir a cero consumidores. Recomendación para B3.02: **documentar la nomenclatura imprecisa**
(como ya se hizo en FASE1/FASE2) y, si se quiere limpiar, **marcarlo como candidato a eliminación** en una fase
posterior — no tocarlo en Fase 3.

---

## Duda 3 — `X-Service-Token` / service token / `X-Service-Name` / `X-Request-Id`

**Patrón usado:** `X-Service-Token|X-Service-Name|X-Request-Id|service_token|SERVICE_TOKEN`
**Existencia: SÍ — infraestructura completa, en uso y probada.**

### Evidencia — implementación compartida

| Artefacto | Ruta | Línea(s) |
|-----------|------|----------|
| Constante del header | `shared/python/vialibre_common/service_auth.py` | 35 → `SERVICE_TOKEN_HEADER = "X-Service-Token"` |
| Construcción | ídem | 71 → `def build_service_token(...)` |
| Convenience `service_headers()` | ídem | 111 → `SERVICE_TOKEN_HEADER: build_service_token(...)` |
| Verificación | ídem | 117 → `def verify_service_token(...)` |
| Ventana / skew | ídem | 44–45 → `WINDOW = 60s`, `SKEW = 10s` |
| Nonce store TTL thread-safe | ídem | 181–194 |

**Qué lleva el token:** JWT firmado con `jwt_secret_key`, con claims `t` (timestamp), `m` (method), `p` (path),
`n` (nonce aleatorio de 16 bytes hex), `s` (service_name) — ver líneas 73–90.
**Verificación** exige: firma válida, path/method exactos, `|now − t| ≤ window`, y nonce **no repetido** (single-use).

### Evidencia — verificador server-side

| Artefacto | Ruta | Línea(s) |
|-----------|------|----------|
| `_verify_internal_request` | `services/auth-service/app/api/deps.py` | 23, 26 |
| `require_internal_service` | ídem | 131, 141 |
| Híbrido JWT / service token (**fail-closed**) | ídem | 93, 102–107 → *"an invalid token never falls back to JWT authentication"* |
| Único endpoint protegido | `services/auth-service/app/api/v1/endpoints/users.py` | 220–229 → `GET /{user_id}/resumen` |

### Evidencia — emisores (5 llamadas cross-service con token)

| Origen | Destino | Ruta | Línea |
|--------|---------|------|-------|
| match → auth | documents | `services/match-service/app/api/v1/endpoints/documents.py` | 61–62 (`_service_headers`), 297, 301 |
| match → auth | interactions (contacto) | `services/match-service/app/api/v1/endpoints/interactions.py` | 321 |
| match → auth | practicas (validación usuario) | `services/match-service/app/api/v1/endpoints/practicas.py` | 84–91 |
| core → auth | empresas | `services/core-service/app/api/v1/endpoints/empresas.py` | 46–53 |
| core → auth | challenges (validación autor) | `services/core-service/app/api/v1/endpoints/challenges.py` | 37–52 |

### Sub-dudas

| Sub-duda | ¿Existe? | Evidencia |
|----------|----------|-----------|
| `X-Service-Token` | **SÍ** | `service_auth.py:35` |
| `X-Service-Name` | **NO como header HTTP** | El nombre del servicio viaja **dentro del JWT** como claim `"s"` (`service_auth.py:90`) |
| `X-Request-Id` | **NO** | Cero coincidencias en el código del proyecto (sólo en `.opencode/node_modules/effect/`, ajeno) |
| `SERVICE_TOKEN` (env var) | **NO** | No hay variable de entorno dedicada; el secreto es el **`jwt_secret_key` compartido** entre los 3 servicios |

### Hallazgos

1. **La infraestructura está madura y bien diseñada:** HMAC request-bound (method + path exactos), nonce
   single-use, ventana de 60s con skew de 10s, y **fail-closed** ante token inválido.
2. **Asimetría importante (patrón, no bug):** `match → auth` **sí** envía `X-Service-Token`;
   `match → core` **NO**. Motivo: sólo `auth-service` implementa el verificador.
   - `interactions.py:77–80` → GET a core **sin headers**
   - `practicas.py:57–60` → GET a core **sin headers**
   - `documents.py:75–77` → GET a core **sin headers** (`_fetch_json` sin `headers=`)
   Esto está documentado en FASE2_DISENO_TECNICO.md:496 ("match→core sin token (patrón documentado)").
3. **Consecuencia para Fase 3:** si algún endpoint de `core-service` llega a exponer datos internos,
   **no tiene mecanismo para verificar un service token**. Cualquier nuevo endpoint "interno" en core
   necesita primero portar `require_internal_service` desde `shared` (ya está en `vialibre_common`,
   es portable — sólo falta el dependency de FastAPI).

### Respuesta
**La infra existe y es sólida.** No hay que inventar nada. Para Fase 3, sólo documentar la asimetría
match→core y, si aparece un endpoint interno en core/match, portar `require_internal_service`
(dependency ~15 líneas, la lógica ya vive en `shared`).

---

## Duda 4 — `redirect_slashes`

**Patrón usado:** `redirect_slashes`
**Existencia: PARCIAL — 2 de 3 servicios. `auth-service` NO lo define.**

### Evidencia

| Servicio | ¿Lo tiene? | Ruta | Línea |
|----------|-----------|------|-------|
| `core-service` | **SÍ** | `services/core-service/app/main.py` | 27 → `redirect_slashes=False` |
| `match-service` | **SÍ** | `services/match-service/app/main.py` | 26 → `redirect_slashes=False` |
| `auth-service` | **NO** | `services/auth-service/app/main.py` | — (app creada en línea 19–23 sin ese parámetro → default de Starlette = `True`) |

**Comentario justificativo ya presente en core** (`services/core-service/app/main.py:24–26` y
`services/core-service/app/api/v1/endpoints/challenges.py:110`):

> *"Evita el rebote 307 entre rutas con/sin slash final. El proxy de Next.js normaliza a rutas SIN slash
> (308), de modo que FastAPI debe resolver la colección en `/challenges` (sin slash) sin devolver un 307
> que cree un bucle que rompía el POST (publicación de problemáticas) en el navegador."*

### Análisis de impacto en auth-service

Rutas de colección **sin slash final** registradas en auth-service (`@router.post("")` / `@router.get("")`):

| Ruta | Archivo | Línea |
|------|---------|-------|
| `POST /api/v1/auth/tutores-docentes` | `services/auth-service/app/api/v1/endpoints/tutores_docentes.py` | 51 |
| `GET /api/v1/auth/tutores-docentes` | ídem | 65 |

- `auth.py` (`/login`, `/register`) y `users.py` (`/me`, `/talent`, `/{user_id}`) **no** tienen rutas de
  colección vacía, así que **no están afectados** por el rebote.
- **Sí está afectado** `/tutores-docentes`: es exactamente el mismo patrón (colección `""` + proxy Next.js
  que normaliza con 308) que ya obligó a poner `redirect_slashes=False` en core y match.
- La UI admin de tutores (`frontend/src/app/admin/tutores/page.tsx`) hace `listTutoresDocentes`
  (`frontend/src/lib/api.ts:364–369`) → es una **llamada de listado que atraviesa el proxy**, es decir,
  el escenario de riesgo real.

**Nota:** el frontend usa `redirect_trailing_slash` por defecto del proxy; el bucle se manifiesta en el
**POST** (creación de tutor) igual que lo hizo en core. El riesgo es real pero de severidad **baja-media**
(afecta a una sola colección, y sólo si el cliente normaliza).

### Hallazgos

1. **Inconsistencia real y verificable.** La justificación escrita en core y match aplica *idénticamente*
   a `tutores-docentes` en auth, pero auth-service no la adoptó (probablemente porque `tutores-docentes`
   se añadió después, en la Etapa 3.2/3.3).
2. El cambio es **aditivo y de 1 línea** — el mismo comentario ya redactado en core/match puede reutilizarse.
3. **Bajo riesgo de regresión:** `redirect_slashes=False` sólo elimina redirecciones 307; ninguna ruta
   registrada en auth-service tiene alias con slash.

### Respuesta
**SÍ — añadir `redirect_slashes=False` a `services/auth-service/app/main.py`.** Es una corrección de
consistencia de bajo riesgo que elimina un bucle 307/308 latente en `POST/GET /tutores-docentes`.
Debe ir acompañada del comentario justificativo (reutilizando el texto de core/match) y de la nota
en el informe de decisiones.

---

## Duda 5 — `NecesidadEmpresarial` vs `Challenge` (comparativo)

**Patrón usado:** `NecesidadEmpresarial|necesidad_empresarial|necesidad`
**Existencia de `NecesidadEmpresarial`: NO — la entidad no existe en código.**

### Búsqueda exhaustiva

| Filtro | Coincidencias en código (`*.py`, `*.ts`, `*.tsx`) |
|--------|---------------------------------------------------|
| `services/**` | **0** |
| `frontend/src/**` | **0** |
| Repo completo (excl. `node_modules`/`.next`) | **0** |

Aparece **únicamente en documentación y planes**, nunca en código:

| Documento | Línea |
|-----------|-------|
| `docs/gestion-practicas/diagnostico-integracion.md` | 126 ("Inexistente — No existe formulario/backend para 'necesidades empresariales'"), 163, 217, 225 |
| `.opencode/reports/FASE2_DISENO_TECNICO.md` | 26–27 (R08/R09), 69, 76, 164, 241, 327, 412 (decisión **D03**) |
| `.opencode/reports/FASE1_ANALISIS_ALCANCE.md` | 54, 77, 161, 257, 355 |

### Comparativo — lo que SÍ existe: `Challenge`

**Modelo:** `services/core-service/app/models/challenge.py` (líneas 13–61)

| Aspecto | `Challenge` (existente) | `NecesidadEmpresarial` (propuesta, D03) |
|---------|-------------------------|----------------------------------------|
| Estado actual | **Implementado y en producción** | **No existe — entidad nueva** |
| Esquema | `vialibre_core.challenges` | `vialibre_core` (propuesto) |
| Semántica | **Publicación/oferta** creada *proactivamente* por un publicador | **Captación proactiva**: solicitud que nace de una necesidad y *deriva* en oferta |
| `status` | `ChallengeStatus`: `abierto` / `en_progreso` / `cerrado` (líneas 15–19) — **ciclo de vida de la oferta** | Estado propio de aprobación (aprobado / rechazado / en revisión) — **no reutilizable** |
| Campos clave | `tipo` (`reto`/`practica`/`empleo`, línea 29), `title`, `short_description`, `long_description`, `category_id`, `author_id` (UUID cross-service sin FK), `difficulty`, `tags`, `budget`, `deadline`, `modalidad`, `ubicacion`, `is_featured`, `featured_score` | Estado, **origen** de la solicitud, **responsable de seguimiento**, fechas |
| Visibilidad | Visible inmediatamente como oferta | **No visible como oferta hasta aprobado** (FASE2:76) |
| Relación | — | Conversión *posible* hacia `Challenge`, **sin sobrescribir históricos** (FASE2:27) |
| Rutas propuestas | `/api/v1/core/challenges` (ya activo) | `/api/v1/core/necesidades*` (FASE2:327) |
| Propietario decidido | `core-service` | `core-service` — decisión **D03** (FASE2:164, 241) |

### Hallazgos

1. **`NecesidadEmpresarial` es 100 % una entidad nueva.** No hay código que reutilizar ni que refactorizar.
2. **No debe reutilizarse `Challenge`** para captación. Los dos motivos son técnicamente verificables:
   - `Challenge.status` es un ciclo de vida de *oferta* (`abierto`→`en_progreso`→`cerrado`), no un estado
     de *aprobación*. Mezclarlos destruiría el significado de `is_featured`/`featured_score` y del filtrado
     público (`GET /challenges`).
   - Un `Challenge` es **público por diseño** (listado, featured). Una necesidad sin aprobar no debe serlo.
3. **Ambigüedad de propiedad ya resuelta en FASE2:** D03 asigna `NecesidadEmpresarial` a `core-service`
   (`vialibre_core`). Justificación registrada: *"Auth → no es identidad. Match → no es seguimiento
   postulación."*
4. **Queda por definir** el scope de aprobación (sólo ADMIN, o ADMIN + PUBLICADOR según flujo) —
   FASE2:327 lo marca explícitamente como pendiente de decisión.

### Respuesta
**Entidad nueva en `core-service` / `vialibre_core`, con modelo de estado propio y flujo de aprobación,
sin reutilizar `Challenge`.** No hay deuda existente que resolver: la comparativa sólo confirma que
**no hay solapamiento de datos** que exija migración o fusión.

---

## Duda 6 — Fronteras cross-service (UUID sin FK · `service_urls` · llamadas httpx)

**Existencia del patrón: SÍ — uniforme y verificable en las 3 fronteras.**

### 6.1 Referencias cross-service como UUID puro (sin FK)

| Entidad | Campo | Archivo | Línea | Comentario en código |
|---------|-------|---------|-------|---------------------|
| `Challenge` | `author_id` | `services/core-service/app/models/challenge.py` | 40 | *"Publisher reference (cross-service - no FK constraint)"* |
| `Empresa` | `publicador_user_id` | `services/core-service/app/models/empresa.py` | 33 | *"Referencia logica a User (vialibre_auth): UUID puro, sin FK entre servicios."* |
| `TutorDocente` | `user_id` | `services/auth-service/app/models/tutor_docente.py` | 33 | *"Referencia logica a User (mismo esquema); sin FK ni relationship (D3 pendiente)."* |
| `Practica` | `tutor_docente_id` | `services/match-service/app/models/practica.py` | 39 | `# auth-service` |
| `Interaction` | `solucionador_id`, `challenge_id` | `services/match-service/app/models/interaction.py` | — | UUID cross-service |

### 6.2 FKs — sólo **intra**-servicio (3 en todo el backend)

| FK | Archivo | Línea |
|----|---------|-------|
| `challenge.category_id → vialibre_core.categories.id` | `services/core-service/app/models/challenge.py` | 36 |
| `document.interaction_id → vialibre_match.interactions.id` (`CASCADE`) | `services/match-service/app/models/document.py` | 23 |
| `user.role_id → vialibre_auth.roles.id` | `services/auth-service/app/models/user.py` | 19 |

**Confirmado: cero FKs cruzando esquemas.** Los tests lo blindan explícitamente
(`services/auth-service/tests/test_models.py:48` → `test_tutor_docente_has_no_foreign_keys`).

### 6.3 `service_urls` (configuración)

| Servicio | Variable | Archivo | Línea | Default |
|----------|----------|---------|-------|---------|
| core | `auth_service_url` | `services/core-service/app/config.py` | 21 | `http://auth-service:8000` |
| match | `auth_service_url` | `services/match-service/app/config.py` | 21 | `http://auth-service:8000` |
| match | `core_service_url` | `services/match-service/app/config.py` | 22 | `http://core-service:8000` |
| auth | — | — | — | **No llama a ningún servicio** (es la raíz de confianza) |

### 6.4 Llamadas httpx — inventario completo (12 llamadas / 5 archivos)

| # | Origen → Destino | Propósito | Archivo | Línea(s) | ¿Con `X-Service-Token`? |
|---|------------------|-----------|---------|----------|-------------------------|
| 1 | core → auth | validar `author_id` | `core/.../challenges.py` | 37–52 | **SÍ** (`service_headers`, 40) |
| 2 | core → auth | validar usuario de empresa | `core/.../empresas.py` | 46–53 | **SÍ** (49) |
| 3 | match → core | validar `challenge_id` | `match/.../practicas.py` | 57–60 | **NO** |
| 4 | match → auth | validar `solucionador_id` | `match/.../practicas.py` | 84–91 | **SÍ** (87) |
| 5 | match → core | verificar challenge + autor | `match/.../interactions.py` | 77–80 | **NO** |
| 6 | match → core | revalidar en approve | `match/.../interactions.py` | 209–211 | **NO** |
| 7 | match → core | revalidar en delete | `match/.../interactions.py` | 292–294 | **NO** |
| 8 | match → auth | obtener contacto | `match/.../interactions.py` | 318–321 | **SÍ** (321) |
| 9 | match → core | obtener challenge p/ documentos | `match/.../documents.py` | 75–77 | **NO** |
| 10–11 | match → auth | resumen estudiante + empresa | `match/.../documents.py` | 292–301 | **SÍ** (297, 301) |
| 12 | match → core | (vía `_fetch_json`, reutiliza #9) | `match/.../documents.py` | 50–58 | **NO** |

**Resumen de la asimetría:** `→ auth` = **6/6 con token** · `→ core` = **0/6 con token**.

### 6.5 Validación en runtime de referencias sin FK

El código **sí** compensa la ausencia de FK con validación HTTP en el momento de la escritura:

- `match/.../practicas.py:52–75` → `_validate_challenge()` (404 core → 400 "no corresponde a una publicacion existente")
- `match/.../practicas.py:78+` → `_validate_user()` contra auth
- `core/.../challenges.py:37–52` → valida `author_id` contra auth

### Hallazgos

1. **El patrón es coherente en las 3 fronteras y está bien documentado en el propio código.** Ninguna FK
   cruza esquemas; cada frontera tiene su comentario.
2. **La única asimetría real es match→core sin token** — ya conocida y aceptada en FASE2:496. Se sostiene
   porque `core-service` no implementa verificación. **No es una vulnerabilidad hoy** (los endpoints de core
   que match llama son de lectura pública de challenges), pero **limita qué puede exponer core** en el futuro.
3. **`timeout` inconsistente:** `empresas.py:46`, `challenges.py:37`, `practicas.py:57,84`, `documents.py:51`
   usan `timeout=5.0`; **`interactions.py:77, 209, 292` no ponen timeout** → un cuelgue de core bloquearía
   el hilo de la petición indefinidamente. Es un hallazgo nuevo, menor, no registrado en FASE0–FASE2.
4. **`interactions.py` no tiene manejo `try/except httpx.HTTPError`** en los bloques 77/209/292 — si core
   está caído, el usuario recibe un 500 en lugar de un 502 con mensaje claro (los otros 3 archivos sí lo manejan).

### Respuesta
**Patrón consistente y reutilizable. Mantener.** Para Fase 3: (a) alinear los `timeout=5.0` y el
`try/except httpx.HTTPError` en `interactions.py`; (b) si se añade algún endpoint interno en core, portar
`require_internal_service` antes de exponerlo.

---

## Consolidado de hallazgos

| # | Hallazgo | Severidad | ¿Bloquea B3.02? |
|---|----------|-----------|------------------|
| H1 | `TutorDocente` ya existe — cualquier plan que lo "cree" está obsoleto | Informativo | No |
| H2 | `TutorDocente.user_id` sin FK pese a compartir esquema con `User` (D3/D11 pendientes) | Baja | No |
| H3 | `services/auth-service/tests/test_models.py:48–55` **blindan** la ausencia de FK/relación en TutorDocente | Media (si se añade FK, rompen) | No — sólo planificar |
| H4 | `/reactions/internal/count/` es **código muerto** (0 llamadores), protegido con JWT | Baja | No |
| H5 | `require_internal_service` **sólo existe en auth-service**; core y match no pueden verificar service tokens | Media (futuro) | No |
| H6 | `auth-service` **no define `redirect_slashes=False`** — bucle 307 latente en `/tutores-docentes` | Media | No — es el fix |
| H7 | `NecesidadEmpresarial` no existe en código, sólo en docs (decisión D03) | Informativo | No |
| H8 | `match → core` viaja **sin `X-Service-Token`** en 6/6 llamadas | Baja (aceptada en FASE2) | No |
| H9 | `interactions.py:77, 209, 292` **sin `timeout`** ni `try/except httpx.HTTPError` (nuevo, no registrado) | Baja-Media | No |
| H10 | `X-Request-Id` no existe en absoluto; `X-Service-Name` va dentro del JWT, no como header | Informativo | No |

---

## Recomendación: ¿Continuar con B3.02?

### **SÍ — continuar, con 4 ajustes al plan**

**Razones a favor:**

1. **Las 6 dudas están resueltas con evidencia verificable** (rutas + líneas). No queda ninguna incertidumbre
   que justifique detener la fase.
2. **Ningún hallazgo es bloqueante.** Los 10 hallazgos son de severidad baja/media y ninguno compromete
   integridad de datos ni seguridad activa.
3. **Dos de las dudas eliminan trabajo:** `TutorDocente` ya existe (no crear) y `NecesidadEmpresarial`
   es nueva sin deuda previa (no refactorizar). Esto **reduce** el alcance de B3.02.
4. **El patrón cross-service es estable** (UUID sin FK + validación HTTP en runtime) y se puede seguir
   con confianza sin rediseñar nada.
5. La infra de service token ya está lista y probada; no exige trabajo previo.

**Ajustes obligatorios al plan de B3.02:**

| Ajuste | Motivo |
|--------|--------|
| **A1** — Incluir `redirect_slashes=False` en `services/auth-service/app/main.py` (con el mismo comentario justificativo de core/match) | H6 — inconsistencia verificada con riesgo latente en `/tutores-docentes` |
| **A2** — Si se añade la FK `TutorDocente.user_id → User`, planificar además la actualización de `test_models.py:48–55` | H3 — los tests actuales fallarán deliberadamente |
| **A3** — NO migrar `/internal/count` a service token; documentar la nomenclatura imprecisa como decisión registrada | H4 — migrarlo obligaría a crear infra para cero consumidores |
| **A4** — Corregir `interactions.py:77, 209, 292`: añadir `timeout=5.0` y `try/except httpx.HTTPError` → 502 | H9 — hallazgo nuevo no registrado, alineable con el patrón de los otros 3 archivos |

**Advertencia de alcance:** B3.02 debe **reutilizar** `TutorDocente` y `Empresa` tal como existen, y crear
`NecesidadEmpresarial` como entidad nueva en `core-service` con su **propio** modelo de estado (no reutilizar
`Challenge.status`). Queda pendiente de decisión explícita el **scope de aprobación** de la necesidad
(ADMIN vs ADMIN+PUBLICADOR) — debe resolverse antes de escribir el modelo.

---

## Estado

> **Plan Mode. Este documento NO autoriza la Fase 3.**
>
> - No se modificó ningún archivo fuente, modelo, endpoint ni configuración.
> - No se creó ninguna migración ni se ejecutó `make migrate*`.
> - No se inició, detuvo ni reinició ningún servicio.
> - El único artefacto generado es este informe: `.opencode/reports/B3_01_INVESTIGACION.md`.
>
> **B3.02 requiere aprobación explícita previa.** Recomendación emitida: **SÍ procede**, sujeta a los
> ajustes A1–A4 y a la resolución del scope de aprobación de `NecesidadEmpresarial`.
