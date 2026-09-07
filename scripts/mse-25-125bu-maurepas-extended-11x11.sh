#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${MSE_25_125_BASE_URL:-http://127.0.0.1:4000}"
TENANT_SLUG="${MSE_25_125_TENANT_SLUG:-mondescale}"
BASELINE_CAMPAIGN_ID="${MSE_25_125BU_BASELINE_CAMPAIGN_ID:-}"
SPACING_KM="${MSE_25_125BU_SPACING_KM:-3}"

log() { printf '[MSE-25.125BU] %s\n' "$*"; }
fail() { printf '[MSE-25.125BU] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage (free preparation only):
  MSE_25_125BU_BASELINE_CAMPAIGN_ID=<maurepas-5x5-id> \
  bash scripts/mse-25-125bu-maurepas-extended-11x11.sh

Purpose:
- derives agencyId, keywordId and exact center from an existing Maurepas 5x5 baseline
- prepares an 11x11 extended measurement centered exactly on Maurepas
- default spacing is 3 km: +/-15 km on each axis, 30 km center-to-center width
- validates 121 unique points and exact center 5:5
- preparation only: this script has no campaign run endpoint and performs no DataForSEO call
- never enables or disables DataForSEO

The geometry is intentionally separate from the 7x7 CORE baseline. It is designed to observe the wider
Maurepas catchment, including the outer Rambouillet axis, without changing or reusing baseline #20.
EOF
}

[[ "${1:-}" != "-h" && "${1:-}" != "--help" ]] || { usage; exit 0; }
[[ $# -eq 0 ]] || fail "no positional arguments are accepted"
[[ "$BASELINE_CAMPAIGN_ID" =~ ^[1-9][0-9]*$ ]] || fail "set MSE_25_125BU_BASELINE_CAMPAIGN_ID to the exact Maurepas 5x5 campaign id"
command -v curl >/dev/null 2>&1 || fail "curl is required"
command -v node >/dev/null 2>&1 || fail "node is required"
node -e 'const n=Number(process.argv[1]); if(!Number.isFinite(n)||n<=0||n>25) process.exit(1)' "$SPACING_KM" || fail "MSE_25_125BU_SPACING_KM must be > 0 and <= 25"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

request() {
  local method="$1" url="$2" output="$3" body="${4:-}"
  local args=(--silent --show-error --connect-timeout 5 --max-time "${MSE_25_125_HTTP_TIMEOUT_SECONDS:-60}" --output "$output" --write-out '%{http_code}' -X "$method" -H "x-tenant-slug: $TENANT_SLUG")
  if [[ -n "$body" ]]; then
    args+=(-H 'content-type: application/json' --data "$body")
  fi
  curl "${args[@]}" "$url"
}

BASELINE_FILE="$TMP_DIR/baseline.json"
log "reading exact Maurepas 5x5 baseline campaign id=$BASELINE_CAMPAIGN_ID"
CODE="$(request GET "$BASE_URL/rankings/grid/campaigns/$BASELINE_CAMPAIGN_ID" "$BASELINE_FILE")"
[[ "$CODE" == "200" ]] || { cat "$BASELINE_FILE" >&2; fail "baseline campaign returned HTTP $CODE"; }

BASELINE_ENV="$(node - "$BASELINE_FILE" <<'NODE'
const fs = require('fs');
const c = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!/maurepas/i.test(String(c.city || ''))) throw new Error('baseline city is not Maurepas');
if (Number(c.gridSize) !== 5 || !Array.isArray(c.points) || c.points.length !== 25) throw new Error('baseline must be 5x5/25');
const keys = new Set(c.points.map(p => `${p.row}:${p.col}`));
if (keys.size !== 25) throw new Error('baseline duplicate row/col');
const center = c.points.find(p => Number(p.row) === 2 && Number(p.col) === 2);
if (!center) throw new Error('baseline center 2:2 missing');
const agencyId = Number(c.agencyId), keywordId = Number(c.keywordId);
const lat = Number(c.centerLat ?? center.latitude), lng = Number(c.centerLng ?? center.longitude);
if (![agencyId, keywordId, lat, lng].every(Number.isFinite)) throw new Error('invalid baseline identifiers/center');
if (Math.abs(Number(center.latitude)-lat) > 1e-7 || Math.abs(Number(center.longitude)-lng) > 1e-7) throw new Error('baseline center mismatch');
process.stdout.write([agencyId, keywordId, lat, lng].join('\t'));
NODE
)" || fail "baseline validation failed"
IFS=$'\t' read -r AGENCY_ID KEYWORD_ID CENTER_LAT CENTER_LNG <<< "$BASELINE_ENV"
log "PASS: baseline agencyId=$AGENCY_ID keywordId=$KEYWORD_ID center=$CENTER_LAT,$CENTER_LNG"

BODY="$(node - "$AGENCY_ID" "$KEYWORD_ID" "$CENTER_LAT" "$CENTER_LNG" "$SPACING_KM" <<'NODE'
const [agencyId, keywordId, centerLat, centerLng, spacingKm] = process.argv.slice(2).map(Number);
process.stdout.write(JSON.stringify({ agencyId, keywordId, centerLat, centerLng, gridSize: 11, spacingKm }));
NODE
)"

CREATE_FILE="$TMP_DIR/create.json"
CODE="$(request POST "$BASE_URL/rankings/grid/campaigns" "$CREATE_FILE" "$BODY")"
[[ "$CODE" == "201" ]] || { cat "$CREATE_FILE" >&2; fail "11x11 preparation returned HTTP $CODE"; }

CAMPAIGN_ID="$(node - "$CREATE_FILE" "$AGENCY_ID" "$KEYWORD_ID" "$CENTER_LAT" "$CENTER_LNG" "$SPACING_KM" <<'NODE'
const fs = require('fs');
const [file, agencyRaw, keywordRaw, latRaw, lngRaw, spacingRaw] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(file, 'utf8'));
const agencyId=Number(agencyRaw), keywordId=Number(keywordRaw), lat=Number(latRaw), lng=Number(lngRaw), spacing=Number(spacingRaw);
if (!Number.isInteger(Number(c.id))) throw new Error('campaign id missing');
if (Number(c.agencyId)!==agencyId || Number(c.keywordId)!==keywordId) throw new Error('campaign identity mismatch');
if (Number(c.gridSize)!==11 || Math.abs(Number(c.spacingKm)-spacing)>1e-9) throw new Error('geometry mismatch');
if (!Array.isArray(c.points) || c.points.length!==121) throw new Error('campaign must contain 121 points');
const keys=new Set(c.points.map(p=>`${p.row}:${p.col}`));
if (keys.size!==121) throw new Error('duplicate row/col coordinates');
const center=c.points.find(p=>Number(p.row)===5&&Number(p.col)===5);
if (!center) throw new Error('center 5:5 missing');
if (Math.abs(Number(center.latitude)-lat)>1e-7 || Math.abs(Number(center.longitude)-lng)>1e-7) throw new Error('extended center mismatch');
process.stdout.write(String(c.id));
NODE
)" || fail "prepared 11x11 validation failed"

log "PASS: extended campaign id=$CAMPAIGN_ID grid=11x11 points=121 spacing=${SPACING_KM}km center=5:5"
log "COVERAGE: approximately +/-$(( 5 * ${SPACING_KM%.*} )) km per axis when spacing is an integer; default geometry is 30 km wide"
log "PREPARED ONLY: no DataForSEO call performed; no /run endpoint exists in this script"
log "Keep campaign id=$CAMPAIGN_ID for a later exact-ID paid runner after explicit approval."
