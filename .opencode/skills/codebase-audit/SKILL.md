---
name: codebase-audit
description: "Auditoría de arquitectura, funcionalidades, dependencias y modelo de datos de VíaLibre antes de modificar código. Úsala al iniciar cualquier funcionalidad nueva para mapear los 3 microservicios FastAPI (auth/core/match), el frontend Next.js 14, la librería compartida, los schemas y los comandos existentes, de modo que el trabajo amplíe la plataforma en lugar de reconstruirla."
---

# Auditoría del código base (codebase-audit)

Objetivo: comprender qué existe hoy en VíaLibre **antes** de tocar una sola línea. Esta plataforma universitaria ya está construida; el trabajo consiste en ampliarla reutilizando su arquitectura y sus entidades. Auditar es un paso obligatorio y **de solo lectura**.

## Cuándo usar esta skill

- Al comenzar cualquier funcionalidad nueva (RBAC, panel admin, documentos, etc.).
- Cuando no esté claro dónde vive una responsabilidad (¿auth, core o match?).
- Antes de proponer un modelo de datos, un endpoint o un componente nuevo.
- Cuando el usuario pida "revisar", "entender" o "auditar" el proyecto.

## Procedimiento

1. Lee `AGENTS.md` completo: es la fuente de verdad de layout, comandos, migraciones, seeds y "gotchas".
2. Recorre el layout real de cada servicio (no asumas Symfony/Django/Laravel ni otro framework; este repo es **FastAPI + SQLAlchemy async**):
   - `services/auth-service/app/` → `config.py`, `database.py`, `models/`, `schemas/`, `core/security.py`, `api/deps.py`, `api/v1/endpoints/`.
   - `services/core-service/app/` → retos/categorías (`models/challenge.py`, `models/category.py`, `api/v1/endpoints/challenges.py`).
   - `services/match-service/app/` → postulaciones, reacciones y documentos (`models/interaction.py`, `models/reaction.py`, `models/document.py`, `api/v1/endpoints/`).
3. Lee la librería compartida `shared/python/vialibre_common/`:
   - `schemas.py` → `UserRole`, `TALENT_ROLES`, `TokenPayload`, enums compartidos.
   - `auth.py` → verificación de JWT (`verify_token`).
   - `pdf.py` → generador de PDF mínimo.
4. Mapea el frontend `frontend/src/`: `app/` (App Router), `components/`, `contexts/AuthContext.tsx`, `hooks/useRoleGuard.ts`, `lib/api.ts`, `types/index.ts`, `middleware.ts`, `data/mock.ts`.
5. Mapea infraestructura: `docker-compose.yml`, `Makefile`, `gateway/nginx.conf`, `.env.example`.
6. Localiza funcionalidad existente antes de crear nueva: busca por palabra clave (`grep`/`rg`) y por entidad.
7. Enumera dependencias reales: `requirements*.txt` de cada servicio y `frontend/package.json`. No asumas paquetes que no aparezcan ahí.
8. Produce un informe breve con: componentes implicados, entidades reutilizables, enums relevantes, endpoints existentes y huecos.

## Reglas técnicas

- **Solo lectura.** Esta skill no crea ni modifica archivos.
- Cada servicio define su propio `schema_name` y su propio `api_v1_prefix` en `app/config.py`; consérvalo.
- Existe una “trampa de enums”: `shared/.../schemas.py` define enums en inglés (`ChallengeStatus`, `InteractionStatus`, `DifficultyLevel`), pero cada servicio usa sus **enums locales en español** (core: `abierto`/`en_progreso`/`cerrado`; match: `pendiente`/`aprobado`/`rechazado`). Reporta ambos y no los mezcles.
- Las referencias entre servicios (`author_id`, `solucionador_id`, `challenge_id`) son UUID “desnudos”, **sin FK**. Verifica su existencia por HTTP (`httpx`) contra `settings.auth_service_url` / `core_service_url`.
- Las rutas de colección se registran sin barra final (`@router.post("")`), no con `/`.
- No propongas dependencias nuevas sin justificar por qué el stack actual no basta.

## Criterios de validación

- El informe nombra archivos y rutas **reales** del repo (no plantillas genéricas).
- Distingue correctamente qué pertenece a auth vs core vs match.
- Identifica entidades existentes candidatas a reutilizar (p. ej. `User`, `Role`, `Challenge`, `Interaction`, `InteractionDocument`).
- Señala los enums locales correctos y la trampa de enums compartidos.
- Lista los comandos reales (`make up`, `make setup-db`, `make migrate-<svc>`, `npm run lint`).

## Errores a evitar

- Asumir un framework, ORM, base de datos o librería documental que el repo no usa.
- Proponer “reconstruir” o reescribir módulos que ya existen.
- Ignorar la separación por esquemas PostgreSQL (`vialibre_auth`, `vialibre_core`, `vialibre_match`).
- Confundir enums compartidos con enums locales.
- Dar por hecho que existe suite de pruebas o CI (hoy no existen).

## Criterios de finalización verificables

- [ ] Informe entregado con las secciones: arquitectura, funcionalidades existentes, entidades reutilizables, dependencias y huecos.
- [ ] Cada afirmación referencia un archivo o ruta concreta del repositorio.
- [ ] Se listan los endpoints y modelos relevantes al cambio previsto.
- [ ] No se modificó ningún archivo de la aplicación durante la auditoría.
