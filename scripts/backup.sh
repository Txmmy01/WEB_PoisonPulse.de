#!/usr/bin/env bash
set -euo pipefail

APP_DATA_DIR="${DATA_DIR:-/var/lib/poisonpulse}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/poisonpulse}"
STAMP="$(date +%Y%m%d-%H%M%S)"

command -v sqlite3 >/dev/null 2>&1 || { echo "sqlite3 fehlt. Installiere: apt install sqlite3"; exit 1; }
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

for db in poisonpulse.sqlite sessions.sqlite; do
  if [[ -f "$APP_DATA_DIR/$db" ]]; then
    sqlite3 "$APP_DATA_DIR/$db" ".backup '$BACKUP_DIR/$db-$STAMP'"
  fi
done

find "$BACKUP_DIR" -type f -name '*.sqlite-*' -mtime +14 -delete
echo "Backup abgeschlossen: $BACKUP_DIR ($STAMP)"
