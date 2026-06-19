#!/usr/bin/env bash
# Backup PostgreSQL + Laravel storage
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/docker"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

source "$ENV_FILE" 2>/dev/null || true

mkdir -p "$BACKUP_DIR"

COMPOSE="-f $DOCKER_DIR/docker-compose.yml"
if [ "${1:-}" = "prod" ]; then
    COMPOSE="$COMPOSE -f $DOCKER_DIR/docker-compose.prod.yml"
fi

DB_BACKUP="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"
STORAGE_BACKUP="$BACKUP_DIR/storage_${TIMESTAMP}.tar.gz"

echo "[..] Backup database..."
docker compose $COMPOSE exec -T postgres pg_dump \
    -U "${POSTGRES_USER:-giai_bong_da}" \
    -d "${POSTGRES_DB:-giai_bong_da}" \
    --no-owner --no-acl | gzip > "$DB_BACKUP"
echo "[OK] Database: $DB_BACKUP ($(du -h "$DB_BACKUP" | cut -f1))"

echo "[..] Backup storage..."
docker compose $COMPOSE exec -T backend tar czf - -C /var/www/backend/storage/app/public . \
    > "$STORAGE_BACKUP" 2>/dev/null || echo "[--] Storage backup skipped (backend chưa chạy)"
echo "[OK] Storage: $STORAGE_BACKUP"

# Cleanup old backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name "storage_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

echo "[OK] Backup hoàn tất. Giữ lại $RETENTION_DAYS ngày."
