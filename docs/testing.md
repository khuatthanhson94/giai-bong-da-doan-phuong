# Chiến lược kiểm thử — Giải Bóng đá Đoàn phường

## Kim tự tháp kiểm thử

```
        ┌───────┐
        │  E2E  │  ← Playwright (10%)
       ┌┴───────┴┐
       │ Integr. │  ← PHPUnit Feature (30%)
      ┌┴─────────┴┐
      │   Unit    │  ← PHPUnit Unit (60%)
      └───────────┘
```

## Unit Tests (Backend)

**Framework**: PHPUnit 11 + Pest (optional)

**Target coverage**: ≥ 80% cho Service layer

### Services cần test

| Service | Test cases |
|---------|-----------|
| `StandingsService` | Tính điểm, hiệu số, tiebreak, nhiều bảng |
| `FixtureGeneratorService` | Round robin, knockout bracket, group+knockout |
| `MatchResultService` | Publish, own goal, penalty, recalculate stats |
| `ImportExportService` | Parse Excel, validate, duplicate detection |
| `TournamentWizardService` | 8 bước wizard end-to-end |

### Ví dụ

```php
public function test_standings_calculates_points_correctly(): void
{
    $tournament = Tournament::factory()->create(['points_win' => 3]);
    // ... setup matches
    $standings = app(StandingsService::class)->calculate($tournament);
    $this->assertEquals(9, $standings->first()->points);
}
```

## Integration Tests (Backend)

**Framework**: PHPUnit Feature tests + RefreshDatabase

### Nhóm test

| File | Mô tả |
|------|--------|
| `AuthTest.php` | Login, refresh, logout, RBAC |
| `TournamentWizardTest.php` | Wizard 8 bước → fixtures generated |
| `MatchResultTest.php` | Nhập kết quả → BXH updated |
| `ImportTeamTest.php` | Import Excel → teams + players created |
| `RecycleBinTest.php` | Soft delete → restore → permanent delete |
| `AuditLogTest.php` | Mọi CRUD ghi audit |

### Chạy

```bash
docker compose -f docker/docker-compose.yml exec backend php artisan test
docker compose -f docker/docker-compose.yml exec backend php artisan test --filter=Standings
docker compose -f docker/docker-compose.yml exec backend php artisan test --coverage
```

## Frontend Tests

### Unit / Component (Vitest + Testing Library)

- Form validation components
- StandingsTable rendering
- MatchCard states (scheduled, live, finished)
- Auth context / role guards

```bash
cd frontend && npm run test
```

### Lint & Type Check

```bash
cd frontend && npm run lint
cd frontend && npx tsc --noEmit
```

## E2E Tests (Playwright)

**Target**: Critical user journeys

| Spec | Luồng |
|------|-------|
| `public-home.spec.ts` | Trang chủ load, BXH hiển thị |
| `admin-login.spec.ts` | Login → dashboard |
| `enter-result.spec.ts` | Scorekeeper nhập kết quả → BXH thay đổi |
| `tournament-wizard.spec.ts` | Tạo giải 8 bước |
| `live-score.spec.ts` | WebSocket cập nhật tỷ số |

```bash
cd frontend && npx playwright test
npx playwright test --ui  # debug mode
```

## CI Pipeline

File: `.github/workflows/ci.yml`

| Job | Steps |
|-----|-------|
| backend-tests | PHPUnit + Pint |
| frontend-lint-build | ESLint + tsc + build |
| docker-build | Build images + validate compose |

## Test Data

- **Factories**: Laravel Model Factories cho mọi entity
- **Seeders**: `DatabaseSeeder` tạo demo tournament 8 đội
- **Fixtures**: `tests/fixtures/teams.xlsx` cho import tests

## Performance Tests (optional)

- k6 hoặc Artillery cho API load test
- Target: 100 concurrent users, p95 < 500ms
- Endpoints: `/public/home`, `/public/standings`, `/matches`

## Test Environments

| Env | Database | Mục đích |
|-----|----------|----------|
| local | SQLite/PG dev | Dev manual test |
| CI | PostgreSQL service | Automated tests |
| staging | PG staging | E2E + UAT |
| production | PG prod | Smoke test only |

## Definition of Done (Testing)

- [ ] Unit tests cho Service mới
- [ ] Feature test cho API endpoint mới
- [ ] Không giảm coverage tổng thể
- [ ] CI pass trên PR
- [ ] Manual test trên staging cho UI changes

## Tài liệu liên quan

- [tests/README.md](../tests/README.md) — Integration test docs
- [docs/api.md](./api.md) — API reference cho contract tests
