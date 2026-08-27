#!/usr/bin/env bash
set -u

PUBLIC_URL="${1:-https://agences.mondescale.com/agence/gien}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3000/agence/gien}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4000/health}"

section() {
  printf '\n=== %s ===\n' "$1"
}

http_probe() {
  local label="$1"
  local url="$2"
  local output
  output="$(curl -sS -L -o /dev/null -w 'HTTP=%{http_code} TTFB=%{time_starttransfer}s TOTAL=%{time_total}s REMOTE=%{remote_ip}\n' --max-time 15 "$url" 2>&1)"
  local status=$?
  printf '%s URL=%s\n%s\n' "$label" "$url" "$output"
  return "$status"
}

section "MSE-25.71 ORIGIN READINESS"
printf 'PUBLIC_URL=%s\n' "$PUBLIC_URL"
printf 'FRONTEND_URL=%s\n' "$FRONTEND_URL"
printf 'BACKEND_URL=%s\n' "$BACKEND_URL"

section "DOCKER COMPOSE SERVICES"
if command -v docker >/dev/null 2>&1; then
  docker compose ps 2>&1 || true
else
  echo 'DOCKER=not-found'
fi

section "CONTAINER HEALTH"
if command -v docker >/dev/null 2>&1; then
  for name in mle_postgres mle_backend mle_frontend; do
    if docker inspect "$name" >/dev/null 2>&1; then
      printf '%s ' "$name"
      docker inspect --format 'STATUS={{.State.Status}} HEALTH={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} RESTARTS={{.RestartCount}} STARTED={{.State.StartedAt}}' "$name" 2>&1 || true
    else
      printf '%s STATUS=missing\n' "$name"
    fi
  done
fi

section "LOCAL BACKEND"
http_probe BACKEND "$BACKEND_URL" || true

section "LOCAL FRONTEND"
http_probe FRONTEND "$FRONTEND_URL" || true

section "PUBLIC ROUTE"
http_probe PUBLIC "$PUBLIC_URL" || true

section "LISTENERS"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | grep -E '(:80|:443|:3000|:4000)([[:space:]]|$)' || true
fi

section "REVERSE PROXY DISCOVERY"
for service in nginx apache2 caddy; do
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files "${service}.service" >/dev/null 2>&1; then
    printf '%s=' "$service"
    systemctl is-active "$service" 2>/dev/null || true
  fi
done

if command -v nginx >/dev/null 2>&1; then
  echo 'NGINX_UPSTREAM_REFERENCES:'
  nginx -T 2>/dev/null | grep -nE 'server_name[[:space:]].*agences\.mondescale\.com|proxy_pass|upstream' | head -n 80 || true
fi

section "RECENT FRONTEND LOGS"
if command -v docker >/dev/null 2>&1 && docker inspect mle_frontend >/dev/null 2>&1; then
  docker logs --tail 80 mle_frontend 2>&1 || true
fi

section "RECENT BACKEND LOGS"
if command -v docker >/dev/null 2>&1 && docker inspect mle_backend >/dev/null 2>&1; then
  docker logs --tail 80 mle_backend 2>&1 || true
fi

section "VERDICT"
public_code="$(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 15 "$PUBLIC_URL" 2>/dev/null || printf '000')"
frontend_code="$(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 15 "$FRONTEND_URL" 2>/dev/null || printf '000')"
backend_code="$(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 15 "$BACKEND_URL" 2>/dev/null || printf '000')"

printf 'PUBLIC_HTTP=%s\nFRONTEND_HTTP=%s\nBACKEND_HTTP=%s\n' "$public_code" "$frontend_code" "$backend_code"

if [[ "$public_code" =~ ^2|^3 ]]; then
  echo 'ORIGIN_STATE=PUBLIC_READY'
elif [[ "$frontend_code" =~ ^2|^3 ]] && [[ "$public_code" == "502" || "$public_code" == "503" || "$public_code" == "504" ]]; then
  echo 'ORIGIN_STATE=REVERSE_PROXY_UPSTREAM_FAILURE'
elif [[ "$backend_code" =~ ^2 ]] && [[ ! "$frontend_code" =~ ^2|^3 ]]; then
  echo 'ORIGIN_STATE=FRONTEND_FAILURE'
elif [[ ! "$backend_code" =~ ^2 ]]; then
  echo 'ORIGIN_STATE=BACKEND_OR_STACK_FAILURE'
else
  echo 'ORIGIN_STATE=UNRESOLVED'
fi
