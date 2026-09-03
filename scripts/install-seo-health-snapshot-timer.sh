#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/mondescale-local-engine}"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
SERVICE_NAME="mondescale-seo-health-snapshot.service"
TIMER_NAME="mondescale-seo-health-snapshot.timer"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Ce script doit être exécuté en root (sudo)." >&2
  exit 1
fi

for file in \
  "$PROJECT_DIR/ops/systemd/$SERVICE_NAME" \
  "$PROJECT_DIR/ops/systemd/$TIMER_NAME" \
  "$PROJECT_DIR/scripts/seo-health-daily-snapshot.sh"; do
  if [[ ! -f "$file" ]]; then
    echo "Fichier requis introuvable: $file" >&2
    exit 1
  fi
done

chmod 0755 "$PROJECT_DIR/scripts/seo-health-daily-snapshot.sh"
install -m 0644 "$PROJECT_DIR/ops/systemd/$SERVICE_NAME" "$SYSTEMD_DIR/$SERVICE_NAME"
install -m 0644 "$PROJECT_DIR/ops/systemd/$TIMER_NAME" "$SYSTEMD_DIR/$TIMER_NAME"

systemctl daemon-reload
systemctl enable --now "$TIMER_NAME"

if [[ "${RUN_NOW:-0}" == "1" ]]; then
  echo "Exécution de validation immédiate..."
  systemctl start "$SERVICE_NAME"
  systemctl --no-pager --full status "$SERVICE_NAME" || true
fi

echo "Timer activé: $TIMER_NAME"
systemctl --no-pager --full status "$TIMER_NAME" || true
systemctl list-timers --all --no-pager | grep -F "$TIMER_NAME" || true
