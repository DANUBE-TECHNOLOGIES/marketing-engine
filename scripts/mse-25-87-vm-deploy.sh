#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_BRANCH="feature/mse-25-87-public-regression-fixes-20260829"
REMOTE="${MSE_25_87_REMOTE:-origin}"
PROBE_SITE_SLUG="${MSE_25_87_PROBE_SITE_SLUG:-}"
SKIP_GIT_UPDATE="${MSE_25_87_SKIP_GIT_UPDATE:-false}"
SKIP_BUILD="${MSE_25_87_SKIP_BUILD:-false}"
DEPLOY_ACK="${MSE_25_87_DEPLOY_ACK:-}"
EXPECTED_ACK="PUBLIC-REGRESSION-RECOVERY"
MIN_FREE_MB="${MSE_25_87_MIN_FREE_MB:-3072}"
FRONTEND_CONTAINER_NAME="${MSE_25_87_FRONTEND_CONTAINER_NAME:-mle_frontend}"
ROLLBACK_CONTAINER_NAME="${MSE_25_87_ROLLBACK_CONTAINER_NAME:-mle_frontend_mse_25_87_rollback}"
FRONTEND_IMAGE="${MSE_25_87_FRONTEND_IMAGE:-mondescale-marketing-frontend:mse-25-3}"

log() {
  printf '[MSE-25.87] %s\n' "$*"
}

fail() {
  printf '[MSE-25.87] ERROR: %s\n' "$*" >&2
  exit 1
}

free_mb() {
  df -Pm "$1" | awk 'NR==2 {print $4}'
}

assert_free_space() {
  local label="$1"
  local path="$2"
  local available
  available="$(free_mb "$path")"
  [[ "$available" =~ ^[0-9]+$ ]] || fail "cannot determine free space for $label ($path)"
  log "$label free space: ${available} MB (minimum ${MIN_FREE_MB} MB)"
  (( available >= MIN_FREE_MB )) || fail "insufficient free space for $label: ${available} MB available, ${MIN_FREE_MB} MB required"
}

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

LEGACY_PRESERVED=false
NEW_CONTAINER_STARTED=false

rollback() {
  local exit_code=$?
  trap - ERR
  set +e

  if [[ "$NEW_CONTAINER_STARTED" == "true" ]]; then
    log "deployment failed after replacement; removing new frontend container"
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

[[ "$DEPLOY_ACK" == "$EXPECTED_ACK" ]] || fail "set MSE_25_87_DEPLOY_ACK=$EXPECTED_ACK before deployment"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is required"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "run this script from the marketing-engine repository"
cd "$REPO_ROOT"

[[ -f docker-compose.yml ]] || fail "docker-compose.yml is missing"
[[ -f frontend/Dockerfile ]] || fail "frontend/Dockerfile is missing"

if [[ -n "$(git status --porcelain)" ]]; then
  fail "worktree must be clean before deployment"
fi

CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "$EXPECTED_BRANCH" ]]; then
  fail "expected branch $EXPECTED_BRANCH, got ${CURRENT_BRANCH:-detached HEAD}"
fi

PREVIOUS_HEAD="$(git rev-parse HEAD)"
DEPLOY_HEAD="$PREVIOUS_HEAD"

if [[ "$SKIP_GIT_UPDATE" != "true" ]]; then
  log "fetching $EXPECTED_BRANCH"
  git fetch "$REMOTE" "$EXPECTED_BRANCH"
  REMOTE_HEAD="$(git rev-parse "$REMOTE/$EXPECTED_BRANCH")"
  git merge-base --is-ancestor HEAD "$REMOTE_HEAD" || fail "local HEAD is not an ancestor of remote branch"
  git merge --ff-only "$REMOTE_HEAD"
fi

DEPLOY_HEAD="$(git rev-parse HEAD)"
log "deploying $DEPLOY_HEAD"

if [[ "$SKIP_BUILD" != "true" ]]; then
  assert_free_space "repository filesystem" "$REPO_ROOT"
  DOCKER_ROOT="$(docker info --format '{{.DockerRootDir}}' 2>/dev/null || true)"
  if [[ -n "$DOCKER_ROOT" && -d "$DOCKER_ROOT" ]]; then
    assert_free_space "Docker filesystem" "$DOCKER_ROOT"
  fi

  log "running focused MSE-25.87 regression tests"
  (
    cd frontend
    npm ci --ignore-scripts --no-audit --no-fund
    node --test test/mse-25-87-public-regression-fixes.test.mjs
    npx eslint \
      lib/showcase-url.js \
      components/public-site/PublicBrandLogo.js \
      components/public-site/renderers/HeroV2Renderer.js \
      components/public-site/renderers/TeamRenderer.js \
      components/public-site/PublicPaymentMethodsBand.js \
      'app/agence/[siteSlug]/layout.js'
  )

  log "building frontend image"
  docker compose build frontend
else
  log "build skipped by MSE_25_87_SKIP_BUILD=true"
  docker image inspect "$FRONTEND_IMAGE" >/dev/null 2>&1 || fail "prebuilt frontend image $FRONTEND_IMAGE is missing"
fi

remove_container_if_exists "$ROLLBACK_CONTAINER_NAME"

if container_exists "$FRONTEND_CONTAINER_NAME"; then
  log "preserving existing $FRONTEND_CONTAINER_NAME container for rollback"
  docker rename "$FRONTEND_CONTAINER_NAME" "$ROLLBACK_CONTAINER_NAME"
  docker stop "$ROLLBACK_CONTAINER_NAME" >/dev/null
  LEGACY_PRESERVED=true
else
  log "no existing $FRONTEND_CONTAINER_NAME container found"
fi

log "starting new frontend container without rebuilding"
docker compose up -d --no-deps --no-build frontend
NEW_CONTAINER_STARTED=true

container_exists "$FRONTEND_CONTAINER_NAME" || fail "frontend container was not created"
container_running "$FRONTEND_CONTAINER_NAME" || fail "frontend container is not running"

log "waiting for frontend health endpoint"
HEALTH_FILE="$(mktemp)"
trap 'rm -f "$HEALTH_FILE"' EXIT
HEALTHY=false
for attempt in $(seq 1 30); do
  CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 15 \
    --output "$HEALTH_FILE" --write-out '%{http_code}' \
    http://127.0.0.1:3000/healthz 2>/dev/null || true)"
  log "health attempt $attempt: HTTP ${CODE:-000}"
  if [[ "$CODE" == "200" ]]; then
    HEALTHY=true
    break
  fi
  sleep 2
done
[[ "$HEALTHY" == "true" ]] || fail "frontend health endpoint did not return HTTP 200"
log "validated: frontend health endpoint"

if [[ -n "$PROBE_SITE_SLUG" ]]; then
  log "checking optional public SSR output for $PROBE_SITE_SLUG"
  PROBE_URL="http://127.0.0.1:3000/agence/${PROBE_SITE_SLUG}"
  PROBE_FILE="$(mktemp)"
  CODE="$(curl --silent --show-error --location --connect-timeout 5 --max-time 30 \
    --output "$PROBE_FILE" --write-out '%{http_code}' "$PROBE_URL" 2>/dev/null || true)"
  log "public probe: HTTP ${CODE:-000}"

  if [[ "$CODE" == "200" ]]; then
    grep -Fq 'data-public-brand-logo="1"' "$PROBE_FILE" || fail "company header logo is absent from public HTML"
    log "validated: company header logo"

    if grep -Eqi 'href="https://mondescale\.com([/\"?#]|$)' "$PROBE_FILE"; then
      fail "bare mondescale.com showcase link is still present"
    fi
    log "validated: no bare mondescale.com showcase link"

    grep -Fqi 'Solutions de paiement' "$PROBE_FILE" || fail "payment methods band is absent"
    grep -Fqi 'Visa' "$PROBE_FILE" || fail "Visa payment method is absent"
    log "validated: payment methods and Visa"

    if grep -Fqi 'Découvrir vos voyages' "$PROBE_FILE"; then
      grep -Eqi 'href="https://www\.mondescale\.com([/\"?#]|$)' "$PROBE_FILE" || fail "Découvrir vos voyages is not pointing to the showcase host"
      log "validated: Découvrir vos voyages points to www.mondescale.com"
    else
      log "CTA Découvrir vos voyages not configured on probe site; routing contract already covered by tests"
    fi
  elif [[ "$CODE" == "404" ]]; then
    log "public probe slug returned 404; deployment remains valid because /healthz is healthy"
  else
    fail "public SSR probe returned HTTP ${CODE:-000}"
  fi
fi

trap - ERR
rm -f "$HEALTH_FILE" >/dev/null 2>&1 || true

if [[ "$LEGACY_PRESERVED" == "true" ]] && container_exists "$ROLLBACK_CONTAINER_NAME"; then
  log "deployment validated; removing preserved previous frontend container"
  docker rm "$ROLLBACK_CONTAINER_NAME" >/dev/null
fi

log "deployment complete"
printf 'MSE_25_87_DEPLOYED_HEAD=%s\n' "$DEPLOY_HEAD"
printf 'MSE_25_87_PREVIOUS_HEAD=%s\n' "$PREVIOUS_HEAD"
docker ps --filter "name=^/${FRONTEND_CONTAINER_NAME}$"
