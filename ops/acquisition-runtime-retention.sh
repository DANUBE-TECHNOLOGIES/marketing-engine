#!/usr/bin/env bash
set -euo pipefail

MODE="audit"
if [[ "${1:-}" == "--apply" ]]; then
  MODE="apply"
elif [[ -n "${1:-}" && "${1:-}" != "--audit" ]]; then
  echo "Usage: $0 [--audit|--apply]" >&2
  exit 64
fi

ROOT="${MSE_ROOT:-/home/admin1/mondescale-local-engine}"
WORKTREES_ROOT="${MSE_WORKTREES_ROOT:-/home/admin1/mondescale-worktrees}"
RUNTIME_ROOT="${MSE_RUNTIME_ROOT:-/home/admin1/mondescale-runtime}"
STATE_ROOT="${MSE_RETENTION_STATE_ROOT:-${RUNTIME_ROOT}/retention}"
FRONTEND_REPO="${MSE_FRONTEND_IMAGE_REPO:-mondescale-marketing-frontend}"
FRONTEND_KEEP="${MSE_FRONTEND_KEEP:-3}"
BACKEND_KEEP="${MSE_BACKEND_KEEP:-3}"
MIN_FREE_GB="${MSE_MIN_FREE_GB:-4}"
TARGET_FREE_GB="${MSE_TARGET_FREE_GB:-6}"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TMP="$(mktemp -d /tmp/mse-25-215.XXXXXX)"
trap 'rm -rf "$TMP"' EXIT

log(){ printf '%s\n' "$*"; }
fail(){ log "ERROR: $*" >&2; exit 1; }
require(){ command -v "$1" >/dev/null 2>&1 || fail "missing command: $1"; }

require docker
require git
require python3
require date

[[ -d "$ROOT/.git" || -f "$ROOT/.git" ]] || fail "repository root not found: $ROOT"
[[ "$FRONTEND_KEEP" =~ ^[0-9]+$ ]] || fail "MSE_FRONTEND_KEEP must be an integer"
[[ "$BACKEND_KEEP" =~ ^[0-9]+$ ]] || fail "MSE_BACKEND_KEEP must be an integer"
(( FRONTEND_KEEP >= 1 )) || fail "MSE_FRONTEND_KEEP must be >= 1"
(( BACKEND_KEEP >= 1 )) || fail "MSE_BACKEND_KEEP must be >= 1"

free_kb(){ df --output=avail / | tail -1 | tr -d ' '; }
free_gb(){ python3 - "$1" <<'PY'
import sys
print(round(int(sys.argv[1]) / 1024 / 1024, 2))
PY
}

container_health(){
  local name="$1"
  if ! docker inspect "$name" >/dev/null 2>&1; then
    printf 'missing'
    return
  fi
  docker inspect "$name" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}'
}

FRONTEND_HEALTH_BEFORE="$(container_health mle_frontend)"
BACKEND_HEALTH_BEFORE="$(container_health mle_backend)"
POSTGRES_HEALTH_BEFORE="$(container_health mle_postgres)"

[[ "$FRONTEND_HEALTH_BEFORE" == "healthy" ]] || fail "mle_frontend is not healthy: $FRONTEND_HEALTH_BEFORE"
[[ "$BACKEND_HEALTH_BEFORE" == "healthy" ]] || fail "mle_backend is not healthy: $BACKEND_HEALTH_BEFORE"
[[ "$POSTGRES_HEALTH_BEFORE" == "healthy" ]] || fail "mle_postgres is not healthy: $POSTGRES_HEALTH_BEFORE"

ACTIVE_FRONTEND_IMAGE="$(docker inspect mle_frontend --format '{{.Config.Image}}')"
ACTIVE_FRONTEND_ID="$(docker inspect mle_frontend --format '{{.Image}}')"
ACTIVE_BACKEND_SOURCE="$(docker inspect mle_backend --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}')"
ACTIVE_BACKEND_WORKTREE=""
if [[ "$ACTIVE_BACKEND_SOURCE" == "$WORKTREES_ROOT"/acquisition-*/backend ]]; then
  ACTIVE_BACKEND_WORKTREE="${ACTIVE_BACKEND_SOURCE%/backend}"
fi

FREE_BEFORE_KB="$(free_kb)"
FREE_BEFORE_GB="$(free_gb "$FREE_BEFORE_KB")"
MIN_FREE_KB=$(( MIN_FREE_GB * 1024 * 1024 ))
TARGET_FREE_KB=$(( TARGET_FREE_GB * 1024 * 1024 ))

log "======================================================"
log " MSE-25.215 — ACQUISITION RUNTIME RETENTION V1"
log "======================================================"
log "Mode                    : $MODE"
log "Free disk before        : ${FREE_BEFORE_GB} GB"
log "Active frontend image   : $ACTIVE_FRONTEND_IMAGE"
log "Active backend source   : ${ACTIVE_BACKEND_SOURCE:-none}"
log "Frontend retention      : active + $((FRONTEND_KEEP-1)) rollback"
log "Backend retention       : active + $((BACKEND_KEEP-1)) rollback worktrees"
log ""

# Snapshot all container image IDs and bind-mount sources so cleanup can never remove live resources.
docker ps -aq | while read -r cid; do
  [[ -n "$cid" ]] || continue
  docker inspect "$cid" --format '{{.Image}}'
done | sort -u >"$TMP/container-image-ids.txt"

docker ps -aq | while read -r cid; do
  [[ -n "$cid" ]] || continue
  docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Type "bind"}}{{.Source}}{{"\n"}}{{end}}{{end}}'
done | sed '/^$/d' | sort -u >"$TMP/container-bind-sources.txt"

# Candidate acquisition frontend images, newest first.
: >"$TMP/frontend-images.tsv"
while IFS= read -r tag; do
  [[ -n "$tag" ]] || continue
  [[ "$tag" == "$FRONTEND_REPO":mse-25-* ]] || continue
  created="$(docker image inspect "$tag" --format '{{.Created}}' 2>/dev/null || true)"
  image_id="$(docker image inspect "$tag" --format '{{.Id}}' 2>/dev/null || true)"
  [[ -n "$created" && -n "$image_id" ]] || continue
  epoch="$(date -d "$created" +%s 2>/dev/null || printf '0')"
  printf '%s\t%s\t%s\n' "$epoch" "$tag" "$image_id" >>"$TMP/frontend-images.tsv"
done < <(docker images --format '{{.Repository}}:{{.Tag}}' | sort -u)
sort -rn -k1,1 "$TMP/frontend-images.tsv" -o "$TMP/frontend-images.tsv"

# Keep active image plus the newest rollback images. Duplicate image IDs are collapsed.
declare -A KEEP_IMAGE_IDS=()
declare -A KEEP_IMAGE_TAGS=()
KEEP_IMAGE_IDS["$ACTIVE_FRONTEND_ID"]=1
KEEP_IMAGE_TAGS["$ACTIVE_FRONTEND_IMAGE"]=1
rollback_slots=$(( FRONTEND_KEEP - 1 ))
rollback_count=0
while IFS=$'\t' read -r epoch tag image_id; do
  [[ -n "$tag" ]] || continue
  if [[ "$image_id" == "$ACTIVE_FRONTEND_ID" ]]; then
    KEEP_IMAGE_TAGS["$tag"]=1
    continue
  fi
  if [[ -n "${KEEP_IMAGE_IDS[$image_id]:-}" ]]; then
    KEEP_IMAGE_TAGS["$tag"]=1
    continue
  fi
  if (( rollback_count < rollback_slots )); then
    KEEP_IMAGE_IDS["$image_id"]=1
    KEEP_IMAGE_TAGS["$tag"]=1
    rollback_count=$(( rollback_count + 1 ))
  fi
done <"$TMP/frontend-images.tsv"

: >"$TMP/frontend-delete.tsv"
: >"$TMP/frontend-keep.tsv"
while IFS=$'\t' read -r epoch tag image_id; do
  [[ -n "$tag" ]] || continue
  if [[ -n "${KEEP_IMAGE_IDS[$image_id]:-}" || -n "${KEEP_IMAGE_TAGS[$tag]:-}" ]]; then
    printf '%s\t%s\t%s\n' "$epoch" "$tag" "$image_id" >>"$TMP/frontend-keep.tsv"
  elif grep -Fxq "$image_id" "$TMP/container-image-ids.txt"; then
    printf '%s\t%s\t%s\tLIVE_CONTAINER\n' "$epoch" "$tag" "$image_id" >>"$TMP/frontend-keep.tsv"
  else
    printf '%s\t%s\t%s\n' "$epoch" "$tag" "$image_id" >>"$TMP/frontend-delete.tsv"
  fi
done <"$TMP/frontend-images.tsv"

# Backend worktrees: preserve the active one and the closest older acquisition worktrees.
ACTIVE_BACKEND_N=""
if [[ -n "$ACTIVE_BACKEND_WORKTREE" ]]; then
  bn="$(basename "$ACTIVE_BACKEND_WORKTREE")"
  if [[ "$bn" =~ ^acquisition-([0-9]+)$ ]]; then
    ACTIVE_BACKEND_N="${BASH_REMATCH[1]}"
  fi
fi

declare -A KEEP_WORKTREES=()
if [[ -n "$ACTIVE_BACKEND_WORKTREE" ]]; then
  KEEP_WORKTREES["$ACTIVE_BACKEND_WORKTREE"]=1
fi

if [[ -n "$ACTIVE_BACKEND_N" ]]; then
  slots=$(( BACKEND_KEEP - 1 ))
  count=0
  while IFS=$'\t' read -r n wt; do
    (( n < ACTIVE_BACKEND_N )) || continue
    if (( count < slots )); then
      KEEP_WORKTREES["$wt"]=1
      count=$(( count + 1 ))
    fi
  done < <(
    find "$WORKTREES_ROOT" -maxdepth 1 -mindepth 1 -type d -name 'acquisition-[0-9]*' -printf '%f\t%p\n' 2>/dev/null \
      | awk -F'\t' '{n=$1; sub(/^acquisition-/,"",n); if(n ~ /^[0-9]+$/) print n"\t"$2}' \
      | sort -rn -k1,1
  )
fi

# Any worktree used by any container is always protected regardless of retention rank.
while IFS= read -r src; do
  [[ "$src" == "$WORKTREES_ROOT"/acquisition-*/* ]] || continue
  root="$src"
  while [[ "$root" != "$WORKTREES_ROOT" && "$root" != "/" ]]; do
    if [[ "$(basename "$root")" =~ ^acquisition-[0-9]+$ ]]; then
      KEEP_WORKTREES["$root"]=1
      break
    fi
    root="$(dirname "$root")"
  done
done <"$TMP/container-bind-sources.txt"

: >"$TMP/worktree-keep.tsv"
: >"$TMP/worktree-delete.tsv"
while IFS= read -r wt; do
  [[ -n "$wt" ]] || continue
  if [[ -n "${KEEP_WORKTREES[$wt]:-}" ]]; then
    printf '%s\tKEEP\n' "$wt" >>"$TMP/worktree-keep.tsv"
    continue
  fi
  if git -C "$wt" status --porcelain --untracked-files=normal 2>/dev/null | grep -q .; then
    printf '%s\tDIRTY_PROTECTED\n' "$wt" >>"$TMP/worktree-keep.tsv"
  else
    printf '%s\tDELETE\n' "$wt" >>"$TMP/worktree-delete.tsv"
  fi
done < <(find "$WORKTREES_ROOT" -maxdepth 1 -mindepth 1 -type d -name 'acquisition-[0-9]*' -print 2>/dev/null | sort)

log "===== FRONTEND IMAGES KEPT ====="
if [[ -s "$TMP/frontend-keep.tsv" ]]; then cut -f2- "$TMP/frontend-keep.tsv"; else log "none"; fi
log ""
log "===== FRONTEND IMAGES ELIGIBLE FOR DELETE ====="
if [[ -s "$TMP/frontend-delete.tsv" ]]; then cut -f2- "$TMP/frontend-delete.tsv"; else log "none"; fi
log ""
log "===== WORKTREES KEPT ====="
if [[ -s "$TMP/worktree-keep.tsv" ]]; then cat "$TMP/worktree-keep.tsv"; else log "none"; fi
log ""
log "===== WORKTREES ELIGIBLE FOR DELETE ====="
if [[ -s "$TMP/worktree-delete.tsv" ]]; then cat "$TMP/worktree-delete.tsv"; else log "none"; fi
log ""

if [[ "$MODE" == "apply" ]]; then
  mkdir -p "$STATE_ROOT"

  # Write the recovery manifest before destructive cleanup.
  python3 - "$STATE_ROOT/acquisition-runtime-state-${TIMESTAMP}.json" \
    "$ACTIVE_FRONTEND_IMAGE" "$ACTIVE_FRONTEND_ID" "$ACTIVE_BACKEND_SOURCE" \
    "$FRONTEND_HEALTH_BEFORE" "$BACKEND_HEALTH_BEFORE" "$POSTGRES_HEALTH_BEFORE" \
    "$FREE_BEFORE_GB" "$TMP/frontend-keep.tsv" "$TMP/frontend-delete.tsv" \
    "$TMP/worktree-keep.tsv" "$TMP/worktree-delete.tsv" <<'PY'
import json,sys
from pathlib import Path
(
 out,active_image,active_image_id,backend_source,fh,bh,ph,free_before,
 frontend_keep,frontend_delete,worktree_keep,worktree_delete
)=sys.argv[1:]
def rows(path):
    p=Path(path)
    if not p.exists(): return []
    return [line.rstrip("\n").split("\t") for line in p.read_text().splitlines() if line.strip()]
data={
 "version":"MSE-25.215-v1",
 "createdAt":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
 "activeFrontendImage":active_image,
 "activeFrontendImageId":active_image_id,
 "activeBackendSource":backend_source or None,
 "healthBefore":{"frontend":fh,"backend":bh,"postgres":ph},
 "freeDiskGbBefore":float(free_before),
 "frontendKeep":rows(frontend_keep),
 "frontendDelete":rows(frontend_delete),
 "worktreeKeep":rows(worktree_keep),
 "worktreeDelete":rows(worktree_delete),
}
Path(out).write_text(json.dumps(data,indent=2,ensure_ascii=False)+"\n")
print(out)
PY

  log "===== APPLY IMAGE RETENTION ====="
  while IFS=$'\t' read -r epoch tag image_id; do
    [[ -n "$tag" ]] || continue
    log "Removing old acquisition image: $tag"
    docker image rm "$tag"
  done <"$TMP/frontend-delete.tsv"

  log "===== APPLY WORKTREE RETENTION ====="
  while IFS=$'\t' read -r wt action; do
    [[ -n "$wt" ]] || continue
    log "Removing old clean worktree: $wt"
    git -C "$ROOT" worktree remove "$wt"
  done <"$TMP/worktree-delete.tsv"
  git -C "$ROOT" worktree prune

  log "===== PRUNE UNUSED BUILD CACHE ====="
  docker builder prune -af --filter 'until=24h' >/dev/null
  docker image prune -f >/dev/null
else
  log "AUDIT ONLY — no file, image, worktree, container or database mutation performed."
fi

FRONTEND_HEALTH_AFTER="$(container_health mle_frontend)"
BACKEND_HEALTH_AFTER="$(container_health mle_backend)"
POSTGRES_HEALTH_AFTER="$(container_health mle_postgres)"
[[ "$FRONTEND_HEALTH_AFTER" == "healthy" ]] || fail "mle_frontend unhealthy after retention: $FRONTEND_HEALTH_AFTER"
[[ "$BACKEND_HEALTH_AFTER" == "healthy" ]] || fail "mle_backend unhealthy after retention: $BACKEND_HEALTH_AFTER"
[[ "$POSTGRES_HEALTH_AFTER" == "healthy" ]] || fail "mle_postgres unhealthy after retention: $POSTGRES_HEALTH_AFTER"

ACTIVE_FRONTEND_AFTER="$(docker inspect mle_frontend --format '{{.Config.Image}}')"
ACTIVE_FRONTEND_ID_AFTER="$(docker inspect mle_frontend --format '{{.Image}}')"
ACTIVE_BACKEND_SOURCE_AFTER="$(docker inspect mle_backend --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}')"
[[ "$ACTIVE_FRONTEND_ID_AFTER" == "$ACTIVE_FRONTEND_ID" ]] || fail "active frontend image changed"
[[ "$ACTIVE_BACKEND_SOURCE_AFTER" == "$ACTIVE_BACKEND_SOURCE" ]] || fail "active backend source changed"

FREE_AFTER_KB="$(free_kb)"
FREE_AFTER_GB="$(free_gb "$FREE_AFTER_KB")"

log ""
log "======================================================"
log " MSE-25.215 — RETENTION ${MODE^^} SUCCESS"
log "======================================================"
log "Active frontend         : $ACTIVE_FRONTEND_AFTER"
log "Active backend source   : ${ACTIVE_BACKEND_SOURCE_AFTER:-none}"
log "Frontend health         : $FRONTEND_HEALTH_AFTER"
log "Backend health          : $BACKEND_HEALTH_AFTER"
log "Postgres health         : $POSTGRES_HEALTH_AFTER"
log "Free disk before        : ${FREE_BEFORE_GB} GB"
log "Free disk after         : ${FREE_AFTER_GB} GB"
log "Database writes         : NONE"
log "Container restart       : NONE"
log "Application deploy      : NONE"

if (( FREE_AFTER_KB < MIN_FREE_KB )); then
  fail "free disk remains below hard minimum ${MIN_FREE_GB} GB"
elif (( FREE_AFTER_KB < TARGET_FREE_KB )); then
  log "Disk target             : WARNING (< ${TARGET_FREE_GB} GB)"
else
  log "Disk target             : PASS (>= ${TARGET_FREE_GB} GB)"
fi
