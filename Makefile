.PHONY: install install-auth install-core install-match install-frontend \
        dev-auth dev-core dev-match dev-frontend \
        init-schemas migrate migrate-auth migrate-core migrate-match \
        seed seed-core seed-match setup-db \
        test test-auth test-core test-match

# Desarrollo local sin contenedores: PostgreSQL 16 instalado (o administrado),
# Python 3.11+ con el entorno virtual activo y Node.js 20+.
# Nombre de la revision autogenerada: make migrate MSG=agregar_campos
MSG ?= initial_schema
PSQL ?= psql -h localhost -U vialibre -d vialibre

# ── Instalacion ──
install: install-auth install-core install-match install-frontend

install-%:
	pip install -r shared/python/requirements-common.txt -e shared/python -r services/$*-service/requirements.txt

install-frontend:
	cd frontend && npm install

# ── Servidores de desarrollo (uno por terminal) ──
dev-auth:
	cd services/auth-service && uvicorn app.main:app --reload --port 8001

dev-core:
	cd services/core-service && uvicorn app.main:app --reload --port 8002

dev-match:
	cd services/match-service && uvicorn app.main:app --reload --port 8003

dev-frontend:
	cd frontend && npm run dev

# ── Base de datos ──
init-schemas:
	$(PSQL) -c "CREATE SCHEMA IF NOT EXISTS vialibre_auth;"
	$(PSQL) -c "CREATE SCHEMA IF NOT EXISTS vialibre_core;"
	$(PSQL) -c "CREATE SCHEMA IF NOT EXISTS vialibre_match;"

migrate-%:
	cd services/$*-service && alembic revision --autogenerate -m "$(MSG)" && alembic upgrade head

migrate: migrate-auth migrate-core migrate-match

# ── Pruebas (pytest en cada servicio, con el entorno virtual activo) ──
test: test-auth test-core test-match

test-%:
	cd services/$*-service && pytest -q

seed:
	cd services/auth-service && python -m app.seed

seed-core:
	cd services/core-service && python -m app.seed_core

seed-match:
	cd services/match-service && python -m app.seed_match

setup-db: init-schemas migrate seed seed-core seed-match
	@echo "Database setup complete!"
