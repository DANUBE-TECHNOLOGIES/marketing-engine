#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(
  cd \
    "$(dirname "${BASH_SOURCE[0]}")" \
    && pwd
)"

# shellcheck source=/dev/null
source "${SCRIPT_DIR}/../framework/mse.sh"

CERT_ID="MSE-00A-PLATFORM-SMOKE"

mse_section \
  "${CERT_ID}"

mse_require_command docker
mse_require_command curl
mse_require_command python3

mse_load_basic_auth || true
mse_auth_status

mse_assert_compose_service backend
mse_assert_compose_service frontend

##############################################################################
# BACKEND
##############################################################################

mse_section \
  "BACKEND"

mse_wait_container \
  backend

mse_wait_http \
  "http://127.0.0.1:4000/health" \
  200 \
  180

mse_collect_logs \
  backend

##############################################################################
# FRONTEND
##############################################################################

mse_section \
  "FRONTEND"

mse_wait_container \
  frontend


mse_wait_next \
  frontend \
  300

mse_wait_http \
  "http://127.0.0.1:3000/brand-studio" \
  200 \
  180

mse_collect_logs \
  frontend

##############################################################################
# TEMPLATE LIBRARY
##############################################################################

mse_section \
  "TEMPLATE LIBRARY"

mse_fetch_json \
  "http://127.0.0.1:3000/api/template-library/resolve?agencyId=6&pageType=HOME&variant=default" \
  "${MSE_REPORT_DIR}/artifacts/template-resolution.json" \
  --header "x-tenant-slug: mondescale"

mse_assert_json_exists \
  "${MSE_REPORT_DIR}/artifacts/template-resolution.json" \
  "source"

mse_assert_json_exists \
  "${MSE_REPORT_DIR}/artifacts/template-resolution.json" \
  "template.id"

mse_fetch_json \
  "http://127.0.0.1:3000/api/template-library/preview?agencyId=6&pageType=HOME&variant=default" \
  "${MSE_REPORT_DIR}/artifacts/template-preview.json" \
  --header "x-tenant-slug: mondescale"

mse_assert_json \
  "${MSE_REPORT_DIR}/artifacts/template-preview.json" \
  "publishing" \
  "false"

mse_assert_json_exists \
  "${MSE_REPORT_DIR}/artifacts/template-preview.json" \
  "preview.sections"

mse_assert_not_contains \
  "${MSE_REPORT_DIR}/artifacts/template-preview.json" \
  "{{"

##############################################################################
# SUCCESS
##############################################################################

mse_report_success \
  "${CERT_ID}" \
  "Mondescale Platform Smoke Certification"
