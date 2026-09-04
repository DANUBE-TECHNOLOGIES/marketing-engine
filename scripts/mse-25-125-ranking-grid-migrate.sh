#!/usr/bin/env bash
set -Eeuo pipefail

TARGET_MIGRATION="20260904131500_ranking_grid"
EXPECTED_ACK="APPLY-RANKING-GRID-MIGRATION"
APPLY=false
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
POSTGRES_CONTAINER="${MSE_25_125_POSTGRES_CONTAINER:-mle_postgres}"

log() { printf '[MSE-25.125A] %s\n' "$*"; }
fail() { printf '[MSE-25.125A] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage: bash scripts/mse-25-125-ranking-grid-migrate.sh [--apply]

Default mode is read-only inspection.
--apply requires MSE_25_125_MIGRATION_ACK=APPLY-RANKING-GRID-MIGRATION.
A PostgreSQL backup is mandatory before Prisma migrate deploy.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=true ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

command -v git >/dev/null 2>&1 || fail "git is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"
docker compose version >/dev/null 2>&1 || fail "docker compose plugin is required"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || fail "run from marketing-engine repository"
cd "$REPO_ROOT"
[[ -z "$(git status --porcelain)" ]] || fail "worktree must be clean"
[[ -f "backend/prisma/migrations/$TARGET_MIGRATION/migration.sql" ]] || fail "target migration is missing from repository"

docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER" || fail "backend container $BACKEND_CONTAINER is not running"
docker ps --format '{{.Names}}' | grep -Fxq "$POSTGRES_CONTAINER" || fail "postgres container $POSTGRES_CONTAINER is not running"
docker exec "$BACKEND_CONTAINER" test -f "/app/prisma/migrations/$TARGET_MIGRATION/migration.sql" || fail "backend container does not expose target migration; deploy/sync canonical source first"

psql_scalar() {
  local sql="$1"
  docker exec "$POSTGRES_CONTAINER" sh -lc "psql -v ON_ERROR_STOP=1 -U \"\$POSTGRES_USER\" -d \"\$POSTGRES_DB\" -Atc \"$sql\"" | tr -d '[:space:]'
}

migration_applied() {
  local migration="$1"
  [[ "$(psql_scalar "SELECT COUNT(*) FROM \"_prisma_migrations\" WHERE migration_name = '$migration' AND finished_at IS NOT NULL AND rolled_back_at IS NULL;")" == "1" ]]
}

[[ "$(psql_scalar "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations';")" == "1" ]] || fail "Prisma migration history table is missing; refusing targeted deployment"

unexpected_pending=()
for dir in backend/prisma/migrations/[0-9]*; do
  [[ -d "$dir" ]] || continue
  migration="${dir##*/}"
  [[ "$migration" == "$TARGET_MIGRATION" ]] && continue
  if ! migration_applied "$migration"; then
    unexpected_pending+=("$migration")
  fi
done

if (( ${#unexpected_pending[@]} > 0 )); then
  printf '[MSE-25.125A] unrelated/unapplied migrations detected:\n' >&2
  printf '  - %s\n' "${unexpected_pending[@]}" >&2
  fail "refusing migrate deploy because MSE-25.125 is not the only pending repository migration"
fi

TARGET_APPLIED=false
if migration_applied "$TARGET_MIGRATION"; then
  TARGET_APPLIED=true
fi

TABLE_COUNT="$(psql_scalar "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('RankingGridCampaign','RankingGridPoint');")"
log "target migration applied: $TARGET_APPLIED"
log "ranking grid tables present: $TABLE_COUNT/2"

log "Prisma migration status (read-only)"
docker exec "$BACKEND_CONTAINER" npx prisma migrate status --schema=/app/prisma/schema.prisma

if [[ "$APPLY" != "true" ]]; then
  log "inspection complete; no database write performed"
  if [[ "$TARGET_APPLIED" == "true" && "$TABLE_COUNT" == "2" ]]; then
    log "PASS: ranking grid schema is already ready"
  else
    log "ACTION REQUIRED: rerun with --apply and explicit acknowledgement after review"
  fi
  exit 0
fi

[[ "${MSE_25_125_MIGRATION_ACK:-}" == "$EXPECTED_ACK" ]] || fail "set MSE_25_125_MIGRATION_ACK=$EXPECTED_ACK before --apply"

if [[ "$TARGET_APPLIED" == "true" ]]; then
  [[ "$TABLE_COUNT" == "2" ]] || fail "migration is recorded as applied but expected tables are missing"
  log "PASS: target migration already applied; nothing to write"
  exit 0
fi

BACKUP_DIR="${MSE_25_125_BACKUP_DIR:-backups/migrations}"
BACKUP_STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/mse-25-125-before-$BACKUP_STAMP.dump"
mkdir -p "$BACKUP_DIR"
log "creating mandatory PostgreSQL backup: $BACKUP_FILE"
docker exec "$POSTGRES_CONTAINER" sh -lc 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_FILE"
[[ -s "$BACKUP_FILE" ]] || fail "database backup is empty"
log "backup verified: $(du -h "$BACKUP_FILE" | awk '{print $1}')"

log "applying the single allowed pending migration through Prisma migrate deploy"
docker exec "$BACKEND_CONTAINER" npx prisma migrate deploy --schema=/app/prisma/schema.prisma

migration_applied "$TARGET_MIGRATION" || fail "target migration is not recorded as applied after migrate deploy"
TABLE_COUNT="$(psql_scalar "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('RankingGridCampaign','RankingGridPoint');")"
[[ "$TABLE_COUNT" == "2" ]] || fail "expected RankingGridCampaign and RankingGridPoint tables after migration"

log "PASS: $TARGET_MIGRATION applied and both ranking grid tables verified"
log "rollback backup retained at $BACKUP_FILE"
