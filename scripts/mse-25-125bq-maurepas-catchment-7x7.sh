#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
BASELINE_CAMPAIGN_ID="${MSE_25_125BQ_BASELINE_CAMPAIGN_ID:-}"
SPACING_KM="${MSE_25_125BQ_SPACING_KM:-2}"
RUN_PAID="${MSE_25_125BQ_RUN_PAID:-false}"
EXPECTED_ACK="RUN-MAUREPAS-CATCHMENT-7X7"
MAX_COST_USD="${MSE_25_125BQ_MAX_COST_USD:-0.10}"
MIN_BALANCE_USD="${MSE_25_125_MIN_BALANCE_USD:-0.10}"

log() { printf '[MSE-25.125BQ] %s\n' "$*"; }
fail() { printf '[MSE-25.125BQ] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage (free preparation only):
  MSE_25_125BQ_BASELINE_CAMPAIGN_ID=<maurepas-5x5-id> \
  bash scripts/mse-25-125bq-maurepas-catchment-7x7.sh

Usage (explicit paid execution):
  MSE_25_125BQ_BASELINE_CAMPAIGN_ID=<maurepas-5x5-id> \
  MSE_25_125BQ_RUN_PAID=true \
  MSE_25_125BQ_PAID_ACK=RUN-MAUREPAS-CATCHMENT-7X7 \
  bash scripts/mse-25-125bq-maurepas-catchment-7x7.sh

Purpose:
- derives agencyId, keywordId and exact center from an existing Maurepas 5x5 baseline
- creates/idempotently resolves a 7x7 catchment campaign
- default spacing is 2 km (override with MSE_25_125BQ_SPACING_KM)
- validates 49 unique points and exact center 3:3
- paid execution is opt-in only and capped by a read-only paid-plan estimate
- never enables or disables DataForSEO itself
EOF
}

[[ "${1:-}" != "-h" && "${1:-}" != "--help" ]] || { usage; exit 0; }
[[ $# -eq 0 ]] || fail "no positional arguments are accepted"
[[ "$BASELINE_CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set MSE_25_125BQ_BASELINE_CAMPAIGN_ID to the exact Maurepas 5x5 campaign id"
[[ "$RUN_PAID" == "true" || "$RUN_PAID" == "false" ]] || fail "MSE_25_125BQ_RUN_PAID must be true or false"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"

node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0) process.exit(1)' "$SPACING_KM" || fail "MSE_25_125BQ_SPACING_KM must be > 0"
node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0) process.exit(1)' "$MAX_COST_USD" || fail "MSE_25_125BQ_MAX_COST_USD must be > 0"
node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<0) process.exit(1)' "$MIN_BALANCE_USD" || fail "MSE_25_125_MIN_BALANCE_USD must be >= 0"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

request() {
  local method="$1" url="$2" output="$3" body="${4:-}"
  local args=(--silent --show-error --connect-timeout 5 --max-time "${MSE_25_125_HTTP_TIMEOUT_SECONDS:-300}" --output "$output" --write-out '%{http_code}' -X "$method" -H "x-tenant-slug: $TENANT_SLUG")
  if [[ -n "$body" ]]; then
    args+=(-H 'content-type: application/json' --data "$body")
  fi
  curl "${args[@]}" "$url"
}

log "reading exact Maurepas baseline campaign id=$BASELINE_CAMPAIGN_ID"
BASELINE_FILE="$TMP_DIR/baseline.json"
BASELINE_CODE="$(request GET "$BASE_URL/rankings/grid/campaigns/$BASELINE_CAMPAIGN_ID" "$BASELINE_FILE")"
[[ "$BASELINE_CODE" == "200" ]] || { cat "$BASELINE_FILE" >&2; fail "baseline campaign returned HTTP $BASELINE_CODE"; }

BASELINE_ENV="$(node - "$BASELINE_FILE" <<'NODE'
const fs = require('fs');
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const city = String(c.city || '');
if (!/maurepas/i.test(city)) throw new Error(`baseline city is not Maurepas: ${city}`);
if (Number(c.gridSize) !== 5) throw new Error('baseline must be a 5x5 campaign');
if (!Array.isArray(c.points) || c.points.length !== 25) throw new Error('baseline must contain exactly 25 points');
const keys = new Set(c.points.map(p => `${p.row}:${p.col}`));
if (keys.size !== 25) throw new Error('baseline contains duplicate row/col coordinates');
const center = c.points.find(p => Number(p.row) === 2 && Number(p.col) === 2);
if (!center) throw new Error('baseline center 2:2 is missing');
const agencyId = Number(c.agencyId);
const keywordId = Number(c.keywordId);
const centerLat = Number(c.centerLat ?? center.latitude);
const centerLng = Number(c.centerLng ?? center.longitude);
for (const [k,v] of Object.entries({agencyId,keywordId,centerLat,centerLng})) {
  if (!Number.isFinite(v)) throw new Error(`baseline ${k} is invalid`);
}
if (Math.abs(Number(center.latitude)-centerLat) > 1e-7 || Math.abs(Number(center.longitude)-centerLng) > 1e-7) {
  throw new Error('baseline center point does not match campaign center');
}
process.stdout.write([agencyId, keywordId, centerLat, centerLng, city].join('\t'));
NODE
)" || fail "baseline validation failed"
IFS=$'\t' read -r AGENCY_ID KEYWORD_ID CENTER_LAT CENTER_LNG BASELINE_CITY <<< "$BASELINE_ENV"
log "PASS: baseline city=$BASELINE_CITY agencyId=$AGENCY_ID keywordId=$KEYWORD_ID center=$CENTER_LAT,$CENTER_LNG"

CREATE_BODY="$(node - "$AGENCY_ID" "$KEYWORD_ID" "$CENTER_LAT" "$CENTER_LNG" "$SPACING_KM" <<'NODE'
const [agencyId, keywordId, centerLat, centerLng, spacingKm] = process.argv.slice(2).map(Number);
process.stdout.write(JSON.stringify({ agencyId, keywordId, centerLat, centerLng, gridSize: 7, spacingKm }));
NODE
)"

CREATE_FILE="$TMP_DIR/create.json"
CREATE_CODE="$(request POST "$BASE_URL/rankings/grid/campaigns" "$CREATE_FILE" "$CREATE_BODY")"
[[ "$CREATE_CODE" == "201" ]] || { cat "$CREATE_FILE" >&2; fail "7x7 campaign creation returned HTTP $CREATE_CODE"; }

CAMPAIGN_ID="$(node - "$CREATE_FILE" "$CENTER_LAT" "$CENTER_LNG" "$SPACING_KM" <<'NODE'
const fs = require('fs');
const [file, latRaw, lngRaw, spacingRaw] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(file, 'utf8'));
const lat = Number(latRaw), lng = Number(lngRaw), spacing = Number(spacingRaw);
if (!Number.isInteger(Number(c.id))) throw new Error('campaign id missing');
if (Number(c.gridSize) !== 7) throw new Error('created campaign gridSize is not 7');
if (Math.abs(Number(c.spacingKm)-spacing) > 1e-9) throw new Error('created campaign spacing mismatch');
if (!Array.isArray(c.points) || c.points.length !== 49) throw new Error('created campaign must contain exactly 49 points');
const keys = new Set(c.points.map(p => `${p.row}:${p.col}`));
if (keys.size !== 49) throw new Error('created campaign contains duplicate row/col coordinates');
const center = c.points.find(p => Number(p.row) === 3 && Number(p.col) === 3);
if (!center) throw new Error('7x7 center point 3:3 missing');
if (Math.abs(Number(center.latitude)-lat) > 1e-7 || Math.abs(Number(center.longitude)-lng) > 1e-7) {
  throw new Error('7x7 center does not match Maurepas baseline center');
}
process.stdout.write(String(c.id));
NODE
)" || fail "created 7x7 geometry validation failed"

log "PASS: Maurepas 7x7 catchment campaign created/idempotently resolved id=$CAMPAIGN_ID (49 unique points, spacing=${SPACING_KM}km, exact center 3:3)"

if [[ "$RUN_PAID" != "true" ]]; then
  log "PREPARED ONLY: no DataForSEO call performed"
  log "To run explicitly: MSE_25_125BQ_BASELINE_CAMPAIGN_ID=$BASELINE_CAMPAIGN_ID MSE_25_125BQ_RUN_PAID=true MSE_25_125BQ_PAID_ACK=$EXPECTED_ACK bash $0"
  exit 0
fi

[[ "${MSE_25_125BQ_PAID_ACK:-}" == "$EXPECTED_ACK" ]] || fail "set MSE_25_125BQ_PAID_ACK=$EXPECTED_ACK"
command -v docker >/dev/null 2>&1 || fail "docker is required for paid provider-state verification"
docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER" || fail "backend container $BACKEND_CONTAINER is not running"
PROVIDER_ENABLED="$(docker exec "$BACKEND_CONTAINER" sh -lc 'printf %s "${RANKING_GRID_DATAFORSEO_ENABLED:-false}"' | tr '[:upper:]' '[:lower:]')"
[[ "$PROVIDER_ENABLED" == "true" ]] || fail "provider is not explicitly enabled inside backend; this script will not enable it"

PLAN_FILE="$TMP_DIR/plan.json"
PLAN_CODE="$(request GET "$BASE_URL/rankings/grid/paid-plan?campaignIds=$CAMPAIGN_ID" "$PLAN_FILE")"
[[ "$PLAN_CODE" == "200" ]] || { cat "$PLAN_FILE" >&2; fail "paid-plan returned HTTP $PLAN_CODE"; }
node - "$PLAN_FILE" "$CAMPAIGN_ID" "$MAX_COST_USD" <<'NODE'
const fs = require('fs');
const [file, idRaw, maxRaw] = process.argv.slice(2);
const id = Number(idRaw), max = Number(maxRaw);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
if (p.mode !== 'read_only' || p.providerCalls !== 0 || p.executionTriggered !== false) throw new Error('paid-plan safety invariant failed');
if (!Array.isArray(p.campaigns) || p.campaigns.length !== 1 || Number(p.campaigns[0].campaignId) !== id) throw new Error('paid-plan campaign mismatch');
const c = p.campaigns[0];
if (!c.eligible || Number(c.remainingPoints) !== 49) throw new Error(`fresh 7x7 campaign expected 49 payable points, got ${c.remainingPoints}`);
const estimated = Number(c.estimatedCostUsd);
if (!Number.isFinite(estimated) || estimated < 0 || estimated > max + 1e-9) throw new Error(`estimated cost ${estimated} exceeds max ${max}`);
console.log(`[MSE-25.125BQ] PASS: paid-plan remaining=49 estimated=${estimated.toFixed(4)} max=${max.toFixed(4)}`);
NODE

BALANCE_OUTPUT="$(docker exec -e MSE_25_125_MIN_BALANCE_USD="$MIN_BALANCE_USD" "$BACKEND_CONTAINER" sh -lc 'node <<'"'"'NODE'"'"'
const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;
const minimum = Number(process.env.MSE_25_125_MIN_BALANCE_USD || 0.10);
if (!login || !password) process.exit(20);
const auth = Buffer.from(`${login}:${password}`, "utf8").toString("base64");
fetch("https://api.dataforseo.com/v3/appendix/user_data", { headers: { Authorization: `Basic ${auth}` } })
  .then(async response => {
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

log "PAID ACTION AUTHORIZED: Maurepas catchment campaign=$CAMPAIGN_ID points=49 spacing=${SPACING_KM}km"
RUN_FILE="$TMP_DIR/run.json"
RUN_CODE="$(request POST "$BASE_URL/rankings/grid/campaigns/$CAMPAIGN_ID/run" "$RUN_FILE" '{}')"
[[ "$RUN_CODE" == "200" ]] || { cat "$RUN_FILE" >&2; fail "paid 7x7 campaign run returned HTTP $RUN_CODE"; }

node - "$RUN_FILE" <<'NODE'
const fs = require('fs');
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (Number(c.gridSize) !== 7 || !Array.isArray(c.points) || c.points.length !== 49) throw new Error('runtime campaign is not 7x7/49');
const keys = new Set(c.points.map(p => `${p.row}:${p.col}`));
if (keys.size !== 49) throw new Error('runtime campaign contains duplicate row/col coordinates');
if (!c.points.some(p => Number(p.row) === 3 && Number(p.col) === 3)) throw new Error('runtime center 3:3 missing');
if (!c.summary || Number(c.summary.totalPoints) !== 49) throw new Error('runtime summary totalPoints != 49');
const cost = c.points.reduce((s,p) => s + (Number.isFinite(Number(p.cost)) ? Number(p.cost) : 0), 0);
console.log(`[MSE-25.125BQ] campaign=${c.id} status=${c.status} measured=${c.summary.measuredPoints} errors=${c.summary.errorPoints} found=${c.summary.foundPoints}`);
console.log(`[MSE-25.125BQ] presence=${c.summary.presenceRate} top3=${c.summary.top3Rate} top10=${c.summary.top10Rate} top20=${c.summary.top20Rate} avg=${c.summary.averagePosition}`);
console.log(`[MSE-25.125BQ] provider cost recorded=${cost.toFixed(4)}`);
const rows = [...Array(7)].map((_, r) => [...Array(7)].map((__, col) => {
  const p = c.points.find(x => Number(x.row) === r && Number(x.col) === col);
  if (!p) return 'ERR';
  const pos = Number(p.position);
  return p.found && Number.isFinite(pos) ? `#${pos}` : '—';
}).join('\t'));
console.log('[MSE-25.125BQ] GRID 7x7');
console.log(rows.join('\n'));
if (c.status !== 'completed' || Number(c.summary.errorPoints) !== 0) throw new Error('campaign partial/incomplete; rerun remains safe for unsuccessful points only');
console.log('[MSE-25.125BQ] PASS: Maurepas 7x7 catchment campaign completed without point errors');
NODE
