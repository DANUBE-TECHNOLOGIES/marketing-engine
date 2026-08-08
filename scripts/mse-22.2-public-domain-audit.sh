#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.."
  pwd
)"

cd "${ROOT_DIR}"

STAMP="${1:-$(date +%Y%m%d-%H%M%S)}"

PUBLIC_HOST="${PUBLIC_HOST:-agences.mondescale.com}"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-https://${PUBLIC_HOST}}"

REPORT_DIR="reports/mse-22.2"
REPORT_FILE="${REPORT_DIR}/mse-22.2-public-domain-${STAMP}.md"
JSON_FILE="${REPORT_DIR}/mse-22.2-public-domain-${STAMP}.json"
TEMP_DIR="/tmp/mse-22.2-${STAMP}"

mkdir -p "${REPORT_DIR}"
mkdir -p "${TEMP_DIR}"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

declare -a RESULTS=()

cleanup() {
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT

json_escape() {
  node -e '
    process.stdout.write(
      JSON.stringify(
        process.argv[1] || ""
      )
    );
  ' "$1"
}

record() {
  local level="$1"
  local category="$2"
  local check="$3"
  local detail="$4"

  case "${level}" in
    PASS)
      PASS_COUNT=$((PASS_COUNT + 1))
      ;;
    WARN)
      WARN_COUNT=$((WARN_COUNT + 1))
      ;;
    FAIL)
      FAIL_COUNT=$((FAIL_COUNT + 1))
      ;;
  esac

  RESULTS+=(
    "$(
      printf \
        '{"level":%s,"category":%s,"check":%s,"detail":%s}' \
        "$(json_escape "${level}")" \
        "$(json_escape "${category}")" \
        "$(json_escape "${check}")" \
        "$(json_escape "${detail}")"
    )"
  )

  printf '| %s | %s | %s | %s |\n' \
    "${level}" \
    "${category}" \
    "${check}" \
    "${detail}" \
    >> "${REPORT_FILE}"
}

http_status() {
  local url="$1"

  curl \
    --silent \
    --show-error \
    --output /dev/null \
    --max-time 20 \
    --write-out '%{http_code}' \
    "${url}" \
    2>/dev/null \
    || true
}

fetch_page() {
  local url="$1"
  local output="$2"
  local headers="$3"

  curl \
    --silent \
    --show-error \
    --location \
    --max-time 25 \
    --dump-header "${headers}" \
    --output "${output}" \
    "${url}"
}

write_header() {
  cat > "${REPORT_FILE}" <<EOF
# Certification du domaine public Mini Site Engine

- Date : $(date --iso-8601=seconds)
- Domaine : \`${PUBLIC_HOST}\`
- Origine publique : \`${PUBLIC_ORIGIN}\`
- Serveur : \`$(hostname)\`
- Projet : \`${ROOT_DIR}\`

## Résultats

| Niveau | Catégorie | Contrôle | Détail |
|---|---|---|---|
EOF
}

audit_dns() {
  local addresses

  addresses="$(
    getent ahosts "${PUBLIC_HOST}" \
      2>/dev/null \
      | awk '{print $1}' \
      | sort -u \
      | tr '\n' ' ' \
      | sed 's/[[:space:]]\+$//'
  )"

  if [ -n "${addresses}" ]; then
    record \
      "PASS" \
      "DNS" \
      "Résolution du sous-domaine" \
      "${PUBLIC_HOST} → ${addresses}"
  else
    record \
      "FAIL" \
      "DNS" \
      "Résolution du sous-domaine" \
      "Aucune adresse IP résolue"
  fi

  if command -v dig >/dev/null 2>&1; then
    local cname

    cname="$(
      dig +short CNAME "${PUBLIC_HOST}" \
        | tr '\n' ' ' \
        | sed 's/[[:space:]]\+$//'
    )"

    if [ -n "${cname}" ]; then
      record \
        "PASS" \
        "DNS" \
        "CNAME" \
        "${cname}"
    else
      record \
        "PASS" \
        "DNS" \
        "Type d’enregistrement" \
        "A/AAAA direct ou CNAME non nécessaire"
    fi
  else
    record \
      "WARN" \
      "DNS" \
      "Inspection détaillée" \
      "La commande dig n’est pas installée"
  fi
}

audit_tls() {
  local tls_output="${TEMP_DIR}/tls.txt"

  if timeout 20 \
    openssl s_client \
      -connect "${PUBLIC_HOST}:443" \
      -servername "${PUBLIC_HOST}" \
      -showcerts \
      </dev/null \
      >"${tls_output}" 2>&1
  then
    if grep -q \
      'Verify return code: 0 (ok)' \
      "${tls_output}"
    then
      record \
        "PASS" \
        "TLS" \
        "Validation du certificat" \
        "Certificat reconnu par OpenSSL"
    else
      record \
        "FAIL" \
        "TLS" \
        "Validation du certificat" \
        "$(
          grep \
            'Verify return code' \
            "${tls_output}" \
            | tail -1 \
            | tr '\n' ' '
        )"
    fi

    local subject
    local issuer
    local dates

    subject="$(
      openssl x509 \
        -noout \
        -subject \
        -in <(
          sed -n \
            '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' \
            "${tls_output}" \
            | sed -n \
              '1,/END CERTIFICATE/p'
        ) \
        2>/dev/null \
        || true
    )"

    issuer="$(
      openssl x509 \
        -noout \
        -issuer \
        -in <(
          sed -n \
            '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' \
            "${tls_output}" \
            | sed -n \
              '1,/END CERTIFICATE/p'
        ) \
        2>/dev/null \
        || true
    )"

    dates="$(
      openssl x509 \
        -noout \
        -dates \
        -in <(
          sed -n \
            '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' \
            "${tls_output}" \
            | sed -n \
              '1,/END CERTIFICATE/p'
        ) \
        2>/dev/null \
        | tr '\n' ' ' \
        || true
    )"

    record \
      "PASS" \
      "TLS" \
      "Identité du certificat" \
      "${
        subject:-Sujet non extrait
      } — ${
        issuer:-Émetteur non extrait
      } — ${
        dates:-Dates non extraites
      }"
  else
    record \
      "FAIL" \
      "TLS" \
      "Connexion HTTPS" \
      "Impossible d’établir une connexion TLS sur le port 443"
  fi
}

audit_redirects() {
  local http_url="http://${PUBLIC_HOST}/"
  local headers="${TEMP_DIR}/http-redirect.txt"

  curl \
    --silent \
    --show-error \
    --max-time 20 \
    --output /dev/null \
    --dump-header "${headers}" \
    "${http_url}" \
    || true

  local status
  local location

  status="$(
    awk \
      '/^HTTP\// {code=$2} END {print code}' \
      "${headers}"
  )"

  location="$(
    awk '
      BEGIN {
        IGNORECASE=1
      }

      /^location:/ {
        sub(/\r$/, "", $0)
        sub(/^[^:]+:[[:space:]]*/, "", $0)
        value=$0
      }

      END {
        print value
      }
    ' "${headers}"
  )"

  if [[ "${status}" =~ ^(301|302|307|308)$ ]] &&
     [[ "${location}" == https://* ]]
  then
    record \
      "PASS" \
      "HTTP" \
      "Redirection HTTP vers HTTPS" \
      "HTTP ${status} → ${location}"
  elif [ "${status}" = "200" ]; then
    record \
      "WARN" \
      "HTTP" \
      "Redirection HTTP vers HTTPS" \
      "Le site répond en HTTP sans redirection"
  else
    record \
      "FAIL" \
      "HTTP" \
      "Redirection HTTP vers HTTPS" \
      "Statut ${status:-inconnu}, Location ${location:-absente}"
  fi
}

audit_https_root() {
  local body="${TEMP_DIR}/root.html"
  local headers="${TEMP_DIR}/root.headers"

  if fetch_page \
    "${PUBLIC_ORIGIN}/" \
    "${body}" \
    "${headers}"
  then
    local status
    local content_type
    local final_url

    status="$(
      awk \
        '/^HTTP\// {code=$2} END {print code}' \
        "${headers}"
    )"

    content_type="$(
      awk '
        BEGIN {
          IGNORECASE=1
        }

        /^content-type:/ {
          sub(/\r$/, "", $0)
          sub(/^[^:]+:[[:space:]]*/, "", $0)
          value=$0
        }

        END {
          print value
        }
      ' "${headers}"
    )"

    final_url="$(
      curl \
        --silent \
        --location \
        --output /dev/null \
        --max-time 20 \
        --write-out '%{url_effective}' \
        "${PUBLIC_ORIGIN}/"
    )"

    if [[ "${status}" =~ ^(200|401|403)$ ]]; then
      record \
        "PASS" \
        "HTTP" \
        "Réponse HTTPS publique" \
        "HTTP ${status} — ${content_type:-type inconnu} — URL finale ${final_url}"
    else
      record \
        "FAIL" \
        "HTTP" \
        "Réponse HTTPS publique" \
        "HTTP ${status:-inconnu}"
    fi

    if grep -qi \
      '<html' \
      "${body}"
    then
      record \
        "PASS" \
        "HTTP" \
        "Document HTML" \
        "Une page HTML est retournée"
    elif [[ "${status}" =~ ^(401|403)$ ]]; then
      record \
        "WARN" \
        "HTTP" \
        "Document HTML" \
        "La racine est protégée ; recette publique limitée"
    else
      record \
        "FAIL" \
        "HTTP" \
        "Document HTML" \
        "Aucune balise HTML détectée"
    fi
  else
    record \
      "FAIL" \
      "HTTP" \
      "Réponse HTTPS publique" \
      "Échec curl sur ${PUBLIC_ORIGIN}/"
  fi
}

audit_security_headers() {
  local headers="${TEMP_DIR}/security.headers"

  curl \
    --silent \
    --show-error \
    --location \
    --max-time 20 \
    --output /dev/null \
    --dump-header "${headers}" \
    "${PUBLIC_ORIGIN}/" \
    || true

  declare -A checks=(
    ["Strict-Transport-Security"]="HSTS"
    ["X-Content-Type-Options"]="Protection MIME"
    ["Referrer-Policy"]="Politique Referer"
    ["Content-Security-Policy"]="CSP"
    ["X-Frame-Options"]="Protection iframe"
  )

  for header in "${!checks[@]}"; do
    if grep -qi \
      "^${header}:" \
      "${headers}"
    then
      record \
        "PASS" \
        "Sécurité" \
        "${checks[${header}]}" \
        "${header} présent"
    else
      if [ "${header}" = "Content-Security-Policy" ]; then
        record \
          "WARN" \
          "Sécurité" \
          "${checks[${header}]}" \
          "${header} absent"
      else
        record \
          "WARN" \
          "Sécurité" \
          "${checks[${header}]}" \
          "${header} absent"
      fi
    fi
  done
}

discover_public_slugs() {
  node <<'NODE' > "${TEMP_DIR}/slugs.txt"
const fs =
  require("fs");

const path =
  "backend/prisma/schema.prisma";

if (!fs.existsSync(path)) {
  process.exit(0);
}

console.log("");
NODE

  if docker compose ps backend \
    >/dev/null 2>&1
  then
    docker compose exec -T backend sh -lc '
      node - <<'"'"'NODE'"'"'
const { PrismaClient } =
  require("@prisma/client");

const prisma =
  new PrismaClient();

(async () => {
  try {
    const sites =
      await prisma.agencySite.findMany({
        select: {
          slug: true,
          status: true,
          publishedAt: true,
          agency: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

    for (const site of sites) {
      console.log(
        JSON.stringify(site)
      );
    }
  } finally {
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
    ' > "${TEMP_DIR}/site-records.jsonl" 2>/dev/null \
      || true
  fi
}

audit_site_records() {
  discover_public_slugs

  local records="${TEMP_DIR}/site-records.jsonl"

  if [ ! -s "${records}" ]; then
    record \
      "WARN" \
      "Données" \
      "Mini-sites en base" \
      "Impossible de lire les mini-sites via Prisma"

    return
  fi

  local count
  local published

  count="$(
    grep -c \
      '^{' \
      "${records}" \
      || true
  )"

  published="$(
    node - "${records}" <<'NODE'
const fs =
  require("fs");

const file =
  process.argv[2];

const rows =
  fs.readFileSync(
    file,
    "utf8"
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

const published =
  rows.filter(
    (site) =>
      site.status === "published" ||
      Boolean(site.publishedAt)
  );

process.stdout.write(
  String(published.length)
);
NODE
  )"

  if [ "${count}" -gt 0 ]; then
    record \
      "PASS" \
      "Données" \
      "Mini-sites en base" \
      "${count} site(s), ${published} publié(s)"
  else
    record \
      "FAIL" \
      "Données" \
      "Mini-sites en base" \
      "Aucun mini-site trouvé"
  fi
}

audit_public_sites() {
  local records="${TEMP_DIR}/site-records.jsonl"

  if [ ! -s "${records}" ]; then
    return
  fi

  node - "${records}" <<'NODE' > "${TEMP_DIR}/published-slugs.txt"
const fs =
  require("fs");

const file =
  process.argv[2];

const rows =
  fs.readFileSync(
    file,
    "utf8"
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

for (const site of rows) {
  if (
    site.status === "published" ||
    site.publishedAt
  ) {
    console.log(site.slug);
  }
}
NODE

  if [ ! -s "${TEMP_DIR}/published-slugs.txt" ]; then
    record \
      "WARN" \
      "Publication" \
      "Sites publics" \
      "Aucun site avec statut publié"

    return
  fi

  while IFS= read -r slug; do
    [ -n "${slug}" ] || continue

    local url="${PUBLIC_ORIGIN}/sites/${slug}"
    local body="${TEMP_DIR}/site-${slug}.html"
    local headers="${TEMP_DIR}/site-${slug}.headers"
    local status

    status="$(
      curl \
        --silent \
        --show-error \
        --location \
        --max-time 25 \
        --output "${body}" \
        --dump-header "${headers}" \
        --write-out '%{http_code}' \
        "${url}" \
        2>/dev/null \
        || true
    )"

    if [ "${status}" = "200" ]; then
      record \
        "PASS" \
        "Publication" \
        "Mini-site ${slug}" \
        "HTTP 200 — ${url}"
    elif [[ "${status}" =~ ^(401|403)$ ]]; then
      record \
        "FAIL" \
        "Publication" \
        "Mini-site ${slug}" \
        "HTTP ${status} — le site public est protégé par authentification"
    else
      record \
        "FAIL" \
        "Publication" \
        "Mini-site ${slug}" \
        "HTTP ${status} — ${url}"
    fi

    if [ "${status}" = "200" ]; then
      if grep -qi '<title[^>]*>[^<]' "${body}"; then
        record \
          "PASS" \
          "SEO" \
          "Title ${slug}" \
          "Balise title présente"
      else
        record \
          "FAIL" \
          "SEO" \
          "Title ${slug}" \
          "Balise title absente ou vide"
      fi

      if grep -qi \
        '<meta[^>]*name=["'\'']description["'\''][^>]*content=["'\''][^"'\'']' \
        "${body}"
      then
        record \
          "PASS" \
          "SEO" \
          "Meta description ${slug}" \
          "Meta description présente"
      else
        record \
          "WARN" \
          "SEO" \
          "Meta description ${slug}" \
          "Meta description absente ou vide"
      fi

      if grep -qi \
        '<link[^>]*rel=["'\'']canonical["'\'']' \
        "${body}"
      then
        record \
          "PASS" \
          "SEO" \
          "Canonical ${slug}" \
          "Lien canonical présent"
      else
        record \
          "WARN" \
          "SEO" \
          "Canonical ${slug}" \
          "Lien canonical absent"
      fi

      if grep -qi \
        'application/ld+json' \
        "${body}"
      then
        record \
          "PASS" \
          "SEO" \
          "JSON-LD ${slug}" \
          "Données structurées présentes"
      else
        record \
          "WARN" \
          "SEO" \
          "JSON-LD ${slug}" \
          "Données structurées absentes"
      fi
    fi
  done < "${TEMP_DIR}/published-slugs.txt"
}

audit_robots_and_sitemap() {
  local robots_status
  local sitemap_status

  robots_status="$(
    http_status \
      "${PUBLIC_ORIGIN}/robots.txt"
  )"

  sitemap_status="$(
    http_status \
      "${PUBLIC_ORIGIN}/sitemap.xml"
  )"

  if [ "${robots_status}" = "200" ]; then
    record \
      "PASS" \
      "SEO" \
      "robots.txt public" \
      "HTTP 200"
  else
    record \
      "WARN" \
      "SEO" \
      "robots.txt public" \
      "HTTP ${robots_status}"
  fi

  if [ "${sitemap_status}" = "200" ]; then
    record \
      "PASS" \
      "SEO" \
      "sitemap.xml public" \
      "HTTP 200"
  else
    record \
      "WARN" \
      "SEO" \
      "sitemap.xml public" \
      "HTTP ${sitemap_status}"
  fi
}

write_summary() {
  local total
  local verdict
  local joined

  total=$(
    (
      PASS_COUNT +
      WARN_COUNT +
      FAIL_COUNT
    )
  )

  if [ "${FAIL_COUNT}" -gt 0 ]; then
    verdict="NON CERTIFIÉ"
  elif [ "${WARN_COUNT}" -gt 0 ]; then
    verdict="CERTIFIABLE APRÈS CORRECTIONS"
  else
    verdict="CERTIFIÉ"
  fi

  cat >> "${REPORT_FILE}" <<EOF

## Synthèse

- Total : **${total}**
- Réussis : **${PASS_COUNT}**
- Avertissements : **${WARN_COUNT}**
- Échecs : **${FAIL_COUNT}**

## Verdict

**${verdict}**
EOF

  joined="$(
    IFS=,
    echo "${RESULTS[*]}"
  )"

  cat > "${JSON_FILE}" <<EOF
{
  "patch": "MSE-22.2A-PUBLIC-DOMAIN-CERTIFICATION",
  "generatedAt": "$(date --iso-8601=seconds)",
  "publicHost": $(json_escape "${PUBLIC_HOST}"),
  "publicOrigin": $(json_escape "${PUBLIC_ORIGIN}"),
  "summary": {
    "total": ${total},
    "pass": ${PASS_COUNT},
    "warning": ${WARN_COUNT},
    "fail": ${FAIL_COUNT},
    "verdict": $(json_escape "${verdict}")
  },
  "results": [
    ${joined}
  ]
}
EOF

  echo
  echo "============================================================"
  echo " CERTIFICATION DU DOMAINE TERMINÉE"
  echo "============================================================"
  echo " Réussis        : ${PASS_COUNT}"
  echo " Avertissements : ${WARN_COUNT}"
  echo " Échecs         : ${FAIL_COUNT}"
  echo " Verdict        : ${verdict}"
  echo
  echo " Rapport : ${REPORT_FILE}"
  echo " JSON    : ${JSON_FILE}"
  echo "============================================================"

  if [ "${FAIL_COUNT}" -gt 0 ]; then
    return 2
  fi

  return 0
}

main() {
  write_header
  audit_dns
  audit_tls
  audit_redirects
  audit_https_root
  audit_security_headers
  audit_site_records
  audit_public_sites
  audit_robots_and_sitemap
  write_summary
}

main "$@"
