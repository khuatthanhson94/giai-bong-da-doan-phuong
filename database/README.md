# Database

Thư mục này chứa tài liệu và tham chiếu schema cho hệ thống **Giải Bóng đá Đoàn phường**.

## Cấu trúc

| File | Mô tả |
|------|--------|
| `schema-overview.sql` | Tài liệu tham chiếu toàn bộ bảng, cột, quan hệ (commented SQL) |

## Nguồn chính thức

Schema thực tế được quản lý bởi **Laravel Migrations** trong `backend/database/migrations/`. File `schema-overview.sql` chỉ dùng để review thiết kế và onboarding.

## Công nghệ

- **PostgreSQL 16** — Database chính
- **Redis 7** — Cache, session, queue
- Extensions: `uuid-ossp`, `pg_trgm`, `btree_gin`, `unaccent`

## Lệnh thường dùng

```bash
# Migrate (Docker)
docker compose -f docker/docker-compose.yml exec backend php artisan migrate

# Seed dữ liệu mẫu
docker compose -f docker/docker-compose.yml exec backend php artisan db:seed

# Fresh migrate (DEV ONLY — xóa toàn bộ dữ liệu)
docker compose -f docker/docker-compose.yml exec backend php artisan migrate:fresh --seed

# Backup
bash scripts/backup.sh

# Restore
bash scripts/restore.sh backups/db_YYYYMMDD_HHMMSS.sql.gz
```

## ER Diagram

Xem sơ đồ ER đầy đủ trong [docs/database.md](../docs/database.md).

## Quy ước đặt tên

- Bảng: snake_case, số nhiều (`teams`, `match_events`)
- Khóa chính: UUID (`uuid-ossp`)
- Soft delete: cột `deleted_at` (Laravel SoftDeletes)
- Audit schema riêng: `audit.audit_logs`
- Pivot tables: `{entity1}_{entity2}` (`group_team`, `role_user`)

## Multi-tenancy

Mỗi **tournament** (giải đấu) có dữ liệu độc lập: teams, players, matches, standings, news. Cột `tournament_id` FK xuất hiện trên hầu hết bảng nghiệp vụ. Mùa giải (`seasons`) nhóm nhiều giải đấu.
