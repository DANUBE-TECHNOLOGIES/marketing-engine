#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
CAMPAIGN_ID="${MSE_25_125M_CAMPAIGN_ID:-}"
EXPECTED_ACK="RUN-SINGLE-RANKING-GRID-CAMPAIGN"
MAX_COST_USD="${MSE_25_125M_MAX_COST_USD:-0.05}"
MIN_BALANCE_USD="${MSE_25_125_MIN_BALANCE_USD:-0.10}"
RUNTIME_SCRIPT="${MSE_25_125M_RUNTIME_SCRIPT:-scripts/mse-25-125-ranking-grid-runtime.sh}"

log() { printf '[MSE-25.125M] %s\n' "$*"; }
fail() { printf '[MSE-25.125M] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  MSE_25_125M_CAMPAIGN_ID=<id> \
  MSE_25_125M_PAID_ACK=RUN-SINGLE-RANKING-GRID-CAMPAIGN \
  bash scripts/mse-25-125m-paid-campaign.sh

Required safeguards:
- exactly one campaign id
- exact ACK
- RANKING_GRID_DATAFORSEO_ENABLED=true inside backend
- paid-plan says campaign is eligible
- estimated cost <= MSE_25_125M_MAX_COST_USD (default 0.05)
- DataForSEO balance >= MSE_25_125_MIN_BALANCE_USD (default 0.10)

This wrapper never enables the provider itself and never accepts a campaign batch.
EOF
}

[[ "${1:-}" != "-h" && "${1:-}" != "--help" ]] || { usage; exit 0; }
[[ $# -eq 0 ]] || fail "no positional arguments are accepted; use MSE_25_125M_CAMPAIGN_ID"
[[ "$CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set one positive integer MSE_25_125M_CAMPAIGN_ID"
[[ "${MSE_25_125M_PAID_ACK:-}" == "$EXPECTED_ACK" ]] || fail "set MSE_25_125M_PAID_ACK=$EXPECTED_ACK"
[[ -f "$RUNTIME_SCRIPT" ]] || fail "runtime script not found: $RUNTIME_SCRIPT"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"

node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0) process.exit(1)' "$MAX_COST_USD" || fail "MSE_25_125M_MAX_COST_USD must be > 0"
node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<0) process.exit(1)' "$MIN_BALANCE_USD" || fail "MSE_25_125_MIN_BALANCE_USD must be >= 0"

docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER" || fail "backend container $BACKEND_CONTAINER is not running"
PROVIDER_ENABLED="$(docker exec "$BACKEND_CONTAINER" sh -lc 'printf %s "${RANKING_GRID_DATAFORSEO_ENABLED:-false}"' | tr '[:upper:]' '[:lower:]')"
[[ "$PROVIDER_ENABLED" == "true" ]] || fail "provider is not explicitly enabled inside backend; this script will not enable it"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
PLAN_FILE="$TMP_DIR/plan.json"
PLAN_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$PLAN_FILE" --write-out '%{http_code}' -H "x-tenant-slug: $TENANT_SLUG" "$BASE_URL/rankings/grid/paid-plan?campaignIds=$CAMPAIGN_ID")"
[[ "$PLAN_CODE" == "200" ]] || { cat "$PLAN_FILE" >&2; fail "paid-plan returned HTTP $PLAN_CODE"; }

PLAN_LINE="$(node - "$PLAN_FILE" "$CAMPAIGN_ID" "$MAX_COST_USD" <<'NODE'
const fs = require('fs');
const [file, campaignIdRaw, maxRaw] = process.argv.slice(2);
const campaignId = Number(campaignIdRaw);
const maxCost = Number(maxRaw);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
if (p.mode !== 'read_only' || p.providerCalls !== 0 || p.executionTriggered !== false) throw new Error('paid-plan safety invariant failed');
if (Number(p.summary?.campaigns) !== 1 || !Array.isArray(p.campaigns) || p.campaigns.length !== 1) throw new Error('paid-plan must resolve exactly one campaign');
const c = p.campaigns[0];
if (Number(c.campaignId) !== campaignId) throw new Error('paid-plan returned another campaign');
if (!c.eligible || Number(c.remainingPoints) <= 0) throw new Error('campaign is not eligible for paid execution');
const estimated = Number(c.estimatedCostUsd);
if (!Number.isFinite(estimated) || estimated < 0) throw new Error('campaign estimated cost is invalid');
if (estimated > maxCost + 1e-9) throw new Error(`estimated cost ${estimated.toFixed(4)} exceeds max ${maxCost.toFixed(4)}`);
process.stdout.write(`city=${c.city} remaining=${c.remainingPoints} estimated=${estimated.toFixed(4)} max=${maxCost.toFixed(4)}`);
NODE
)" || fail "campaign plan/preflight rejected campaign id=$CAMPAIGN_ID"
log "PASS: paid-plan $PLAN_LINE"

BALANCE_OUTPUT="$(docker exec -e MSE_25_125_MIN_BALANCE_USD="$MIN_BALANCE_USD" "$BACKEND_CONTAINER" sh -lc 'node <<'"'"'NODE'"'"'
const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;
const minimum = Number(process.env.MSE_25_125_MIN_BALANCE_USD || 0.10);
if (!login || !password) process.exit(20);
const auth = Buffer.from(`${login}:${password}`, "utf8").toString("base64");
fetch("https://api.dataforseo.com/v3/appendix/user_data", { headers: { Authorization: `Basic ${auth}` } })
  .then(async (response) => {
    if (!response.ok) process.exit(21);
    const payload = await response.json();
    const result = payload?.tasks?.[0]?.result?.[0] ?? payload?.tasks?.[0]?.result ?? null;
    const balance = Number(result?.money?.balance);
    if (!Number.isFinite(balance)) process.exit(22);
    console.log(`balance=${balance.toFixed(6)} minimum=${minimum.toFixed(6)}`);
    if (balance < minimum) process.exit(23);
  })
  .catch(() => process.exit(24));
NODE
')" || fail "DataForSEO balance preflight failed or balance is below $MIN_BALANCE_USD USD"
log "PASS: DataForSEO balance preflight ($BALANCE_OUTPUT)"

log "PAID ACTION AUTHORIZED: campaign=$CAMPAIGN_ID ($PLAN_LINE)"
MSE_25_125_CAMPAIGN_ID="$CAMPAIGN_ID" \
MSE_25_125_PAID_ACK="RUN-25-POINT-DATAFORSEO" \
MSE_25_125_MIN_BALANCE_USD="$MIN_BALANCE_USD" \
MSE_25_125_BASE_URL="$BASE_URL" \
MSE_25_125_TENANT_SLUG="$TENANT_SLUG" \
MSE_25_125_BACKEND_CONTAINER="$BACKEND_CONTAINER" \
bash "$RUNTIME_SCRIPT" --run-paid

POST_FILE="$TMP_DIR/post-plan.json"
POST_CODE="$(curl --silent --show-error --connect-timeout 5 --max-time 30 --output "$POST_FILE" --write-out '%{http_code}' -H "x-tenant-slug: $TENANT_SLUG" "$BASE_URL/rankings/grid/paid-plan?campaignIds=$CAMPAIGN_ID")"
[[ "$POST_CODE" == "200" ]] || fail "post-run paid-plan returned HTTP $POST_CODE"
node - "$POST_FILE" "$CAMPAIGN_ID" <<'NODE'
const fs = require('fs');
const p = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const id = Number(process.argv[3]);
if (Number(p.summary?.campaigns) !== 1 || Number(p.campaigns?.[0]?.campaignId) !== id) throw new Error('post-run campaign mismatch');
if (Number(p.campaigns[0].remainingPoints) !== 0 || p.campaigns[0].eligible !== false) throw new Error('campaign still has payable points after run');
console.log(`[MSE-25.125M] PASS: campaign ${id} has zero remaining payable points`);
NODE
