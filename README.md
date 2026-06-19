# Giải Bóng đá Thanh niên Đoàn phường

Hệ thống **Production Ready** quản lý và theo dõi giải bóng đá do Đoàn phường tổ chức — hỗ trợ nhiều mùa giải, nhiều giải đấu song song, live score realtime và quản trị toàn diện.

## Công nghệ

| Thành phần | Stack |
|------------|-------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Laravel 12, PHP 8.3-FPM |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Realtime | Laravel Reverb (WebSocket) |
| Proxy | Nginx 1.27 |
| Container | Docker Compose |
| CI/CD | GitHub Actions |

## Tính năng chính

### Trang công khai
- Trang chủ: banner, tin nổi bật, lịch thi đấu, BXH, vua phá lưới, countdown
- Lịch thi đấu & kết quả chi tiết (lọc theo vòng, ngày, đội)
- Bảng xếp hạng tự động cập nhật
- Hồ sơ đội bóng & cầu thủ, thống kê biểu đồ
- Tin tức, thư viện ảnh/video, nhà tài trợ
- Live score realtime qua WebSocket
- QR Code, dark mode, responsive mobile-first

### Trang quản trị
- Dashboard thống kê tổng quan
- **Tournament Wizard** — tạo giải 8 bước (chia bảng, sinh lịch, bracket)
- CRUD đội bóng, cầu thủ (import/export Excel)
- Nhập & công bố kết quả → tự động cập nhật BXH
- Quản lý tin tức, thư viện, nhà tài trợ
- Phân quyền 8 cấp (RBAC)
- Thùng rác 30 ngày, nhật ký audit, backup/restore

## Cấu trúc dự án

```
giai-bong-da-doan-phuong/
├── frontend/          # Next.js App Router
├── backend/           # Laravel 12 API
├── docker/            # Docker Compose + Dockerfiles
├── nginx/             # Reverse proxy config
├── scripts/           # Setup, backup, deploy, health-check
├── database/          # Schema reference
├── docs/              # Tài liệu tiếng Việt
├── tests/             # Integration test docs
├── .github/workflows/ # CI/CD
├── client/            # Legacy React (Vite) — đang migration
├── server/            # Legacy Express — đang migration
└── package.json       # Root scripts
```

## Quick Start

### Yêu cầu

- Docker 24+ & Docker Compose v2
- Git

### Cài đặt (Docker — khuyến nghị)

```bash
# Linux/macOS
bash scripts/setup.sh

# Windows PowerShell
.\scripts\setup.ps1
```

Truy cập:
- **Website**: http://localhost:8080
- **API**: http://localhost:8080/api/v1
- **Admin**: http://localhost:8080/admin

### Development (legacy — Node.js)

```bash
npm run install:all
npm run seed
npm run dev
```

- Website: http://localhost:5173
- API: http://localhost:3004

### Docker commands

```bash
npm run docker:dev      # Development với hot reload
npm run docker:prod     # Production build
npm run docker:down     # Dừng containers
npm run docker:logs     # Xem logs
npm run docker:health   # Health check
npm run docker:backup   # Backup database + storage
```

## Tài khoản demo

| Username | Password | Quyền |
|----------|----------|-------|
| admin | admin123 | Super Admin |
| bientap | bientap123 | Biên tập viên |
| nhapketqua | ketqua123 | Nhập kết quả |

## Kiến trúc

```
Browser → Nginx → Frontend (Next.js)
                → Backend (Laravel API)
                → Reverb (WebSocket)
         Backend → PostgreSQL + Redis
         Queue Worker + Scheduler
```

Chi tiết: [docs/architecture.md](docs/architecture.md)

## Tài liệu

| Tài liệu | Nội dung |
|----------|----------|
| [docs/requirements.md](docs/requirements.md) | Yêu cầu đầy đủ |
| [docs/database.md](docs/database.md) | ER diagram, bảng dữ liệu |
| [docs/api.md](docs/api.md) | API endpoints |
| [docs/ui.md](docs/ui.md) | UI/UX specifications |
| [docs/deployment.md](docs/deployment.md) | Hướng dẫn triển khai Docker |
| [docs/security.md](docs/security.md) | JWT, RBAC, audit, backup |
| [docs/testing.md](docs/testing.md) | Chiến lược kiểm thử |
| [docs/tasks.md](docs/tasks.md) | Phân rã công việc |
| [docs/prompt.md](docs/prompt.md) | Master prompt gốc |

## Production Deploy

```bash
# 1. Cấu hình
cp docker/.env.docker.example docker/.env
# Chỉnh POSTGRES_PASSWORD, JWT_SECRET, APP_KEY...

# 2. Deploy
npm run docker:prod

# 3. SSL (optional)
# Xem docs/deployment.md

# 4. Backup cron
0 2 * * * /opt/giai-bong-da/scripts/backup.sh prod
```

## CI/CD

- **CI** (`.github/workflows/ci.yml`): PHPUnit, ESLint, build, Docker validate
- **Deploy** (`.github/workflows/deploy.yml`): SSH deploy template

## License

Dự án nội bộ — Đoàn phường. All rights reserved.
