#!/usr/bin/env bash
# Read-only preflight for VM 102. Does not change containers, files, or database.
set -euo pipefail
printf '%s\n' 'MSE-25.322 VM 102 — READ ONLY PREFLIGHT'
printf '\n[Host]\n'
hostname
date -Is
df -h /
printf '\n[Docker containers]\n'
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
printf '\n[Production compose worktree — read only]\n'
if [ -d /home/admin1/mondescale-local-engine/.git ]; then
 git -C /home/admin1/mondescale-local-engine status --short | head -n 30
else
 printf '%s\n' 'Production Git worktree not found at expected location'
fi
printf '\n[PostgreSQL readiness]\n'
docker exec mle_postgres pg_isready || true
printf '\n[Backend and frontend HTTP health]\n'
curl -sS -o /dev/null -w 'backend HTTP %{http_code}\n' --max-time 8 http://127.0.0.1:4000/health || true
curl -sS -o /dev/null -w 'frontend HTTP %{http_code}\n' --max-time 8 http://127.0.0.1:3000/healthz || true
printf '\n[FRAM target commit]\n'
printf '%s\n' '8c2fcceed477ab3ae2c003779178a4b498124f82'
printf '\n[Preflight complete — no deployment performed]\n'
