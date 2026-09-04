#!/usr/bin/env bash
set -Eeuo pipefail

POSTGRES_CONTAINER="${MSE_25_125_POSTGRES_CONTAINER:-mle_postgres}"
EXPECTED_ACK="NORMALIZE-NOT-FOUND-RANKS"
APPLY=false

log() { printf '[MSE-25.125D] %s\n' "$*"; }
fail() { printf '[MSE-25.125D] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  bash scripts/mse-25-125d-normalize-null-ranks.sh
  bash scripts/mse-25-125d-normalize-null-ranks.sh --apply

Default mode is read-only and reports not-found points carrying non-null ranks.

--apply requires:
  MSE_25_125D_NORMALIZE_ACK=NORMALIZE-NOT-FOUND-RANKS

The update is idempotent and only sets position/absolutePosition to NULL where found=false.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

command -v docker >/dev/null 2>&1 || fail "docker is required"
docker ps --format '{{.Names}}' | grep -Fxq "$POSTGRES_CONTAINER" || fail "postgres container $POSTGRES_CONTAINER is not running"

log "preflight: not-found points with non-null stored ranks"
docker exec "$POSTGRES_CONTAINER" sh -lc \
'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off -c "
SELECT
  \"campaignId\",
  COUNT(*) AS points,
  COUNT(*) FILTER (WHERE position IS NOT NULL) AS position_non_null,
  COUNT(*) FILTER (WHERE \"absolutePosition\" IS NOT NULL) AS absolute_position_non_null
FROM \"RankingGridPoint\"
WHERE found = false
  AND (position IS NOT NULL OR \"absolutePosition\" IS NOT NULL)
GROUP BY \"campaignId\"
ORDER BY \"campaignId\";
"'

if [[ "$APPLY" != "true" ]]; then
  log "read-only complete; no database write performed"
  exit 0
fi

[[ "${MSE_25_125D_NORMALIZE_ACK:-}" == "$EXPECTED_ACK" ]] || \
  fail "set MSE_25_125D_NORMALIZE_ACK=$EXPECTED_ACK before --apply"

log "applying idempotent null-rank normalization"
docker exec "$POSTGRES_CONTAINER" sh -lc \
'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off <<'"'"'SQL'"'"'
BEGIN;

UPDATE "RankingGridPoint"
SET
  position = NULL,
  "absolutePosition" = NULL,
  "updatedAt" = NOW()
WHERE found = false
  AND (position IS NOT NULL OR "absolutePosition" IS NOT NULL);

COMMIT;
SQL'

log "post-check"
REMAINING="$(docker exec "$POSTGRES_CONTAINER" sh -lc \
'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "
SELECT COUNT(*)
FROM \"RankingGridPoint\"
WHERE found = false
  AND (position IS NOT NULL OR \"absolutePosition\" IS NOT NULL);
"')"

[[ "$REMAINING" == "0" ]] || fail "normalization incomplete: $REMAINING row(s) remain"
log "PASS: not-found ranking positions are stored as NULL"
