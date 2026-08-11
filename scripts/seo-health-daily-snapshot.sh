#!/usr/bin/env bash
set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
TENANT_SLUG="${TENANT_SLUG:-mondescale}"
ENDPOINT="${API_BASE_URL%/}/api/agency-launch/network/seo-health/snapshot"

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

http_code="$(curl --silent --show-error --output "$response_file" --write-out '%{http_code}' \
  --request POST \
  --header 'Accept: application/json' \
  --header "x-tenant-slug: ${TENANT_SLUG}" \
  "$ENDPOINT")"

if [[ "$http_code" != "200" && "$http_code" != "201" ]]; then
  echo "SEO health snapshot failed: HTTP ${http_code}" >&2
  cat "$response_file" >&2
  exit 1
fi

cat "$response_file"
echo
