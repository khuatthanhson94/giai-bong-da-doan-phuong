# Giải Bóng Đá Đoàn Phường - Laravel 12 Backend

Hệ thống quản lý giải bóng đá với kiến trúc production-ready.

## Cài đặt

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan jwt:secret
php artisan migrate --seed
php artisan serve
```

## Kiến trúc

- **Repository Pattern** - `app/Repositories/`
- **Service Layer** - `app/Services/`
- **JWT Auth** - access + refresh token
- **Soft Deletes + Recycle Bin** - 30 ngày retention
- **Audit Logging** - tự động qua `Auditable` trait
- **Swagger** - `/api/documentation`

## API Endpoints

- `POST /api/v1/auth/login` - Đăng nhập
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/public/home` - Trang chủ công khai
- `POST /api/v1/tournaments/{id}/wizard/step/{1-8}` - Wizard tạo giải

## Tài khoản demo

| Email | Role | Password |
|-------|------|----------|
| superadmin@giaibongda.local | super_admin | password |
| admin@giaibongda.local | admin | password |

## Tests

```bash
php artisan test
```
