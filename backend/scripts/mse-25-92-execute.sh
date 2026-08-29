#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-preview}"
REPORT_DIR="${MSE_25_92_REPORT_DIR:-/home/admin1/mse-25-92-reports}"
TENANT_SLUG="${TENANT_SLUG:-mondescale}"

cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "MSE-25.92: DATABASE_URL absente." >&2
  exit 2
fi

mkdir -p "$REPORT_DIR"
export MSE_25_92_REPORT_DIR="$REPORT_DIR"
export TENANT_SLUG

case "$MODE" in
  preview)
    unset MSE_25_92_CONFIRM || true
    echo "MSE-25.92 PREVIEW — 12 actions résiduelles, aucune écriture"
    node scripts/mse-25-92-residual-seo-remediation.js
    ;;
  apply)
    if [[ "${MSE_25_92_APPLY_ACK:-}" != "RESIDUAL-SEO-12-ACTIONS" ]]; then
      echo "MSE-25.92: apply refusé. Définir MSE_25_92_APPLY_ACK=RESIDUAL-SEO-12-ACTIONS." >&2
      exit 3
    fi
    export MSE_25_92_CONFIRM=true
    echo "MSE-25.92 APPLY — 7 services + 5 contacts, transaction atomique"
    node scripts/mse-25-92-residual-seo-remediation.js
    ;;
  *)
    echo "Usage: $0 {preview|apply}" >&2
    exit 64
    ;;
esac
