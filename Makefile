.PHONY: up down logs restart build clean ps init-schemas logs-auth logs-core logs-match

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
