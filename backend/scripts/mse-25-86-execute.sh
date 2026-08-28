#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-preview}"
REPORT_DIR="${MSE_25_86_REPORT_DIR:-/home/admin1/mse-25-86-reports}"
TENANT_SLUG="${TENANT_SLUG:-mondescale}"

cd "$(dirname "$0")/.."

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "MSE-25.86: DATABASE_URL absente. Exécuter depuis l'environnement backend/VM qui possède la connexion Prisma." >&2
  exit 2
fi

mkdir -p "$REPORT_DIR"
export MSE_25_86_REPORT_DIR="$REPORT_DIR"
export TENANT_SLUG

case "$MODE" in
  preview)
    unset MSE_25_86_CONFIRM || true
    echo "MSE-25.86 PREVIEW — aucune écriture autorisée"
    node scripts/mse-25-86-seo-coverage-remediation.js
    ;;

  apply)
    if [[ "${MSE_25_86_APPLY_ACK:-}" != "SEO-COVERAGE-9-SITES" ]]; then
      echo "MSE-25.86: apply refusé. Définir MSE_25_86_APPLY_ACK=SEO-COVERAGE-9-SITES." >&2
      exit 3
    fi
    export MSE_25_86_CONFIRM=true
    echo "MSE-25.86 APPLY — transaction réseau atomique, 9 sites"
    node scripts/mse-25-86-seo-coverage-remediation.js
    APPLY_REPORT="$(ls -1t "$REPORT_DIR"/mse-25-86-apply-*.json 2>/dev/null | head -n 1 || true)"
    if [[ -z "$APPLY_REPORT" || ! -f "$APPLY_REPORT" ]]; then
      echo "MSE-25.86: rapport d'application introuvable après écriture ; vérification post-apply impossible." >&2
      exit 6
    fi
    export MSE_25_86_APPLY_REPORT="$APPLY_REPORT"
    echo "MSE-25.86 POST-APPLY VERIFY — lecture seule depuis $APPLY_REPORT"
    node scripts/mse-25-86-post-apply-verify.js
    ;;

  verify)
    REPORT_FILE="${2:-${MSE_25_86_APPLY_REPORT:-}}"
    if [[ -z "$REPORT_FILE" || ! -f "$REPORT_FILE" ]]; then
      echo "MSE-25.86: verify refusé. Fournir le rapport JSON d'application réel en second argument." >&2
      exit 7
    fi
    export MSE_25_86_APPLY_REPORT="$REPORT_FILE"
    echo "MSE-25.86 VERIFY — lecture seule depuis $REPORT_FILE"
    node scripts/mse-25-86-post-apply-verify.js
    ;;

  rollback)
    REPORT_FILE="${2:-${MSE_25_86_ROLLBACK_REPORT:-}}"
    if [[ -z "$REPORT_FILE" || ! -f "$REPORT_FILE" ]]; then
      echo "MSE-25.86: rollback refusé. Fournir le rapport JSON d'application réel en second argument." >&2
      exit 4
    fi
    if [[ "${MSE_25_86_ROLLBACK_ACK:-}" != "RESTORE-MSE-25-86" ]]; then
      echo "MSE-25.86: rollback refusé. Définir MSE_25_86_ROLLBACK_ACK=RESTORE-MSE-25-86." >&2
      exit 5
    fi
    export MSE_25_86_ROLLBACK_CONFIRM=true
    export MSE_25_86_ROLLBACK_REPORT="$REPORT_FILE"
    echo "MSE-25.86 ROLLBACK — restauration depuis $REPORT_FILE"
    node scripts/mse-25-86-seo-coverage-rollback.js
    ;;

  *)
    echo "Usage: $0 {preview|apply|verify [apply-report.json]|rollback [apply-report.json]}" >&2
    exit 64
    ;;
esac
