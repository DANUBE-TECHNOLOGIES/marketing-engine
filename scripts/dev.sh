#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/.."

ACTION="${1:-status}"

case "$ACTION" in
  start)
    docker compose up -d
    ;;

  stop)
    docker compose stop
    ;;

  restart)
    docker compose restart
    ;;

  backend)
    docker compose restart backend
    ;;

  logs)
    docker compose logs -f --tail=100
    ;;

  backend-logs)
    docker compose logs -f --tail=100 backend
    ;;

  status)
    docker compose ps
    ;;

  *)
    echo "Usage : $0 {start|stop|restart|backend|logs|backend-logs|status}"
    exit 1
    ;;
esac
