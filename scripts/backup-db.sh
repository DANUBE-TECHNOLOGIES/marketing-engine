#!/bin/bash
set -euo pipefail

STAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p backups/migrations

ENV_FILE="backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ backend/.env introuvable"
    exit 1
fi

DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | cut -d= -f2- | tr -d '"')

USER=$(python3 -c "from urllib.parse import urlparse;u=urlparse('$DATABASE_URL');print(u.username)")
PASSWORD=$(python3 -c "from urllib.parse import urlparse;u=urlparse('$DATABASE_URL');print(u.password)")
DB=$(python3 -c "from urllib.parse import urlparse;u=urlparse('$DATABASE_URL');print(u.path.lstrip('/'))")

CONTAINER=$(docker ps --format '{{.Names}} {{.Image}}' | awk '/postgres/ {print $1; exit}')

if [ -z "$CONTAINER" ]; then
    echo "❌ Aucun conteneur PostgreSQL trouvé."
    exit 1
fi

echo "Conteneur : $CONTAINER"
echo "Base       : $DB"

docker exec \
    -e PGPASSWORD="$PASSWORD" \
    "$CONTAINER" \
    pg_dump \
        -U "$USER" \
        -d "$DB" \
        -Fc \
> "backups/migrations/db-$STAMP.dump"

echo
echo "✅ Backup terminé"
echo "Fichier : backups/migrations/db-$STAMP.dump"
