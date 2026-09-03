#!/usr/bin/env bash

set -Eeuo pipefail

: "${MSE_CERT_ROOT:=certification}"
: "${MSE_REPORT_DIR:=reports/certification/manual}"
: "${MSE_HTTP_TIMEOUT:=5}"
: "${MSE_WAIT_TIMEOUT:=240}"

mkdir -p \
  "${MSE_REPORT_DIR}" \
  "${MSE_REPORT_DIR}/logs" \
  "${MSE_REPORT_DIR}/artifacts"

MSE_CERT_STARTED_AT="${MSE_CERT_STARTED_AT:-$(date +%s)}"

mse_now() {
  date '+%Y-%m-%dT%H:%M:%S%z'
}

mse_section() {
  echo
  echo "============================================================"
  echo " $*"
  echo "============================================================"
}

mse_info() {
  echo "INFO : $*"
}

mse_ok() {
  echo "OK : $*"
}

mse_warn() {
  echo "ATTENTION : $*" >&2
}

mse_fail() {
  echo "ERREUR : $*" >&2
  return 1
}

mse_command_exists() {
  command -v "$1" >/dev/null 2>&1
}

mse_require_command() {
  if ! mse_command_exists "$1"; then
    mse_fail "commande requise absente : $1"
    return 1
  fi

  mse_ok "commande disponible : $1"
}

mse_elapsed_seconds() {
  local now
  now="$(date +%s)"
  echo $((now - MSE_CERT_STARTED_AT))
}

mse_write_timing() {
  python3 - \
    "${MSE_REPORT_DIR}/timing.json" \
    "$(mse_elapsed_seconds)" \
    "$(mse_now)" <<'PY'
import json
import sys

path = sys.argv[1]
elapsed = int(sys.argv[2])
finished = sys.argv[3]

with open(path, "w") as f:
    json.dump(
        {
            "elapsedSeconds": elapsed,
            "finishedAt": finished,
        },
        f,
        indent=2,
    )
    f.write("\n")
PY
}

mse_capture_environment() {
  {
    echo "timestamp=$(mse_now)"
    echo "pwd=$(pwd)"
    echo "hostname=$(hostname 2>/dev/null || true)"
    echo "user=$(id -un 2>/dev/null || true)"
    echo
    echo "### docker compose ps"
    docker compose ps 2>&1 || true
    echo
    echo "### docker ps"
    docker ps 2>&1 || true
    echo
    echo "### disk"
    df -h 2>&1 || true
    echo
    echo "### memory"
    free -h 2>&1 || true
  } > "${MSE_REPORT_DIR}/environment.txt"
}

mse_on_error() {
  local exit_code="$?"
  local command="${BASH_COMMAND:-unknown}"
  local source_file="${BASH_SOURCE[1]:-${BASH_SOURCE[0]:-unknown}}"
  local line="${BASH_LINENO[0]:-unknown}"
  local function_name="${FUNCNAME[1]:-main}"

  echo
  echo "============================================================"
  echo " ❌ CERTIFICATION EN ÉCHEC"
  echo " Code     : ${exit_code}"
  echo " Fichier  : ${source_file}"
  echo " Ligne    : ${line}"
  echo " Fonction : ${function_name}"
  echo " Commande : ${command}"
  echo "============================================================"

  mse_capture_environment || true
  mse_write_timing || true

  if declare -F mse_collect_all_logs >/dev/null 2>&1
  then
    mse_collect_all_logs || true
  fi

  return "${exit_code}"
}

if [ "${MSE_ENABLE_ERR_TRAP:-false}" = "true" ]; then
  trap mse_on_error ERR
fi
