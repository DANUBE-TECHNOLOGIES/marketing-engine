#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
EXPECTED_PAID_ACK="RUN-25-POINT-DATAFORSEO"
MIN_BALANCE_USD="${MSE_25_125_MIN_BALANCE_USD:-0.01}"
CREATE=false
RUN_PAID=false
CAMPAIGN_ID="${MSE_25_125_CAMPAIGN_ID:-}"

log() { printf '[MSE-25.125A] %s\n' "$*"; }
fail() { printf '[MSE-25.125A] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  bash scripts/mse-25-125-ranking-grid-runtime.sh
  bash scripts/mse-25-125-ranking-grid-runtime.sh --create
  bash scripts/mse-25-125-ranking-grid-runtime.sh --run-paid
  bash scripts/mse-25-125-ranking-grid-runtime.sh --create --run-paid

Default mode is read-only and validates GET /rankings/grid/campaigns.

--create performs a free DB write and requires:
  MSE_25_125_AGENCY_ID
  MSE_25_125_KEYWORD_ID
  MSE_25_125_CENTER_LAT
  MSE_25_125_CENTER_LNG
Optional: MSE_25_125_SPACING_KM (default 1)

--run-paid triggers the DataForSEO 5x5 campaign and requires:
  MSE_25_125_PAID_ACK=RUN-25-POINT-DATAFORSEO
  RANKING_GRID_DATAFORSEO_ENABLED=true inside the running backend container
  a DataForSEO account balance >= MSE_25_125_MIN_BALANCE_USD (default 0.01)
  and either --create or MSE_25_125_CAMPAIGN_ID.

This script never enables the paid provider itself.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --create) CREATE=true ;;
    --run-paid) RUN_PAID=true ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown argument: $arg" ;;
  esac
done

command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"

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

log "read-only API validation: $BASE_URL tenant=$TENANT_SLUG"
LIST_FILE="$TMP_DIR/list.json"
LIST_CODE="$(request GET "$BASE_URL/rankings/grid/campaigns?limit=6" "$LIST_FILE")"
[[ "$LIST_CODE" == "200" ]] || { cat "$LIST_FILE" >&2; fail "campaign listing returned HTTP $LIST_CODE"; }
node - "$LIST_FILE" <<'NODE'
const fs = require('fs');
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!payload || !Array.isArray(payload.campaigns)) throw new Error('campaigns array missing');
for (const campaign of payload.campaigns) {
  if (!Array.isArray(campaign.points)) throw new Error(`campaign ${campaign.id} points missing`);
}
console.log(`[MSE-25.125A] PASS: read-only listing (${payload.campaigns.length} campaign(s))`);
NODE

if [[ "$CREATE" != "true" && "$RUN_PAID" != "true" ]]; then
  log "runtime read-only validation complete; no DB write and no provider call performed"
  exit 0
fi

if [[ "$CREATE" == "true" ]]; then
  : "${MSE_25_125_AGENCY_ID:?MSE_25_125_AGENCY_ID is required with --create}"
  : "${MSE_25_125_KEYWORD_ID:?MSE_25_125_KEYWORD_ID is required with --create}"
  : "${MSE_25_125_CENTER_LAT:?MSE_25_125_CENTER_LAT is required with --create}"
  : "${MSE_25_125_CENTER_LNG:?MSE_25_125_CENTER_LNG is required with --create}"

  CREATE_BODY="$(node - <<'NODE'
const values = {
  agencyId: Number(process.env.MSE_25_125_AGENCY_ID),
  keywordId: Number(process.env.MSE_25_125_KEYWORD_ID),
  centerLat: Number(process.env.MSE_25_125_CENTER_LAT),
  centerLng: Number(process.env.MSE_25_125_CENTER_LNG),
  gridSize: 5,
  spacingKm: Number(process.env.MSE_25_125_SPACING_KM || 1),
};
for (const [key, value] of Object.entries(values)) {
  if (!Number.isFinite(value)) throw new Error(`${key} must be numeric`);
}
process.stdout.write(JSON.stringify(values));
NODE
)"

  CREATE_FILE="$TMP_DIR/create.json"
  CREATE_CODE="$(request POST "$BASE_URL/rankings/grid/campaigns" "$CREATE_FILE" "$CREATE_BODY")"
  [[ "$CREATE_CODE" == "201" ]] || { cat "$CREATE_FILE" >&2; fail "campaign creation returned HTTP $CREATE_CODE"; }
  CAMPAIGN_ID="$(node - "$CREATE_FILE" <<'NODE'
const fs = require('fs');
const campaign = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Number.isInteger(Number(campaign.id))) throw new Error('campaign id missing');
if (Number(campaign.gridSize) !== 5) throw new Error('campaign gridSize is not 5');
if (!Array.isArray(campaign.points) || campaign.points.length !== 25) throw new Error('campaign does not contain 25 points');
const keys = new Set(campaign.points.map((p) => `${p.row}:${p.col}`));
if (keys.size !== 25) throw new Error('campaign contains duplicate grid coordinates');
const center = campaign.points.find((p) => Number(p.row) === 2 && Number(p.col) === 2);
if (!center) throw new Error('center point 2:2 missing');
const expectedLat = Number(process.env.MSE_25_125_CENTER_LAT);
const expectedLng = Number(process.env.MSE_25_125_CENTER_LNG);
if (Math.abs(Number(center.latitude) - expectedLat) > 1e-7 || Math.abs(Number(center.longitude) - expectedLng) > 1e-7) {
  throw new Error('center point does not match explicit requested coordinates');
}
process.stdout.write(String(campaign.id));
NODE
)"
  log "PASS: 5x5 campaign created/idempotently resolved as id=$CAMPAIGN_ID (25 unique points, exact center)"
fi

if [[ "$RUN_PAID" != "true" ]]; then
  log "campaign preparation complete; no provider call performed"
  exit 0
fi

[[ "${MSE_25_125_PAID_ACK:-}" == "$EXPECTED_PAID_ACK" ]] || fail "set MSE_25_125_PAID_ACK=$EXPECTED_PAID_ACK before --run-paid"
[[ "$CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set MSE_25_125_CAMPAIGN_ID or use --create before --run-paid"
command -v docker >/dev/null 2>&1 || fail "docker is required for provider-state verification"
docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER" || fail "backend container $BACKEND_CONTAINER is not running"
PROVIDER_ENABLED="$(docker exec "$BACKEND_CONTAINER" sh -lc 'printf %s "${RANKING_GRID_DATAFORSEO_ENABLED:-false}"' | tr '[:upper:]' '[:lower:]')"
[[ "$PROVIDER_ENABLED" == "true" ]] || fail "paid provider is not explicitly enabled inside backend; script will not enable it automatically"

BALANCE_OUTPUT="$(docker exec -e MSE_25_125_MIN_BALANCE_USD="$MIN_BALANCE_USD" "$BACKEND_CONTAINER" sh -lc 'node <<'"'"'NODE'"'"'
const login = process.env.DATAFORSEO_LOGIN;
const password = process.env.DATAFORSEO_PASSWORD;
const minimum = Number(process.env.MSE_25_125_MIN_BALANCE_USD || 0.01);
if (!login || !password) {
  console.error("CREDENTIALS_MISSING");
  process.exit(20);
}
if (!Number.isFinite(minimum) || minimum < 0) {
  console.error("INVALID_MINIMUM_BALANCE");
  process.exit(21);
}
const auth = Buffer.from(`${login}:${password}`, "utf8").toString("base64");
fetch("https://api.dataforseo.com/v3/appendix/user_data", {
  headers: { Authorization: `Basic ${auth}` },
})
  .then(async (response) => {
    if (!response.ok) {
      console.error(`PREFLIGHT_HTTP_${response.status}`);
      process.exit(22);
    }
    const payload = await response.json();
    const result = payload?.tasks?.[0]?.result?.[0] ?? payload?.tasks?.[0]?.result ?? null;
    const balance = Number(result?.money?.balance);
    if (!Number.isFinite(balance)) {
      console.error("BALANCE_UNAVAILABLE");
      process.exit(23);
    }
    console.log(`balance=${balance.toFixed(6)} minimum=${minimum.toFixed(6)}`);
    if (balance < minimum) process.exit(24);
  })
  .catch((error) => {
    console.error(`PREFLIGHT_FETCH_ERROR=${error.message}`);
    process.exit(25);
  });
NODE
')" || fail "DataForSEO balance preflight failed or balance is below required minimum $MIN_BALANCE_USD USD"
log "PASS: DataForSEO balance preflight ($BALANCE_OUTPUT)"

log "PAID ACTION: running campaign id=$CAMPAIGN_ID; a fresh 5x5 campaign can issue up to 25 DataForSEO measurements"
RUN_FILE="$TMP_DIR/run.json"
RUN_CODE="$(request POST "$BASE_URL/rankings/grid/campaigns/$CAMPAIGN_ID/run" "$RUN_FILE" '{}')"
[[ "$RUN_CODE" == "200" ]] || { cat "$RUN_FILE" >&2; fail "paid campaign run returned HTTP $RUN_CODE"; }

node - "$RUN_FILE" <<'NODE'
const fs = require('fs');
const campaign = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!Array.isArray(campaign.points) || campaign.points.length !== 25) throw new Error('runtime campaign does not contain 25 points');
const keys = new Set(campaign.points.map((p) => `${p.row}:${p.col}`));
if (keys.size !== 25) throw new Error('runtime campaign contains duplicate row/col points');
if (!campaign.points.some((p) => Number(p.row) === 2 && Number(p.col) === 2)) throw new Error('runtime center point missing');
if (!campaign.summary || Number(campaign.summary.totalPoints) !== 25) throw new Error('runtime summary totalPoints != 25');
const totalCost = campaign.points.reduce((sum, p) => sum + (Number.isFinite(Number(p.cost)) ? Number(p.cost) : 0), 0);
console.log(`[MSE-25.125A] campaign status=${campaign.status}`);
console.log(`[MSE-25.125A] measured=${campaign.summary.measuredPoints} errors=${campaign.summary.errorPoints} found=${campaign.summary.foundPoints}`);
console.log(`[MSE-25.125A] presence=${campaign.summary.presenceRate} top3=${campaign.summary.top3Rate} top10=${campaign.summary.top10Rate} top20=${campaign.summary.top20Rate} avg=${campaign.summary.averagePosition}`);
console.log(`[MSE-25.125A] provider cost recorded=${totalCost.toFixed(4)}`);
if (campaign.status !== 'completed' || Number(campaign.summary.errorPoints) !== 0) {
  throw new Error('campaign is partial/incomplete; rerun is safe for unsuccessful points only');
}
console.log('[MSE-25.125A] PASS: paid 5x5 runtime campaign completed without point errors');
NODE
