#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000/api/assets}"
TENANT_ID="${TENANT_ID:-tenant-demo}"
USER_ID="${USER_ID:-user-demo}"

TMP_CREATE="/tmp/asset-create-response.json"
TMP_LIST="/tmp/asset-list-response.json"
TMP_UPDATE="/tmp/asset-update-response.json"
TMP_VERSIONS="/tmp/asset-versions-response.json"
TMP_PUBLISH="/tmp/asset-publish-response.json"

echo "============================================================"
echo "🧪 TEST ASSET ENGINE"
echo "============================================================"
echo "API : $BASE_URL"

echo
echo "1. Vérification de la route..."

HTTP_CODE="$(
  curl -sS \
    -o "$TMP_LIST" \
    -w "%{http_code}" \
    -H "x-tenant-id: $TENANT_ID" \
    "$BASE_URL" || true
)"

echo "Code HTTP : $HTTP_CODE"
cat "$TMP_LIST" 2>/dev/null || true
echo

if [ "$HTTP_CODE" = "000" ]; then
  echo "❌ Impossible de joindre le backend."
  exit 1
fi

if [ "$HTTP_CODE" = "404" ]; then
  echo "❌ La route /api/assets n'est pas enregistrée."
  exit 1
fi

if [ "$HTTP_CODE" -ge 500 ] 2>/dev/null; then
  echo "❌ Erreur interne du backend."
  exit 1
fi

echo
echo "2. Création d'un Asset..."

CREATE_CODE="$(
  curl -sS \
    -o "$TMP_CREATE" \
    -w "%{http_code}" \
    -X POST "$BASE_URL" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "x-user-id: $USER_ID" \
    -d '{
      "type": "GOOGLE_POST",
      "title": "Découvrir Budapest",
      "slug": "decouvrir-budapest-test",
      "summary": "Asset créé par le test automatique",
      "payload": {
        "text": "Budapest compte plus de 120 sources thermales.",
        "cta": "Découvrir Budapest"
      },
      "metadata": {
        "language": "fr",
        "test": true
      },
      "tags": [
        "budapest",
        "hongrie",
        "test"
      ]
    }' || true
)"

echo "Code HTTP : $CREATE_CODE"
cat "$TMP_CREATE"
echo

if [ "$CREATE_CODE" != "201" ] && [ "$CREATE_CODE" != "200" ]; then
  echo "❌ Échec de création de l'Asset."
  exit 1
fi

ASSET_ID="$(
  node - "$TMP_CREATE" <<'NODE'
const fs = require("fs");
const file = process.argv[2];

try {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  if (!data.id) {
    process.exit(1);
  }

  process.stdout.write(data.id);
} catch {
  process.exit(1);
}
NODE
)"

if [ -z "$ASSET_ID" ]; then
  echo "❌ Identifiant Asset absent de la réponse."
  exit 1
fi

echo "✅ Asset créé : $ASSET_ID"

echo
echo "3. Modification de l'Asset..."

UPDATE_CODE="$(
  curl -sS \
    -o "$TMP_UPDATE" \
    -w "%{http_code}" \
    -X PATCH "$BASE_URL/$ASSET_ID" \
    -H "Content-Type: application/json" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "x-user-id: $USER_ID" \
    -d '{
      "title": "Découvrir Budapest et ses bains thermaux",
      "payload": {
        "text": "Découvrez les bains thermaux emblématiques de Budapest.",
        "cta": "Préparer mon voyage"
      }
    }' || true
)"

echo "Code HTTP : $UPDATE_CODE"
cat "$TMP_UPDATE"
echo

if [ "$UPDATE_CODE" != "200" ]; then
  echo "❌ Échec de modification."
  exit 1
fi

echo
echo "4. Vérification des versions..."

VERSIONS_CODE="$(
  curl -sS \
    -o "$TMP_VERSIONS" \
    -w "%{http_code}" \
    -H "x-tenant-id: $TENANT_ID" \
    "$BASE_URL/$ASSET_ID/versions" || true
)"

echo "Code HTTP : $VERSIONS_CODE"
cat "$TMP_VERSIONS"
echo

if [ "$VERSIONS_CODE" != "200" ]; then
  echo "❌ Impossible de lire les versions."
  exit 1
fi

VERSION_COUNT="$(
  node - "$TMP_VERSIONS" <<'NODE'
const fs = require("fs");
const file = process.argv[2];

try {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  process.stdout.write(String(Array.isArray(data) ? data.length : 0));
} catch {
  process.stdout.write("0");
}
NODE
)"

if [ "$VERSION_COUNT" -lt 2 ]; then
  echo "❌ Le versionnement automatique ne fonctionne pas."
  echo "Versions trouvées : $VERSION_COUNT"
  exit 1
fi

echo "✅ Versions trouvées : $VERSION_COUNT"

echo
echo "5. Publication..."

PUBLISH_CODE="$(
  curl -sS \
    -o "$TMP_PUBLISH" \
    -w "%{http_code}" \
    -X POST "$BASE_URL/$ASSET_ID/publish" \
    -H "x-tenant-id: $TENANT_ID" \
    -H "x-user-id: $USER_ID" || true
)"

echo "Code HTTP : $PUBLISH_CODE"
cat "$TMP_PUBLISH"
echo

if [ "$PUBLISH_CODE" != "200" ]; then
  echo "❌ Échec de publication."
  exit 1
fi

echo
echo "============================================================"
echo "✅ ASSET ENGINE VALIDÉ"
echo "============================================================"
echo "Asset testé : $ASSET_ID"
