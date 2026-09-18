#!/usr/bin/env bash
#
# Nightly backup: the database and the uploaded files.
#
# A backup nobody has restored is a rumour, so this writes a dated archive you can actually open,
# keeps a fortnight of them, and is loud when it fails. Run it from cron as the coex user:
#
#   0 2 * * * /srv/coex/current/deploy/backup.sh >> /srv/coex/shared/backup.log 2>&1
#
# Copy the archives off this machine as well. A backup on the same disk as the database survives a
# mistake but not a dead server.

set -euo pipefail

DATABASE="${COEX_DB:-coex}"
BACKUP_DIR="${COEX_BACKUP_DIR:-/srv/coex/shared/backups}"
STORAGE_DIR="${COEX_STORAGE_DIR:-/srv/coex/shared/storage}"
KEEP_DAYS="${COEX_BACKUP_KEEP_DAYS:-14}"

stamp="$(date +%Y-%m-%d-%H%M)"
mkdir -p "$BACKUP_DIR"

echo "[$(date -Is)] backing up $DATABASE"

mongodump \
  --uri="${MONGODB_URI:?MONGODB_URI is not set. Source /srv/coex/shared/.env first.}" \
  --archive="$BACKUP_DIR/coex-$stamp.archive.gz" \
  --gzip \
  --quiet

if [ -d "$STORAGE_DIR" ]; then
  tar -czf "$BACKUP_DIR/files-$stamp.tar.gz" -C "$(dirname "$STORAGE_DIR")" "$(basename "$STORAGE_DIR")"
fi

# Anything older than the retention window goes, so the disk cannot fill quietly.
find "$BACKUP_DIR" -name 'coex-*.archive.gz' -mtime "+$KEEP_DAYS" -delete
find "$BACKUP_DIR" -name 'files-*.tar.gz' -mtime "+$KEEP_DAYS" -delete

size="$(du -sh "$BACKUP_DIR" | cut -f1)"
echo "[$(date -Is)] done, $BACKUP_DIR now $size"
