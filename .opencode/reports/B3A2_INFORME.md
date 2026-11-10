# B3-A.2 — Informe de implementación: imagen y rewrites del frontend

**Bloque:** B3-A.2 (implementación autorizada) · **Fecha:** 2026-10-18 · **Rama:** `feature/funcionalidades-eric-jassir` (HEAD `8a6211b`, sin staging ni commits)
**Diagnóstico previo:** `B3A2_DIAGNOSTICO.md` · **Predecesores:** `B3A_INFORME.md`, `B3A1_INFORME.md` (35/25/18 pruebas y lint limpio — línea base confirmada sin regresiones).

---

## 1. Resumen

Se corrigió la discrepancia entre la configuración del frontend en el repo y la imagen Docker desplegada (imagen del 14-Sep con `next.config.js` MOCK_MODE y `.env.local` horneado que vaciaba las rewrites → todo `:3000/api/*` terminaba en 404 de Next.js). Implementación de **Opción A**: nuevo `frontend/.dockerignore` + rebuild + recreate **solo** del contenedor frontend. Resultado: `:3000/api/*` llega al backend real (401/422/200), la imagen usa la config vigente del repo y `.env.local` local ya no puede hornearse.

## 2. Archivos modificados

| Archivo | Acción | Detalle |
|---|---|---|
| `frontend/.dockerignore` | **Nuevo** (único cambio de código) | Excluye del contexto de build: `node_modules`, `.next`, `tsconfig.tsbuildinfo`, `.env`, `.env.local`, `.env.*.local`, logs npm/yarn/pnpm. `.env.local.example` queda **incluido** a propósito (plantilla sin secretos). |
| `.opencode/reports/B3A2_DIAGNOSTICO.md` | Nuevo (informe) | Diagnóstico persistido (bloque Plan) + nota de actualización §3.1. |
| `.opencode/reports/B3A2_INFORME.md` | Nuevo (este informe) | — |

**Sin cambios** (verificado antes y después): `frontend/next.config.js` (ya era la config proxy commitada en `8fbba78`), `frontend/Dockerfile` (idéntico al horneado en la imagen vieja; se conserva `COPY . .`, ahora filtrado), `docker-compose.yml` (contexto `./frontend` confirmado), variables de entorno de ningún servicio.

## 3. Corrección respecto al diagnóstico (hallazgo durante la implementación)

El diagnóstico (en modo Plan, con `glob` que omitía ficheros ocultos) afirmaba que `frontend/.env.local` **no existía** en el working tree. **Era incorrecto**: el fichero **sí existe** (183 B, 12-Sep, gitignored) junto a un `.env.local.example` (63 B, 15-Oct). Contenido verificado sin exponer valores: solo la clave `NEXT_PUBLIC_API_MOCK` (comentario + variable; sin secretos) y el template solo `NEXT_PUBLIC_API_URL=http://localhost/api`.

**Implicación (refuerza la causa raíz y la solución):** un rebuild sin `.dockerignore` habría **vuelto a hornear** el `.env.local` con el flag de mock en la nueva imagen. El `.dockerignore` no solo mitiga un riesgo futuro: neutralizó la contaminación inmediata. Verificado en la imagen nueva: existe `/app/.env.local.example`, **no existe** `/app/.env.local`.

## 4. Comandos ejecutados y resultados reales

### 4.1 Verificación previa (antes de tocar nada)
- `git status --porcelain` / `git diff --cached --stat` → línea base de B3-A.1 (34 M + 36 ??, staging vacío).
- `frontend/next.config.js` = versión proxy (sin `MOCK_MODE`), limpio respecto a HEAD.
- Glob `**/.dockerignore` → sin resultados (confirmado inexistente).
- `docker-compose.yml` → `frontend: build: ./frontend`, sin `env_file`/`environment`, volúmenes solo `src` y `public`.
- Diff del Dockerfile del contenedor viejo vs working tree → idéntico.

### 4.2 Build y recreate
```
docker-compose build frontend      → imagen sha256:e8af349d5bd0… (2026-10-18T02:47Z)
docker-compose up -d frontend      → Container vialibre-frontend-1 Recreated/Started (02:48:50Z)
```
- La capa `npm install` se re-ejecutó (lockfile actualizado desde Sep: vitest y deps de prueba) — comportamiento esperado y declarado en el diagnóstico.
- **No se recreó ningún otro contenedor**: uptime de auth/match (40 min), core/nginx/postgres (2 h, healthy) conservado.

### 4.3 Validación estática en la imagen nueva
- `/app/next.config.js` → versión proxy del repo (grep `MOCK_MODE` → **0** ocurrencias).
- `/app/.env.local` → **No such file or directory** (excluido por `.dockerignore`).

### 4.4 Validación en vivo (rewrites reales, no solo "arranca")

| Petición | Antes (imagen 14-Sep) | Ahora | Vía |
|---|---|---|---|
| `GET /api/v1/auth/tutores-docentes` | 404 HTML de Next | **401** | `:3000` y `:80` |
| `GET /api/v1/match/interactions` | 404 HTML de Next | **401** | `:3000` y `:80` |
| `POST /api/v1/auth/login` (payload `{}`) | 404 (POST) | **422** (validación) | `:3000` |
| `POST /api/v1/auth/login` (credenciales demo sembradas) | 404 | **200** (login end-to-end) | `:3000` y `:80` |
| `GET /` (shell de la app) | 200 | **200** | `:3000` |

**Prueba de autoría de la respuesta** (distingue backend vs Next): `curl -i :3000/api/v1/auth/tutores-docentes` →
```
HTTP/1.1 401 Unauthorized
server: nginx/1.25.5
content-type: application/json
www-authenticate: Bearer
{"detail":"Not authenticated"}
```
JSON del backend con cabecera `server: nginx` — cadena browser → rewrite de Next → nginx → auth-service. El 404 de Next era HTML; ahora no aparece. En los logs del frontend: `GET / 200`, compilaciones limpias, sin errores.

### 4.5 Regresión y salud
- `npm run lint` (frontend/) → **✔ No ESLint warnings or errors**.
- `npm test` (vitest, disponible en el repo) → **5 files, 45 passed** (~20 s).
- `pytest -q` → match **35 passed**, auth **25 passed**, core **18 passed** — idéntico a la línea base B3-A.1.
- `/health` en los 3 servicios (vía urllib dentro del contenedor) → **200/200/200**; `docker-compose ps` → los 6 contenedores Up (postgres healthy).

## 5. Conservación de trabajo (verificado al cierre)

- `git status --porcelain` → **71 líneas** = línea base (70) + exactamente `?? frontend/.dockerignore`. Los 34 ficheros modificados y 36 no rastreados preexistentes intactos.
- `git diff --cached --stat` → **vacío** (sin staging, sin commits).
- Únicos ficheros nuevos del bloque: `frontend/.dockerignore` y los dos informes B3A2 en `.opencode/reports/`.
- No se ejecutaron migraciones, ni limpiezas, ni borrados de imágenes/volúmenes/contenedores. No se reiniciaron auth, core, match, nginx ni PostgreSQL.

## 6. Riesgos, limitaciones y reversión

| Elemento | Estado |
|---|---|
| Modo mock | **No se modificó ni reintrodujo.** El código actual no tiene implementación de mock (solo el flag en `.env.local`, ahora excluido del build). Si se quiere demos offline, requiere bloque aparte con decisión explícita (pendiente institucional del diagnóstico §6.1). |
| Lockfile nuevo horneado | La imagen nueva incluye vitest/testing-library (`next` fijado a 14.2.5). Coherente con el repo; solo afecta al contenedor de desarrollo. |
| `next dev` en contenedor | Sigue siendo un stack de desarrollo (no `next build`/`start`). Endurecimiento de producción = fuera de alcance. |
| `.env.local` local | Sigue existiendo en el working tree (gitignored, sin secretos) para `next dev` en host; **ya no contamina** imágenes gracias a `.dockerignore`. |
| Caché | Riesgo residual bajo; el nuevo `.dockerignore` invalidó el contexto y forzó capas nuevas. |
| **Reversión** | Imagen previa preservada como dangling: `71cc434a1297` (14-Sep). Volver: `docker tag 71cc434a1297 vialibre-frontend && docker-compose up -d --force-recreate frontend`. Revertir el código: borrar `frontend/.dockerignore`. Sin volúmenes de estado en el frontend. |

## 7. Criterios de aceptación

- ✅ `.dockerignore` evita incorporar `.env.local` local a la imagen (verificado: existe el ejemplo, no el fichero real).
- ✅ La imagen utiliza la configuración vigente del repositorio (proxy simple, 0 ocurrencias de `MOCK_MODE`).
- ✅ `/api/*` llega al backend esperado por `:3000` y `:80` (401/422/200 con autoría demostrada: JSON + `server: nginx`, sin rastro de 404 de Next).
- ✅ El modo mock no se modificó ni se reintrodujo por suposición.
- ✅ Lint limpio, 45/45 vitest, 35/25/18 pytest (sin regresiones), salud ×6 contenedores.
- ✅ Informes documentados; sin staging ni commits; trabajo preexistente intacto.

---

> **B3-A.2 concluido.** No se inició B3-B ni ninguna otra parte de la Fase 3. Pendiente de decisión futura: destino del "modo mock" (ya sin implementación en el código).
