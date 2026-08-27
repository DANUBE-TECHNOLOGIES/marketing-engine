#!/usr/bin/env bash
set -u

PUBLIC_HOST="${PUBLIC_HOST:-agences.mondescale.com}"
FRONTEND_CONTAINER="${FRONTEND_CONTAINER:-mle_frontend}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

section() {
  printf '\n=== %s ===\n' "$1"
}

if ! command -v docker >/dev/null 2>&1; then
  echo 'DOCKER=not-found'
  exit 0
fi

section "MSE-25.71 REVERSE PROXY DISCOVERY"
printf 'PUBLIC_HOST=%s\nFRONTEND_CONTAINER=%s\nFRONTEND_PORT=%s\n' \
  "$PUBLIC_HOST" "$FRONTEND_CONTAINER" "$FRONTEND_PORT"

section "RUNNING CONTAINERS"
docker ps --format 'NAME={{.Names}} IMAGE={{.Image}} PORTS={{.Ports}}' 2>&1 || true

section "FRONTEND NETWORK IDENTITY"
frontend_ip=""
frontend_networks=""
if docker inspect "$FRONTEND_CONTAINER" >/dev/null 2>&1; then
  docker inspect --format 'STATUS={{.State.Status}} HEALTH={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} PORTS={{json .NetworkSettings.Ports}}' "$FRONTEND_CONTAINER" 2>&1 || true
  docker inspect --format 'NETWORKS={{range $k,$v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}' "$FRONTEND_CONTAINER" 2>&1 || true
  frontend_ip="$(docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{if $v.IPAddress}}{{$v.IPAddress}}{{"\n"}}{{end}}{{end}}' "$FRONTEND_CONTAINER" 2>/dev/null | head -n 1 || true)"
  frontend_networks="$(docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{" "}}{{end}}' "$FRONTEND_CONTAINER" 2>/dev/null || true)"
else
  echo 'FRONTEND_CONTAINER_STATE=missing'
fi
printf 'FRONTEND_IP=%s\nFRONTEND_NETWORKS=%s\n' "${frontend_ip:-unknown}" "${frontend_networks:-unknown}"

section "PROXY CONTAINER CANDIDATES"
mapfile -t proxy_ids < <(
  docker ps --format '{{.ID}} {{.Names}} {{.Image}}' 2>/dev/null \
    | awk 'BEGIN{IGNORECASE=1} /openresty|nginx|proxy-manager|nginxproxymanager|traefik|caddy|haproxy/{print $1}'
)

if (( ${#proxy_ids[@]} == 0 )); then
  echo 'PROXY_CONTAINER_CANDIDATES=none'
else
  printf 'PROXY_CONTAINER_CANDIDATES=%s\n' "${#proxy_ids[@]}"
fi

for id in "${proxy_ids[@]}"; do
  name="$(docker inspect --format '{{.Name}}' "$id" 2>/dev/null | sed 's#^/##' || true)"
  image="$(docker inspect --format '{{.Config.Image}}' "$id" 2>/dev/null || true)"

  section "PROXY CONTAINER ${name:-$id}"
  printf 'PROXY_NAME=%s\nPROXY_IMAGE=%s\n' "${name:-unknown}" "${image:-unknown}"
  docker inspect --format 'STATUS={{.State.Status}} RESTARTS={{.RestartCount}} PORTS={{json .NetworkSettings.Ports}}' "$id" 2>&1 || true
  proxy_networks="$(docker inspect --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{" "}}{{end}}' "$id" 2>/dev/null || true)"
  printf 'PROXY_NETWORKS=%s\n' "${proxy_networks:-unknown}"

  shared_networks=""
  for network in $proxy_networks; do
    case " $frontend_networks " in
      *" $network "*) shared_networks="${shared_networks}${network} " ;;
    esac
  done
  printf 'SHARED_FRONTEND_NETWORKS=%s\n' "${shared_networks:-none}"

  echo 'PROXY_MOUNTS:'
  docker inspect --format '{{range .Mounts}}{{.Source}} -> {{.Destination}} ({{.Mode}}){{"\n"}}{{end}}' "$id" 2>&1 || true

  echo 'PROXY_CONFIG_REFERENCES:'
  docker exec "$id" sh -c '
    for root in /data/nginx/proxy_host /etc/nginx /etc/openresty /usr/local/openresty/nginx/conf /etc/traefik /etc/caddy; do
      [ -d "$root" ] || continue
      grep -RniE "server_name[[:space:]].*agences\.mondescale\.com|proxy_pass|upstream[[:space:]]" "$root" 2>/dev/null | head -n 120
    done
  ' 2>/dev/null || true

  if [[ -n "$frontend_ip" ]]; then
    echo 'PROXY_TO_FRONTEND_LIVENESS:'
    docker exec "$id" sh -c "
      if command -v curl >/dev/null 2>&1; then
        curl -sS -o /dev/null -w 'HTTP=%{http_code} TOTAL=%{time_total}s\\n' --max-time 5 http://${frontend_ip}:${FRONTEND_PORT}/healthz
      elif command -v wget >/dev/null 2>&1; then
        wget -q -S -O /dev/null -T 5 http://${frontend_ip}:${FRONTEND_PORT}/healthz 2>&1 | tail -n 12
      elif command -v nc >/dev/null 2>&1; then
        nc -vz -w 5 ${frontend_ip} ${FRONTEND_PORT}
      else
        echo 'PROXY_NETWORK_PROBE_TOOL=unavailable'
      fi
    " 2>&1 || true
  fi

done

section "HOST PORT 3000"
if command -v ss >/dev/null 2>&1; then
  ss -ltnp 2>/dev/null | grep -E '(:3000)([[:space:]]|$)' || true
fi

if command -v curl >/dev/null 2>&1; then
  curl -sS -o /dev/null -w 'HOST_FRONTEND_LIVENESS_HTTP=%{http_code} TOTAL=%{time_total}s\n' --max-time 5 "http://127.0.0.1:${FRONTEND_PORT}/healthz" 2>&1 || true
fi

section "INTERPRETATION"
echo 'If OpenResty/Nginx is the public server and /healthz is 502, compare its proxy_pass target with FRONTEND_IP/FRONTEND_PORT and SHARED_FRONTEND_NETWORKS.'
echo 'If the proxy and frontend share no Docker network, a container proxy cannot use the frontend container name unless both are attached to a common network.'
echo 'If the proxy targets 127.0.0.1:3000 from inside its own container, that loopback points to the proxy container itself, not mle_frontend.'
