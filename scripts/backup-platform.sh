#!/bin/bash

DATE=$(date +%Y%m%d-%H%M)

BACKUP_DIR=backups/$DATE

mkdir -p $BACKUP_DIR

echo "=== Backup plateforme Mondescale Local Engine ==="

cp -R backend $BACKUP_DIR/
cp -R frontend $BACKUP_DIR/
cp docker-compose.yml $BACKUP_DIR/

echo "Backup créé : $BACKUP_DIR"
