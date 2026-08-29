#!/usr/bin/env bash
set -Eeuo pipefail

EXPECTED_BRANCH="integration/mse-25-91-canonical-public-reconvergence-20260829"
EXPECTED_ACK="VISUAL-BASELINE-VALIDATED"
ACK="${MSE_25_91_VISUAL_ACK:-}"
FRONTEND_CONTAINER="${MSE_25_91_FRONTEND_CONTAINER_NAME:-mle_frontend}"
BACKEND_CONTAINER="${MSE_25_91_BACKEND_CONTAINER_NAME:-mle_backend}"
FRONTEND_ROLLBACK="${MSE_25_91_ROLLBACK_CONTAINER_NAME:-mle_frontend_mse_25_91_rollback}"
BACKEND_ROLLBACK="${MSE_25_91_BACKEND_ROLLBACK_NAME:-mle_backend_mse_25_91_rollback}"
LEGACY_WORKTREE="${MSE_25_91_LEGACY_WORKTREE:-/home/admin1/worktrees/mse-25-convergence}"

log() { printf '[MSE-25.91-CLEANUP] %s\n' "$*"; }
fail() { printf '[MSE-25.91-CLEANUP] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$ACK" == "$EXPECTED_ACK" ]] || fail "set MSE_25_91_VISUAL_ACK=$EXPECTED_ACK"
command -v git >/dev/null 2>&1 || fail "git is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"
command -v curl >/dev/null 2>&1 || fail "curl is required"

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "run from marketing-engine repository"
cd "$ROOT"
[[ "$(git branch --show-current)" == "$EXPECTED_BRANCH" ]] || fail "not on canonical MSE-25.91 branch"
[[ -z "$(git status --porcelain)" ]] || fail "worktree must be clean"

node scripts/mse-25-91-canonical-drift-check.js

[[ "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/healthz || true)" == "200" ]] || fail "frontend is not healthy"
[[ "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:4000/health || true)" == "200" ]] || fail "backend is not healthy"

CANONICAL_BACKEND_SOURCE="$(readlink -f "$ROOT/backend")"
ACTIVE_BACKEND_SOURCE="$(docker inspect "$BACKEND_CONTAINER" --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}' 2>/dev/null || true)"
ACTIVE_BACKEND_SOURCE="$(readlink -f "$ACTIVE_BACKEND_SOURCE" 2>/dev/null || printf '%s' "$ACTIVE_BACKEND_SOURCE")"
[[ "$ACTIVE_BACKEND_SOURCE" == "$CANONICAL_BACKEND_SOURCE" ]] || fail "backend source is not canonical: $ACTIVE_BACKEND_SOURCE"

log "canonical runtime verified"

for rollback in "$FRONTEND_ROLLBACK" "$BACKEND_ROLLBACK"; do
  if docker ps -aq --filter "name=^/${rollback}$" | grep -q .; then
    log "removing validated rollback container $rollback"
    docker rm -f "$rollback" >/dev/null
  else
    log "rollback container $rollback already absent"
  fi
done

if [[ -d "$LEGACY_WORKTREE" ]]; then
  LEGACY_SOURCE="$(readlink -f "$LEGACY_WORKTREE")"
  MOUNT_USERS="$(docker ps -aq | xargs -r docker inspect --format '{{.Name}} {{range .Mounts}}{{.Source}} {{end}}' 2>/dev/null | grep -F "$LEGACY_SOURCE" || true)"
  [[ -z "$MOUNT_USERS" ]] || fail "legacy worktree still mounted by a container: $MOUNT_USERS"

  if git worktree list --porcelain | grep -Fqx "worktree $LEGACY_SOURCE"; then
    log "removing retired git worktree $LEGACY_SOURCE"
    git worktree remove --force "$LEGACY_SOURCE"
  else
    fail "legacy path exists but is not a registered git worktree; refusing rm -rf"
  fi
else
  log "legacy convergence worktree already absent"
fi

# Remove only unused Docker networks carrying the retired convergence project name.
while IFS= read -r network; do
  [[ -n "$network" ]] || continue
  ATTACHED="$(docker network inspect "$network" --format '{{len .Containers}}' 2>/dev/null || printf '1')"
  if [[ "$ATTACHED" == "0" ]]; then
    log "removing unused retired network $network"
    docker network rm "$network" >/dev/null || true
  else
    log "keeping network $network because ${ATTACHED} container(s) remain attached"
  fi
done < <(docker network ls --format '{{.Name}}' | grep '^mse-25-convergence' || true)

log "pruning dangling images only"
docker image prune -f >/dev/null 2>&1 || true

printf 'MSE_25_91_POST_VALIDATION_CLEANUP=OK\n'
printf 'ACTIVE_BACKEND_SOURCE=%s\n' "$ACTIVE_BACKEND_SOURCE"
printf 'LEGACY_WORKTREE=%s\n' "$LEGACY_WORKTREE"
df -h /
