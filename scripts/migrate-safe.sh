#!/bin/bash
set -euo pipefail

LOGDIR="logs/migrations"
mkdir -p "$LOGDIR"

LOGFILE="$LOGDIR/$(date +%Y%m%d-%H%M%S).log"

exec > >(tee -a "$LOGFILE")
exec 2>&1

if [ $# -eq 0 ]; then
    echo "Usage : ./scripts/migrate-safe.sh <nom_migration>"
    exit 1
fi

NAME="$1"

echo "===================================="
echo " MONDESCALE SAFE MIGRATION"
echo "===================================="

echo
echo "[1/6] Vérification Git..."

if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "❌ Le dépôt contient des modifications non commitées."
    exit 1
fi

echo "✅ Git OK"

echo
echo "[2/6] Sauvegarde..."

./scripts/backup-db.sh

echo
echo "[3/6] Génération migration..."

cd backend

npx prisma migrate dev --name "$NAME" --create-only

SQL=$(find prisma/migrations -name migration.sql | sort | tail -1)

echo
echo "[4/6] Analyse..."

../scripts/check-migration.sh "$SQL"

echo
echo "[5/6] Application..."

npx prisma migrate dev

cd ..

echo
echo "[6/6] Terminé"

echo "✅ Migration réussie"
echo "Journal : $LOGFILE"
