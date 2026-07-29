#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:4000}"
TENANT_ID="${TENANT_ID:-mondescale}"
USER_ID="${USER_ID:-asset-smoke-test}"
SLUG="asset-smoke-$(date +%s)"

echo "===== SANTÉ BACKEND ====="

curl -sS \
  "$BASE_URL/health" |
python3 -m json.tool

echo
echo "===== CRÉATION ====="

CREATE_RESPONSE="$(
  curl -sS \
    -X POST \
    "$BASE_URL/api/assets" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "x-user-id: $USER_ID" \
    -d "{
      \"type\": \"MINI_SITE\",
      \"title\": \"Smoke test Asset Engine\",
      \"slug\": \"$SLUG\",
      \"summary\": \"Validation automatisée\",
      \"payload\": {
        \"content\": \"Version 1\"
      },
      \"metadata\": {
        \"test\": true
      },
      \"tags\": [
        \"smoke-test\"
      ]
    }"
)"

echo "$CREATE_RESPONSE" | python3 -m json.tool

ASSET_ID="$(
  printf '%s' "$CREATE_RESPONSE" |
  python3 -c '
import json
import sys

data = json.load(sys.stdin)
print(data.get("id", ""))
'
)"

if [ -z "$ASSET_ID" ]; then
  echo "❌ Création Asset impossible."
  exit 1
fi

echo
echo "===== VERSION 2 ====="

curl -sS \
  -X PATCH \
  "$BASE_URL/api/assets/$ASSET_ID" \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-user-id: $USER_ID" \
  -d '{
    "summary": "Versioning validé",
    "payload": {
      "content": "Version 2"
    }
  }' |
python3 -m json.tool

echo
echo "===== PUBLICATION ====="

curl -sS \
  -X POST \
  "$BASE_URL/api/assets/$ASSET_ID/publish" \
  -H "x-tenant-id: $TENANT_ID" \
  -H "x-user-id: $USER_ID" |
python3 -m json.tool

echo
echo "===== VERSIONS ====="

VERSIONS_RESPONSE="$(
  curl -sS \
    "$BASE_URL/api/assets/$ASSET_ID/versions" \
    -H "x-tenant-id: $TENANT_ID"
)"

echo "$VERSIONS_RESPONSE" | python3 -m json.tool

VERSION_COUNT="$(
  printf '%s' "$VERSIONS_RESPONSE" |
  python3 -c '
import json
import sys

data = json.load(sys.stdin)
print(len(data))
'
)"

if [ "$VERSION_COUNT" -ne 3 ]; then
  echo "❌ Nombre de versions incorrect : $VERSION_COUNT"
  exit 1
fi

echo
echo "===== CONTRÔLE FINAL ====="

FINAL_RESPONSE="$(
  curl -sS \
    "$BASE_URL/api/assets/$ASSET_ID" \
    -H "x-tenant-id: $TENANT_ID"
)"

echo "$FINAL_RESPONSE" | python3 -m json.tool

FINAL_STATUS="$(
  printf '%s' "$FINAL_RESPONSE" |
  python3 -c '
import json
import sys

data = json.load(sys.stdin)
print(data.get("status", ""))
'
)"

FINAL_VERSION="$(
  printf '%s' "$FINAL_RESPONSE" |
  python3 -c '
import json
import sys

data = json.load(sys.stdin)
print(data.get("currentVersion", ""))
'
)"

if [ "$FINAL_STATUS" != "published" ]; then
  echo "❌ Statut final incorrect : $FINAL_STATUS"
  exit 1
fi

if [ "$FINAL_VERSION" != "3" ]; then
  echo "❌ Version finale incorrecte : $FINAL_VERSION"
  exit 1
fi

echo
echo "============================================"
echo "✅ ASSET ENGINE VALIDÉ"
echo "Asset : $ASSET_ID"
echo "Versions : $VERSION_COUNT"
echo "Statut : $FINAL_STATUS"
echo "============================================"
