#!/bin/bash

DATE=$(date +%Y-%m-%d_%H-%M)
BACKUP_DIR="/home/admin1/mondescale-local-engine/backups"

docker exec mle_postgres pg_dump -U mle_user mondescale_local_engine > "$BACKUP_DIR/mle_$DATE.sql"

find "$BACKUP_DIR" -type f -name "*.sql" -mtime +30 -delete
