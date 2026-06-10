#!/bin/bash

cd ~/mondescale-local-engine

LOG_FILE="$HOME/mondescale-local-engine/logs/daily-automation.log"

echo "" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"
echo "DAILY AUTOMATION - $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

curl -s -X POST http://localhost:4000/automation/daily-run \
  -H "Content-Type: application/json" \
  >> "$LOG_FILE"

echo "" >> "$LOG_FILE"
echo "END - $(date)" >> "$LOG_FILE"
