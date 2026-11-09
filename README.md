# VíaLibre

Plataforma que conecta organizaciones con estudiantes y egresados mediante retos,
prácticas y empleos.

| Componente      | Tecnología         | Puerto local |
| --------------- | ------------------ | ------------ |
| `auth-service`  | FastAPI + Alembic  | 8001         |
| `core-service`  | FastAPI + Alembic  | 8002         |
| `match-service` | FastAPI + Alembic  | 8003         |
| `frontend`      | Next.js 14         | 3000         |
| Base de datos   | PostgreSQL 16 (1 BD, 3 esquemas) | 5432 |

El frontend reenvía `/api/v1/{auth,core,match}/*` a cada servicio
(ver `frontend/next.config.js`), por lo que el navegador solo habla con Next.js.

## Desarrollo local

Requisitos: PostgreSQL 16, Python 3.11+ y Node.js 20+.

```bash
# 1. Variables de entorno
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local

# 2. Base de datos (usuario y BD "vialibre")
createuser -h localhost -P vialibre
createdb -h localhost -O vialibre vialibre

# 3. Dependencias (con el entorno virtual activo)
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
make install

# 4. Esquemas, migraciones y datos de prueba
make setup-db

# 5. Servidores, cada uno en su terminal
make dev-auth
make dev-core
make dev-match
make dev-frontend
```

Sin `make`, cada objetivo del `Makefile` es un comando simple que puede copiarse
y ejecutarse a mano.

La librería compartida `shared/python/vialibre_common` se instala en modo editable
(`pip install -e shared/python`), así que sus cambios se reflejan sin reinstalar.
