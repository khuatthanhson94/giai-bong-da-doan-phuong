#!/usr/bin/env bash
# Restore PostgreSQL + Laravel storage from backup
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/docker"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"

if [ $# -lt 1 ]; then
    echo "Usage: $0 <db_backup.sql.gz> [storage_backup.tar.gz]"
    echo "Example: $0 backups/db_20260616_020000.sql.gz backups/storage_20260616_020000.tar.gz"
    exit 1
fi

DB_FILE="$1"
STORAGE_FILE="${2:-}"

if [ ! -f "$DB_FILE" ]; then
    echo "[!!] File không tồn tại: $DB_FILE"
    exit 1
fi

source "$ENV_FILE" 2>/dev/null || true
COMPOSE="-f $DOCKER_DIR/docker-compose.yml"

echo "[!!] CẢNH BÁO: Thao tác này sẽ GHI ĐÈ database hiện tại!"
read -rp "Nhập 'yes' để tiếp tục: " confirm
if [ "$confirm" != "yes" ]; then
    echo "Đã hủy."
    exit 0
fi

echo "[..] Restore database từ $DB_FILE..."
gunzip -c "$DB_FILE" | docker compose $COMPOSE exec -T postgres psql \
    -U "${POSTGRES_USER:-giai_bong_da}" \
    -d "${POSTGRES_DB:-giai_bong_da}" \
    --single-transaction
echo "[OK] Database restored"

if [ -n "$STORAGE_FILE" ] && [ -f "$STORAGE_FILE" ]; then
    echo "[..] Restore storage từ $STORAGE_FILE..."
    cat "$STORAGE_FILE" | docker compose $COMPOSE exec -T backend tar xzf - -C /var/www/backend/storage/app/public
    echo "[OK] Storage restored"
fi

docker compose $COMPOSE exec -T backend php artisan cache:clear 2>/dev/null || true
docker compose $COMPOSE exec -T backend php artisan config:cache 2>/dev/null || true

echo "[OK] Restore hoàn tất"
