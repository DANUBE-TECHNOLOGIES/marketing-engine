#!/usr/bin/env bash
set -euo pipefail

TIMER_NAME="mondescale-seo-health-snapshot.timer"
SERVICE_NAME="mondescale-seo-health-snapshot.service"

if ! systemctl list-unit-files "$TIMER_NAME" --no-legend 2>/dev/null | grep -q "$TIMER_NAME"; then
  echo "Timer non installé: $TIMER_NAME" >&2
  exit 2
fi

active="$(systemctl is-active "$TIMER_NAME" || true)"
enabled="$(systemctl is-enabled "$TIMER_NAME" || true)"
next="$(systemctl show "$TIMER_NAME" -p NextElapseUSecRealtime --value || true)"
last_result="$(systemctl show "$SERVICE_NAME" -p Result --value || true)"

printf 'timer=%s\nactive=%s\nenabled=%s\nnext=%s\nlast_service_result=%s\n' \
  "$TIMER_NAME" "$active" "$enabled" "$next" "${last_result:-unknown}"

if [[ "$active" != "active" || "$enabled" != "enabled" ]]; then
  exit 3
fi

if [[ -n "$last_result" && "$last_result" != "success" && "$last_result" != "" ]]; then
  exit 4
fi
