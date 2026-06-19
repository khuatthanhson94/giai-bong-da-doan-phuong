#!/usr/bin/env bash
# Production deployment script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/docker"
ENV_FILE="$DOCKER_DIR/.env"
COMPOSE="-f $DOCKER_DIR/docker-compose.yml -f $DOCKER_DIR/docker-compose.prod.yml"

echo "=========================================="
echo " Deploy — Giải Bóng đá Đoàn phường"
echo " $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

# Pre-deploy backup
if [ -f "$SCRIPT_DIR/backup.sh" ]; then
    echo "[..] Backup trước khi deploy..."
    bash "$SCRIPT_DIR/backup.sh" prod
fi

# Pull latest code
echo "[..] Pull latest code..."
cd "$ROOT_DIR"
git pull origin main

# Build & restart
echo "[..] Build images..."
docker compose $COMPOSE --env-file "$ENV_FILE" build --no-cache

echo "[..] Rolling update..."
docker compose $COMPOSE --env-file "$ENV_FILE" up -d --remove-orphans

# Laravel maintenance
if docker compose $COMPOSE exec -T backend test -f artisan 2>/dev/null; then
    echo "[..] Laravel migrations..."
    docker compose $COMPOSE exec -T backend php artisan down --retry=60 || true
    docker compose $COMPOSE exec -T backend php artisan migrate --force
    docker compose $COMPOSE exec -T backend php artisan config:cache
    docker compose $COMPOSE exec -T backend php artisan route:cache
    docker compose $COMPOSE exec -T backend php artisan view:cache
    docker compose $COMPOSE exec -T backend php artisan queue:restart
    docker compose $COMPOSE exec -T backend php artisan up
fi

# Health check
bash "$SCRIPT_DIR/health-check.sh" || {
    echo "[!!] Health check FAILED — xem xét rollback"
    exit 1
}

echo "[OK] Deploy thành công!"
