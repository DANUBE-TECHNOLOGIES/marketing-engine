#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_BRANCH="${MSE_25_118G_EXPECTED_BRANCH:-main}"
SOURCE_SCRIPT="scripts/mse-25-91-vm-deploy.sh"

log() { printf '[MSE-25.118g] %s\n' "$*"; }
fail() { printf '[MSE-25.118g] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$EXPECTED_BRANCH" == "main" ]] || fail "only main is allowed for this deployment wrapper"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v awk >/dev/null 2>&1 || fail "awk is required"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "run from marketing-engine repository"
cd "$REPO_ROOT"

[[ -f "$SOURCE_SCRIPT" ]] || fail "missing guarded deployment script: $SOURCE_SCRIPT"
[[ -z "$(git status --porcelain)" ]] || fail "worktree must be clean"
CURRENT_BRANCH="$(git branch --show-current)"
[[ "$CURRENT_BRANCH" == "$EXPECTED_BRANCH" ]] || fail "expected branch $EXPECTED_BRANCH, got ${CURRENT_BRANCH:-detached}"

TMP_DEPLOY="$(mktemp)"
HUB_FILE="$(mktemp)"
SITEMAP_FILE="$(mktemp)"
cleanup() {
  rm -f "$TMP_DEPLOY" "$HUB_FILE" "$SITEMAP_FILE"
}
trap cleanup EXIT

log "preparing guarded MSE-25.91 deployment for main"
awk -v branch="$EXPECTED_BRANCH" '
  /^EXPECTED_BRANCH=/ { printf "EXPECTED_BRANCH=\"%s\"\n", branch; next }
  { print }
' "$SOURCE_SCRIPT" > "$TMP_DEPLOY"
chmod +x "$TMP_DEPLOY"

grep -Fq "EXPECTED_BRANCH=\"$EXPECTED_BRANCH\"" "$TMP_DEPLOY" || fail "could not bind guarded deployment to main"
grep -Fq 'EXPECTED_ACK="CANONICAL-PUBLIC-RECONVERGENCE"' "$TMP_DEPLOY" || fail "guarded acknowledgement contract changed unexpectedly"
grep -Fq 'trap rollback ERR' "$TMP_DEPLOY" || fail "rollback guard missing from source deployment script"

MSE_25_91_DEPLOY_ACK="CANONICAL-PUBLIC-RECONVERGENCE" bash "$TMP_DEPLOY"

DEPLOYED_HEAD="$(git rev-parse HEAD)"
REMOTE_HEAD="$(git rev-parse origin/main)"
[[ "$DEPLOYED_HEAD" == "$REMOTE_HEAD" ]] || fail "deployed HEAD $DEPLOYED_HEAD differs from origin/main $REMOTE_HEAD"
log "main deployed at $DEPLOYED_HEAD"

log "probing public agency hub"
HUB_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$HUB_FILE" --write-out '%{http_code}' http://127.0.0.1:3000/agence 2>/dev/null || true)"
[[ "$HUB_CODE" == "200" ]] || fail "/agence returned HTTP ${HUB_CODE:-000}"
grep -Fq 'Nos agences de voyages' "$HUB_FILE" || fail "agency hub heading missing"
grep -Eq 'href="/agence/[^"/]+"' "$HUB_FILE" || fail "agency hub contains no crawlable agency homepage link"

log "probing public sitemap"
SITEMAP_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$SITEMAP_FILE" --write-out '%{http_code}' http://127.0.0.1:3000/sitemap.xml 2>/dev/null || true)"
[[ "$SITEMAP_CODE" == "200" ]] || fail "/sitemap.xml returned HTTP ${SITEMAP_CODE:-000}"
grep -Eq '<loc>https?://[^<]+/agence</loc>' "$SITEMAP_FILE" || fail "canonical /agence entry missing from sitemap"

printf 'MSE_25_118G_DEPLOYED_HEAD=%s\n' "$DEPLOYED_HEAD"
printf 'MSE_25_118G_AGENCY_HUB=OK\n'
printf 'MSE_25_118G_SITEMAP=OK\n'
