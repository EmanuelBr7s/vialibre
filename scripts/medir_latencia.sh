#!/usr/bin/env bash
# Mide los tiempos de respuesta de la API (solo lecturas y un login).
#
# Uso:
#   scripts/medir_latencia.sh [URL_BASE] [REPETICIONES]
#   VL_EMAIL=... VL_PASSWORD=... scripts/medir_latencia.sh https://vialibre-api.onrender.com 5
#
# Imprime, por endpoint, la mediana y el máximo del tiempo total y el desglose
# Server-Timing de la última respuesta (servicio y gateway).
set -u

BASE="${1:-http://127.0.0.1:10000}"
N="${2:-5}"
API="$BASE/api/v1"

medir() {
  local nombre="$1"; shift
  local tiempos=() cabecera=""
  for _ in $(seq "$N"); do
    local salida
    salida=$(curl -s -o /dev/null -D - -w '\n%{time_total}' "$@" 2>/dev/null)
    tiempos+=("$(printf '%s' "$salida" | tail -n1)")
    cabecera=$(printf '%s' "$salida" | grep -i '^server-timing:' | tr -d '\r' | cut -d' ' -f2-)
  done
  printf '%s\n' "${tiempos[@]}" | sort -n | awk -v n="$nombre" -v st="$cabecera" '
    { v[NR] = $1 }
    END {
      med = (NR % 2) ? v[(NR + 1) / 2] : (v[NR / 2] + v[NR / 2 + 1]) / 2
      printf "%-34s mediana %6.0f ms   máx %6.0f ms   %s\n", n, med * 1000, v[NR] * 1000, st
    }'
}

echo "API: $BASE  (repeticiones: $N)"
medir "GET /health" "$BASE/health"
medir "GET publicaciones (limit=30)" "$API/core/challenges?limit=30"
medir "GET publicaciones destacadas" "$API/core/challenges?featured_only=true"

if [ -n "${VL_EMAIL:-}" ] && [ -n "${VL_PASSWORD:-}" ]; then
  cuerpo=$(printf '{"email":"%s","password":"%s"}' "$VL_EMAIL" "$VL_PASSWORD")
  medir "POST login" -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "$cuerpo"
  token=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "$cuerpo" \
    | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
  if [ -n "$token" ]; then
    medir "GET /auth/users/me" "$API/auth/users/me" -H "Authorization: Bearer $token"
    medir "GET mis postulaciones" "$API/match/interactions/me" -H "Authorization: Bearer $token"
  fi
else
  echo "(define VL_EMAIL y VL_PASSWORD para medir también el login y las rutas con sesión)"
fi
