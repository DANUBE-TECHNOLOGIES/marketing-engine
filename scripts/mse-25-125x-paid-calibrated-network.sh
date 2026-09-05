#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
CAMPAIGN_IDS_RAW="${MSE_25_125X_CAMPAIGN_IDS:-}"
EXPECTED_ACK="RUN-CALIBRATED-RANKING-GRID-NETWORK"
EXPECTED_METHOD_SUFFIX=":method:mse-25.125u-z14-v1:z14:d100:sp0:sta1"
MAX_TOTAL_COST_USD="${MSE_25_125X_MAX_TOTAL_COST_USD:-0.45}"
MAX_CAMPAIGN_COST_USD="${MSE_25_125X_MAX_CAMPAIGN_COST_USD:-0.05}"
MIN_BALANCE_USD="${MSE_25_125_MIN_BALANCE_USD:-0.10}"
NETWORK_SCRIPT="${MSE_25_125X_NETWORK_SCRIPT:-scripts/mse-25-125o-paid-network.sh}"

log() { printf '[MSE-25.125X] %s\n' "$*"; }
fail() { printf '[MSE-25.125X] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  MSE_25_125X_CAMPAIGN_IDS=10,11,12,13,14,15,16,17,18 \
  MSE_25_125X_PAID_ACK=RUN-CALIBRATED-RANKING-GRID-NETWORK \
  bash scripts/mse-25-125x-paid-calibrated-network.sh

Safeguards:
- exact explicit campaign IDs only
- exact calibrated-network ACK
- provider must already be enabled inside backend
- every campaign must have the exact calibrated 14z methodology key
- every campaign must be a 5x5 / 1km grid with exactly 25 points
- global paid-plan must contain only the requested campaigns
- default total estimate ceiling is $0.45
- per-campaign ceiling remains $0.05
- delegates paid execution to guarded MSE-25.125O / MSE-25.125M
- this script never edits env files and never enables/disables DataForSEO
EOF
}

[[ "${1:-}" != "-h" && "${1:-}" != "--help" ]] || { usage; exit 0; }
[[ $# -eq 0 ]] || fail "no positional arguments are accepted; use MSE_25_125X_CAMPAIGN_IDS"
[[ "${MSE_25_125X_PAID_ACK:-}" == "$EXPECTED_ACK" ]] || fail "set MSE_25_125X_PAID_ACK=$EXPECTED_ACK"
[[ -n "$CAMPAIGN_IDS_RAW" ]] || fail "set MSE_25_125X_CAMPAIGN_IDS to an explicit comma-separated list"
[[ -f "$NETWORK_SCRIPT" ]] || fail "network executor not found: $NETWORK_SCRIPT"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"

node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0) process.exit(1)' "$MAX_TOTAL_COST_USD" || fail "MSE_25_125X_MAX_TOTAL_COST_USD must be > 0"
node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0) process.exit(1)' "$MAX_CAMPAIGN_COST_USD" || fail "MSE_25_125X_MAX_CAMPAIGN_COST_USD must be > 0"

NORMALIZED_IDS="$(node - "$CAMPAIGN_IDS_RAW" <<'NODE'
const raw = String(process.argv[2] || '');
const parts = raw.split(',').map(v => v.trim());
if (!parts.length || parts.some(v => !/^[1-9][0-9]*$/.test(v))) process.exit(10);
const ids = parts.map(Number);
if (new Set(ids).size !== ids.length) process.exit(11);
process.stdout.write(ids.join(','));
NODE
)" || fail "campaign IDs must be unique positive integers"
IFS=',' read -r -a CAMPAIGN_IDS <<< "$NORMALIZED_IDS"

[[ ${#CAMPAIGN_IDS[@]} -eq 9 ]] || fail "exactly 9 calibrated network campaigns are required"

docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER" || fail "backend container $BACKEND_CONTAINER is not running"
PROVIDER_ENABLED="$(docker exec "$BACKEND_CONTAINER" sh -lc 'printf %s "${RANKING_GRID_DATAFORSEO_ENABLED:-false}"' | tr '[:upper:]' '[:lower:]')"
[[ "$PROVIDER_ENABLED" == "true" ]] || fail "provider is not explicitly enabled inside backend; this script will not enable it"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

for CAMPAIGN_ID in "${CAMPAIGN_IDS[@]}"; do
  FILE="$TMP_DIR/campaign-$CAMPAIGN_ID.json"
  CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$FILE" --write-out '%{http_code}' -H "x-tenant-slug: $TENANT_SLUG" "$BASE_URL/rankings/grid/campaigns/$CAMPAIGN_ID")"
  [[ "$CODE" == "200" ]] || { cat "$FILE" >&2; fail "campaign $CAMPAIGN_ID returned HTTP $CODE"; }
  node - "$FILE" "$CAMPAIGN_ID" "$EXPECTED_METHOD_SUFFIX" <<'NODE'
const fs = require('fs');
const [file, idRaw, suffix] = process.argv.slice(2);
const id = Number(idRaw);
const c = JSON.parse(fs.readFileSync(file, 'utf8'));
if (Number(c.id) !== id) throw new Error(`campaign ${id} identity mismatch`);
if (Number(c.gridSize) !== 5 || Number(c.spacingKm) !== 1) throw new Error(`campaign ${id} geometry is not calibrated 5x5/1km`);
if (!String(c.key || '').endsWith(suffix)) throw new Error(`campaign ${id} methodology key mismatch`);
if (!Array.isArray(c.points) || c.points.length !== 25) throw new Error(`campaign ${id} must have exactly 25 points`);
const invalid = c.points.filter(p => !['pending','success','error'].includes(String(p.status)));
if (invalid.length) throw new Error(`campaign ${id} has invalid point states`);
console.log(`[MSE-25.125X] PASS: campaign=${id} city=${c.city} methodology=14z points=25 status=${c.status}`);
NODE
done

PLAN_FILE="$TMP_DIR/network-plan.json"
PLAN_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$PLAN_FILE" --write-out '%{http_code}' -H "x-tenant-slug: $TENANT_SLUG" "$BASE_URL/rankings/grid/paid-plan?campaignIds=$NORMALIZED_IDS")"
[[ "$PLAN_CODE" == "200" ]] || { cat "$PLAN_FILE" >&2; fail "calibrated paid-plan returned HTTP $PLAN_CODE"; }

node - "$PLAN_FILE" "$NORMALIZED_IDS" "$MAX_TOTAL_COST_USD" <<'NODE'
const fs = require('fs');
const [file, idsRaw, maxRaw] = process.argv.slice(2);
const ids = idsRaw.split(',').map(Number);
const set = new Set(ids);
const max = Number(maxRaw);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
if (p.mode !== 'read_only' || p.providerCalls !== 0 || p.executionTriggered !== false) throw new Error('paid-plan safety invariant failed');
if (!Array.isArray(p.campaigns) || p.campaigns.length !== ids.length) throw new Error('paid-plan did not resolve exactly 9 campaigns');
if (p.campaigns.some(c => !set.has(Number(c.campaignId)))) throw new Error('paid-plan returned an unrequested campaign');
const remaining = p.campaigns.reduce((sum, c) => sum + Number(c.remainingPoints || 0), 0);
const estimated = Number(p.summary?.estimatedCostUsd);
if (!Number.isFinite(estimated) || estimated < 0) throw new Error('invalid estimated cost');
if (estimated > max + 1e-9) throw new Error(`estimated cost ${estimated.toFixed(4)} exceeds max ${max.toFixed(4)}`);
if (remaining > 225) throw new Error(`remaining points ${remaining} exceeds calibrated network maximum 225`);
console.log(`[MSE-25.125X] PASS: calibrated paid-plan campaigns=${ids.length} remaining=${remaining} estimated=${estimated.toFixed(4)} max=${max.toFixed(4)}`);
NODE

log "PAID CALIBRATED NETWORK ACTION AUTHORIZED: campaigns=$NORMALIZED_IDS"
MSE_25_125O_CAMPAIGN_IDS="$NORMALIZED_IDS" \
MSE_25_125O_PAID_ACK="RUN-NETWORK-RANKING-GRID-CAMPAIGNS" \
MSE_25_125O_MAX_TOTAL_COST_USD="$MAX_TOTAL_COST_USD" \
MSE_25_125O_MAX_CAMPAIGN_COST_USD="$MAX_CAMPAIGN_COST_USD" \
MSE_25_125_MIN_BALANCE_USD="$MIN_BALANCE_USD" \
MSE_25_125_BASE_URL="$BASE_URL" \
MSE_25_125_TENANT_SLUG="$TENANT_SLUG" \
MSE_25_125_BACKEND_CONTAINER="$BACKEND_CONTAINER" \
bash "$NETWORK_SCRIPT"

log "PASS: calibrated network execution finished"
