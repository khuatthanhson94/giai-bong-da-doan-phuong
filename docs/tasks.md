# Development Tasks — Giải Bóng đá Đoàn phường

> Phân rã công việc theo phase. Đánh dấu ✅ khi hoàn thành.

## Phase 0: Infrastructure ✅

- [x] Docker Compose (nginx, frontend, backend, postgres, redis, reverb, queue, scheduler)
- [x] Docker Compose prod/dev overrides
- [x] Backend Dockerfile (PHP 8.3-FPM)
- [x] Frontend Dockerfile (Node 22 multi-stage)
- [x] Nginx reverse proxy config
- [x] Setup scripts (bash + PowerShell)
- [x] Backup/restore/deploy/health-check scripts
- [x] CI/CD workflows
- [x] Documentation (docs/)
- [x] Database schema reference

## Phase 1: Backend Foundation

- [ ] Khởi tạo Laravel 12 project trong `backend/`
- [ ] Cấu hình PostgreSQL, Redis, JWT auth
- [ ] Migration: users, roles, permissions, refresh_tokens
- [ ] Seeder: roles (8 vai trò), super admin user
- [ ] Middleware: auth, RBAC, audit log
- [ ] Base API response format + exception handler
- [ ] L5-Swagger setup

## Phase 2: Core Domain

- [ ] Migration + Model: seasons, tournaments, groups, group_team
- [ ] Migration + Model: teams, players
- [ ] Migration + Model: venues, matches, match_events, match_lineups
- [ ] Migration + Model: standings (materialized)
- [ ] Repository interfaces + Eloquent implementations
- [ ] TournamentService, TeamService, PlayerService
- [ ] API Controllers v1: CRUD endpoints

## Phase 3: Tournament Wizard & Fixtures

- [ ] TournamentWizardService (8 bước)
- [ ] FixtureGeneratorService (round robin, knockout, group+knockout)
- [ ] Group assignment: manual, random, seed, ranking
- [ ] Bracket generation
- [ ] API: POST /tournaments/wizard
- [ ] API: POST /tournaments/{id}/generate-fixtures
- [ ] Unit tests cho fixture generation

## Phase 4: Match Results & Standings

- [ ] MatchResultService: nhập kết quả, publish
- [ ] StandingsService: tính BXH, tiebreak
- [ ] Player stats aggregation (goals, assists, cards)
- [ ] Events: MatchPublished → listeners
- [ ] API: POST /matches/{id}/result, /publish
- [ ] Integration tests: result → standings update

## Phase 5: Live Score & WebSocket

- [ ] Laravel Reverb setup
- [ ] Broadcast events: MatchUpdated, StandingsUpdated
- [ ] Live match state machine (start, events, end)
- [ ] API: POST /matches/{id}/live/*
- [ ] Frontend WebSocket client integration

## Phase 6: Content Management

- [ ] Migration + CRUD: news (SEO, rich editor)
- [ ] Migration + CRUD: gallery_albums, gallery_items
- [ ] Migration + CRUD: sponsors, pages
- [ ] Migration + CRUD: settings (key-value)
- [ ] File upload service (local + S3)
- [ ] API endpoints + policies

## Phase 7: Import/Export

- [ ] Excel template generation (teams + players)
- [ ] ImportExportService: parse, validate, preview, commit
- [ ] Export: Excel, CSV, PDF (standings, teams)
- [ ] API: POST /teams/import, GET /teams/export
- [ ] Queue job cho import lớn

## Phase 8: Recycle Bin & Audit

- [ ] RecycleBinService: soft delete 30 ngày
- [ ] Scheduled job: purge expired items
- [ ] AuditLogService + middleware
- [ ] API: /recycle-bin, /audit-logs
- [ ] Admin UI: recycle bin page

## Phase 9: Frontend Public Pages

- [ ] Next.js App Router setup, Tailwind, dark mode
- [ ] Layout: header, footer, tournament selector
- [ ] Pages: home, schedule, results, standings, teams, players
- [ ] Pages: news, gallery, sponsors, contact, about
- [ ] Match detail page + live score component
- [ ] Responsive + SEO (metadata, sitemap)

## Phase 10: Frontend Admin

- [ ] Admin layout + sidebar + auth guard
- [ ] Dashboard with charts
- [ ] CRUD pages: seasons, tournaments, teams, players
- [ ] Tournament Wizard UI (8-step stepper)
- [ ] Match management + result entry form
- [ ] News editor, gallery manager
- [ ] User management (Super Admin)
- [ ] Recycle bin, audit log viewer

## Phase 11: Advanced Features

- [ ] QR Code generation (website, team, player, match)
- [ ] AI content generation integration
- [ ] Push notifications
- [ ] PWA manifest + service worker
- [ ] Player MVP voting
- [ ] Analytics / page views

## Phase 12: Testing & QA

- [ ] Unit tests: all services (≥80% coverage)
- [ ] Feature tests: all API endpoints
- [ ] Playwright E2E: critical flows
- [ ] Load testing (k6)
- [ ] Security audit
- [ ] UAT với ban tổ chức

## Phase 13: Production Deploy

- [ ] SSL/TLS configuration
- [ ] Backup cron setup
- [ ] Monitoring + alerting
- [ ] Production smoke test
- [ ] Documentation review
- [ ] Training ban tổ chức

## Ưu tiên MVP (Minimum Viable Product)

Phase 1 → 2 → 4 → 9 (basic) → 10 (basic):

1. Auth + RBAC
2. 1 giải đấu: teams, players, matches
3. Nhập & công bố kết quả → BXH
4. Trang công khai: home, standings, schedule
5. Admin: dashboard, teams, matches, results

## Ước lượng effort

| Phase | Effort |
|-------|--------|
| Phase 0 | 3 ngày ✅ |
| Phase 1-2 | 5 ngày |
| Phase 3-4 | 5 ngày |
| Phase 5 | 3 ngày |
| Phase 6-8 | 5 ngày |
| Phase 9-10 | 8 ngày |
| Phase 11 | 4 ngày |
| Phase 12-13 | 3 ngày |
| **Tổng** | **~36 ngày** |
