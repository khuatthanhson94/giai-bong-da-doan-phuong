#!/usr/bin/env bash
set -e

# Build and start containers
docker compose -f docker/docker-compose.yml up -d --build backend nginx frontend

# Wait for backend to be healthy and run migrations
echo "Waiting for backend container to become healthy..."
while ! docker exec gbd-backend php artisan --no-ansi --no-interaction --quiet migrate --force; do
  sleep 5
done

# Cache config
docker exec gbd-backend php artisan config:cache

# Health check
if curl -f -I https://giai-bong-da-phuong-backend.onrender.com/api/v1/health; then
  echo "Health check succeeded."
else
  echo "Health check failed."
fi

echo "Setup completed."
