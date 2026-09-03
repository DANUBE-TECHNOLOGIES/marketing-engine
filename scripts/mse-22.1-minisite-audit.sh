#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.."
  pwd
)"

cd "${ROOT_DIR}"

STAMP="${1:-$(date +%Y%m%d-%H%M%S)}"

REPORT_DIR="reports/mse-22.1"
REPORT_FILE="${REPORT_DIR}/mse-22.1-audit-${STAMP}.md"
JSON_FILE="${REPORT_DIR}/mse-22.1-audit-${STAMP}.json"
TEMP_DIR="/tmp/mse-22.1-${STAMP}"

mkdir -p "${REPORT_DIR}"
mkdir -p "${TEMP_DIR}"

BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://127.0.0.1:3000}"

PASS_COUNT=0
WARN_COUNT=0
FAIL_COUNT=0

declare -a JSON_RESULTS=()

cleanup() {
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT

escape_json() {
  node -e '
    const value = process.argv[1] ?? "";
    process.stdout.write(JSON.stringify(value));
  ' "$1"
}

record_result() {
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

  JSON_RESULTS+=(
    "$(
      printf \
        '{"level":%s,"category":%s,"check":%s,"detail":%s}' \
        "$(escape_json "${level}")" \
        "$(escape_json "${category}")" \
        "$(escape_json "${check}")" \
        "$(escape_json "${detail}")"
    )"
  )

  printf '| %s | %s | %s | %s |\n' \
    "${level}" \
    "${category}" \
    "${check}" \
    "${detail}" \
    >> "${REPORT_FILE}"
}

run_capture() {
  local output_file="$1"
  shift

  if "$@" >"${output_file}" 2>&1; then
    return 0
  fi

  return 1
}

http_check() {
  local category="$1"
  local label="$2"
  local url="$3"
  local expected_pattern="${4:-^(200|301|302|307|308)$}"

  local headers_file="${TEMP_DIR}/headers-$(date +%s%N).txt"
  local body_file="${TEMP_DIR}/body-$(date +%s%N).txt"

  local status

  status="$(
    curl \
      --silent \
      --show-error \
      --location \
      --max-time 15 \
      --output "${body_file}" \
      --dump-header "${headers_file}" \
      --write-out '%{http_code}' \
      "${url}" \
      2>"${TEMP_DIR}/curl-error.txt" \
      || true
  )"

  if [[ "${status}" =~ ${expected_pattern} ]]; then
    record_result \
      "PASS" \
      "${category}" \
      "${label}" \
      "HTTP ${status} — ${url}"
  elif [ "${status}" = "000" ]; then
    local error_message
    error_message="$(
      tr '\n' ' ' \
        < "${TEMP_DIR}/curl-error.txt" \
        | sed 's/[[:space:]]\+/ /g' \
        | cut -c1-220
    )"

    record_result \
      "FAIL" \
      "${category}" \
      "${label}" \
      "Service inaccessible — ${url} — ${error_message}"
  else
    record_result \
      "FAIL" \
      "${category}" \
      "${label}" \
      "HTTP ${status} — ${url}"
  fi
}

file_check() {
  local category="$1"
  local label="$2"
  local file="$3"

  if [ -f "${file}" ]; then
    record_result \
      "PASS" \
      "${category}" \
      "${label}" \
      "${file}"
  else
    record_result \
      "FAIL" \
      "${category}" \
      "${label}" \
      "Fichier absent : ${file}"
  fi
}

directory_check() {
  local category="$1"
  local label="$2"
  local directory="$3"

  if [ -d "${directory}" ]; then
    record_result \
      "PASS" \
      "${category}" \
      "${label}" \
      "${directory}"
  else
    record_result \
      "FAIL" \
      "${category}" \
      "${label}" \
      "Répertoire absent : ${directory}"
  fi
}

contains_check() {
  local category="$1"
  local label="$2"
  local file="$3"
  local pattern="$4"

  if [ ! -f "${file}" ]; then
    record_result \
      "FAIL" \
      "${category}" \
      "${label}" \
      "Fichier absent : ${file}"

    return
  fi

  if grep -Eq "${pattern}" "${file}"; then
    record_result \
      "PASS" \
      "${category}" \
      "${label}" \
      "${file}"
  else
    record_result \
      "WARN" \
      "${category}" \
      "${label}" \
      "Motif absent dans ${file} : ${pattern}"
  fi
}

count_backups() {
  find backend frontend \
    -type f \
    \( \
      -name '*.bak-*' \
      -o -name '*.backup-*' \
      -o -name '*.bak' \
    \) \
    2>/dev/null \
    | wc -l \
    | tr -d ' '
}

write_header() {
  cat > "${REPORT_FILE}" <<EOF
# Audit de certification Mini Site Engine

- Patch : \`${PATCH_ID:-MSE-22.1A}\`
- Date : $(date --iso-8601=seconds)
- Répertoire : \`${ROOT_DIR}\`
- Backend : \`${BACKEND_URL}\`
- Frontend : \`${FRONTEND_URL}\`

## Résultats

| Niveau | Catégorie | Contrôle | Détail |
|---|---|---|---|
EOF
}

audit_structure() {
  directory_check \
    "Structure" \
    "Module Mini Site backend" \
    "backend/src/modules/mini-site"

  directory_check \
    "Structure" \
    "Module Page Builder backend" \
    "backend/src/modules/page-builder"

  directory_check \
    "Structure" \
    "Module persistance Page Builder" \
    "backend/src/modules/page-builder-persistence"

  directory_check \
    "Structure" \
    "Visual Builder V3" \
    "frontend/components/page-builder-v3"

  directory_check \
    "Structure" \
    "Bibliothèque Builder V3" \
    "frontend/lib/page-builder-v3"

  file_check \
    "Structure" \
    "Registre des modules backend" \
    "backend/src/modules/register-modules.js"

  file_check \
    "Structure" \
    "Schéma Prisma" \
    "backend/prisma/schema.prisma"

  file_check \
    "Structure" \
    "Page Visual Builder V3" \
    "frontend/app/website-builder/v3/[siteId]/page.js"

  file_check \
    "Structure" \
    "Composant Visual Builder V3" \
    "frontend/components/page-builder-v3/VisualBuilderV3.js"

  file_check \
    "Structure" \
    "Styles Visual Builder V3" \
    "frontend/components/page-builder-v3/VisualBuilderV3.module.css"

  file_check \
    "Structure" \
    "Rendu public du site" \
    "frontend/app/sites/[siteSlug]/layout.js"
}

audit_prisma() {
  local output="${TEMP_DIR}/prisma-validate.txt"

  if run_capture \
    "${output}" \
    bash -lc '
      cd backend
      npx prisma validate
    '
  then
    record_result \
      "PASS" \
      "Prisma" \
      "Validation du schéma" \
      "npx prisma validate"
  else
    record_result \
      "FAIL" \
      "Prisma" \
      "Validation du schéma" \
      "$(
        tail -30 "${output}" \
          | tr '\n' ' ' \
          | sed 's/[[:space:]]\+/ /g' \
          | cut -c1-420
      )"
  fi

  contains_check \
    "Prisma" \
    "Modèle AgencySite" \
    "backend/prisma/schema.prisma" \
    '^model[[:space:]]+AgencySite[[:space:]]+\{'

  contains_check \
    "Prisma" \
    "Modèle AgencySitePage" \
    "backend/prisma/schema.prisma" \
    '^model[[:space:]]+AgencySitePage[[:space:]]+\{'

  contains_check \
    "Prisma" \
    "Modèle PageBlock" \
    "backend/prisma/schema.prisma" \
    '^model[[:space:]]+PageBlock[[:space:]]+\{'

  contains_check \
    "Prisma" \
    "Historique des pages" \
    "backend/prisma/schema.prisma" \
    '^model[[:space:]]+AgencySitePageVersion[[:space:]]+\{'
}

audit_backend_syntax() {
  local output="${TEMP_DIR}/backend-syntax.txt"

  if run_capture \
    "${output}" \
    bash -lc '
      set -Eeuo pipefail

      while IFS= read -r file; do
        node --check "$file"
      done < <(
        find backend/src/modules \
          -type f \
          -name "*.js" \
          \( \
            -path "*/mini-site/*" \
            -o -path "*/page-builder/*" \
            -o -path "*/page-builder-persistence/*" \
            -o -path "*/agency-site/*" \
            -o -path "*/editorial-ai/*" \
          \) \
          | sort
      )
    '
  then
    record_result \
      "PASS" \
      "Backend" \
      "Syntaxe des modules Mini Site" \
      "Tous les fichiers JavaScript ciblés sont valides"
  else
    record_result \
      "FAIL" \
      "Backend" \
      "Syntaxe des modules Mini Site" \
      "$(
        tail -40 "${output}" \
          | tr '\n' ' ' \
          | sed 's/[[:space:]]\+/ /g' \
          | cut -c1-520
      )"
  fi
}

audit_backend_tests() {
  local output="${TEMP_DIR}/backend-tests.txt"

  if run_capture \
    "${output}" \
    npm --prefix backend test
  then
    local summary
    summary="$(
      grep -E \
        'ℹ tests|ℹ pass|ℹ fail|# tests|# pass|# fail' \
        "${output}" \
        | tail -6 \
        | tr '\n' ' ' \
        | sed 's/[[:space:]]\+/ /g'
    )"

    record_result \
      "PASS" \
      "Backend" \
      "Suite complète des tests" \
      "${summary:-Tests backend réussis}"
  else
    record_result \
      "FAIL" \
      "Backend" \
      "Suite complète des tests" \
      "$(
        tail -50 "${output}" \
          | tr '\n' ' ' \
          | sed 's/[[:space:]]\+/ /g' \
          | cut -c1-620
      )"
  fi
}

audit_frontend_tests() {
  local output="${TEMP_DIR}/frontend-tests.txt"

  mapfile -t tests < <(
    find frontend/test \
      -maxdepth 1 \
      -type f \
      \( \
        -name 'page-builder-v3*.test.mjs' \
        -o -name 'mini-site*.test.mjs' \
      \) \
      | sort
  )

  if [ "${#tests[@]}" -eq 0 ]; then
    record_result \
      "WARN" \
      "Frontend" \
      "Tests Mini Site / Builder V3" \
      "Aucun test ciblé trouvé dans frontend/test"

    return
  fi

  if run_capture \
    "${output}" \
    node --test "${tests[@]}"
  then
    local summary
    summary="$(
      grep -E \
        'ℹ tests|ℹ pass|ℹ fail|# tests|# pass|# fail' \
        "${output}" \
        | tail -6 \
        | tr '\n' ' ' \
        | sed 's/[[:space:]]\+/ /g'
    )"

    record_result \
      "PASS" \
      "Frontend" \
      "Tests Mini Site / Builder V3" \
      "${summary:-Tests frontend réussis}"
  else
    record_result \
      "FAIL" \
      "Frontend" \
      "Tests Mini Site / Builder V3" \
      "$(
        tail -50 "${output}" \
          | tr '\n' ' ' \
          | sed 's/[[:space:]]\+/ /g' \
          | cut -c1-620
      )"
  fi
}

audit_frontend_build() {
  local output="${TEMP_DIR}/frontend-build.txt"

  if docker compose ps frontend \
    >/dev/null 2>&1
  then
    if run_capture \
      "${output}" \
      docker compose exec -T frontend sh -lc '
        cd /app 2>/dev/null \
          || cd /workspace 2>/dev/null \
          || cd /usr/src/app 2>/dev/null \
          || exit 1

        npm run build
      '
    then
      record_result \
        "PASS" \
        "Frontend" \
        "Build de production" \
        "npm run build dans le conteneur frontend"
    else
      record_result \
        "FAIL" \
        "Frontend" \
        "Build de production" \
        "$(
          tail -70 "${output}" \
            | tr '\n' ' ' \
            | sed 's/[[:space:]]\+/ /g' \
            | cut -c1-760
        )"
    fi
  else
    record_result \
      "WARN" \
      "Frontend" \
      "Build de production" \
      "Conteneur frontend non détecté"
  fi
}

audit_docker() {
  local output="${TEMP_DIR}/docker-ps.txt"

  if run_capture \
    "${output}" \
    docker compose ps
  then
    record_result \
      "PASS" \
      "Docker" \
      "Lecture de la stack" \
      "docker compose ps"

    local unhealthy
    unhealthy="$(
      grep -Ei \
        'unhealthy|exited|dead|restarting' \
        "${output}" \
        || true
    )"

    if [ -n "${unhealthy}" ]; then
      record_result \
        "FAIL" \
        "Docker" \
        "État des conteneurs" \
        "$(
          echo "${unhealthy}" \
            | tr '\n' ' ' \
            | sed 's/[[:space:]]\+/ /g' \
            | cut -c1-420
        )"
    else
      record_result \
        "PASS" \
        "Docker" \
        "État des conteneurs" \
        "Aucun conteneur unhealthy, exited ou restarting"
    fi
  else
    record_result \
      "FAIL" \
      "Docker" \
      "Lecture de la stack" \
      "$(
        tail -30 "${output}" \
          | tr '\n' ' ' \
          | sed 's/[[:space:]]\+/ /g'
      )"
  fi
}

audit_http_services() {
  local frontend_root_status

  frontend_root_status="$(
    curl \
      --silent \
      --output /dev/null \
      --max-time 12 \
      --write-out '%{http_code}' \
      "${FRONTEND_URL}/" \
      || true
  )"

  case "${frontend_root_status}" in
    200|301|302|307|308)
      record_result \
        "PASS" \
        "HTTP" \
        "Frontend racine" \
        "HTTP ${frontend_root_status} — frontend accessible"
      ;;

    401|403)
      record_result \
        "PASS" \
        "HTTP" \
        "Frontend racine protégée" \
        "HTTP ${frontend_root_status} — authentification active et serveur accessible"
      ;;

    000)
      record_result \
        "FAIL" \
        "HTTP" \
        "Frontend racine" \
        "Frontend inaccessible — ${FRONTEND_URL}/"
      ;;

    *)
      record_result \
        "FAIL" \
        "HTTP" \
        "Frontend racine" \
        "HTTP ${frontend_root_status} — ${FRONTEND_URL}/"
      ;;
  esac

  http_check \
    "HTTP" \
    "Backend Editorial AI Health" \
    "${BACKEND_URL}/editorial-ai/health"

  local backend_candidates=(
    "${BACKEND_URL}/health"
    "${BACKEND_URL}/api/health"
    "${BACKEND_URL}/mini-site/health"
    "${BACKEND_URL}/page-builder/health"
  )

  for url in "${backend_candidates[@]}"; do
    local status

    status="$(
      curl \
        --silent \
        --output /dev/null \
        --max-time 8 \
        --write-out '%{http_code}' \
        "${url}" \
        || true
    )"

    if [[ "${status}" =~ ^(200|204)$ ]]; then
      record_result \
        "PASS" \
        "HTTP" \
        "Endpoint de santé détecté" \
        "HTTP ${status} — ${url}"

      break
    fi
  done
}

audit_routes() {
  local route_report="${TEMP_DIR}/routes.txt"

  {
    echo "### Backend routes"
    grep -RInE \
      'router\.(get|post|put|patch|delete)|app\.use' \
      backend/src/modules/mini-site \
      backend/src/modules/page-builder \
      backend/src/modules/page-builder-persistence \
      backend/src/modules/agency-site \
      2>/dev/null \
      || true

    echo
    echo "### Frontend routes"

    find frontend/app \
      -type f \
      \( \
        -name 'page.js' \
        -o -name 'route.js' \
        -o -name 'layout.js' \
      \) \
      | grep -E \
        'website-builder|sites|mini-site' \
      | sort \
      || true
  } > "${route_report}"

  local backend_route_count
  backend_route_count="$(
    grep -Ec \
      'router\.(get|post|put|patch|delete)|app\.use' \
      "${route_report}" \
      || true
  )"

  local frontend_route_count
  frontend_route_count="$(
    grep -Ec \
      '^frontend/app/' \
      "${route_report}" \
      || true
  )"

  if [ "${backend_route_count}" -gt 0 ]; then
    record_result \
      "PASS" \
      "Routes" \
      "Routes backend détectées" \
      "${backend_route_count} déclaration(s)"
  else
    record_result \
      "FAIL" \
      "Routes" \
      "Routes backend détectées" \
      "Aucune route Mini Site/Page Builder trouvée"
  fi

  if [ "${frontend_route_count}" -gt 0 ]; then
    record_result \
      "PASS" \
      "Routes" \
      "Routes frontend détectées" \
      "${frontend_route_count} fichier(s)"
  else
    record_result \
      "FAIL" \
      "Routes" \
      "Routes frontend détectées" \
      "Aucune route publique ou Builder trouvée"
  fi

  cat >> "${REPORT_FILE}" <<EOF

## Inventaire des routes

\`\`\`text
$(cat "${route_report}")
\`\`\`
EOF
}

audit_public_site_code() {
  local public_layout="frontend/app/sites/[siteSlug]/layout.js"
  local renderer_registry="frontend/components/public-site/renderers/registry.js"
  local public_route_dir="frontend/app/sites/[siteSlug]"

  contains_check \
    "Rendu public" \
    "Layout public dynamique" \
    "${public_layout}" \
    'siteSlug'

  contains_check \
    "Rendu public" \
    "Header public" \
    "${public_layout}" \
    'PublicSiteHeader'

  contains_check \
    "Rendu public" \
    "Footer public" \
    "${public_layout}" \
    'PublicSiteFooter'

  if [ ! -f "${renderer_registry}" ]; then
    record_result \
      "FAIL" \
      "Rendu public" \
      "Registre des renderers" \
      "Fichier absent : ${renderer_registry}"
  else
    local renderer_export_count
    local renderer_type_count

    renderer_export_count="$(
      grep -Ec \
        'export|module\.exports|default' \
        "${renderer_registry}" \
        || true
    )"

    renderer_type_count="$(
      grep -Eo \
        "['\"][a-zA-Z0-9_-]+['\"][[:space:]]*:" \
        "${renderer_registry}" \
        | sort -u \
        | wc -l \
        | tr -d ' '
    )"

    if [ "${renderer_export_count}" -gt 0 ]; then
      record_result \
        "PASS" \
        "Rendu public" \
        "Registre des renderers" \
        "Registre exporté — ${renderer_type_count} type(s) détecté(s)"
    else
      record_result \
        "FAIL" \
        "Rendu public" \
        "Registre des renderers" \
        "Le fichier existe mais aucun export n’est détecté"
    fi
  fi

  if grep -RqsE \
    'generateMetadata|export[[:space:]]+const[[:space:]]+metadata|metadata[[:space:]]*=' \
    "${public_route_dir}"
  then
    local metadata_files

    metadata_files="$(
      grep -RIlE \
        'generateMetadata|export[[:space:]]+const[[:space:]]+metadata|metadata[[:space:]]*=' \
        "${public_route_dir}" \
        | tr '\n' ' ' \
        | sed 's/[[:space:]]\+/ /g'
    )"

    record_result \
      "PASS" \
      "SEO" \
      "Génération des métadonnées" \
      "Métadonnées détectées dans : ${metadata_files}"
  else
    record_result \
      "WARN" \
      "SEO" \
      "Génération des métadonnées" \
      "Aucune déclaration metadata ou generateMetadata dans ${public_route_dir}"
  fi

  local sitemap_files
  sitemap_files="$(
    find frontend/app \
      -type f \
      \( \
        -name 'sitemap.js' \
        -o -name 'sitemap.xml.js' \
        -o -path '*/sitemap/route.js' \
      \) \
      | wc -l \
      | tr -d ' '
  )"

  if [ "${sitemap_files}" -gt 0 ]; then
    record_result \
      "PASS" \
      "SEO" \
      "Sitemap frontend" \
      "${sitemap_files} fichier(s)"
  else
    record_result \
      "WARN" \
      "SEO" \
      "Sitemap frontend" \
      "Aucun fichier sitemap détecté"
  fi

  local robots_files
  robots_files="$(
    find frontend/app \
      -type f \
      \( \
        -name 'robots.js' \
        -o -name 'robots.txt.js' \
        -o -path '*/robots/route.js' \
      \) \
      | wc -l \
      | tr -d ' '
  )"

  if [ "${robots_files}" -gt 0 ]; then
    record_result \
      "PASS" \
      "SEO" \
      "Robots frontend" \
      "${robots_files} fichier(s)"
  else
    record_result \
      "WARN" \
      "SEO" \
      "Robots frontend" \
      "Aucun fichier robots détecté"
  fi
}

audit_builder_v3() {
  local editor="frontend/components/page-builder-v3/VisualBuilderV3.js"

  contains_check \
    "Builder V3" \
    "Drag and drop" \
    "${editor}" \
    'DraggableCanvas'

  contains_check \
    "Builder V3" \
    "Undo / Redo" \
    "${editor}" \
    'undo|redo'

  contains_check \
    "Builder V3" \
    "Sauvegarde serveur" \
    "${editor}" \
    'handleSave'

  contains_check \
    "Builder V3" \
    "Prévisualisation" \
    "${editor}" \
    'PagePreviewModal'

  contains_check \
    "Builder V3" \
    "Publication" \
    "${editor}" \
    'handlePublish'

  contains_check \
    "Builder V3" \
    "Historique" \
    "${editor}" \
    'VersionHistoryModal'

  contains_check \
    "Builder V3" \
    "Assistant éditorial" \
    "${editor}" \
    'EditorialAssistantModal'

  contains_check \
    "Builder V3" \
    "Réglages SEO" \
    "${editor}" \
    'PageSettingsModal'

  contains_check \
    "Builder V3" \
    "Inspecteur avancé" \
    "${editor}" \
    'BlockInspectorV3'

  contains_check \
    "Builder V3" \
    "Édition inline" \
    "${editor}" \
    'InlineEditable'
}

audit_code_quality() {
  local todo_count
  todo_count="$(
    grep -RInE \
      'TODO|FIXME|HACK|XXX' \
      backend/src/modules/mini-site \
      backend/src/modules/page-builder \
      backend/src/modules/page-builder-persistence \
      frontend/components/page-builder-v3 \
      frontend/lib/page-builder-v3 \
      2>/dev/null \
      | wc -l \
      | tr -d ' '
  )"

  if [ "${todo_count}" -eq 0 ]; then
    record_result \
      "PASS" \
      "Qualité" \
      "TODO / FIXME" \
      "Aucun marqueur détecté dans le périmètre Mini Site"
  else
    record_result \
      "WARN" \
      "Qualité" \
      "TODO / FIXME" \
      "${todo_count} occurrence(s)"
  fi

  local backup_count
  backup_count="$(count_backups)"

  if [ "${backup_count}" -eq 0 ]; then
    record_result \
      "PASS" \
      "Qualité" \
      "Fichiers de sauvegarde dans le code" \
      "Aucun fichier .bak ou .backup"
  else
    record_result \
      "WARN" \
      "Qualité" \
      "Fichiers de sauvegarde dans le code" \
      "${backup_count} fichier(s) à nettoyer avant certification"
  fi

  local diff_output="${TEMP_DIR}/git-diff-check.txt"

  if run_capture \
    "${diff_output}" \
    git diff --check
  then
    record_result \
      "PASS" \
      "Git" \
      "git diff --check" \
      "Aucune erreur d’espace ou de conflit"
  else
    record_result \
      "FAIL" \
      "Git" \
      "git diff --check" \
      "$(
        tail -40 "${diff_output}" \
          | tr '\n' ' ' \
          | sed 's/[[:space:]]\+/ /g' \
          | cut -c1-520
      )"
  fi

  local status_count
  status_count="$(
    git status --short \
      | wc -l \
      | tr -d ' '
  )"

  if [ "${status_count}" -eq 0 ]; then
    record_result \
      "PASS" \
      "Git" \
      "Arbre de travail" \
      "Propre"
  else
    record_result \
      "WARN" \
      "Git" \
      "Arbre de travail" \
      "${status_count} fichier(s) modifié(s) ou non suivi(s)"
  fi
}

write_summary() {
  local total
  total=$((PASS_COUNT + WARN_COUNT + FAIL_COUNT))

  cat >> "${REPORT_FILE}" <<EOF

## Synthèse

- Contrôles : **${total}**
- Réussis : **${PASS_COUNT}**
- Avertissements : **${WARN_COUNT}**
- Échecs : **${FAIL_COUNT}**

EOF

  if [ "${FAIL_COUNT}" -eq 0 ] && [ "${WARN_COUNT}" -eq 0 ]; then
    cat >> "${REPORT_FILE}" <<'EOF'
### Verdict

**CERTIFIABLE**

Le Mini Site Engine satisfait tous les contrôles automatisés de cette étape.
EOF
  elif [ "${FAIL_COUNT}" -eq 0 ]; then
    cat >> "${REPORT_FILE}" <<'EOF'
### Verdict

**CERTIFIABLE APRÈS NETTOYAGE**

Aucun défaut bloquant n’a été détecté. Les avertissements doivent être traités avant le gel de la version 1.0.
EOF
  else
    cat >> "${REPORT_FILE}" <<'EOF'
### Verdict

**NON CERTIFIÉ**

Un ou plusieurs défauts bloquants subsistent. Les échecs doivent être corrigés avant la recette fonctionnelle finale.
EOF
  fi

  local joined_results
  joined_results="$(
    IFS=,
    echo "${JSON_RESULTS[*]}"
  )"

  cat > "${JSON_FILE}" <<EOF
{
  "patch": "MSE-22.1A-MINISITE-CERTIFICATION-AUDIT",
  "generatedAt": "$(date --iso-8601=seconds)",
  "root": $(escape_json "${ROOT_DIR}"),
  "backendUrl": $(escape_json "${BACKEND_URL}"),
  "frontendUrl": $(escape_json "${FRONTEND_URL}"),
  "summary": {
    "total": ${total},
    "pass": ${PASS_COUNT},
    "warning": ${WARN_COUNT},
    "fail": ${FAIL_COUNT}
  },
  "results": [
    ${joined_results}
  ]
}
EOF
}

main() {
  write_header

  audit_structure
  audit_prisma
  audit_backend_syntax
  audit_docker
  audit_routes
  audit_public_site_code
  audit_builder_v3
  audit_backend_tests
  audit_frontend_tests
  audit_frontend_build
  audit_http_services
  audit_code_quality
  write_summary

  echo
  echo "============================================================"
  echo " AUDIT MINI SITE ENGINE TERMINÉ"
  echo "============================================================"
  echo " Réussis       : ${PASS_COUNT}"
  echo " Avertissements: ${WARN_COUNT}"
  echo " Échecs        : ${FAIL_COUNT}"
  echo
  echo " Rapport Markdown : ${REPORT_FILE}"
  echo " Rapport JSON     : ${JSON_FILE}"
  echo "============================================================"

  if [ "${FAIL_COUNT}" -gt 0 ]; then
    exit 2
  fi
}

main "$@"
