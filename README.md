# VíaLibre

Plataforma que conecta **organizaciones** (empresas, fundaciones, grupos de investigación) con **solucionadores** (estudiantes y profesionales) mediante **retos abiertos**: las organizaciones publican problemáticas reales y los solucionadores se postulan para resolverlas.

El proyecto está construido como un **monorepo** con microservicios:

- **Frontend**: Next.js 14 (App Router) + React 18 + Tailwind CSS.
- **Backend**: 3 microservicios FastAPI (auth, core, match) con SQLAlchemy async + Alembic.
- **Base de datos**: PostgreSQL 16 (una base, tres esquemas lógicos).
- **Gateway**: Nginx, que enruta `/api/v1/*` a los servicios y el resto al frontend.
- **Orquestación**: Docker Compose.

El frontend incluye un **modo mock** autocontenido que permite trabajar en la interfaz sin levantar el backend.

---

## Arquitectura

```
                     ┌──────────────────────────────┐
   Navegador ──────► │  Nginx (gateway)  :80        │
                     │                              │
                     │  /                ─► frontend:3000
                     │  /api/v1/auth/    ─► auth-service:8000
                     │  /api/v1/core/    ─► core-service:8000
                     │  /api/v1/match/   ─► match-service:8000
                     └──────────────┬───────────────┘
                                    │
                     ┌──────────────▼───────────────┐
                     │  PostgreSQL 16  :5432        │
                     │  esquemas: auth / core / match
                     └──────────────────────────────┘
```

| Servicio      | Puerto host | Descripción                          |
| ------------- | ----------- | ------------------------------------ |
| `nginx`       | 80          | Gateway de entrada (frontend + API)  |
| `frontend`    | 3000        | Next.js (modo desarrollo)            |
| `auth-service`| 8001        | Autenticación y usuarios             |
| `core-service`| 8002        | Retos / problemáticas                |
| `match-service`| 8003       | Postulaciones, reacciones e interacciones |
| `postgres`    | 5433        | Base de datos (5432 dentro de la red) |

Cada servicio expone documentación interactiva en `http://localhost:<puerto>/docs` y un healthcheck en `/health`.

---

## Estructura del repositorio

```
ViaLibre/
├── docker-compose.yml      # Orquestación de todos los servicios
├── Makefile                # Atajos para levantar, migrar y sembrar datos
├── .env.example            # Variables de entorno del backend (copiar a .env)
├── frontend/               # Aplicación Next.js
│   ├── .env.local.example  # Variables del frontend (copiar a .env.local)
│   └── src/
│       ├── app/            # Rutas (App Router)
│       ├── components/     # Componentes de interfaz
│       ├── lib/            # Cliente API real y mock
│       └── data/           # Datos simulados
├── gateway/                # Configuración de Nginx
├── services/
│   ├── auth-service/       # FastAPI: autenticación y usuarios
│   ├── core-service/       # FastAPI: retos
│   └── match-service/      # FastAPI: postulaciones y reacciones
└── shared/python/          # Librería común entre microservicios
```

---

## Requisitos previos

- **Docker Desktop** con Docker Compose (obligatorio para el stack completo).
- **Git**.
- **Node.js 20+** y **npm** (solo si quieres correr el frontend suelto en modo mock).
- **Make** (opcional, para usar los atajos del `Makefile`). En Windows puedes usar los comandos `docker compose` equivalentes.

> En Docker Desktop moderno el comando es `docker compose` (v2). El `Makefile` de este repositorio usa `docker-compose` (v1). Si no tienes el alias, ejecuta los comandos equivalentes de `docker compose`.

---

## Configuración

1. Crea el archivo de entorno del backend a partir del ejemplo:

   ```bash
   cp .env.example .env
   ```

   Ajusta los valores si lo necesitas (por defecto ya funcionan en desarrollo).

2. (Solo para el modo mock) Crea el archivo de entorno del frontend:

   ```bash
   cp frontend/.env.local.example frontend/.env.local
   ```

   No necesitas crear `frontend/.env.local` para el stack completo: Docker inyecta la configuración necesaria.

---

## Paso a paso — Opción A: modo mock (solo frontend, sin backend)

Ideal para trabajar en la interfaz sin levantar base de datos ni microservicios.

1. Configura el modo mock en `frontend/.env.local`:

   ```bash
   NEXT_PUBLIC_API_MOCK=true
   ```

2. Instala dependencias y arranca el servidor de desarrollo:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Abre **http://localhost:3000**.

En este modo los datos se guardan en el `localStorage` del navegador y no se realiza ninguna llamada de red. Para reiniciar los datos, limpia el `localStorage` del sitio o borra la clave `vialibre_mock_db_v1` desde las DevTools.

---

## Paso a paso — Opción B: stack completo con Docker

1. Crea el archivo de entorno del backend (ver [Configuración](#configuración)):

   ```bash
   cp .env.example .env
   ```

2. Construye y levanta todos los servicios:

   ```bash
   make up
   # Equivalente: docker compose up -d --build
   ```

   Espera a que PostgreSQL pase su healthcheck y los servicios arranquen.

3. Crea los esquemas, aplica las migraciones y carga los datos de prueba:

   ```bash
   make setup-db
   ```

   Este objetivo ejecuta, en orden: `init-schemas` → `migrate` → `seed` → `seed-core` → `seed-match`.

4. Abre la aplicación:
   - **Gateway (recomendado)**: http://localhost
   - **Frontend directo**: http://localhost:3000
   - **Docs de API**: http://localhost:8001/docs · http://localhost:8002/docs · http://localhost:8003/docs

> La primera ejecución de `make setup-db` puede tardar mientras se descargan imágenes y se instalan dependencias. Si `migrate` falla por una carrera de arranque, espera unos segundos y vuelve a ejecutar `make setup-db`.

---

## Credenciales de prueba

Los datos sembrados por `make seed` incluyen tres usuarios:

| Rol           | Correo                          | Contraseña          |
| ------------- | ------------------------------- | ------------------- |
| Admin         | `admin@vialibre.edu.co`         | `Admin1234`         |
| Publicador    | `contacto@artesaniasllamas.com` | `Publicador1234`    |
| Solucionador  | `leonardo@vialibre.edu.co`      | `Solucionador1234`  |

> En **modo mock** no se valida la contraseña: el inicio de sesión usa el correo para asociar un usuario de demostración.

---

## Rutas principales del frontend

| Ruta                         | Descripción                                  |
| ---------------------------- | -------------------------------------------- |
| `/`                          | Inicio                                       |
| `/feed`                      | Muro de retos disponibles                    |
| `/feed/[id]`                 | Detalle de un reto                           |
| `/login`, `/register`        | Inicio de sesión y registro                  |
| `/mis-postulaciones`         | Postulaciones del solucionador               |
| `/mis-problematicas`         | Retos publicados por la organización         |
| `/perfil/academico`          | Perfil académico del solucionador            |
| `/perfil/organizacion`       | Perfil de la organización                    |
| `/settings`                  | Ajustes (por rol)                            |
| `/admin/dashboard`, `/admin/anuncios` | Panel de administración             |

---

## Modo mock

El comportamiento se controla con la variable `NEXT_PUBLIC_API_MOCK` del frontend:

| Valor   | Comportamiento                                                        |
| ------- | --------------------------------------------------------------------- |
| `true`  | Usa `src/lib/mockApi.ts` y datos locales (`localStorage`). Sin red.   |
| `false` | Llama a la API real a través del gateway.                             |

Cuando se usa Docker Compose, el servicio `frontend` fuerza `NEXT_PUBLIC_API_MOCK=false`, de modo que el contenedor siempre consume la API real.

Variables de entorno relevantes:

- `NEXT_PUBLIC_API_URL`: URL base de la API (por defecto `/api`).
- `NEXT_PUBLIC_API_MOCK`: activa (`true`) o desactiva (`false`) el modo mock.

---

## Comandos útiles (Makefile)

| Comando             | Descripción                                              |
| ------------------- | -------------------------------------------------------- |
| `make up`           | Levanta todos los servicios en segundo plano.            |
| `make down`         | Detiene y elimina los contenedores.                      |
| `make build`        | Reconstruye las imágenes.                                |
| `make restart`      | Reinicia los contenedores.                               |
| `make ps`           | Muestra el estado de los servicios.                      |
| `make logs`         | Sigue los logs de todos los servicios.                   |
| `make logs-auth` / `logs-core` / `logs-match` | Logs por servicio.            |
| `make init-schemas` | Crea los tres esquemas lógicos en PostgreSQL.            |
| `make migrate`      | Genera y aplica migraciones de los tres servicios.       |
| `make seed`         | Siembra roles y usuarios de prueba.                      |
| `make seed-core`    | Siembra retos de ejemplo.                                |
| `make seed-match`   | Siembra interacciones de ejemplo.                        |
| `make setup-db`     | Ejecuta esquemas + migraciones + todos los seeds.        |
| `make clean`        | Detiene todo y elimina los volúmenes (borra la BD).      |

Sin `make`, usa el comando equivalente de Docker Compose, por ejemplo:

```bash
docker compose up -d --build
docker compose exec auth-service python -m app.seed
```

---

## Solución de problemas

- **Puerto ocupado (80, 3000, 5433, 8001-8003)**: detén el proceso que lo está usando o ajusta los mapeos de puertos en `docker-compose.yml`.
- **`docker-compose: command not found`**: usa `docker compose` (v2) o instala el binario clásico y crea el alias.
- **La base de datos no tiene tablas**: vuelve a ejecutar `make setup-db` una vez que todos los servicios estén arriba.
- **Los seeds dicen "already exists"**: es normal; los scripts son idempotentes.
- **Quiero reiniciar la base de datos desde cero**: `make clean` y luego repite el paso a paso de la Opción B.
- **El frontend muestra datos de ejemplo teniendo el backend arriba**: revisa que `NEXT_PUBLIC_API_MOCK` sea `false`.
