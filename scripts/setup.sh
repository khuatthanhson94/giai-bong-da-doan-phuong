#!/usr/bin/env bash
# First-time setup — Giải Bóng đá Đoàn phường
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/docker"
ENV_FILE="$DOCKER_DIR/.env"

echo "=========================================="
echo " Giải Bóng đá Đoàn phường — Setup"
echo "=========================================="

# 1. Copy environment file
if [ ! -f "$ENV_FILE" ]; then
    cp "$DOCKER_DIR/.env.docker.example" "$ENV_FILE"
    echo "[OK] Đã tạo docker/.env từ .env.docker.example"
    echo "[!!] Vui lòng chỉnh sửa docker/.env trước khi chạy production"
else
    echo "[--] docker/.env đã tồn tại, bỏ qua"
fi

# 2. Backend .env
if [ -d "$ROOT_DIR/backend" ] && [ ! -f "$ROOT_DIR/backend/.env" ]; then
    if [ -f "$ROOT_DIR/backend/.env.example" ]; then
        cp "$ROOT_DIR/backend/.env.example" "$ROOT_DIR/backend/.env"
        echo "[OK] Đã tạo backend/.env"
    fi
fi

# 3. Frontend .env
if [ -d "$ROOT_DIR/frontend" ] && [ ! -f "$ROOT_DIR/frontend/.env.local" ]; then
    cat > "$ROOT_DIR/frontend/.env.local" <<EOF
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_APP_NAME=Giải Bóng đá Đoàn phường
EOF
    echo "[OK] Đã tạo frontend/.env.local"
fi

# 4. Docker Compose up
COMPOSE_FILES="-f $DOCKER_DIR/docker-compose.yml -f $DOCKER_DIR/docker-compose.dev.yml"
echo "[..] Khởi động Docker containers..."
docker compose $COMPOSE_FILES --env-file "$ENV_FILE" up -d --build

# 5. Wait for postgres
echo "[..] Chờ PostgreSQL sẵn sàng..."
until docker compose $COMPOSE_FILES exec -T postgres pg_isready -U giai_bong_da > /dev/null 2>&1; do
    sleep 2
done
echo "[OK] PostgreSQL đã sẵn sàng"

# 6. Laravel setup (if backend exists)
if [ -d "$ROOT_DIR/backend" ] && [ -f "$ROOT_DIR/backend/artisan" ]; then
    echo "[..] Cài đặt Laravel backend..."
    docker compose $COMPOSE_FILES exec -T backend composer install --no-interaction
    docker compose $COMPOSE_FILES exec -T backend php artisan key:generate --force || true
    docker compose $COMPOSE_FILES exec -T backend php artisan migrate --force
    docker compose $COMPOSE_FILES exec -T backend php artisan db:seed --force || true
    docker compose $COMPOSE_FILES exec -T backend php artisan storage:link || true
    docker compose $COMPOSE_FILES exec -T backend php artisan config:cache
    docker compose $COMPOSE_FILES exec -T backend php artisan route:cache
    echo "[OK] Backend đã migrate & seed"
fi

echo ""
echo "=========================================="
echo " Setup hoàn tất!"
echo " Website:  http://localhost:8080"
echo " API:      http://localhost:8080/api"
echo " Admin:    http://localhost:8080/admin"
echo "=========================================="
