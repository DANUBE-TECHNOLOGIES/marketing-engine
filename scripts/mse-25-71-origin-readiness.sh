#!/usr/bin/env bash
set -u

PUBLIC_URL="${1:-https://agences.mondescale.com/agence/gien}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3000/agence/gien}"
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4000/health}"
PUBLIC_SCHEME="${PUBLIC_URL%%://*}"
PUBLIC_AUTHORITY="${PUBLIC_URL#*://}"
PUBLIC_HOSTPORT="${PUBLIC_AUTHORITY%%/*}"
PUBLIC_HOST="${PUBLIC_HOSTPORT%%:*}"
if [[ "$PUBLIC_SCHEME" == "https" ]]; then
  PUBLIC_PORT="443"
else
  PUBLIC_PORT="80"
fi

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

header_probe() {
  local label="$1"
  local url="$2"
  printf '%s_HEADERS URL=%s\n' "$label" "$url"
  curl -sS -L -D - -o /dev/null --max-time 15 "$url" 2>/dev/null \
    | grep -Ei '^(HTTP/|server:|via:|x-powered-by:|x-cache:|cf-ray:|date:|content-type:|content-length:|location:)' \
    | tail -n 30 || true
}

http_code() {
  local url="$1"
  shift
  local code
  code="$(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 15 "$@" "$url" 2>/dev/null || true)"
  if [[ "$code" =~ ^[0-9]{3}$ ]]; then
    printf '%s' "$code"
  else
    printf '000'
  fi
}

local_proxy_probe() {
  local output
  output="$(curl -k -sS -L -o /dev/null \
    --resolve "${PUBLIC_HOST}:${PUBLIC_PORT}:127.0.0.1" \
    -w 'HTTP=%{http_code} TTFB=%{time_starttransfer}s TOTAL=%{time_total}s REMOTE=%{remote_ip}\n' \
    --max-time 15 "$PUBLIC_URL" 2>&1)"
  local status=$?
  printf 'LOCAL_PROXY URL=%s RESOLVE=%s:%s:127.0.0.1\n%s\n' "$PUBLIC_URL" "$PUBLIC_HOST" "$PUBLIC_PORT" "$output"
  return "$status"
}

section "MSE-25.71 ORIGIN READINESS"
printf 'PUBLIC_URL=%s\n' "$PUBLIC_URL"
printf 'PUBLIC_HOST=%s\n' "$PUBLIC_HOST"
printf 'PUBLIC_PORT=%s\n' "$PUBLIC_PORT"
printf 'FRONTEND_URL=%s\n' "$FRONTEND_URL"
printf 'BACKEND_URL=%s\n' "$BACKEND_URL"

section "DNS"
if command -v getent >/dev/null 2>&1; then
  getent ahosts "$PUBLIC_HOST" 2>/dev/null | head -n 12 || true
elif command -v dig >/dev/null 2>&1; then
  dig +short "$PUBLIC_HOST" A "$PUBLIC_HOST" AAAA 2>/dev/null || true
fi
printf 'HOST_ADDRESSES=' 
hostname -I 2>/dev/null || true

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
      docker inspect --format 'PORTS={{json .NetworkSettings.Ports}} NETWORKS={{range $k,$v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}' "$name" 2>&1 || true
      docker inspect --format '{{if .State.Health}}{{range .State.Health.Log}}{{.End}} EXIT={{.ExitCode}} {{printf "%q" .Output}}{{println}}{{end}}{{end}}' "$name" 2>/dev/null | tail -n 5 || true
    else
      printf '%s STATUS=missing\n' "$name"
    fi
  done
fi

section "LOCAL BACKEND"
http_probe BACKEND "$BACKEND_URL" || true
header_probe BACKEND "$BACKEND_URL"

section "LOCAL FRONTEND"
http_probe FRONTEND "$FRONTEND_URL" || true
header_probe FRONTEND "$FRONTEND_URL"

section "LOCAL REVERSE PROXY"
local_proxy_probe || true

section "PUBLIC ROUTE"
http_probe PUBLIC "$PUBLIC_URL" || true
header_probe PUBLIC "$PUBLIC_URL"

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
  echo 'NGINX_CONFIG_TEST:'
  nginx -t 2>&1 || true
  echo 'NGINX_UPSTREAM_REFERENCES:'
  nginx -T 2>/dev/null | grep -nE 'server_name[[:space:]].*agences\.mondescale\.com|proxy_pass|upstream' | head -n 100 || true
  echo 'NGINX_RECENT_ERRORS:'
  for log in /var/log/nginx/error.log /var/log/nginx/*error*.log; do
    [ -r "$log" ] || continue
    tail -n 40 "$log" 2>/dev/null | grep -Ei 'agences\.mondescale\.com|upstream|connect\(\).*failed|502|503|504' || true
  done
fi

section "RECENT FRONTEND LOGS"
if command -v docker >/dev/null 2>&1 && docker inspect mle_frontend >/dev/null 2>&1; then
  docker logs --tail 100 mle_frontend 2>&1 || true
fi

section "RECENT BACKEND LOGS"
if command -v docker >/dev/null 2>&1 && docker inspect mle_backend >/dev/null 2>&1; then
  docker logs --tail 100 mle_backend 2>&1 || true
fi

section "VERDICT"
public_code="$(http_code "$PUBLIC_URL")"
frontend_code="$(http_code "$FRONTEND_URL")"
backend_code="$(http_code "$BACKEND_URL")"
local_proxy_code="$(http_code "$PUBLIC_URL" -k --resolve "${PUBLIC_HOST}:${PUBLIC_PORT}:127.0.0.1")"
public_server="$(curl -sS -L -D - -o /dev/null --max-time 15 "$PUBLIC_URL" 2>/dev/null | awk 'BEGIN{IGNORECASE=1} /^server:/{sub(/^[^:]+:[[:space:]]*/,""); gsub(/\r/,""); value=$0} END{print value}')"

printf 'PUBLIC_HTTP=%s\nLOCAL_PROXY_HTTP=%s\nFRONTEND_HTTP=%s\nBACKEND_HTTP=%s\nPUBLIC_SERVER=%s\n' \
  "$public_code" "$local_proxy_code" "$frontend_code" "$backend_code" "${public_server:-unknown}"

if [[ "$public_code" =~ ^[23] ]]; then
  echo 'ORIGIN_STATE=PUBLIC_READY'
elif [[ "$local_proxy_code" =~ ^[23] ]] && [[ "$public_code" =~ ^50[234]$ ]]; then
  echo 'ORIGIN_STATE=PUBLIC_EDGE_OR_DNS_PATH_FAILURE'
elif [[ "$frontend_code" =~ ^[23] ]] && [[ "$local_proxy_code" =~ ^50[234]$ ]]; then
  echo 'ORIGIN_STATE=REVERSE_PROXY_UPSTREAM_FAILURE'
elif [[ "$frontend_code" =~ ^[23] ]] && [[ "$local_proxy_code" == "000" ]] && [[ "$public_code" =~ ^50[234]$ ]]; then
  echo 'ORIGIN_STATE=REVERSE_PROXY_UNREACHABLE_LOCALLY'
elif [[ "$backend_code" =~ ^2 ]] && [[ ! "$frontend_code" =~ ^[23] ]]; then
  echo 'ORIGIN_STATE=FRONTEND_FAILURE'
elif [[ ! "$backend_code" =~ ^2 ]]; then
  echo 'ORIGIN_STATE=BACKEND_OR_STACK_FAILURE'
else
  echo 'ORIGIN_STATE=UNRESOLVED'
fi
