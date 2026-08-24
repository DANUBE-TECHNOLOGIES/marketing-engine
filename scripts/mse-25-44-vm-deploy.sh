#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_BRANCH="feature/mse-25-44-payment-methods-band"
REMOTE="${MSE_25_44_REMOTE:-origin}"
PROBE_SITE_SLUG="${MSE_25_44_PROBE_SITE_SLUG:-}"
SKIP_GIT_UPDATE="${MSE_25_44_SKIP_GIT_UPDATE:-false}"

log() {
  printf '[MSE-25.44] %s\n' "$*"
}

fail() {
  printf '[MSE-25.44] ERROR: %s\n' "$*" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"
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

log "running MSE-25.44 contract tests"
(
  cd frontend
  npm ci --ignore-scripts
  node --test test/mse-25-44-trust-bands.test.mjs
  npx eslint \
    "app/agence/[siteSlug]/layout.js" \
    "components/public-site/PublicPaymentMethodsBand.js" \
    "components/public-site/PublicInstitutionalTrustBand.js"
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
  HTML="$(curl --fail --silent --show-error --location --max-time 20 "$PROBE_URL")"
  grep -Fq "Solutions de paiement" <<<"$HTML" || fail "payment band is absent from public HTML"
  grep -Fq "Voyagez en confiance" <<<"$HTML" || fail "institutional trust band is absent from public HTML"
fi

ROLLBACK_REQUIRED=false
trap - ERR

log "deployment complete"
printf 'MSE_25_44_DEPLOYED_HEAD=%s\n' "$DEPLOY_HEAD"
printf 'MSE_25_44_PREVIOUS_HEAD=%s\n' "$PREVIOUS_HEAD"
docker compose ps frontend
