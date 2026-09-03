#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"

test_url() {
  local path="$1"
  local expected="${2:-200}"
  local code

  code="$(curl -sS -o /dev/null -w "%{http_code}" "${BASE_URL}${path}")"

  printf "%s %s\n" "$code" "$path"

  if [ "$code" != "$expected" ]; then
    echo "Échec : ${path} retourne ${code}, attendu ${expected}" >&2
    return 1
  fi
}

echo "========== TEST ROUTES SEO =========="

test_url "/robots.txt"
test_url "/sitemap.xml"

echo
echo "========== ROBOTS =========="

curl -fsS "${BASE_URL}/robots.txt"

echo
echo
echo "========== SITEMAP =========="

curl -fsS "${BASE_URL}/sitemap.xml" | head -80

echo
echo
echo "========== CONTRÔLES CONTENU =========="

curl -fsS "${BASE_URL}/robots.txt" |
  grep -q "Sitemap:"

curl -fsS "${BASE_URL}/sitemap.xml" |
  grep -q "<urlset"

echo "SEO technique : OK"
