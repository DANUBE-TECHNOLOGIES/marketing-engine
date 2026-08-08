#!/usr/bin/env bash

mse_report_success() {
  local certification_id="$1"
  local title="${2:-${certification_id}}"

  mse_write_timing

  cat > "${MSE_REPORT_DIR}/report.md" <<REPORT
# ${title}

Certification : ${certification_id}

Date : $(mse_now)

Statut : ✅ SUCCÈS

Durée : $(mse_elapsed_seconds) secondes

## Artifacts

- environment.txt
- timing.json
- logs/
- artifacts/
REPORT

  python3 - \
    "${MSE_REPORT_DIR}/report.json" \
    "${certification_id}" \
    "${title}" \
    "$(mse_elapsed_seconds)" \
    "$(mse_now)" <<'PY'
import json
import sys

path = sys.argv[1]

payload = {
    "certificationId": sys.argv[2],
    "title": sys.argv[3],
    "status": "success",
    "elapsedSeconds": int(sys.argv[4]),
    "finishedAt": sys.argv[5],
}

with open(path, "w") as f:
    json.dump(
        payload,
        f,
        indent=2,
    )
    f.write("\n")
PY

  mse_capture_environment

  echo
  echo "============================================================"
  echo " ✅ ${certification_id} TERMINÉ"
  echo " Rapport : ${MSE_REPORT_DIR}"
  echo "============================================================"
}
