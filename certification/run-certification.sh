#!/usr/bin/env bash

set -Eeuo pipefail

ROOT="$(
  cd \
    "$(dirname "${BASH_SOURCE[0]}")/.." \
    && pwd
)"

cd "${ROOT}"

MODULE="${1:-platform-smoke}"
STAMP="$(date +%Y%m%d-%H%M%S)"

export MSE_CERT_ROOT="certification"
export MSE_ENABLE_ERR_TRAP=true
export MSE_REPORT_DIR="${MSE_REPORT_DIR:-reports/certification/${MODULE}-${STAMP}}"
export MSE_WAIT_TIMEOUT="${MSE_WAIT_TIMEOUT:-300}"
export MSE_HTTP_TIMEOUT="${MSE_HTTP_TIMEOUT:-8}"

SCRIPT="certification/modules/${MODULE}.sh"

if [ ! -s "${SCRIPT}" ]; then
  echo "ERREUR : module de certification absent : ${SCRIPT}" >&2
  echo
  echo "Modules disponibles :"

  find certification/modules \
    -maxdepth 1 \
    -type f \
    -name '*.sh' \
    -printf '  - %f\n' \
    | sed 's/\.sh$//' \
    | sort

  exit 1
fi

echo "============================================================"
echo " MONDESCALE CERTIFICATION"
echo " Module : ${MODULE}"
echo " Rapport : ${MSE_REPORT_DIR}"
echo "============================================================"

bash "${SCRIPT}"
