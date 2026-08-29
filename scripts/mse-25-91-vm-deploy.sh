#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_BRANCH="integration/mse-25-91-canonical-public-reconvergence-20260829"
EXPECTED_ACK="CANONICAL-PUBLIC-RECONVERGENCE"
DEPLOY_ACK="${MSE_25_91_DEPLOY_ACK:-}"
REMOTE="${MSE_25_91_REMOTE:-origin}"
MIN_FREE_MB="${MSE_25_91_MIN_FREE_MB:-3200}"
FRONTEND_CONTAINER_NAME="${MSE_25_91_FRONTEND_CONTAINER_NAME:-mle_frontend}"
ROLLBACK_CONTAINER_NAME="${MSE_25_91_ROLLBACK_CONTAINER_NAME:-mle_frontend_mse_25_91_rollback}"
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

LEGACY_PRESERVED=false
NEW_CONTAINER_STARTED=false

rollback() {
  local exit_code=$?
  trap - ERR
  set +e

  if [[ "$NEW_CONTAINER_STARTED" == "true" ]]; then
    log "deployment failed after replacement; removing new frontend"
    remove_container_if_exists "$FRONTEND_CONTAINER_NAME"
  fi

  if [[ "$LEGACY_PRESERVED" == "true" ]] && container_exists "$ROLLBACK_CONTAINER_NAME"; then
    log "restoring preserved frontend container"
    docker rename "$ROLLBACK_CONTAINER_NAME" "$FRONTEND_CONTAINER_NAME" >/dev/null 2>&1 || true
    docker start "$FRONTEND_CONTAINER_NAME" >/dev/null 2>&1 || true
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

# Backend is bind-mounted from ./backend and runs under nodemon in the canonical
# compose topology. A git fast-forward therefore reloads backend source without
# a database migration or image rebuild. Wait for that reload and verify the
# real public contract before spending time rebuilding/switching the frontend.
log "waiting for bind-mounted backend source reload"
BACKEND_READY=false
for attempt in $(seq 1 30); do
  BACKEND_CODE="$(curl --silent --show-error --connect-timeout 3 --max-time 8 --output /dev/null --write-out '%{http_code}' http://127.0.0.1:4000/health 2>/dev/null || true)"
  log "backend reload attempt $attempt: HTTP ${BACKEND_CODE:-000}"
  if [[ "$BACKEND_CODE" == "200" ]]; then
    BACKEND_READY=true
    break
  fi
  sleep 2
done
[[ "$BACKEND_READY" == "true" ]] || fail "backend did not become healthy after source reload"

log "validating real public team portrait contract before frontend build"
MSE_25_91_PROBE_SITE_SLUG="$PROBE_SITE_SLUG" node scripts/mse-25-91-public-contract-preflight.js

log "reclaiming safe build space"
docker builder prune -af >/dev/null 2>&1 || true
npm cache clean --force >/dev/null 2>&1 || true
rm -rf frontend/node_modules frontend/.next
assert_free_space "$REPO_ROOT"

if container_exists "$ROLLBACK_CONTAINER_NAME"; then
  log "removing stale MSE-25.91 rollback container"
  docker rm -f "$ROLLBACK_CONTAINER_NAME" >/dev/null
fi

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

log "reclaiming build cache after successful image creation"
docker builder prune -af >/dev/null 2>&1 || true

if container_exists "$FRONTEND_CONTAINER_NAME"; then
  log "preserving current frontend container for visual rollback"
  docker rename "$FRONTEND_CONTAINER_NAME" "$ROLLBACK_CONTAINER_NAME"
  docker stop "$ROLLBACK_CONTAINER_NAME" >/dev/null
  LEGACY_PRESERVED=true
fi

log "starting canonical frontend"
docker compose up -d --no-deps --no-build frontend
NEW_CONTAINER_STARTED=true
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

# Re-run the contract gate after the frontend switch as an end-to-end guard.
log "revalidating public team portrait contract after frontend switch"
MSE_25_91_PROBE_SITE_SLUG="$PROBE_SITE_SLUG" node scripts/mse-25-91-public-contract-preflight.js

trap - ERR
NEW_CONTAINER_STARTED=false

log "deployment complete; previous frontend kept stopped as $ROLLBACK_CONTAINER_NAME until visual validation"
printf 'MSE_25_91_DEPLOYED_HEAD=%s\n' "$DEPLOY_HEAD"
printf 'MSE_25_91_NEW_IMAGE=%s\n' "$NEW_IMAGE_ID"
printf 'MSE_25_91_PREVIOUS_IMAGE=%s\n' "${CURRENT_IMAGE_ID:-none}"
docker ps --filter "name=^/${FRONTEND_CONTAINER_NAME}$" --format 'FRONTEND={{.Names}} STATUS={{.Status}} IMAGE={{.Image}} ID={{.ID}}'
docker ps -a --filter "name=^/${ROLLBACK_CONTAINER_NAME}$" --format 'ROLLBACK={{.Names}} STATUS={{.Status}} IMAGE={{.Image}} ID={{.ID}}'
df -h /
