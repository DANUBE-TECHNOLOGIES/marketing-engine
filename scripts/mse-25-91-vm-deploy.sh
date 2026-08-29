#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_BRANCH="integration/mse-25-91-canonical-public-reconvergence-20260829"
EXPECTED_ACK="CANONICAL-PUBLIC-RECONVERGENCE"
DEPLOY_ACK="${MSE_25_91_DEPLOY_ACK:-}"
REMOTE="${MSE_25_91_REMOTE:-origin}"
MIN_FREE_MB="${MSE_25_91_MIN_FREE_MB:-3200}"
FRONTEND_CONTAINER_NAME="${MSE_25_91_FRONTEND_CONTAINER_NAME:-mle_frontend}"
BACKEND_CONTAINER_NAME="${MSE_25_91_BACKEND_CONTAINER_NAME:-mle_backend}"
FRONTEND_ROLLBACK_NAME="${MSE_25_91_ROLLBACK_CONTAINER_NAME:-mle_frontend_mse_25_91_rollback}"
BACKEND_ROLLBACK_NAME="${MSE_25_91_BACKEND_ROLLBACK_NAME:-mle_backend_mse_25_91_rollback}"
FRONTEND_IMAGE="${MSE_25_91_FRONTEND_IMAGE:-mondescale-marketing-frontend:mse-25-3}"
PROBE_SITE_SLUG="${MSE_25_91_PROBE_SITE_SLUG:-ambassade-fram-mondescale-bois-colombes}"

log() { printf '[MSE-25.91] %s\n' "$*"; }
fail() { printf '[MSE-25.91] ERROR: %s\n' "$*" >&2; exit 1; }

container_exists() {
  docker ps -aq --filter "name=^/${1}$" | grep -q .
}

container_running() {
  local id
  id="$(docker ps -q --filter "name=^/${1}$")"
  [[ -n "$id" ]] && [[ "$(docker inspect -f '{{.State.Running}}' "$id" 2>/dev/null || true)" == "true" ]]
}

remove_container_if_exists() {
  local name="$1"
  if container_exists "$name"; then
    docker rm -f "$name" >/dev/null 2>&1 || true
  fi
}

free_mb() {
  df -Pm "$1" | awk 'NR==2 {print $4}'
}

assert_free_space() {
  local path="$1"
  local available
  available="$(free_mb "$path")"
  [[ "$available" =~ ^[0-9]+$ ]] || fail "cannot determine free space for $path"
  log "free space on $path: ${available} MB (minimum ${MIN_FREE_MB} MB)"
  (( available >= MIN_FREE_MB )) || fail "insufficient free space: ${available} MB available"
}

FRONTEND_PRESERVED=false
NEW_FRONTEND_STARTED=false
BACKEND_PRESERVED=false
NEW_BACKEND_STARTED=false

rollback() {
  local exit_code=$?
  trap - ERR
  set +e

  if [[ "$NEW_FRONTEND_STARTED" == "true" ]]; then
    log "deployment failed after frontend replacement; removing new frontend"
    remove_container_if_exists "$FRONTEND_CONTAINER_NAME"
  fi
  if [[ "$FRONTEND_PRESERVED" == "true" ]] && container_exists "$FRONTEND_ROLLBACK_NAME"; then
    log "restoring preserved frontend container"
    docker rename "$FRONTEND_ROLLBACK_NAME" "$FRONTEND_CONTAINER_NAME" >/dev/null 2>&1 || true
    docker start "$FRONTEND_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi

  if [[ "$NEW_BACKEND_STARTED" == "true" ]]; then
    log "deployment failed after backend reconvergence; removing new backend"
    remove_container_if_exists "$BACKEND_CONTAINER_NAME"
  fi
  if [[ "$BACKEND_PRESERVED" == "true" ]] && container_exists "$BACKEND_ROLLBACK_NAME"; then
    log "restoring preserved backend container"
    docker rename "$BACKEND_ROLLBACK_NAME" "$BACKEND_CONTAINER_NAME" >/dev/null 2>&1 || true
    docker start "$BACKEND_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi

  exit "$exit_code"
}
trap rollback ERR

[[ "$DEPLOY_ACK" == "$EXPECTED_ACK" ]] || fail "set MSE_25_91_DEPLOY_ACK=$EXPECTED_ACK"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is required"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "run from marketing-engine repository"
cd "$REPO_ROOT"
CANONICAL_BACKEND_SOURCE="$(readlink -f "$REPO_ROOT/backend")"

[[ -z "$(git status --porcelain)" ]] || fail "worktree must be clean"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$EXPECTED_BRANCH" ]] || fail "expected branch $EXPECTED_BRANCH, got ${CURRENT_BRANCH:-detached}"

log "fetching canonical branch"
git fetch "$REMOTE" "$EXPECTED_BRANCH"
REMOTE_HEAD="$(git rev-parse "$REMOTE/$EXPECTED_BRANCH")"
git merge-base --is-ancestor HEAD "$REMOTE_HEAD" || fail "local HEAD is not an ancestor of remote canonical branch"
git merge --ff-only "$REMOTE_HEAD"
DEPLOY_HEAD="$(git rev-parse HEAD)"
log "deploying $DEPLOY_HEAD"

log "running lightweight canonical public contract test"
node --test frontend/test/mse-25-91-canonical-public-reconvergence.test.mjs

grep -Fq 'realTeamMembers' backend/src/modules/public-site-read/team-media-hydrator.js || fail "canonical host backend source misses realTeamMembers"
grep -Fq 'isLegacyTeamPlaceholder' backend/src/modules/public-site-read/team-media-hydrator.js || fail "canonical host backend source misses isLegacyTeamPlaceholder"

container_exists "$BACKEND_CONTAINER_NAME" || fail "backend container $BACKEND_CONTAINER_NAME not found"
CURRENT_BACKEND_SOURCE="$(docker inspect "$BACKEND_CONTAINER_NAME" --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}')"
CURRENT_BACKEND_SOURCE="$(readlink -f "$CURRENT_BACKEND_SOURCE" 2>/dev/null || printf '%s' "$CURRENT_BACKEND_SOURCE")"
log "current backend source: ${CURRENT_BACKEND_SOURCE:-unknown}"
log "canonical backend source: $CANONICAL_BACKEND_SOURCE"

if [[ "$CURRENT_BACKEND_SOURCE" != "$CANONICAL_BACKEND_SOURCE" ]]; then
  log "backend source is non-canonical; preserving legacy backend before reconvergence"
  remove_container_if_exists "$BACKEND_ROLLBACK_NAME"
  docker rename "$BACKEND_CONTAINER_NAME" "$BACKEND_ROLLBACK_NAME"
  docker stop "$BACKEND_ROLLBACK_NAME" >/dev/null
  BACKEND_PRESERVED=true

  log "starting backend from canonical repository without migrations or database writes"
  docker compose up -d --no-deps backend
  NEW_BACKEND_STARTED=true
  container_running "$BACKEND_CONTAINER_NAME" || fail "canonical backend container is not running"
else
  log "backend already uses canonical repository; restarting process explicitly"
  docker restart "$BACKEND_CONTAINER_NAME" >/dev/null
fi

log "waiting for canonical backend"
BACKEND_READY=false
for attempt in $(seq 1 60); do
  BACKEND_CODE="$(curl --silent --show-error --connect-timeout 3 --max-time 8 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:4000/health 2>/dev/null || true)"
  log "backend attempt $attempt: HTTP ${BACKEND_CODE:-000}"
  if [[ "$BACKEND_CODE" == "200" ]]; then
    BACKEND_READY=true
    break
  fi
  sleep 2
done
[[ "$BACKEND_READY" == "true" ]] || fail "canonical backend did not become healthy"

log "verifying canonical backend mount and source markers"
ACTIVE_BACKEND_SOURCE="$(docker inspect "$BACKEND_CONTAINER_NAME" --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}')"
ACTIVE_BACKEND_SOURCE="$(readlink -f "$ACTIVE_BACKEND_SOURCE" 2>/dev/null || printf '%s' "$ACTIVE_BACKEND_SOURCE")"
[[ "$ACTIVE_BACKEND_SOURCE" == "$CANONICAL_BACKEND_SOURCE" ]] || fail "backend still mounted from $ACTIVE_BACKEND_SOURCE"
docker exec "$BACKEND_CONTAINER_NAME" node -e "const fs=require('fs');const p='/app/src/modules/public-site-read/team-media-hydrator.js';const s=fs.readFileSync(p,'utf8');if(!s.includes('realTeamMembers')||!s.includes('isLegacyTeamPlaceholder')){console.error('BACKEND_SOURCE_MARKER=FAIL');process.exit(1)}console.log('BACKEND_SOURCE_MARKER=OK')"

log "validating real public team portrait contract before frontend build"
MSE_25_91_PROBE_SITE_SLUG="$PROBE_SITE_SLUG" node scripts/mse-25-91-public-contract-preflight.js

log "reclaiming safe build space"
docker builder prune -af >/dev/null 2>&1 || true
npm cache clean --force >/dev/null 2>&1 || true
rm -rf frontend/node_modules frontend/.next
assert_free_space "$REPO_ROOT"

remove_container_if_exists "$FRONTEND_ROLLBACK_NAME"
CURRENT_IMAGE_ID=""
if container_exists "$FRONTEND_CONTAINER_NAME"; then
  CURRENT_IMAGE_ID="$(docker inspect -f '{{.Image}}' "$FRONTEND_CONTAINER_NAME" 2>/dev/null || true)"
  log "current frontend image: ${CURRENT_IMAGE_ID:-unknown}"
fi

log "building canonical frontend while current frontend remains online"
docker compose build frontend
NEW_IMAGE_ID="$(docker image inspect "$FRONTEND_IMAGE" --format '{{.Id}}')"
[[ -n "$NEW_IMAGE_ID" ]] || fail "new frontend image was not created"
log "built frontend image: $NEW_IMAGE_ID"
docker builder prune -af >/dev/null 2>&1 || true

if container_exists "$FRONTEND_CONTAINER_NAME"; then
  log "preserving current frontend container for visual rollback"
  docker rename "$FRONTEND_CONTAINER_NAME" "$FRONTEND_ROLLBACK_NAME"
  docker stop "$FRONTEND_ROLLBACK_NAME" >/dev/null
  FRONTEND_PRESERVED=true
fi

log "starting canonical frontend"
docker compose up -d --no-deps --no-build frontend
NEW_FRONTEND_STARTED=true
container_running "$FRONTEND_CONTAINER_NAME" || fail "new frontend container is not running"

log "waiting for /healthz"
HEALTH_FILE="$(mktemp)"
HEALTHY=false
for attempt in $(seq 1 30); do
  CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 15 --output "$HEALTH_FILE" --write-out '%{http_code}' http://127.0.0.1:3000/healthz 2>/dev/null || true)"
  log "health attempt $attempt: HTTP ${CODE:-000}"
  if [[ "$CODE" == "200" ]]; then
    HEALTHY=true
    break
  fi
  sleep 2
done
[[ "$HEALTHY" == "true" ]] || fail "frontend health endpoint did not return HTTP 200"
grep -Fq 'marketing-engine-frontend' "$HEALTH_FILE" || fail "unexpected frontend health payload"
rm -f "$HEALTH_FILE"

log "validating frontend -> canonical backend service DNS"
docker exec "$FRONTEND_CONTAINER_NAME" node -e "fetch('http://backend:4000/health').then(r=>{console.log('BACKEND_HTTP='+r.status);if(!r.ok)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"

log "validating real mini-site SSR for $PROBE_SITE_SLUG"
SSR_FILE="$(mktemp)"
SSR_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$SSR_FILE" --write-out '%{http_code}' "http://127.0.0.1:3000/agence/$PROBE_SITE_SLUG" 2>/dev/null || true)"
log "public SSR probe: HTTP ${SSR_CODE:-000}"
[[ "$SSR_CODE" == "200" ]] || fail "real mini-site SSR did not return HTTP 200"
grep -Fq 'data-public-brand-logo="1"' "$SSR_FILE" || fail "header brand logo marker missing from SSR"
if grep -Fq 'public-payment-band' "$SSR_FILE"; then
  fail "duplicate legacy payment band still present in SSR"
fi
rm -f "$SSR_FILE"

log "revalidating public team portrait contract after frontend switch"
MSE_25_91_PROBE_SITE_SLUG="$PROBE_SITE_SLUG" node scripts/mse-25-91-public-contract-preflight.js

trap - ERR
NEW_FRONTEND_STARTED=false
NEW_BACKEND_STARTED=false

log "deployment complete; rollback containers retained until visual validation"
printf 'MSE_25_91_DEPLOYED_HEAD=%s\n' "$DEPLOY_HEAD"
printf 'MSE_25_91_NEW_IMAGE=%s\n' "$NEW_IMAGE_ID"
printf 'MSE_25_91_PREVIOUS_IMAGE=%s\n' "${CURRENT_IMAGE_ID:-none}"
printf 'MSE_25_91_BACKEND_SOURCE=%s\n' "$ACTIVE_BACKEND_SOURCE"
docker ps --filter "name=^/${FRONTEND_CONTAINER_NAME}$" --format 'FRONTEND={{.Names}} STATUS={{.Status}} IMAGE={{.Image}} ID={{.ID}}'
docker ps --filter "name=^/${BACKEND_CONTAINER_NAME}$" --format 'BACKEND={{.Names}} STATUS={{.Status}} IMAGE={{.Image}} ID={{.ID}}'
docker ps -a --filter "name=^/${FRONTEND_ROLLBACK_NAME}$" --format 'FRONTEND_ROLLBACK={{.Names}} STATUS={{.Status}} IMAGE={{.Image}} ID={{.ID}}'
docker ps -a --filter "name=^/${BACKEND_ROLLBACK_NAME}$" --format 'BACKEND_ROLLBACK={{.Names}} STATUS={{.Status}} IMAGE={{.Image}} ID={{.ID}}'
df -h /
