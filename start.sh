#!/usr/bin/env bash
set -e

PORT=${PORT:-10000}
echo "==> Ejecutando migraciones de base de datos..."
cd services/auth-service && alembic upgrade head && cd ../..
cd services/core-service && alembic upgrade head && cd ../..
cd services/match-service && alembic upgrade head && cd ../..

echo "==> Iniciando microservicios en puertos internos..."
uvicorn app.main:app --app-dir services/auth-service --host 127.0.0.1 --port 8001 &
uvicorn app.main:app --app-dir services/core-service --host 127.0.0.1 --port 8002 &
uvicorn app.main:app --app-dir services/match-service --host 127.0.0.1 --port 8003 &

echo "==> Iniciando Gateway publico en puerto $PORT..."
exec uvicorn gateway:app --host 0.0.0.0 --port "$PORT"

