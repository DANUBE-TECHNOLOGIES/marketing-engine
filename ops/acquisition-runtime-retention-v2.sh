#!/usr/bin/env bash
set -euo pipefail

MODE=audit
case "${1:-}" in
  ""|--audit) MODE=audit ;;
  --apply) MODE=apply ;;
  *) echo "Usage: $0 [--audit|--apply]" >&2; exit 2 ;;
esac

ROOT=/home/admin1/mondescale-local-engine
RUNTIME=/home/admin1/mondescale-runtime
LEGACY_ROOT=/home/admin1/mondescale-worktrees
STATE_DIR="$RUNTIME/retention"
FRONTEND_KEEP="${MSE_FRONTEND_KEEP:-3}"
DETACHED_KEEP_PER_ROOT="${MSE_DETACHED_KEEP_PER_ROOT:-3}"
MIN_FREE_GB="${MSE_MIN_FREE_GB:-4}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MANIFEST="$STATE_DIR/acquisition-runtime-state-$STAMP.json"
mkdir -p "$STATE_DIR"

for cmd in docker git python3 find sort awk; do command -v "$cmd" >/dev/null || { echo "Missing command: $cmd" >&2; exit 1; }; done
for c in mle_frontend mle_backend mle_postgres; do docker inspect "$c" >/dev/null 2>&1 || { echo "Missing container: $c" >&2; exit 1; }; done

health(){ docker inspect "$1" --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}'; }
frontend_image(){ docker inspect mle_frontend --format '{{.Config.Image}}'; }
backend_source(){ docker inspect mle_backend --format '{{range .Mounts}}{{if eq .Destination "/app"}}{{.Source}}{{end}}{{end}}'; }

FRONTEND_BEFORE="$(frontend_image)"
BACKEND_BEFORE="$(backend_source)"
FH="$(health mle_frontend)"; BH="$(health mle_backend)"; PH="$(health mle_postgres)"
[[ "$FH" == healthy && "$BH" == healthy && "$PH" == healthy ]] || { echo "Runtime not healthy" >&2; exit 1; }
[[ -n "$FRONTEND_BEFORE" && -n "$BACKEND_BEFORE" ]] || { echo "Cannot resolve active runtime" >&2; exit 1; }

mapfile -t LIVE_BIND_SOURCES < <(docker ps -q | while read -r cid; do docker inspect "$cid" --format '{{range .Mounts}}{{if eq .Type "bind"}}{{.Source}}{{"\n"}}{{end}}{{end}}'; done | sed '/^$/d' | sort -u)
mapfile -t LIVE_IMAGE_IDS < <(docker ps -q | xargs -r docker inspect --format '{{.Image}}' | sort -u)

mapfile -t FRONTEND_ROWS < <(docker images --format '{{.CreatedAt}}|{{.Repository}}:{{.Tag}}|{{.ID}}' | awk -F'|' '$2 ~ /^mondescale-marketing-frontend:/ {print}' | sort -r)
FRONTEND_KEEP_TAGS=("$FRONTEND_BEFORE")
for row in "${FRONTEND_ROWS[@]}"; do
  tag="${row#*|}"; tag="${tag%|*}"
  id="${row##*|}"
  keep=0
  [[ "$tag" == "$FRONTEND_BEFORE" ]] && keep=1
  for live_id in "${LIVE_IMAGE_IDS[@]}"; do [[ "$live_id" == sha256:*"$id"* || "$live_id" == *"$id"* ]] && keep=1; done
  if (( keep == 0 && ${#FRONTEND_KEEP_TAGS[@]} < FRONTEND_KEEP )); then FRONTEND_KEEP_TAGS+=("$tag"); fi
done

FRONTEND_DELETE=()
for row in "${FRONTEND_ROWS[@]}"; do
  tag="${row#*|}"; tag="${tag%|*}"
  keep=0
  for k in "${FRONTEND_KEEP_TAGS[@]}"; do [[ "$tag" == "$k" ]] && keep=1; done
  (( keep == 0 )) && FRONTEND_DELETE+=("$tag")
done

is_live_path(){
  local p="$1" src
  for src in "${LIVE_BIND_SOURCES[@]}"; do
    [[ "$src" == "$p" || "$src" == "$p/"* || "$p" == "$src/"* ]] && return 0
  done
  return 1
}

WORKTREE_KEEP=(); WORKTREE_DELETE=(); WORKTREE_REASONS=()
mapfile -t WTS < <(git -C "$ROOT" worktree list --porcelain | awk '/^worktree /{print substr($0,10)}')
for wt in "${WTS[@]}"; do
  [[ "$wt" == "$ROOT" ]] && { WORKTREE_KEEP+=("$wt"); WORKTREE_REASONS+=("MAIN_CHECKOUT"); continue; }
  if is_live_path "$wt"; then WORKTREE_KEEP+=("$wt"); WORKTREE_REASONS+=("LIVE_BIND"); continue; fi
  dirty="$(git -C "$wt" status --porcelain --untracked-files=normal 2>/dev/null || true)"
  if [[ -n "$dirty" ]]; then WORKTREE_KEEP+=("$wt"); WORKTREE_REASONS+=("DIRTY_PROTECTED"); continue; fi
  branch="$(git -C "$wt" symbolic-ref -q --short HEAD 2>/dev/null || true)"
  if [[ -n "$branch" ]]; then WORKTREE_KEEP+=("$wt"); WORKTREE_REASONS+=("BRANCH_PROTECTED:$branch"); continue; fi
  case "$wt" in
    "$LEGACY_ROOT"/acquisition-*|"$RUNTIME"/worktrees/mse-25-*) ;;
    *) WORKTREE_KEEP+=("$wt"); WORKTREE_REASONS+=("OUTSIDE_MANAGED_SCOPE"); continue ;;
  esac
done

for rootkind in legacy runtime; do
  candidates=()
  for wt in "${WTS[@]}"; do
    case "$rootkind:$wt" in
      legacy:"$LEGACY_ROOT"/acquisition-*) ;;
      runtime:"$RUNTIME"/worktrees/mse-25-*) ;;
      *) continue ;;
    esac
    already=0; for k in "${WORKTREE_KEEP[@]}"; do [[ "$wt" == "$k" ]] && already=1; done
    (( already == 0 )) || continue
    ts="$(git -C "$wt" show -s --format=%ct HEAD 2>/dev/null || echo 0)"
    candidates+=("$ts|$wt")
  done
  mapfile -t sorted < <(printf '%s\n' "${candidates[@]:-}" | sed '/^$/d' | sort -t'|' -k1,1nr)
  n=0
  for row in "${sorted[@]}"; do
    wt="${row#*|}"
    if (( n < DETACHED_KEEP_PER_ROOT )); then WORKTREE_KEEP+=("$wt"); WORKTREE_REASONS+=("DETACHED_ROLLBACK"); else WORKTREE_DELETE+=("$wt"); fi
    n=$((n+1))
  done
done

python3 - "$MANIFEST" "$MODE" "$FRONTEND_BEFORE" "$BACKEND_BEFORE" "$FH" "$BH" "$PH" "$FRONTEND_KEEP" "$DETACHED_KEEP_PER_ROOT" "${FRONTEND_KEEP_TAGS[*]}" "${FRONTEND_DELETE[*]}" "${WORKTREE_KEEP[*]}" "${WORKTREE_DELETE[*]}" "${WORKTREE_REASONS[*]}" <<'PY'
import json,sys
(path,mode,frontend,backend,fh,bh,ph,fkeep,wkeep,fi,fd,wk,wd,reasons)=sys.argv[1:]
data={"version":"MSE-25.215-v2","mode":mode,"activeFrontendImage":frontend,"activeBackendSource":backend,"healthBefore":{"frontend":fh,"backend":bh,"postgres":ph},"policy":{"frontendKeep":int(fkeep),"detachedKeepPerRoot":int(wkeep)},"frontendKeep":fi.split() if fi else [],"frontendDelete":fd.split() if fd else [],"worktreeKeep":wk.split() if wk else [],"worktreeDelete":wd.split() if wd else [],"worktreeKeepReasons":reasons.split() if reasons else []}
with open(path,"w") as f: json.dump(data,f,indent=2,ensure_ascii=False)
print("Manifest:",path)
PY

echo "Mode                    : $MODE"
echo "Active frontend         : $FRONTEND_BEFORE"
echo "Active backend source   : $BACKEND_BEFORE"
echo "Frontend keep           : ${FRONTEND_KEEP_TAGS[*]:-NONE}"
echo "Frontend delete         : ${FRONTEND_DELETE[*]:-NONE}"
echo "Worktree delete         : ${WORKTREE_DELETE[*]:-NONE}"
echo "Database writes         : NONE"
echo "Container restart       : NONE"

if [[ "$MODE" == apply ]]; then
  [[ "$(frontend_image)" == "$FRONTEND_BEFORE" ]] || { echo "ABORT: active frontend image changed" >&2; exit 1; }
  [[ "$(backend_source)" == "$BACKEND_BEFORE" ]] || { echo "ABORT: active backend source changed" >&2; exit 1; }
  [[ "$(health mle_frontend)" == healthy && "$(health mle_backend)" == healthy && "$(health mle_postgres)" == healthy ]] || { echo "ABORT: runtime health changed" >&2; exit 1; }

  for tag in "${FRONTEND_DELETE[@]}"; do
    used=0
    iid="$(docker image inspect "$tag" --format '{{.Id}}' 2>/dev/null || true)"
    for live in "${LIVE_IMAGE_IDS[@]}"; do [[ -n "$iid" && "$iid" == "$live" ]] && used=1; done
    if (( used )); then echo "SKIP live image: $tag"; else docker image rm "$tag"; fi
  done

  for wt in "${WORKTREE_DELETE[@]}"; do
    is_live_path "$wt" && { echo "ABORT: candidate became live: $wt" >&2; exit 1; }
    [[ -z "$(git -C "$wt" status --porcelain --untracked-files=normal 2>/dev/null || true)" ]] || { echo "SKIP dirty: $wt"; continue; }
    [[ -z "$(git -C "$wt" symbolic-ref -q --short HEAD 2>/dev/null || true)" ]] || { echo "SKIP branch: $wt"; continue; }
    git -C "$ROOT" worktree remove "$wt"
  done

  git -C "$ROOT" worktree prune
  docker builder prune -f --filter 'until=168h' >/dev/null || true

  [[ "$(frontend_image)" == "$FRONTEND_BEFORE" ]] || { echo "FAIL: active frontend image changed" >&2; exit 1; }
  [[ "$(backend_source)" == "$BACKEND_BEFORE" ]] || { echo "FAIL: active backend source changed" >&2; exit 1; }
  [[ "$(health mle_frontend)" == healthy && "$(health mle_backend)" == healthy && "$(health mle_postgres)" == healthy ]] || { echo "FAIL: runtime unhealthy after cleanup" >&2; exit 1; }
fi

free_kb="$(df --output=avail / | tail -1 | tr -d ' ')"
min_kb=$((MIN_FREE_GB*1024*1024))
(( free_kb >= min_kb )) || { echo "FAIL: free disk below ${MIN_FREE_GB}GB" >&2; exit 1; }

echo "Free disk guard         : PASS (>= ${MIN_FREE_GB}GB)"
echo "Runtime health          : PASS"
if [[ "$MODE" == apply ]]; then echo "MSE-25.215 V2 — RETENTION APPLY SUCCESS"; else echo "MSE-25.215 V2 — RETENTION AUDIT SUCCESS"; fi
