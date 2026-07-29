#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

ACTION="${1:-}"

case "$ACTION" in
  validate)
    docker compose exec backend npx prisma validate
    ;;

  generate)
    docker compose exec backend npx prisma generate
    ;;

  push)
    docker compose exec backend npx prisma db push
    docker compose exec backend npx prisma generate
    ;;

  studio)
    docker compose exec backend npx prisma studio \
      --hostname 0.0.0.0 \
      --port 5555
    ;;

  *)
    echo "Usage : $0 {validate|generate|push|studio}"
    exit 1
    ;;
esac
