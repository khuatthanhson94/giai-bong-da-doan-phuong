# Integration Tests

Tài liệu chiến lược kiểm thử tích hợp cho **Giải Bóng đá Đoàn phường**.

## Mục tiêu

Đảm bảo các luồng nghiệp vụ quan trọng hoạt động đúng end-to-end giữa Frontend, API, Database và WebSocket.

## Phạm vi Integration Test

### Backend (PHPUnit + Laravel HTTP Tests)

| Nhóm | Test case | Mức ưu tiên |
|------|-----------|-------------|
| Auth | Login, refresh token, logout, đổi mật khẩu | P0 |
| RBAC | Mỗi role chỉ truy cập endpoint được phép | P0 |
| Tournament | CRUD giải, wizard tạo giải 8 bước | P0 |
| Teams | CRUD đội, cascade delete cầu thủ | P0 |
| Matches | Tạo lịch, nhập kết quả, publish | P0 |
| Standings | Tự động tính BXH sau publish | P0 |
| Import | Import Excel đội/cầu thủ, validate lỗi | P1 |
| Recycle Bin | Soft delete, khôi phục, xóa vĩnh viễn | P1 |
| News | CRUD tin, SEO fields | P1 |
| Audit | Ghi log mọi thao tác admin | P1 |

### Frontend (Playwright E2E)

| Luồng | Mô tả |
|-------|--------|
| Public home | Trang chủ load banner, BXH, lịch thi đấu |
| Standings | BXH cập nhật sau khi admin publish kết quả |
| Admin login | Đăng nhập, redirect dashboard |
| Enter result | Scorekeeper nhập tỷ số → BXH thay đổi |
| Live score | WebSocket cập nhật realtime trên trang trận đấu |

### API Contract Tests

- Validate response schema theo OpenAPI/Swagger spec
- Kiểm tra HTTP status codes và error format thống nhất
- Versioning: `/api/v1/*`

## Cấu trúc thư mục (dự kiến)

```
tests/
├── README.md                 # File này
├── integration/
│   ├── backend/              # PHPUnit Feature tests
│   │   ├── AuthTest.php
│   │   ├── TournamentWizardTest.php
│   │   ├── MatchResultTest.php
│   │   └── StandingsCalculationTest.php
│   └── e2e/                  # Playwright
│       ├── public.spec.ts
│       ├── admin-login.spec.ts
│       └── enter-result.spec.ts
└── fixtures/
    ├── teams.xlsx            # File mẫu import test
    └── seed-data.json
```

## Môi trường test

```bash
# Backend integration (Docker test DB)
docker compose -f docker/docker-compose.yml exec backend \
  php artisan test --testsuite=Feature

# E2E (cần stack đang chạy)
cd frontend && npx playwright test
```

### Database test

- Dùng database riêng: `giai_bong_da_test`
- `RefreshDatabase` trait reset sau mỗi test class
- Không dùng dữ liệu production

## Tiêu chí pass

- Coverage backend ≥ 80% cho Service layer
- Tất cả P0 tests pass trên CI
- E2E chạy trên Chrome + Mobile viewport
- Không test flaky (retry tối đa 2 lần trên CI)

## CI Integration

Workflow `.github/workflows/ci.yml` chạy PHPUnit và build frontend. E2E chạy trên staging sau deploy.

## Tài liệu liên quan

- [docs/testing.md](../docs/testing.md) — Chiến lược test tổng thể
- [docs/api.md](../docs/api.md) — API endpoints reference
