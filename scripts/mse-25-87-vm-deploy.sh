#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_BRANCH="feature/mse-25-87-public-regression-fixes-20260829"
REMOTE="${MSE_25_87_REMOTE:-origin}"
PROBE_SITE_SLUG="${MSE_25_87_PROBE_SITE_SLUG:-}"
SKIP_GIT_UPDATE="${MSE_25_87_SKIP_GIT_UPDATE:-false}"
DEPLOY_ACK="${MSE_25_87_DEPLOY_ACK:-}"
EXPECTED_ACK="PUBLIC-REGRESSION-RECOVERY"

log() {
  printf '[MSE-25.87] %s\n' "$*"
}

fail() {
  printf '[MSE-25.87] ERROR: %s\n' "$*" >&2
  exit 1
}

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
ROLLBACK_REQUIRED=false

rollback() {
  local exit_code=$?
  if [[ "$ROLLBACK_REQUIRED" == "true" ]]; then
    log "deployment failed; restoring frontend from $PREVIOUS_HEAD"
    git reset --hard "$PREVIOUS_HEAD" >/dev/null 2>&1 || true
    docker compose build frontend >/dev/null 2>&1 || true
    docker compose up -d --no-deps frontend >/dev/null 2>&1 || true
  fi
  exit "$exit_code"
}
trap rollback ERR

if [[ "$SKIP_GIT_UPDATE" != "true" ]]; then
  log "fetching $EXPECTED_BRANCH"
  git fetch "$REMOTE" "$EXPECTED_BRANCH"
  REMOTE_HEAD="$(git rev-parse "$REMOTE/$EXPECTED_BRANCH")"
  git merge-base --is-ancestor HEAD "$REMOTE_HEAD" || fail "local HEAD is not an ancestor of remote branch"
  git merge --ff-only "$REMOTE_HEAD"
fi

DEPLOY_HEAD="$(git rev-parse HEAD)"
log "deploying $DEPLOY_HEAD"
ROLLBACK_REQUIRED=true

log "running focused MSE-25.87 regression tests"
(
  cd frontend
  npm ci --ignore-scripts
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

log "replacing frontend container only"
docker compose up -d --no-deps frontend

CONTAINER_ID="$(docker compose ps -q frontend)"
[[ -n "$CONTAINER_ID" ]] || fail "frontend container was not created"
RUNNING="$(docker inspect -f '{{.State.Running}}' "$CONTAINER_ID")"
[[ "$RUNNING" == "true" ]] || fail "frontend container is not running"

if [[ -n "$PROBE_SITE_SLUG" ]]; then
  log "checking public SSR output for $PROBE_SITE_SLUG"
  PROBE_URL="http://127.0.0.1:3000/agence/${PROBE_SITE_SLUG}"
  PROBE_FILE="$(mktemp)"
  trap 'rm -f "$PROBE_FILE"' EXIT

  READY=false
  for attempt in $(seq 1 30); do
    CODE="$(curl --silent --show-error --location --connect-timeout 5 --max-time 30 \
      --output "$PROBE_FILE" --write-out '%{http_code}' "$PROBE_URL" 2>/dev/null || true)"
    log "probe attempt $attempt: HTTP ${CODE:-000}"
    if [[ "$CODE" == "200" ]]; then
      READY=true
      break
    fi
    sleep 2
  done

  [[ "$READY" == "true" ]] || fail "public SSR probe did not return HTTP 200"

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
fi

ROLLBACK_REQUIRED=false
trap - ERR

log "deployment complete"
printf 'MSE_25_87_DEPLOYED_HEAD=%s\n' "$DEPLOY_HEAD"
printf 'MSE_25_87_PREVIOUS_HEAD=%s\n' "$PREVIOUS_HEAD"
docker compose ps frontend
