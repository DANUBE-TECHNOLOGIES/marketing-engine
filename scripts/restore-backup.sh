#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage : ./scripts/restore-backup.sh backups/DATE"
  exit 1
fi

BACKUP=$1

echo "=== Restore plateforme ==="

rm -rf backend frontend

cp -R $BACKUP/backend .
cp -R $BACKUP/frontend .

echo "Restore terminé"
