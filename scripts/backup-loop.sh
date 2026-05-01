#!/bin/sh
# SQLite backup sidecar.
# - Runs sqlite3 .backup on $DB_PATH every $BACKUP_INTERVAL_SECONDS (default 86400 = daily).
# - Keeps the last $BACKUP_RETENTION_DAYS backups, prunes the rest.
# - Uses .backup (not cp) so the snapshot is consistent under concurrent writes.

set -eu

: "${DB_PATH:=/app/data/fitness.db}"
: "${BACKUP_DIR:=/app/data/backups}"
: "${BACKUP_INTERVAL_SECONDS:=86400}"
: "${BACKUP_RETENTION_DAYS:=30}"

apk add --no-cache sqlite tzdata >/dev/null 2>&1 || true

mkdir -p "$BACKUP_DIR"

echo "[backup] db=$DB_PATH dir=$BACKUP_DIR interval=${BACKUP_INTERVAL_SECONDS}s retention=${BACKUP_RETENTION_DAYS}d"

while true; do
  if [ ! -f "$DB_PATH" ]; then
    echo "[backup] waiting for $DB_PATH to exist..."
    sleep 30
    continue
  fi

  ts="$(date +%Y-%m-%dT%H-%M-%S)"
  out="$BACKUP_DIR/fitness-${ts}.db"

  if sqlite3 "$DB_PATH" ".backup '$out'"; then
    echo "[backup] wrote $out ($(stat -c%s "$out" 2>/dev/null || stat -f%z "$out") bytes)"
  else
    echo "[backup] FAILED for $DB_PATH" >&2
  fi

  find "$BACKUP_DIR" -name 'fitness-*.db' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -delete 2>/dev/null || true

  sleep "$BACKUP_INTERVAL_SECONDS"
done
