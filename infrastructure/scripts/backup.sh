#!/usr/bin/env bash
# Daily PostgreSQL backup — add to cron on the DB LXC:
#   0 2 * * * /opt/kanban/scripts/backup.sh

set -euo pipefail

BACKUP_DIR="/opt/kanban/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILE="$BACKUP_DIR/planka_$DATE.sql.gz"

mkdir -p "$BACKUP_DIR"

# Adjust these to match your PostgreSQL user/installation.
DB_USER="${POSTGRES_USER:-planka}"
DB_NAME="${POSTGRES_DB:-planka}"
DB_HOST="${POSTGRES_HOST:-localhost}"
DB_PORT="${POSTGRES_PORT:-5432}"

pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  "$DB_NAME" \
  | gzip > "$FILE"

echo "Backup saved: $FILE ($(du -h "$FILE" | cut -f1))"

# Retain last 30 daily backups
find "$BACKUP_DIR" -name "planka_*.sql.gz" -mtime +30 -delete
echo "Old backups cleaned."
