# B3-A.2 — Diagnóstico de la configuración efectiva del frontend

**Bloque:** B3-A.2 (diagnóstico y planificación en modo Plan; sin implementación, reconstrucción, reinicio ni modificación de archivos/variables/contenedores durante el diagnóstico).
**Fecha:** 2026-10-18 · **Rama:** `feature/funcionalidades-eric-jassir` (HEAD `8a6211b`)
**Predecesores:** `B3A_INFORME.md`, `B3A1_INFORME.md` (35/25/18 pruebas y lint limpio — línea base histórica sin cambios en el bloque de diagnóstico).

---

## 1. Diagnóstico y causa raíz

**Causa raíz (mecanismo con certeza ALTA, confirmado con 5+ evidencias independientes):**
la imagen `vialibre-frontend` en ejecución se construyó el **14-Sep** a partir de un contexto de build que contenía, sin commitear, un `next.config.js` con lógica `MOCK_MODE` y un `frontend/.env.local` con `NEXT_PUBLIC_API_MOCK=true`. El `Dockerfile` ejecuta `COPY . .` y **el repositorio no tenía ningún `.dockerignore`**, de modo que esos archivos locales no rastreados quedaron horneados en la imagen. Desde entonces, `docker-compose up -d` reutiliza esa imagen (el tag no cambió → no reconstruye), mientras el working tree avanzó a la configuración proxy definitiva (única versión commitada). Al arrancar el proceso `next dev`, la config horneada lee el `.env.local` horneado → `MOCK_MODE=true` → `rewrites()` devuelve `[]` → toda petición a `:3000/api/*` termina en el 404 de Next.js.

**Grado de certeza:**
- Mecanismo (config horneada ≠ config del repo; `.env.local` horneado; rewrites vacías; red correcta): **ALTA** — ver §2.
- Cronología de por qué el working tree se revertió/borró tras el build (12-Sep → 18-Oct): **INDICIO NO RECONSTRUÍBLE** — git no versiona archivos no rastreados ni su borrado; no se afirma más de lo que la evidencia sostiene.

## 2. Evidencias concretas

| # | Evidencia | Fuente |
|---|---|---|
| 1 | Imagen creada **2026-09-14T21:27Z**; contenedor iniciado 2026-10-18T00:28Z desde la **misma imagen** (`sha256:71cc434a1297…`) | `docker image inspect` / `docker inspect` |
| 2 | Contenedor: `/app/.env.local` (12-Sep, `NEXT_PUBLIC_API_MOCK=true`), `/app/.env.local.example` (documenta los knobs, pone `false` de ejemplo) y `/app/next.config.js` (12-Sep, con `MOCK_MODE`) | `docker-compose exec frontend ls -la /app` + lectura |
| 3 | `next.config.js` del working tree y del HEAD (`8fbba78`, único commit que lo tocó, 26-Aug): proxy simple `/api/:path*` → `http://nginx:80/api/:path*`, **sin MOCK_MODE**; working tree limpio respecto a HEAD | `git log/show/status` |
| 4 | **No existía ningún `.dockerignore`** en el repo; el Dockerfile horneado en la imagen es **idéntico** al del working tree (`COPY . .`, línea 10) | glob `**/.dockerignore`; `cat /app/Dockerfile` |
| 5 | `.gitignore:36` ignora `.env.local` → en el build de Sep era un fichero **no rastreado**; hoy **no existe** `frontend/.env.local` ni `.env.local.example` en el árbol | `.gitignore`; glob `frontend/.env*` sin resultados |
| 6 | Comportamiento: `:3000/api/*` → 404 HTML de Next; `fetch` interno del contenedor a `http://nginx:80/api/...` → **401** (red OK); acceso vía `:80`/nginx → 401/422 reales | verificado en vivo en B3-A |
| 7 | El servicio `frontend` en compose **no tiene `env_file` ni `environment`**; `printenv` no contiene la variable → única fuente: `.env.local` horneado | `docker-compose.yml:70-77`; `printenv` |
| 8 | Código actual (bind-mounteado): **ninguna compuerta de mock** — `grep NEXT_PUBLIC` en todo `frontend/`: 1 resultado (`api.ts:35`, `NEXT_PUBLIC_API_URL || '/api'`); `grep MOCK` en `api.ts`: 0. El dev-server loguea `POST /api/v1/auth/login 404` porque el código llama a la API real y la config horneada no la proyecta | greps + `docker logs frontend` |
| 9 | `src/` y `public/` sí están bind-mounteados (código vivo); `next.config.js`, `.env.local` e `node_modules` no → el contenedor era un **híbrido config-Sep/código-Oct** | `docker-compose.yml:75-77` |

### Respuestas a las 8 preguntas de inspección

1. **Cómo se calcula `MOCK_MODE` y cuándo se evalúa:** en la imagen, se evalúa al **arrancar** `next dev` (carga de la config). En el repo actual, la variable **no se calcula en ningún sitio**.
2. **Uso de `NEXT_PUBLIC_API_MOCK` (build/runtime):** en la imagen, runtime del proceso dev vía `.env.local` (quedaría congelada en bundle en un `next build`). En el working tree actual: **no se utiliza en absoluto** (ni config ni src).
3. **Cómo llega `.env.local` a la imagen:** `COPY . .` del build de Sep, sin `.dockerignore`. No era montaje (compose solo monta `src` y `public`) ni generación automática.
4. **Config efectiva del contenedor:** la horneada de 12-Sep (MOCK_MODE + `.env.local` `true`); observable como rewrites vacías (404 de Next en `/api/*`).
5. **¿Contenedor desactualizado? SÍ**, en tres capas: (a) `next.config.js` (imagen: MOCK_MODE; tree: proxy), (b) `.env.local*` (solo en la imagen), (c) `node_modules`/lockfile (install del 12-Sep; el `package-lock.json` del tree está modificado desde — se añadieron vitest y dependencias de prueba). El `src` NO: al día por bind-mount.
6. **¿Dockerfile/compose explican la discrepancia?** El Dockerfile es idéntico en ambos lados: no es un defecto del Dockerfile per se, sino la **ausencia de `.dockerignore`** combinada con `COPY . .`. Compose no aporta variables al frontend.
7. **Rewrites con mock on/off:** `MOCK_MODE=true` → `rewrites()` devuelve `[]` → `/api/*` no proxyado → 404 de Next. `MOCK_MODE=false` o config del repo → rewrite a `http://nginx:80/api/:path*` → backend real (401/422/200).
8. **¿Basta reconstruir sin cambios? Casi, pero no es suficiente como solución:** un rebuild desde el contexto **actual** produciría imagen correcta (el `.env.local` stale ya no está en el árbol y la config es la commitada), **pero sin `.dockerignore` la clase de riesgo persiste**: el próximo `.env.local` local volverá a hornearse. Además, el rebuild arrastraría el lockfile actualizado (instalación de vitest y compañía) — coherente con el repo, pero a declarar.

## 3. Diferencias working tree vs imagen vs contenedor (estado previo a la corrección)

| Artefacto | Working tree (HEAD, limpio) | Imagen `71cc434a1297` (14-Sep) | Contenedor en ejecución |
|---|---|---|---|
| `next.config.js` | Proxy simple (commit `8fbba78`) | `MOCK_MODE` (nunca commiteado) | El de la imagen |
| `.env.local` | **No existe** | `NEXT_PUBLIC_API_MOCK=true` | El de la imagen (única fuente del flag) |
| `.dockerignore` | **No existía** | No existía | — |
| `src/`, `public/` | Actual (cambios sin commitear de fases previas) | De Sep | **Actual** (bind-mount) |
| `node_modules`/lockfile | lockfile **modificado** (vitest, etc.) | Install del 12-Sep | El de la imagen |
| `Dockerfile` | El del scaffolding | Idéntico | Idéntico |

## 4. Solución recomendada y alternativas

### Opción A (RECOMENDADA, la autorizada): `.dockerignore` + rebuild + recreate selectivo
1. **Nuevo `frontend/.dockerignore`** con `node_modules`, `.next`, `.env`, `.env.local`, `.env.*.local`, `npm-debug.log*`, `tsconfig.tsbuildinfo`. `.env.local.example` **no** se excluye (plantilla sin secretos que documenta los knobs; hoy no existe en el árbol, pero la regla deja el camino abierto).
2. **Sin cambios** en `frontend/next.config.js` (ya es la config correcta y está commitada), ni en `frontend/Dockerfile` (convención `COPY . .` se mantiene, ahora filtrada), ni en `docker-compose.yml`.
3. **Variables build/runtime:** la imagen de Docker siempre en modo API real; cualquier `.env.local` local queda fuera de la imagen por `.dockerignore`.
4. **Procedimiento:** `docker-compose build frontend` (build) y luego `docker-compose up -d frontend` (recreate; nginx depende de auth/core/match, **no** de frontend → aislado).
5. **Riesgos de caché:** la capa `COPY . .` se invalida por cambio de contexto → residual **bajo**. Riesgo a declarar: el `npm install` del rebuild incorpora las dependencias del lockfile actual (vitest, testing-library…; `next` fijado a 14.2.5).
6. **Reversión:** la imagen previa queda como dangling tras el rebuild; volver: `docker tag <id-previa> vialibre-frontend && docker-compose up -d --force-recreate frontend`. `.dockerignore` = borrar el fichero. Frontend stateless, sin volúmenes propios.

### Opción B (descartada como principal): override por variable en compose
`environment: NEXT_PUBLIC_API_MOCK: "false"` funcionaría **solo con la imagen stale** (su config lee la variable), pero tras un rebuild la variable sería ignorada por la config commitada → knob engañoso. Válida únicamente como hotfix de minutos.

### Opción C (alternativa operativa, sin tocar nada): acceso vía nginx
`http://localhost/api/v1/*` (puerto 80) **funciona**: nginx enruta directamente a los backends. El defecto solo afectaba al acceso **directo** a `:3000`. Workaround, no solución.

### Opción D (descartada por alcance): frontend de producción (`next build` + `next start`).

## 5. Ficheros que cambian en la implementación

| Fichero | Acción |
|---|---|
| `frontend/.dockerignore` | **Crear** (único cambio de código) |
| `frontend/next.config.js`, `frontend/Dockerfile`, `docker-compose.yml` | Sin cambios |
| `.opencode/reports/B3A2_INFORME.md` | Crear al implementar (informe de ejecución con resultados reales) |

## 6. Riesgos pendientes y decisiones que requieren aprobación

| # | Elemento | Tipo | Detalle |
|---|---|---|---|
| 1 | **Modo mock: ¿se conserva?** | **DECISIÓN** | El código actual **no tiene** implementación de mock (solo el flag en la config stale). No inventar mock: recomendación = asumir API real siempre vía proxy. Demos offline = bloque aparte explícito. |
| 2 | Rebuild arrastra lockfile nuevo (vitest y deps de prueba) | Riesgo bajo | Coherente con el repo; `next` fijado a 14.2.5. Declarado en el informe. |
| 3 | `next dev` en contenedor (no `next build`) | Riesgo conocido | El stack es de desarrollo; endurecimiento de producción = Opción D, fuera de alcance. |
| 4 | Hueco de indisponibilidad del recreate (~s) | Riesgo operativo | Solo frontend; nginx devuelve 502 en ese instante. |
| 5 | Alguien dependa de la imagen mock actual | Riesgo humano | La app ya no tiene mocks en el código; la imagen nueva elimina el flag. |
| 6 | `.env.local` local vuelve a contaminar imágenes futuras | Mitigado | Precisamente el objetivo de este bloque (`.dockerignore`). |

## 3.1 Actualización posterior a la implementación (para la sección 3)

El glob inicial (`frontend/.env*`) omitió ficheros ocultos y el diagnóstico afirmó que `frontend/.env.local` no existía en el working tree: **era incorrecto**. El fichero **sí existe** (183 B, 12-Sep, gitignored, sin secretos — solo `NEXT_PUBLIC_API_MOCK`), junto a `.env.local.example` (63 B, 15-Oct, solo `NEXT_PUBLIC_API_URL`). Esto refuerza la causa raíz: un rebuild sin `.dockerignore` habría horneado el `.env.local` de nuevo. Verificado tras la corrección: la imagen nueva contiene `.env.local.example` pero **no** `.env.local`. Detalle completo en `B3A2_INFORME.md` §3.

---

> Este diagnóstico se realizó en modo Plan (sin tocar nada) y se persiste aquí tras la autorización expresa de implementación de B3-A.2. La validación posterior y los resultados reales se documentan en `B3A2_INFORME.md`.
