#!/usr/bin/env bash
set -e

PORT=${PORT:-10000}

echo "==> Preparando la base de datos (esquemas, tablas y migraciones)..."
# bootstrap_db.py crea el esquema y las tablas en una base vacía (p. ej. Neon
# recién creada) y después aplica `alembic upgrade head` como siempre.
# Cada servicio tiene su propio esquema y tabla de versión: van en paralelo.
pids=()
for svc in auth core match; do
  (cd "services/${svc}-service" && python ../../bootstrap_db.py "$svc") &
  pids+=($!)
done
for pid in "${pids[@]}"; do
  wait "$pid"
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

# El gateway no se publica hasta que los tres servicios responden, para que
# las primeras peticiones no fallen mientras arrancan (tope: 60 s).
echo "==> Esperando a los microservicios..."
python - <<'PY'
import sys
import time
import urllib.request

pending = {8001, 8002, 8003}
deadline = time.time() + 60
while pending and time.time() < deadline:
    for port in sorted(pending):
        try:
            with urllib.request.urlopen(f"http://127.0.0.1:{port}/health", timeout=2) as res:
                if res.status == 200:
                    pending.discard(port)
        except Exception:
            pass
    if pending:
        time.sleep(0.5)
if pending:
    print(f"AVISO: sin respuesta en los puertos {sorted(pending)}; el gateway arranca igualmente.")
sys.exit(0)
PY

echo "==> Iniciando Gateway publico en puerto $PORT..."
exec uvicorn gateway:app --host 0.0.0.0 --port "$PORT"
