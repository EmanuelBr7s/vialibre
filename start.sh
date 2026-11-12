#!/usr/bin/env bash
set -e

PORT=${PORT:-10000}

echo "==> Preparando la base de datos (esquemas, tablas y migraciones)..."
# bootstrap_db.py crea el esquema y las tablas en una base vacía (p. ej. Neon
# recién creada) y después aplica `alembic upgrade head` como siempre.
for svc in auth core match; do
  (cd "services/${svc}-service" && python ../../bootstrap_db.py "$svc")
done

# Datos de demostración (usuarios, publicaciones y postulaciones). Los scripts
# son idempotentes pero restablecen las cuentas demo en cada arranque: activar
# solo para una demo y desactivar después de la primera carga.
if [ "${SEED_DEMO_DATA:-false}" = "true" ]; then
  echo "==> Sembrando datos de demostración..."
  (cd services/auth-service && python -m app.seed)
  (cd services/core-service && python -m app.seed_core)
  (cd services/match-service && python -m app.seed_match)
fi

echo "==> Iniciando microservicios en puertos internos..."
uvicorn app.main:app --app-dir services/auth-service --host 127.0.0.1 --port 8001 &
uvicorn app.main:app --app-dir services/core-service --host 127.0.0.1 --port 8002 &
uvicorn app.main:app --app-dir services/match-service --host 127.0.0.1 --port 8003 &

echo "==> Iniciando Gateway publico en puerto $PORT..."
exec uvicorn gateway:app --host 0.0.0.0 --port "$PORT"
