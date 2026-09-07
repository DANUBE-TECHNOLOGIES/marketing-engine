#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
BASELINE_CAMPAIGN_ID="${MSE_25_125BQ_BASELINE_CAMPAIGN_ID:-}"
CAMPAIGN_ID="${MSE_25_125BQ_CAMPAIGN_ID:-}"
EXPECTED_ACK="RUN-MAUREPAS-PREPARED-7X7"
MAX_COST_USD="${MSE_25_125BQ_MAX_COST_USD:-0.10}"
MIN_BALANCE_USD="${MSE_25_125_MIN_BALANCE_USD:-0.10}"

log() { printf '[MSE-25.125BS] %s\n' "$*"; }
fail() { printf '[MSE-25.125BS] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 0 ]] || fail "no positional arguments are accepted"
[[ "$BASELINE_CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set MSE_25_125BQ_BASELINE_CAMPAIGN_ID to the exact Maurepas 5x5 baseline"
[[ "$CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set MSE_25_125BQ_CAMPAIGN_ID to the exact prepared Maurepas 7x7 campaign"
[[ "${MSE_25_125BQ_PAID_ACK:-}" == "$EXPECTED_ACK" ]] || fail "set MSE_25_125BQ_PAID_ACK=$EXPECTED_ACK"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"
command -v docker >/dev/null 2>&1 || fail "docker is required"

docker ps --format '{{.Names}}' | grep -Fxq "$BACKEND_CONTAINER" || fail "backend container $BACKEND_CONTAINER is not running"
PROVIDER_ENABLED="$(docker exec "$BACKEND_CONTAINER" sh -lc 'printf %s "${RANKING_GRID_DATAFORSEO_ENABLED:-false}"' | tr '[:upper:]' '[:lower:]')"
[[ "$PROVIDER_ENABLED" == "true" ]] || fail "provider is not explicitly enabled inside backend; this script will not enable it"

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

BASELINE_FILE="$TMP_DIR/baseline.json"
BASELINE_CODE="$(request GET "$BASE_URL/rankings/grid/campaigns/$BASELINE_CAMPAIGN_ID" "$BASELINE_FILE")"
[[ "$BASELINE_CODE" == "200" ]] || fail "baseline campaign returned HTTP $BASELINE_CODE"

CAMPAIGN_FILE="$TMP_DIR/campaign.json"
CAMPAIGN_CODE="$(request GET "$BASE_URL/rankings/grid/campaigns/$CAMPAIGN_ID" "$CAMPAIGN_FILE")"
[[ "$CAMPAIGN_CODE" == "200" ]] || fail "prepared campaign returned HTTP $CAMPAIGN_CODE"

node - "$BASELINE_FILE" "$CAMPAIGN_FILE" <<'NODE'
const fs = require('fs');
const [baselineFile, campaignFile] = process.argv.slice(2);
const b = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
const c = JSON.parse(fs.readFileSync(campaignFile, 'utf8'));
if (!/maurepas/i.test(String(b.city || '')) || !/maurepas/i.test(String(c.city || ''))) throw new Error('campaign city mismatch');
if (Number(b.gridSize) !== 5 || !Array.isArray(b.points) || b.points.length !== 25) throw new Error('baseline must be 5x5/25');
if (Number(c.gridSize) !== 7 || !Array.isArray(c.points) || c.points.length !== 49) throw new Error('prepared campaign must be 7x7/49');
if (Number(c.agencyId) !== Number(b.agencyId) || Number(c.keywordId) !== Number(b.keywordId)) throw new Error('agency/keyword mismatch');
if (Math.abs(Number(c.centerLat)-Number(b.centerLat)) > 1e-7 || Math.abs(Number(c.centerLng)-Number(b.centerLng)) > 1e-7) throw new Error('center mismatch');
const keys = new Set(c.points.map(p => `${p.row}:${p.col}`));
if (keys.size !== 49 || !c.points.some(p => Number(p.row) === 3 && Number(p.col) === 3)) throw new Error('invalid 7x7 geometry');
console.log(`[MSE-25.125BS] PASS: exact prepared campaign id=${c.id} matches baseline id=${b.id}`);
NODE

PLAN_FILE="$TMP_DIR/plan.json"
PLAN_CODE="$(request GET "$BASE_URL/rankings/grid/paid-plan?campaignIds=$CAMPAIGN_ID" "$PLAN_FILE")"
[[ "$PLAN_CODE" == "200" ]] || fail "paid-plan returned HTTP $PLAN_CODE"
REMAINING="$(node - "$PLAN_FILE" "$CAMPAIGN_ID" "$MAX_COST_USD" <<'NODE'
const fs = require('fs');
const [file, idRaw, maxRaw] = process.argv.slice(2);
const p = JSON.parse(fs.readFileSync(file, 'utf8'));
const id = Number(idRaw), max = Number(maxRaw);
if (p.mode !== 'read_only' || p.providerCalls !== 0 || p.executionTriggered !== false) throw new Error('paid-plan safety invariant failed');
if (!Array.isArray(p.campaigns) || p.campaigns.length !== 1 || Number(p.campaigns[0].campaignId) !== id) throw new Error('paid-plan campaign mismatch');
const c = p.campaigns[0];
const remaining = Number(c.remainingPoints);
if (!c.eligible || !Number.isInteger(remaining) || remaining < 1 || remaining > 49) throw new Error(`invalid remaining points: ${c.remainingPoints}`);
const estimated = Number(c.estimatedCostUsd);
if (!Number.isFinite(estimated) || estimated < 0 || estimated > max + 1e-9) throw new Error(`estimated cost ${estimated} exceeds max ${max}`);
console.error(`[MSE-25.125BS] PASS: paid-plan remaining=${remaining} estimated=${estimated.toFixed(4)} max=${max.toFixed(4)}`);
process.stdout.write(String(remaining));
NODE
)" || fail "paid-plan validation failed"

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
log "PAID ACTION AUTHORIZED: exact prepared campaign=$CAMPAIGN_ID remainingPoints=$REMAINING"

RUN_FILE="$TMP_DIR/run.json"
RUN_CODE="$(request POST "$BASE_URL/rankings/grid/campaigns/$CAMPAIGN_ID/run" "$RUN_FILE" '{}')"
[[ "$RUN_CODE" == "200" ]] || fail "paid campaign run returned HTTP $RUN_CODE"

node - "$RUN_FILE" "$CAMPAIGN_ID" <<'NODE'
const fs = require('fs');
const [file, idRaw] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(file, 'utf8'));
if (Number(c.id) !== Number(idRaw)) throw new Error('runtime returned a different campaign id');
if (Number(c.gridSize) !== 7 || !Array.isArray(c.points) || c.points.length !== 49) throw new Error('runtime campaign is not 7x7/49');
if (!c.summary || Number(c.summary.totalPoints) !== 49) throw new Error('runtime summary totalPoints != 49');
const cost = c.points.reduce((s,p) => s + (Number.isFinite(Number(p.cost)) ? Number(p.cost) : 0), 0);
console.log(`[MSE-25.125BS] campaign=${c.id} status=${c.status} measured=${c.summary.measuredPoints} errors=${c.summary.errorPoints} found=${c.summary.foundPoints}`);
console.log(`[MSE-25.125BS] presence=${c.summary.presenceRate} top3=${c.summary.top3Rate} top10=${c.summary.top10Rate} top20=${c.summary.top20Rate} avg=${c.summary.averagePosition}`);
console.log(`[MSE-25.125BS] provider cost recorded=${cost.toFixed(4)}`);
console.log('[MSE-25.125BS] GRID 7x7');
for (let r=0;r<7;r++) console.log([...Array(7)].map((_, col) => {
  const p = c.points.find(x => Number(x.row) === r && Number(x.col) === col);
  const pos = Number(p?.position);
  return p?.found && Number.isFinite(pos) ? `#${pos}` : '—';
}).join('\t'));
if (c.status !== 'completed' || Number(c.summary.errorPoints) !== 0) throw new Error('campaign partial/incomplete; rerun remains safe for unsuccessful points only');
console.log('[MSE-25.125BS] PASS: exact prepared campaign completed without point errors');
NODE
