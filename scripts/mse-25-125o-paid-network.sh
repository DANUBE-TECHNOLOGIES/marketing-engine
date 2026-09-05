#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
CAMPAIGN_IDS_RAW="${MSE_25_125O_CAMPAIGN_IDS:-}"
EXPECTED_ACK="RUN-NETWORK-RANKING-GRID-CAMPAIGNS"
MAX_TOTAL_COST_USD="${MSE_25_125O_MAX_TOTAL_COST_USD:-0.35}"
MAX_CAMPAIGN_COST_USD="${MSE_25_125O_MAX_CAMPAIGN_COST_USD:-0.05}"
MIN_BALANCE_USD="${MSE_25_125_MIN_BALANCE_USD:-0.10}"
SINGLE_SCRIPT="${MSE_25_125O_SINGLE_SCRIPT:-scripts/mse-25-125m-paid-campaign.sh}"

log() { printf '[MSE-25.125O] %s\n' "$*"; }
fail() { printf '[MSE-25.125O] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  MSE_25_125O_CAMPAIGN_IDS=3,4,5,6,7,8,9 \
  MSE_25_125O_PAID_ACK=RUN-NETWORK-RANKING-GRID-CAMPAIGNS \
  bash scripts/mse-25-125o-paid-network.sh

Safeguards:
- explicit, unique positive campaign IDs only
- exact network ACK
- provider must already be enabled inside backend
- global paid-plan preflight must resolve only the requested campaigns
- total remaining estimate <= MSE_25_125O_MAX_TOTAL_COST_USD (default 0.35)
- per-campaign execution delegates to guarded MSE-25.125M
- completed campaigns are skipped; partial campaigns resume only non-success points
- execution stops immediately on a true technical failure

This script never edits env files and never enables/disables DataForSEO.
EOF
}

[[ "${1:-}" != "-h" && "${1:-}" != "--help" ]] || { usage; exit 0; }
[[ $# -eq 0 ]] || fail "no positional arguments are accepted; use MSE_25_125O_CAMPAIGN_IDS"
[[ "${MSE_25_125O_PAID_ACK:-}" == "$EXPECTED_ACK" ]] || fail "set MSE_25_125O_PAID_ACK=$EXPECTED_ACK"
[[ -n "$CAMPAIGN_IDS_RAW" ]] || fail "set MSE_25_125O_CAMPAIGN_IDS to an explicit comma-separated list"
[[ -f "$SINGLE_SCRIPT" ]] || fail "single-campaign executor not found: $SINGLE_SCRIPT"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"

node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0) process.exit(1)' "$MAX_TOTAL_COST_USD" || fail "MSE_25_125O_MAX_TOTAL_COST_USD must be > 0"
node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0) process.exit(1)' "$MAX_CAMPAIGN_COST_USD" || fail "MSE_25_125O_MAX_CAMPAIGN_COST_USD must be > 0"
node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<0) process.exit(1)' "$MIN_BALANCE_USD" || fail "MSE_25_125_MIN_BALANCE_USD must be >= 0"

IFS=',' read -r -a CAMPAIGN_IDS <<< "$CAMPAIGN_IDS_RAW"
[[ ${#CAMPAIGN_IDS[@]} -gt 0 ]] || fail "no campaign IDs resolved"

NORMALIZED_IDS="$(node - "$CAMPAIGN_IDS_RAW" <<'NODE'
const raw = process.argv[2];
const parts = String(raw).split(',').map(v => v.trim());
if (!parts.length || parts.some(v => !/^[1-9][0-9]*$/.test(v))) process.exit(10);
const ids = parts.map(Number);
if (new Set(ids).size !== ids.length) process.exit(11);
process.stdout.write(ids.join(','));
NODE
)" || fail "campaign IDs must be unique positive integers"
IFS=',' read -r -a CAMPAIGN_IDS <<< "$NORMALIZED_IDS"

docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER" || fail "backend container $BACKEND_CONTAINER is not running"
PROVIDER_ENABLED="$(docker exec "$BACKEND_CONTAINER" sh -lc 'printf %s "${RANKING_GRID_DATAFORSEO_ENABLED:-false}"' | tr '[:upper:]' '[:lower:]')"
[[ "$PROVIDER_ENABLED" == "true" ]] || fail "provider is not explicitly enabled inside backend; this script will not enable it"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
PLAN_FILE="$TMP_DIR/network-plan.json"
PLAN_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$PLAN_FILE" --write-out '%{http_code}' -H "x-tenant-slug: $TENANT_SLUG" "$BASE_URL/rankings/grid/paid-plan?campaignIds=$NORMALIZED_IDS")"
[[ "$PLAN_CODE" == "200" ]] || { cat "$PLAN_FILE" >&2; fail "network paid-plan returned HTTP $PLAN_CODE"; }

PLAN_SUMMARY="$(node - "$PLAN_FILE" "$NORMALIZED_IDS" "$MAX_TOTAL_COST_USD" <<'NODE'
const fs = require('fs');
const [file, idsRaw, maxRaw] = process.argv.slice(2);
const requested = idsRaw.split(',').map(Number);
const requestedSet = new Set(requested);
const max = Number(maxRaw);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
if (p.mode !== 'read_only' || p.providerCalls !== 0 || p.executionTriggered !== false) throw new Error('paid-plan safety invariant failed');
if (!Array.isArray(p.campaigns) || p.campaigns.length !== requested.length) throw new Error('paid-plan did not resolve exactly the requested campaigns');
const returned = p.campaigns.map(c => Number(c.campaignId));
if (returned.some(id => !requestedSet.has(id)) || new Set(returned).size !== requested.length) throw new Error('paid-plan campaign selection mismatch');
for (const c of p.campaigns) {
  const remaining = Number(c.remainingPoints);
  if (!Number.isFinite(remaining) || remaining < 0) throw new Error(`campaign ${c.campaignId} invalid remaining points`);
  if (remaining > 0 && c.eligible !== true) throw new Error(`campaign ${c.campaignId} has remaining points but is not eligible`);
  if (remaining === 0 && c.eligible !== false) throw new Error(`campaign ${c.campaignId} zero remaining but still eligible`);
}
const estimated = Number(p.summary?.estimatedCostUsd);
if (!Number.isFinite(estimated) || estimated < 0) throw new Error('global estimated cost invalid');
if (estimated > max + 1e-9) throw new Error(`global estimated cost ${estimated.toFixed(4)} exceeds max ${max.toFixed(4)}`);
const remaining = p.campaigns.reduce((sum, c) => sum + Number(c.remainingPoints || 0), 0);
const eligible = p.campaigns.filter(c => c.eligible).length;
process.stdout.write(`campaigns=${p.campaigns.length} eligible=${eligible} remaining=${remaining} estimated=${estimated.toFixed(4)} max=${max.toFixed(4)}`);
NODE
)" || fail "network plan/preflight rejected requested campaigns"
log "PASS: paid-plan $PLAN_SUMMARY"

log "PAID NETWORK ACTION AUTHORIZED: campaigns=$NORMALIZED_IDS ($PLAN_SUMMARY)"

for CAMPAIGN_ID in "${CAMPAIGN_IDS[@]}"; do
  CAMPAIGN_PLAN="$TMP_DIR/campaign-$CAMPAIGN_ID.json"
  CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$CAMPAIGN_PLAN" --write-out '%{http_code}' -H "x-tenant-slug: $TENANT_SLUG" "$BASE_URL/rankings/grid/paid-plan?campaignIds=$CAMPAIGN_ID")"
  [[ "$CODE" == "200" ]] || fail "campaign $CAMPAIGN_ID paid-plan returned HTTP $CODE"

  STATE="$(node - "$CAMPAIGN_PLAN" "$CAMPAIGN_ID" <<'NODE'
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const id = Number(process.argv[3]);
if (!Array.isArray(p.campaigns) || p.campaigns.length !== 1 || Number(p.campaigns[0].campaignId) !== id) throw new Error('campaign plan mismatch');
const c = p.campaigns[0];
process.stdout.write(`${c.eligible ? 'eligible' : 'complete'}|${Number(c.remainingPoints || 0)}|${Number(c.estimatedCostUsd || 0).toFixed(4)}|${c.city || ''}`);
NODE
)" || fail "campaign $CAMPAIGN_ID state validation failed"

  IFS='|' read -r ELIGIBILITY REMAINING ESTIMATED CITY <<< "$STATE"
  if [[ "$ELIGIBILITY" == "complete" && "$REMAINING" == "0" ]]; then
    log "SKIP: campaign=$CAMPAIGN_ID city=$CITY already complete"
    continue
  fi
  [[ "$ELIGIBILITY" == "eligible" && "$REMAINING" -gt 0 ]] || fail "campaign $CAMPAIGN_ID is neither safely complete nor eligible"

  log "RUN: campaign=$CAMPAIGN_ID city=$CITY remaining=$REMAINING estimated=$ESTIMATED"
  MSE_25_125M_CAMPAIGN_ID="$CAMPAIGN_ID" \
  MSE_25_125M_PAID_ACK="RUN-SINGLE-RANKING-GRID-CAMPAIGN" \
  MSE_25_125M_MAX_COST_USD="$MAX_CAMPAIGN_COST_USD" \
  MSE_25_125_MIN_BALANCE_USD="$MIN_BALANCE_USD" \
  MSE_25_125_BASE_URL="$BASE_URL" \
  MSE_25_125_TENANT_SLUG="$TENANT_SLUG" \
  MSE_25_125_BACKEND_CONTAINER="$BACKEND_CONTAINER" \
  bash "$SINGLE_SCRIPT"
  log "PASS: campaign=$CAMPAIGN_ID completed with zero remaining payable points"
done

POST_FILE="$TMP_DIR/network-post-plan.json"
POST_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$POST_FILE" --write-out '%{http_code}' -H "x-tenant-slug: $TENANT_SLUG" "$BASE_URL/rankings/grid/paid-plan?campaignIds=$NORMALIZED_IDS")"
[[ "$POST_CODE" == "200" ]] || fail "network post-plan returned HTTP $POST_CODE"

node - "$POST_FILE" "$NORMALIZED_IDS" <<'NODE'
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const ids = process.argv[3].split(',').map(Number);
if (!Array.isArray(p.campaigns) || p.campaigns.length !== ids.length) throw new Error('network post-plan selection mismatch');
for (const c of p.campaigns) {
  if (Number(c.remainingPoints) !== 0 || c.eligible !== false) throw new Error(`campaign ${c.campaignId} still has payable points`);
}
console.log(`[MSE-25.125O] PASS: all ${ids.length} requested campaigns have zero remaining payable points`);
NODE
