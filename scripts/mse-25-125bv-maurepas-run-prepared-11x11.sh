#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BACKEND_CONTAINER="${MSE_25_125_BACKEND_CONTAINER:-mle_backend}"
BASELINE_CAMPAIGN_ID="${MSE_25_125BV_BASELINE_CAMPAIGN_ID:-}"
CAMPAIGN_ID="${MSE_25_125BV_CAMPAIGN_ID:-}"
EXPECTED_ACK="RUN-MAUREPAS-EXTENDED-11X11"
MAX_COST_USD="${MSE_25_125BV_MAX_COST_USD:-0.25}"
MIN_BALANCE_USD="${MSE_25_125_MIN_BALANCE_USD:-0.25}"

log() { printf '[MSE-25.125BV] %s\n' "$*"; }
fail() { printf '[MSE-25.125BV] ERROR: %s\n' "$*" >&2; exit 1; }

[[ $# -eq 0 ]] || fail "no positional arguments are accepted"
[[ "$BASELINE_CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set MSE_25_125BV_BASELINE_CAMPAIGN_ID to the exact Maurepas 5x5 baseline"
[[ "$CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set MSE_25_125BV_CAMPAIGN_ID to the exact prepared Maurepas 11x11 campaign"
[[ "${MSE_25_125BV_PAID_ACK:-}" == "$EXPECTED_ACK" ]] || fail "set MSE_25_125BV_PAID_ACK=$EXPECTED_ACK"
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
  local args=(--silent --show-error --connect-timeout 5 --max-time "${MSE_25_125_HTTP_TIMEOUT_SECONDS:-600}" --output "$output" --write-out '%{http_code}' -X "$method" -H "x-tenant-slug: $TENANT_SLUG")
  [[ -z "$body" ]] || args+=(-H 'content-type: application/json' --data "$body")
  curl "${args[@]}" "$url"
}

BASELINE_FILE="$TMP_DIR/baseline.json"
[[ "$(request GET "$BASE_URL/rankings/grid/campaigns/$BASELINE_CAMPAIGN_ID" "$BASELINE_FILE")" == "200" ]] || fail "baseline campaign read failed"
CAMPAIGN_FILE="$TMP_DIR/campaign.json"
[[ "$(request GET "$BASE_URL/rankings/grid/campaigns/$CAMPAIGN_ID" "$CAMPAIGN_FILE")" == "200" ]] || fail "prepared campaign read failed"

node - "$BASELINE_FILE" "$CAMPAIGN_FILE" <<'NODE'
const fs=require('fs'); const [bf,cf]=process.argv.slice(2); const b=JSON.parse(fs.readFileSync(bf)); const c=JSON.parse(fs.readFileSync(cf));
if(!/maurepas/i.test(String(b.city||''))||!/maurepas/i.test(String(c.city||''))) throw Error('city mismatch');
if(Number(b.gridSize)!==5||b.points?.length!==25) throw Error('baseline must be 5x5/25');
if(Number(c.gridSize)!==11||c.points?.length!==121) throw Error('campaign must be 11x11/121');
if(Math.abs(Number(c.spacingKm)-3)>1e-9) throw Error('campaign spacing must be exactly 3 km');
if(Number(c.agencyId)!==Number(b.agencyId)||Number(c.keywordId)!==Number(b.keywordId)) throw Error('identity mismatch');
if(Math.abs(Number(c.centerLat)-Number(b.centerLat))>1e-7||Math.abs(Number(c.centerLng)-Number(b.centerLng))>1e-7) throw Error('center mismatch');
const keys=new Set(c.points.map(p=>`${p.row}:${p.col}`)); if(keys.size!==121||!c.points.some(p=>Number(p.row)===5&&Number(p.col)===5)) throw Error('invalid 11x11 geometry');
console.log(`[MSE-25.125BV] PASS: exact prepared campaign id=${c.id} matches baseline id=${b.id}`);
NODE

PLAN_FILE="$TMP_DIR/plan.json"
[[ "$(request GET "$BASE_URL/rankings/grid/paid-plan?campaignIds=$CAMPAIGN_ID" "$PLAN_FILE")" == "200" ]] || fail "paid-plan read failed"
REMAINING="$(node - "$PLAN_FILE" "$CAMPAIGN_ID" "$MAX_COST_USD" <<'NODE'
const fs=require('fs'); const [f,idRaw,maxRaw]=process.argv.slice(2); const p=JSON.parse(fs.readFileSync(f)); const id=Number(idRaw),max=Number(maxRaw);
if(p.mode!=='read_only'||p.providerCalls!==0||p.executionTriggered!==false) throw Error('paid-plan safety invariant failed');
if(!Array.isArray(p.campaigns)||p.campaigns.length!==1||Number(p.campaigns[0].campaignId)!==id) throw Error('campaign mismatch');
const c=p.campaigns[0], remaining=Number(c.remainingPoints), estimated=Number(c.estimatedCostUsd);
if(!c.eligible||!Number.isInteger(remaining)||remaining<1||remaining>121) throw Error(`invalid remaining ${c.remainingPoints}`);
if(!Number.isFinite(estimated)||estimated<0||estimated>max+1e-9) throw Error(`estimated cost ${estimated} exceeds max ${max}`);
console.error(`[MSE-25.125BV] PASS: paid-plan remaining=${remaining} estimated=${estimated.toFixed(4)} max=${max.toFixed(4)}`); process.stdout.write(String(remaining));
NODE
)" || fail "paid-plan validation failed"

BALANCE_OUTPUT="$(docker exec -e MSE_25_125_MIN_BALANCE_USD="$MIN_BALANCE_USD" "$BACKEND_CONTAINER" sh -lc 'node <<'"'"'NODE'"'"'
const login=process.env.DATAFORSEO_LOGIN,password=process.env.DATAFORSEO_PASSWORD,minimum=Number(process.env.MSE_25_125_MIN_BALANCE_USD||0.25); if(!login||!password)process.exit(20);
const auth=Buffer.from(`${login}:${password}`,"utf8").toString("base64"); fetch("https://api.dataforseo.com/v3/appendix/user_data",{headers:{Authorization:`Basic ${auth}`}}).then(async r=>{if(!r.ok)process.exit(21);const p=await r.json();const x=p?.tasks?.[0]?.result?.[0]??p?.tasks?.[0]?.result??null;const b=Number(x?.money?.balance);if(!Number.isFinite(b))process.exit(22);console.log(`balance=${b.toFixed(6)} minimum=${minimum.toFixed(6)}`);if(b<minimum)process.exit(23)}).catch(()=>process.exit(24));
NODE
')" || fail "DataForSEO balance preflight failed or balance is below $MIN_BALANCE_USD USD"
log "PASS: DataForSEO balance preflight ($BALANCE_OUTPUT)"
log "PAID ACTION AUTHORIZED: exact campaign=$CAMPAIGN_ID remainingPoints=$REMAINING"

RUN_FILE="$TMP_DIR/run.json"
[[ "$(request POST "$BASE_URL/rankings/grid/campaigns/$CAMPAIGN_ID/run" "$RUN_FILE" '{}')" == "200" ]] || fail "paid campaign run failed"
node - "$RUN_FILE" "$CAMPAIGN_ID" <<'NODE'
const fs=require('fs'); const [f,idRaw]=process.argv.slice(2); const c=JSON.parse(fs.readFileSync(f));
if(Number(c.id)!==Number(idRaw)||Number(c.gridSize)!==11||c.points?.length!==121||Number(c.summary?.totalPoints)!==121) throw Error('runtime identity/geometry mismatch');
const cost=c.points.reduce((s,p)=>s+(Number.isFinite(Number(p.cost))?Number(p.cost):0),0);
console.log(`[MSE-25.125BV] campaign=${c.id} status=${c.status} measured=${c.summary.measuredPoints} errors=${c.summary.errorPoints} found=${c.summary.foundPoints}`);
console.log(`[MSE-25.125BV] presence=${c.summary.presenceRate} top3=${c.summary.top3Rate} top10=${c.summary.top10Rate} top20=${c.summary.top20Rate} avg=${c.summary.averagePosition}`);
console.log(`[MSE-25.125BV] provider cost recorded=${cost.toFixed(4)}`); console.log('[MSE-25.125BV] GRID 11x11');
for(let r=0;r<11;r++) console.log([...Array(11)].map((_,col)=>{const p=c.points.find(x=>Number(x.row)===r&&Number(x.col)===col),pos=Number(p?.position);return p?.found&&Number.isFinite(pos)?`#${pos}`:'—'}).join('\t'));
if(c.status!=='completed'||Number(c.summary.errorPoints)!==0) throw Error('campaign partial/incomplete; exact-ID rerun remains safe for unsuccessful points only');
console.log('[MSE-25.125BV] PASS: exact prepared 11x11 campaign completed without point errors');
NODE
