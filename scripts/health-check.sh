#!/usr/bin/env bash
# Health check for all services
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
DOCKER_DIR="$ROOT_DIR/docker"
ENV_FILE="${ENV_FILE:-$DOCKER_DIR/.env}"

source "$ENV_FILE" 2>/dev/null || true
BASE_URL="${APP_URL:-http://localhost:8080}"
FAILED=0

check() {
    local name="$1"
    local cmd="$2"
    if eval "$cmd" > /dev/null 2>&1; then
        echo "[OK] $name"
    else
        echo "[FAIL] $name"
        FAILED=$((FAILED + 1))
    fi
}

echo "Health Check — $(date '+%Y-%m-%d %H:%M:%S')"
echo "Target: $BASE_URL"
echo "---"

# Docker containers
COMPOSE="-f $DOCKER_DIR/docker-compose.yml"
for svc in nginx frontend backend postgres redis reverb queue scheduler; do
    check "container:$svc" "docker compose $COMPOSE ps --status running --services | grep -q ^${svc}$"
done

# HTTP endpoints
check "nginx:/health" "curl -sf ${BASE_URL}/health"
check "frontend:/" "curl -sf -o /dev/null -w '%{http_code}' ${BASE_URL}/ | grep -qE '200|304'"
check "api:/health" "curl -sf ${BASE_URL}/api/health || curl -sf ${BASE_URL}/api/v1/health"

# Database
check "postgres" "docker compose $COMPOSE exec -T postgres pg_isready -U ${POSTGRES_USER:-giai_bong_da}"

# Redis
check "redis" "docker compose $COMPOSE exec -T redis redis-cli ping | grep -q PONG"

echo "---"
if [ $FAILED -eq 0 ]; then
    echo "All checks passed"
    exit 0
else
    echo "$FAILED check(s) failed"
    exit 1
fi
