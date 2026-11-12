# VíaLibre (VA-aLibre)

Plataforma de empleabilidad que conecta las **problemáticas reales del sector productivo** con el **talento universitario**. Las organizaciones publican retos, prácticas y ofertas de empleo; estudiantes y egresados se postulan y, cuando la postulación es aprobada, ambas partes desbloquean el contacto para colaborar.

El repositorio es un **monorepo** con tres microservicios FastAPI, un frontend Next.js y un gateway Nginx, orquestados con Docker Compose sobre una única base de datos PostgreSQL dividida en tres esquemas lógicos.

---

## Tabla de contenido

1. [Funcionalidades](#funcionalidades)
2. [Arquitectura](#arquitectura)
3. [Stack tecnológico](#stack-tecnológico)
4. [Estructura del repositorio](#estructura-del-repositorio)
5. [Requisitos](#requisitos)
6. [Puesta en marcha](#puesta-en-marcha)
7. [Comandos disponibles](#comandos-disponibles)
8. [Variables de entorno](#variables-de-entorno)
9. [API](#api)
10. [Autenticación y roles](#autenticación-y-roles)
11. [Modelo de datos](#modelo-de-datos)
12. [Frontend](#frontend)
13. [Datos de prueba y credenciales demo](#datos-de-prueba-y-credenciales-demo)
14. [Pruebas y calidad](#pruebas-y-calidad)
15. [Despliegue gratuito](#despliegue-gratuito)
16. [Notas y limitaciones](#notas-y-limitaciones)

---

## Funcionalidades

- **Publicaciones**: retos, prácticas y ofertas de empleo (`tipo`), con modalidad (presencial, remoto, híbrido), ubicación, categoría, dificultad, presupuesto, fecha límite y destacados.
- **Postulaciones**: el talento aplica con un mensaje; la organización ve los postulantes y aprueba o rechaza.
- **Contacto desbloqueado**: solo tras aprobar una postulación se expone la información de contacto de la contraparte.
- **Documentos de práctica**: en prácticas aprobadas, el estudiante carga documento de identidad, certificado de matrícula y afiliación a EPS (PDF/JPEG/PNG, hasta 5 MB).
- **Carta de aval**: PDF generado automáticamente cuando la práctica está aprobada y los documentos requisito están completos.
- **Banco de talento**: búsqueda de hojas de vida por rol, texto, programa, afiliación y disponibilidad de CV (solo empresas y administración).
- **Hoja de vida**: carga, reemplazo y descarga de CV en PDF (máximo 5 MB).
- **Reacciones**: `like` y `bookmark` sobre publicaciones, con conteo interno.
- **Perfiles**: datos académicos u organizacionales según rol; habilidades, enlaces profesionales y disponibilidad.
- **Onboarding y accesibilidad**: asistente de bienvenida por rol, recorrido guiado y panel de accesibilidad (tamaño de texto, espaciado, contraste y modos para daltonismo).
- **Panel de administración**: métricas y gestión de anuncios.

---

## Arquitectura

```
                        ┌──────────────────────────────┐
   navegador  :80 ─────▶│  nginx (gateway)             │
                        │  /api/v1/auth/*   → auth     │
                        │  /api/v1/core/*   → core     │
                        │  /api/v1/match/*  → match    │
                        │  /*               → frontend │
                        └──────────────────────────────┘
                             │        │        │        │
                  ┌──────────┘        │        │        └──────────┐
                  ▼                   ▼        ▼                   ▼
          ┌───────────────┐   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          │ auth-service  │   │ core-service │ │ match-service│ │  frontend    │
          │ :8000 → 8001  │   │ :8000 → 8002 │ │ :8000 → 8003 │ │ :3000        │
          │ FastAPI       │   │ FastAPI      │ │ FastAPI      │ │ Next.js 14   │
          └───────┬───────┘   └──────┬───────┘ └──────┬───────┘ └──────────────┘
                  │                  │                │
                  └──────────────────┴────────────────┘
                                     ▼
                        ┌────────────────────────────┐
                        │ PostgreSQL 16 (:5433 host) │
                        │ vialibre_auth              │
                        │ vialibre_core              │
                        │ vialibre_match             │
                        └────────────────────────────┘
```

| Servicio | Contenedor | Puerto host | Prefijo API | Esquema |
|---|---|---|---|---|
| Gateway | `nginx` | `80` | — | — |
| Frontend | `frontend` | `3000` | `/api/*` → gateway | — |
| Autenticación | `auth-service` | `8001` | `/api/v1/auth` | `vialibre_auth` |
| Publicaciones | `core-service` | `8002` | `/api/v1/core` | `vialibre_core` |
| Interacciones | `match-service` | `8003` | `/api/v1/match` | `vialibre_match` |
| Base de datos | `postgres` | `5433` | — | `vialibre` |

Cada servicio expone además `GET /health` en su propio puerto (no a través del gateway). El gateway admite cuerpos de hasta **6 MB** para permitir la subida de hojas de vida y documentos.

**Comunicación entre servicios**: HTTP con `httpx` a `http://auth-service:8000` y `http://core-service:8000`. Las referencias cruzadas (`author_id`, `solucionador_id`, `challenge_id`) son UUID sin restricciones de clave foránea; cada servicio solo garantiza integridad dentro de su esquema.

---

## Stack tecnológico

**Backend**
- Python 3.11 · FastAPI · Uvicorn
- SQLAlchemy 2 (async) · asyncpg · Alembic
- Pydantic 2 · pydantic-settings
- `python-jose` (JWT) · `passlib[bcrypt]`
- `httpx` para llamadas entre servicios
- Generador de PDF propio en `shared/python/vialibre_common/pdf.py` (carta de aval)

**Frontend**
- Next.js 14.2 (App Router) · React 18 · TypeScript 5
- Tailwind CSS 3 · PostCSS · Autoprefixer
- ESLint (`next lint`)

**Infraestructura**
- PostgreSQL 16 (alpine)
- Nginx 1.25 (alpine)
- Docker Compose (sintaxis v1, `docker-compose`) y `Makefile`

---

## Estructura del repositorio

```
ViaLibre/
├── docker-compose.yml          # postgres + 3 servicios + frontend + nginx
├── Makefile                    # arranque, migraciones y seeds
├── .env.example                # plantilla de variables de entorno
├── gateway/
│   ├── Dockerfile
│   └── nginx.conf              # upstreams, enrutado /api/v1/* y límite de subida
├── services/
│   ├── auth-service/           # identidad, JWT, usuarios, CV y banco de talento
│   │   ├── app/
│   │   │   ├── main.py         # FastAPI app + /health
│   │   │   ├── config.py       # settings y schema_name
│   │   │   ├── database.py     # engine y sesión async
│   │   │   ├── seed.py         # roles, empresas, estudiantes y egresados demo
│   │   │   ├── api/v1/endpoints/{auth,users}.py
│   │   │   ├── core/security.py
│   │   │   ├── models/{role,user}.py
│   │   │   └── schemas/{auth,user}.py
│   │   ├── alembic/            # env.py + versiones (no versionadas)
│   │   └── requirements.txt
│   ├── core-service/           # retos, prácticas y ofertas
│   │   ├── app/
│   │   │   ├── api/v1/endpoints/challenges.py
│   │   │   ├── models/{challenge,category}.py
│   │   │   ├── schemas/challenge.py
│   │   │   └── seed_core.py
│   │   └── alembic/
│   └── match-service/          # postulaciones, documentos y reacciones
│       ├── app/
│       │   ├── api/v1/endpoints/{interactions,documents,reactions}.py
│       │   ├── models/{interaction,document,reaction}.py
│       │   ├── schemas/match.py
│       │   └── seed_match.py
│       └── alembic/
├── shared/
│   └── python/
│       ├── requirements-common.txt   # dependencias comunes a los 3 servicios
│       └── vialibre_common/          # enums, auth compartida y generador PDF
└── frontend/
    ├── Dockerfile
    ├── next.config.js                # rewrite /api/* → nginx
    ├── package.json
    ├── public/seed/                  # avatares y portadas de los datos de prueba
    └── src/
        ├── middleware.ts             # protección de rutas por cookie
        ├── app/                      # App Router (páginas y layouts)
        ├── components/               # UI reutilizable
        ├── contexts/                 # Auth, accesibilidad, tour, anuncios
        ├── hooks/                    # useProfile, useRoleGuard, useFocusTrap
        ├── lib/                      # api.ts, constantes, almacenamiento local
        ├── data/                     # mock, módulos, anuncios, tour, a11y
        ├── config/                   # configuración promocional
        └── types/                    # tipos TypeScript del dominio
```

`shared/python/vialibre_common` se monta como volumen en `/shared` (dentro del `PYTHONPATH`) y también se copia en la imagen. Los cambios en la librería se ven tras reiniciar el servicio; si tocas `requirements*.txt`, ejecuta `make build`.

---

## Requisitos

- Docker y Docker Compose (comando `docker-compose`, sintaxis v1)
- `make` (o ejecutar los comandos equivalentes de `docker-compose`)
- Node.js 20+ solo si vas a trabajar en el frontend fuera de Docker

---

## Puesta en marcha

```bash
# 1. Variables de entorno
cp .env.example .env          # en Windows: copy .env.example .env

# 2. Construir y levantar el stack
make build
make up

# 3. Crear esquemas, aplicar migraciones y sembrar datos
make setup-db
```

La aplicación queda disponible en **http://localhost** (gateway).

Comprobación rápida:

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
curl http://localhost:8003/health
```

Para reiniciar desde cero (⚠️ **borra el volumen de la base de datos**):

```bash
make clean   # docker-compose down -v
make up
make setup-db
```

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `make up` | Levanta todos los servicios en segundo plano |
| `make down` | Detiene y elimina los contenedores |
| `make ps` | Estado de los contenedores |
| `make build` | Reconstruye las imágenes (necesario tras cambiar `requirements*.txt`) |
| `make restart` | Reinicia los contenedores |
| `make logs` | Logs de todo el stack (`-f`) |
| `make logs-auth` / `logs-core` / `logs-match` | Logs de un servicio |
| `make clean` | `down -v`: elimina contenedores **y el volumen de datos** |
| `make init-schemas` | Crea `vialibre_auth`, `vialibre_core`, `vialibre_match` |
| `make migrate` | Autogenera y aplica migraciones en los tres servicios |
| `make migrate MSG=descripcion` | Igual, con nombre de revisión personalizado (`MSG` por defecto: `initial_schema`) |
| `make migrate-auth` / `-core` / `-match` | Migraciones de un solo servicio |
| `make seed` | Siembra roles, empresas, estudiantes y egresados (auth) |
| `make seed-core` | Siembra categorías y publicaciones (core) |
| `make seed-match` | Siembra postulaciones y documentos (match) |
| `make setup-db` | `init-schemas` + `migrate` + los tres seeds |

**Frontend** (desde `frontend/`):

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm start` | Servir el build de producción |
| `npm run lint` | ESLint (`next lint`) |

---

## Variables de entorno

Definidas en `.env` (plantilla en `.env.example`):

| Variable | Por defecto | Uso |
|---|---|---|
| `POSTGRES_USER` | `vialibre` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | `vialibre_secret_dev` | Contraseña de PostgreSQL |
| `POSTGRES_DB` | `vialibre` | Base de datos única |
| `JWT_SECRET_KEY` | `change-me-in-production-use-a-real-secret` | Firma de los JWT (cámbiala en producción) |
| `JWT_ALGORITHM` | `HS256` | Algoritmo de firma |
| `JWT_EXPIRE_MINUTES` | `60` | Vigencia del token |
| `DATABASE_URL` | `postgresql+asyncpg://…@postgres:5432/vialibre` | Conexión async; si está vacía se compone con los valores anteriores |

> `DATABASE_URL` apunta al host **`postgres`**, nombre que solo resuelve dentro de la red de Docker. Los servicios no pueden ejecutarse directamente en el host.

---

## API

Todas las rutas se consumen a través del gateway en `http://localhost/api/v1/...`. Los servicios tienen `redirect_slashes=False` y las rutas de colección se registran **sin barra final**.

### auth-service — `/api/v1/auth`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/login` | Autentica y devuelve el JWT |
| `POST` | `/register` | Registro con validación por rol |
| `GET` | `/users/me` | Perfil del usuario autenticado |
| `PATCH` | `/users/me` | Actualiza el perfil propio |
| `PUT` | `/users/me/cv` | Sube o reemplaza la hoja de vida (PDF, ≤ 5 MB) |
| `DELETE` | `/users/me/cv` | Elimina la hoja de vida |
| `GET` | `/users/talent` | Banco de talento (empresas y admin) |
| `GET` | `/users/{user_id}` | Consulta de un usuario |
| `GET` | `/users/{user_id}/cv` | Descarga la hoja de vida |

`GET /users/talent` admite `role`, `q`, `programa`, `afiliacion`, `con_cv`, `skip` y `limit`.

### core-service — `/api/v1/core`

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/challenges` | Listado con filtros y paginación |
| `POST` | `/challenges` | Publica un reto, práctica u oferta |
| `GET` | `/challenges/{challenge_id}` | Detalle de la publicación |
| `PATCH` | `/challenges/{challenge_id}` | Edita la publicación |
| `DELETE` | `/challenges/{challenge_id}` | Elimina la publicación |
| `GET` | `/challenges/categories` | Lista de categorías |
| `POST` | `/challenges/categories` | Crea una categoría |

Filtros de `GET /challenges`: `skip`, `limit`, `status`, `category_id`, `difficulty`, `featured_only`, `tipo`, `author_id`. Por defecto devuelve solo publicaciones abiertas; al filtrar por `author_id` devuelve todos los estados.

### match-service — `/api/v1/match`

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/interactions/apply` | Postula a una publicación |
| `GET` | `/interactions` | Postulaciones del usuario |
| `GET` | `/interactions/challenge/{challenge_id}` | Postulantes de una publicación |
| `GET` | `/interactions/{interaction_id}` | Detalle de la postulación |
| `PATCH` | `/interactions/{interaction_id}/approve` | Aprueba o rechaza |
| `DELETE` | `/interactions/{interaction_id}` | Retira la postulación |
| `GET` | `/interactions/{interaction_id}/contact` | Contacto desbloqueado |
| `GET` | `/interactions/{interaction_id}/documentos` | Checklist de documentos de práctica |
| `PUT` | `/interactions/{interaction_id}/documentos/{tipo}` | Carga un documento requisito |
| `GET` | `/interactions/{interaction_id}/documentos/{tipo}` | Descarga un documento requisito |
| `GET` | `/interactions/{interaction_id}/carta-aval` | Carta de aval en PDF |
| `POST` | `/reactions` | Crea `like` o `bookmark` |
| `GET` | `/reactions` | Reacciones del usuario |
| `DELETE` | `/reactions/{reaction_id}` | Elimina una reacción |
| `GET` | `/reactions/internal/count/{challenge_id}` | Conteo de reacciones por publicación |

Documentos requisito de práctica (`{tipo}`): `documento_identidad`, `certificado_matricula`, `afiliacion_eps`. Formatos admitidos: PDF, JPEG y PNG, hasta 5 MB. La carta de aval solo está disponible cuando la práctica fue aprobada y el checklist está completo.

---

## Autenticación y roles

- **JWT** firmado con `HS256`; el token incluye `sub`, `role`, `iat` y `exp`.
- Contraseñas con **bcrypt** (`passlib`).
- En el frontend el token se guarda en la cookie `vialibre_token` (`AUTH_COOKIE_NAME`), definida en `frontend/src/lib/constants.ts`.
- `frontend/src/middleware.ts` protege las rutas y redirige:
  - sin token en ruta protegida → `/login`
  - con token en `/`, `/login` o `/register` → `/feed`
- Rutas protegidas: `/feed`, `/mis-problematicas`, `/mis-postulaciones`, `/perfil`, `/admin`, `/settings`, `/talento`.

**Roles** (`vialibre_common.schemas.UserRole`):

| Rol | Descripción | Campos obligatorios al registrarse |
|---|---|---|
| `publicador` | Organización que publica retos, prácticas y empleos | `nit_empresa` y datos de empresa |
| `solucionador` | Estudiante que se postula | `programa_academico` |
| `egresado` | Egresado que se postula a ofertas | `programa_academico` |
| `admin` | Administración de la plataforma | — |

Los roles que se postulan y tienen perfil profesional (`TALENT_ROLES`) son `solucionador` y `egresado`; se definen tanto en `shared/` como en `frontend/src/lib/constants.ts`.

---

## Modelo de datos

Una sola base de datos `vialibre`, tres esquemas, y una tabla de versión de Alembic por servicio (`alembic_version_auth`, `alembic_version_core`, `alembic_version_match`).

### `vialibre_auth`

| Tabla | Campos principales |
|---|---|
| `roles` | `id`, `name` (único), `description` |
| `users` | `id`, `email` (único), `password_hash`, `full_name`, `role_id` → `roles.id`, `is_active`, `avatar_url`, `phone`, `bio`, `nit_empresa`, `empresa_nombre`, `programa_academico`, `afiliacion_academica`, `skills`, `soft_skills` (JSONB), `linkedin_url`, `github_url`, `portfolio_url`, `ubicacion`, `semestre`, `anio_egreso`, `disponible`, `cv_filename`, `cv_size`, `cv_updated_at`, `cv_data` (binario diferido), `created_at`, `updated_at` |

### `vialibre_core`

| Tabla | Campos principales |
|---|---|
| `categories` | `id`, `name` (único), `description`, `icon` |
| `challenges` | `id`, `title`, `tipo` (`reto`/`practica`/`empleo`), `short_description`, `long_description`, `category_id` → `categories.id`, `author_id` (UUID de auth, sin FK), `status`, `difficulty`, `tags` (JSONB), `budget`, `deadline`, `image_url`, `modalidad` (`presencial`/`remoto`/`hibrido`), `ubicacion`, `is_featured`, `featured_score`, `created_at`, `updated_at` |

### `vialibre_match`

| Tabla | Campos principales |
|---|---|
| `interactions` | `id`, `solucionador_id`, `challenge_id`, `status`, `message`, `contact_unlocked`, `contact_unlocked_at`, `created_at`, `updated_at` |
| `interaction_documents` | `id`, `interaction_id` → `interactions.id`, `tipo`, `filename`, `content_type`, `size`, `data` (binario diferido), `uploaded_at` |
| `reactions` | `id`, `user_id`, `challenge_id`, `reaction_type`, `created_at` |

### Enums

Los servicios definen sus **propios enums en español**; los enums en inglés de `shared/vialibre_common/schemas.py` no son los que persisten en la base:

| Dominio | Valores |
|---|---|
| `ChallengeStatus` (core) | `abierto`, `en_progreso`, `cerrado` |
| `DifficultyLevel` (core) | `easy`, `medium`, `hard` |
| `InteractionStatus` (match) | `pendiente`, `aprobado`, `rechazado` |
| `ReactionType` (match) | `like`, `bookmark` |

`tipo` y `modalidad` se validan con `Literal` en `services/core-service/app/schemas/challenge.py`.

### Migraciones

- Las revisiones de Alembic son **autogeneradas y no se versionan** (`services/*/alembic/versions/` está en `.gitignore`).
- Cada `alembic/env.py` fija su propia tabla de versión y usa `include_name` para limitar el autogenerado a su esquema (sin eso intentaría recrear o borrar tablas de los otros servicios).
- Los esquemas deben existir antes de migrar: `make init-schemas` precede a `make migrate` en `make setup-db`.
- Al añadir un modelo, impórtalo en `models/__init__.py` y en `alembic/env.py` para que el autogenerado lo detecte.

---

## Frontend

Next.js 14 con App Router. El cliente HTTP vive en `src/lib/api.ts` (auth, perfil, CV, banco de talento, publicaciones, postulaciones, documentos de práctica, reacciones) y usa `NEXT_PUBLIC_API_URL` o `/api` como base; `next.config.js` reescribe `/api/*` hacia `http://nginx:80/api/*`.

### Rutas

| Ruta | Pantalla |
|---|---|
| `/` | Redirección según sesión (`/feed` o `/login`) |
| `/login` | Inicio de sesión + panel promocional |
| `/register` | Registro por rol |
| `/feed` | Listado de retos, prácticas y empleos |
| `/feed/[id]` | Detalle y postulación |
| `/mis-problematicas` | Publicaciones de la organización |
| `/mis-postulaciones` | Postulaciones del talento |
| `/talento` | Banco de hojas de vida (empresas y admin) |
| `/perfil/academico` | Perfil académico del talento |
| `/perfil/organizacion` | Perfil de la organización |
| `/settings` | Ajustes de la cuenta |
| `/admin/dashboard` | Métricas administrativas |
| `/admin/anuncios` | Gestión de anuncios |

Las pantallas de datos incluyen `loading.tsx` con esqueletos de carga.

### Capas

- `contexts/`: `AuthContext` (sesión), `AccessibilityContext`, `TourContext`, `AdvertisementContext`.
- `hooks/`: `useProfile`, `useRoleGuard`, `useFocusTrap`, `useBottomSheet` (hojas inferiores arrastrables en móvil).
- `components/`: `Sidebar`, `MobileHeader`, `BottomNav` (navegación móvil), `LayoutContent`, `UserDropdown`, `ChallengeCard`, `FeaturedCard`, `CreateChallengeModal`, `ApplicantsSection`, `ContactSection`, `PracticeDocuments`, `CvPreviewModal`, `ProfileEditor`, `ResumeUploader`, `AccessibilityPanel`, `OnboardingManager`, `FeatureTour`, diálogos y banners.
- `data/`: datos de demostración (`mock.ts`), módulos por rol (`modules.ts`), anuncios (`ads.ts`), onboarding (`tour.ts`) y accesibilidad (`accessibility.ts`).
- `config/promo.ts`: configuración del panel promocional del login.
- `public/seed/`: avatares SVG y portadas de las publicaciones sembradas.

### Diseño responsive

La interfaz es mobile-first: en pantallas pequeñas se usa `MobileHeader` + `BottomNav` y los modales se presentan como bottom sheets; desde `lg` se muestra la barra lateral colapsable. La tipografía usa la escala fluida `text-fluid-*` (definida en `tailwind.config.js`) y los controles respetan un área táctil mínima (`min-h-touch`). Las clases compartidas viven en `components/ui/classes.ts`.

### Modo mock (solo frontend, sin backend)

Para trabajar en la interfaz sin levantar la base de datos ni los microservicios:

```bash
cd frontend
cp .env.local.example .env.local   # y cambia NEXT_PUBLIC_API_MOCK=true
npm install
npm run dev
```

| `NEXT_PUBLIC_API_MOCK` | Comportamiento |
|---|---|
| `true` | Usa `src/lib/mockApi.ts` y datos locales (`localStorage`). Sin red; el login muestra accesos rápidos por rol. |
| `false` | Llama a la API real a través del proxy de `next.config.js`. |

Los datos del modo mock se guardan en el `localStorage` del navegador; para reiniciarlos borra la clave `vialibre_mock_db_v1` desde las DevTools.

---

## Datos de prueba y credenciales demo

Los seeds son idempotentes y usan **UUID fijos compartidos** entre servicios: las publicaciones del `core` y las postulaciones del `match` referencian usuarios creados por el seed de `auth`.

Credenciales base:

| Rol | Correo | Contraseña |
|---|---|---|
| Admin | `admin@vialibre.edu.co` | `Admin1234` |
| Publicador | `contacto@artesaniasllamas.com` | `Publicador1234` |
| Solucionador | `leonardo@vialibre.edu.co` | `Solucionador1234` |

El banco de prueba incluye además:

- **5 empresas** (`*@empresas.vialibre.edu.co`) con contraseña `Empresa1234`.
- **6 estudiantes** (`nombre.apellido@vialibre.edu.co`) con contraseña `Estudiante1234`.
- **4 egresados** (`*@egresados.vialibre.edu.co`) con contraseña `Egresado1234`.
- 14 publicaciones (5 retos, 5 prácticas y 4 empleos) y postulaciones en distintos estados, con documentos de práctica cargados.

UUID fijos principales: usuarios `00000000-0000-0000-0000-00000000000{1,2,3}` (admin, publicador, solucionador) y roles `a0000000-0000-0000-0000-00000000000{1..4}`. El resto se deriva con la función `_uid(n)` del seed.

Si cambias estos datos, mantén los UUID sincronizados entre `services/auth-service/app/seed.py`, `core-service/app/seed_core.py` y `match-service/app/seed_match.py`.

---

## Pruebas y calidad

**No hay suite de pruebas automatizadas ni CI** en el repositorio. La única verificación disponible es:

```bash
cd frontend
npm run lint
```

Verificación manual sugerida tras un cambio de backend: levantar el stack y comprobar `GET /health` en los puertos `8001`, `8002` y `8003`, y ejercitar los endpoints del servicio modificado.

---

## Despliegue gratuito

Tres servicios con plan gratuito, sin tarjeta:

| Pieza | Servicio | Qué corre |
|---|---|---|
| Base de datos | [Neon](https://neon.tech) | PostgreSQL 16 (los tres esquemas en una base) |
| API | [Render](https://render.com) | `start.sh`: gateway público + auth/core/match en un solo servicio web |
| Frontend | [Vercel](https://vercel.com) | Next.js; su proxy `/api` reenvía al gateway de Render |

**1. Neon.** Crea un proyecto y copia la cadena de conexión (`postgresql://…?sslmode=require`). No hace falta crear esquemas ni tablas: `bootstrap_db.py` los crea en el primer arranque y marca las migraciones; en arranques posteriores solo aplica `alembic upgrade head`.

**2. Render (API).** *New → Blueprint* → conecta el repositorio. `render.yaml` define el servicio `vialibre-api`. Pega la cadena de Neon en `DATABASE_URL`; `JWT_SECRET_KEY` se genera solo. Con `SEED_DEMO_DATA=true` se cargan las [credenciales demo](#datos-de-prueba-y-credenciales-demo); **cámbialo a `false` tras el primer despliegue**, porque los seeds restablecen las contraseñas demo en cada arranque. Comprueba `https://<servicio>.onrender.com/health`.

**3. Vercel (frontend).** *Add New → Project* → importa el repositorio con **Root Directory = `frontend`** y estas variables (se leen en el build):

| Variable | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `/api` |
| `NEXT_PUBLIC_API_MOCK` | `false` |
| `AUTH_SERVICE_URL` | `https://<servicio>.onrender.com` |
| `CORE_SERVICE_URL` | `https://<servicio>.onrender.com` |
| `MATCH_SERVICE_URL` | `https://<servicio>.onrender.com` |

Los tres `*_SERVICE_URL` apuntan al mismo gateway, que enruta por prefijo (`/api/v1/auth`, `/core`, `/match`). Si cambian, vuelve a desplegar el frontend.

> El plan gratuito de Render suspende el servicio tras 15 min sin tráfico: la primera petición después tarda alrededor de un minuto.

---

## Notas y limitaciones

- **Host de base de datos**: `postgres` solo resuelve dentro de la red de Docker; los servicios no arrancan en el host.
- **Librería compartida**: está montada como volumen y también horneada en la imagen; reinicia el servicio tras cambiarla y ejecuta `make build` si cambian dependencias.
- **Enums duplicados**: edita siempre el enum local del servicio (core/match) y no el de `shared/`.
- **Sin claves foráneas entre servicios**: `author_id`, `solucionador_id` y `challenge_id` son UUID sueltos; la integridad cruzada es responsabilidad de la aplicación.
- **Migraciones no versionadas**: cada entorno genera sus revisiones con `make migrate`.
- **Datos de demostración**: varias vistas (KPIs del panel admin, perfiles y módulos por rol) usan datos locales de `frontend/src/data/` cuando la API aún no cubre el flujo.
- **Secretos por defecto**: `JWT_SECRET_KEY` y la contraseña de PostgreSQL son valores de desarrollo; cámbialos antes de desplegar.
- **CORS abierto**: los servicios permiten todos los orígenes; restringir en producción.
