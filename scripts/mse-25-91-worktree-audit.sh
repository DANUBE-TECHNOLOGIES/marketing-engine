#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${1:-/home/admin1/mondescale-local-engine}"
CANONICAL="$(readlink -f "$REPO")"

log() { printf '[MSE-25.91-WORKTREES] %s\n' "$*"; }

command -v git >/dev/null 2>&1 || { echo "git missing" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "docker missing" >&2; exit 1; }
[[ -d "$CANONICAL/.git" || -f "$CANONICAL/.git" ]] || { echo "invalid repository: $CANONICAL" >&2; exit 1; }

printf '=== MSE-25.91 WORKTREE HYGIENE AUDIT ===\n'
printf 'CANONICAL=%s\n\n' "$CANONICAL"

mapfile -t MOUNTS < <(docker inspect $(docker ps -aq) --format '{{range .Mounts}}{{println .Source}}{{end}}' 2>/dev/null | sed '/^$/d' | sort -u || true)

is_mounted() {
  local path="$1" mount
  for mount in "${MOUNTS[@]:-}"; do
    [[ "$mount" == "$path" || "$mount" == "$path"/* ]] && return 0
  done
  return 1
}

is_superseded_lineage() {
  local path="$1" branch="$2"
  case "$path|$branch" in
    *mse-25-86*|*mse-25-71-functional-recovery*|*mse-25-indexation*|*mse-25-operational*|*mse-25-operational-cockpit*) return 0 ;;
    *feature/mse-25-87-public-regression-fixes-20260829*|*integration/mse-25-77-public-experience-reconvergence-20260828*) return 0 ;;
    *) return 1 ;;
  esac
}

worktree_path=""
head=""
branch=""
detached="false"
count=0
safe=0
review=0
mounted=0

emit() {
  [[ -n "$worktree_path" ]] || return 0
  local resolved dirty size_mb mount_state lineage_state disposition
  resolved="$(readlink -f "$worktree_path" 2>/dev/null || printf '%s' "$worktree_path")"
  [[ "$resolved" == "$CANONICAL" ]] && return 0
  count=$((count+1))

  if [[ -e "$worktree_path" ]]; then
    if git -C "$worktree_path" status --porcelain --untracked-files=all 2>/dev/null | grep -q .; then dirty="DIRTY"; else dirty="CLEAN"; fi
    size_mb="$(du -sm "$worktree_path" 2>/dev/null | awk '{print $1}' || printf '?')"
  else
    dirty="MISSING"
    size_mb="0"
  fi

  if is_mounted "$resolved"; then
    mount_state="MOUNTED"
    mounted=$((mounted+1))
  else
    mount_state="UNMOUNTED"
  fi

  if is_superseded_lineage "$resolved" "$branch"; then lineage_state="SUPERSEDED"; else lineage_state="OTHER"; fi

  if [[ "$mount_state" == "UNMOUNTED" && "$dirty" == "CLEAN" && ( "$detached" == "true" || "$lineage_state" == "SUPERSEDED" ) ]]; then
    disposition="SAFE_TO_REMOVE"
    safe=$((safe+1))
  else
    disposition="REVIEW_OR_KEEP"
    review=$((review+1))
  fi

  printf 'PATH=%s\n' "$worktree_path"
  printf 'HEAD=%s\n' "$head"
  printf 'BRANCH=%s\n' "${branch:-DETACHED}"
  printf 'STATE=%s\n' "$dirty"
  printf 'DOCKER=%s\n' "$mount_state"
  printf 'LINEAGE=%s\n' "$lineage_state"
  printf 'SIZE_MB=%s\n' "$size_mb"
  printf 'DISPOSITION=%s\n\n' "$disposition"
}

while IFS= read -r line || [[ -n "$line" ]]; do
  case "$line" in
    worktree\ *)
      emit
      worktree_path="${line#worktree }"
      head=""
      branch=""
      detached="false"
      ;;
    HEAD\ *) head="${line#HEAD }" ;;
    branch\ refs/heads/*) branch="${line#branch refs/heads/}" ;;
    detached) detached="true" ;;
    "") emit; worktree_path=""; head=""; branch=""; detached="false" ;;
  esac
done < <(git -C "$CANONICAL" worktree list --porcelain)
emit

printf '=== SUMMARY ===\n'
printf 'WORKTREES_NON_CANONICAL=%s\n' "$count"
printf 'SAFE_TO_REMOVE=%s\n' "$safe"
printf 'REVIEW_OR_KEEP=%s\n' "$review"
printf 'DOCKER_MOUNTED=%s\n' "$mounted"
printf 'AUDIT_ONLY=1\n'
