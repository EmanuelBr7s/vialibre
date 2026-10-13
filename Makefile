.PHONY: up down logs restart build clean ps init-schemas migrate setup-db seed seed-core seed-match \
        logs-auth logs-core logs-match migrate-auth migrate-core migrate-match

# Nombre de la revision autogenerada: make migrate MSG=agregar_campos
MSG ?= initial_schema

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

logs-auth:
	docker-compose logs -f auth-service

logs-core:
	docker-compose logs -f core-service

logs-match:
	docker-compose logs -f match-service

build:
	docker-compose build

restart:
	docker-compose restart

clean:
	docker-compose down -v

ps:
	docker-compose ps

init-schemas:
	docker-compose exec postgres psql -U vialibre -d vialibre -c "CREATE SCHEMA IF NOT EXISTS vialibre_auth;"
	docker-compose exec postgres psql -U vialibre -d vialibre -c "CREATE SCHEMA IF NOT EXISTS vialibre_core;"
	docker-compose exec postgres psql -U vialibre -d vialibre -c "CREATE SCHEMA IF NOT EXISTS vialibre_match;"

migrate-auth:
	docker-compose exec auth-service alembic revision --autogenerate -m "$(MSG)"
	docker-compose exec auth-service alembic upgrade head

migrate-core:
	docker-compose exec core-service alembic revision --autogenerate -m "$(MSG)"
	docker-compose exec core-service alembic upgrade head

migrate-match:
	docker-compose exec match-service alembic revision --autogenerate -m "$(MSG)"
	docker-compose exec match-service alembic upgrade head

migrate: migrate-auth migrate-core migrate-match

seed:
	docker-compose exec auth-service python -m app.seed

seed-core:
	docker-compose exec core-service python -m app.seed_core

seed-match:
	docker-compose exec match-service python -m app.seed_match

setup-db: init-schemas migrate seed seed-core seed-match
	@echo "Database setup complete!"
