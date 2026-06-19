# Hướng dẫn triển khai Docker — Giải Bóng đá Đoàn phường

## Yêu cầu hệ thống

| Thành phần | Phiên bản tối thiểu |
|------------|---------------------|
| Docker | 24+ |
| Docker Compose | v2.20+ |
| RAM | 4 GB (dev), 8 GB (prod) |
| Disk | 20 GB trống |
| OS | Linux, macOS, Windows (WSL2) |

## Kiến trúc triển khai

```
                    ┌─────────┐
   Internet ──────► │  Nginx  │ :80/:443
                    └────┬────┘
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ Frontend │  │ Backend  │  │  Reverb  │
    │ Next.js  │  │ Laravel  │  │   WS     │
    │  :3000   │  │ PHP-FPM  │  │  :8080   │
    └──────────┘  └────┬─────┘  └──────────┘
                       │
              ┌────────┼────────┐
              ▼        ▼        ▼
        ┌─────────┐ ┌──────┐ ┌───────┐
        │PostgreSQL│ │Redis │ │ Queue │
        │  :5432  │ │:6379 │ │Worker │
        └─────────┘ └──────┘ └───────┘
```

## Bước 1: Clone & cấu hình

```bash
git clone https://github.com/doanphuong/giai-bong-da-doan-phuong.git
cd giai-bong-da-doan-phuong

# Linux/macOS
bash scripts/setup.sh

# Windows PowerShell
.\scripts\setup.ps1
```

Script tự động:
1. Copy `docker/.env.docker.example` → `docker/.env`
2. Tạo `backend/.env` và `frontend/.env.local`
3. Build & start containers
4. Chạy migrate + seed

## Bước 2: Cấu hình môi trường

Chỉnh sửa `docker/.env`:

```env
# Bắt buộc thay đổi cho production
POSTGRES_PASSWORD=<mật-khẩu-mạnh>
JWT_SECRET=<chuỗi-ngẫu-nhiên-32-ký-tự>
REVERB_APP_KEY=<key-ngẫu-nhiên>
REVERB_APP_SECRET=<secret-ngẫu-nhiên>
APP_KEY=base64:...  # php artisan key:generate

APP_URL=https://giaibongda.doanphuong.vn
APP_ENV=production
APP_DEBUG=false
```

## Bước 3: Development

```bash
# Hot reload
npm run docker:dev

# Hoặc thủ công
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml up -d

# Xem logs
docker compose -f docker/docker-compose.yml logs -f backend

# Artisan commands
docker compose -f docker/docker-compose.yml exec backend php artisan migrate
docker compose -f docker/docker-compose.yml exec backend php artisan tinker
```

Truy cập:
- Website: http://localhost:8080
- API: http://localhost:8080/api/v1/health
- Frontend dev trực tiếp: http://localhost:3000

## Bước 4: Production

```bash
# Build & deploy
npm run docker:prod

# Hoặc
docker compose \
  -f docker/docker-compose.yml \
  -f docker/docker-compose.prod.yml \
  --env-file docker/.env \
  up -d --build
```

### SSL/TLS

1. Cài certbot trên host hoặc dùng container riêng
2. Copy certificate vào volume `ssl_certs`
3. Kích hoạt `nginx/ssl.conf.example` → `conf.d/ssl.conf`

```bash
certbot certonly --webroot -w /var/www/certbot \
  -d giaibongda.doanphuong.vn
```

## Bước 5: Backup & Restore

```bash
# Backup tự động (cron hàng ngày 2:00 AM)
0 2 * * * /opt/giai-bong-da/scripts/backup.sh prod

# Backup thủ công
bash scripts/backup.sh prod

# Restore
bash scripts/restore.sh backups/db_20260616_020000.sql.gz backups/storage_20260616_020000.tar.gz
```

## Bước 6: Health Check

```bash
bash scripts/health-check.sh
```

Kiểm tra: containers running, HTTP endpoints, PostgreSQL, Redis.

## Bước 7: CI/CD Deploy

GitHub Actions workflow `.github/workflows/deploy.yml` tự deploy khi push lên `main`.

Cấu hình GitHub Secrets:
- `DEPLOY_SSH_KEY`, `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_PATH`

## Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Backend 502 | `docker compose logs backend` — kiểm tra PHP-FPM |
| Migration fail | Kiểm tra `POSTGRES_PASSWORD` trong `.env` |
| WebSocket không kết nối | Kiểm tra nginx `/ws` proxy và `REVERB_*` env |
| Permission denied storage | `docker compose exec backend chmod -R 775 storage` |
| Port conflict | Đổi `HTTP_PORT` trong `docker/.env` |

## Lệnh hữu ích

```bash
# Restart một service
docker compose -f docker/docker-compose.yml restart backend

# Vào container
docker compose -f docker/docker-compose.yml exec backend bash

# Xem resource usage
docker stats

# Dọn dẹp
docker compose -f docker/docker-compose.yml down -v  # CẢNH BÁO: xóa volumes
```

## Monitoring (khuyến nghị)

- **Logs**: `docker compose logs -f --tail=100`
- **Uptime**: health-check cron mỗi 5 phút
- **Disk**: theo dõi volume `postgres_data` và `backups/`
- **Alerts**: cấu hình notification khi health-check fail
