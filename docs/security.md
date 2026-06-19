# Bảo mật — Giải Bóng đá Đoàn phường

## Authentication — JWT

### Access Token

- Algorithm: HS256 (hoặc RS256 cho multi-service)
- TTL: 60 phút (cấu hình `JWT_TTL`)
- Payload: `{ sub: user_id, role, iat, exp }`
- Header: `Authorization: Bearer {token}`

### Refresh Token

- TTL: 14 ngày (`JWT_REFRESH_TTL`)
- Lưu hash trong bảng `refresh_tokens`
- **Rotation**: mỗi lần refresh cấp token mới, revoke token cũ
- Detect reuse → revoke toàn bộ session của user

### Password Policy

- Minimum 8 ký tự
- Bcrypt cost factor: 12
- Không lưu plaintext, không log password
- Rate limit login: 5 attempts / minute / IP

## Authorization — RBAC

### Ma trận quyền

| Resource | super_admin | admin | organizer | scorekeeper | editor | media | viewer |
|----------|:-----------:|:-----:|:---------:|:-----------:|:------:|:-----:|:------:|
| Users | CRUD | - | - | - | - | - | - |
| Seasons | CRUD | CRUD | R | R | R | R | R |
| Tournaments | CRUD | CRUD | CRU | R | R | R | R |
| Teams | CRUD | CRUD | CRUD | R | R | R | R |
| Matches | CRUD | CRUD | CRUD | CRU* | R | R | R |
| Results | - | - | - | CRU* | - | - | - |
| News | CRUD | CRUD | R | R | CRUD | CRUD | R |
| Gallery | CRUD | CRUD | R | R | R | CRUD | R |
| Settings | CRUD | RU | - | - | - | - | - |
| Audit Logs | R | - | - | - | - | - | - |

*Scorekeeper: chỉ sửa trận được assign, không xóa.

### Implementation

- Laravel **Policies** per Model
- Middleware `CheckRole` trên route groups
- Frontend: hide UI elements theo role (không thay thế server-side check)

## API Security

### Rate Limiting (Nginx + Laravel)

| Endpoint | Limit |
|----------|-------|
| `/api/v1/auth/login` | 5 req/min/IP |
| `/api/v1/*` | 30 req/sec/IP |
| `/api/v1/matches/*/vote` | 1 req/min/IP |

### Input Validation

- Laravel Form Requests cho mọi write endpoint
- Sanitize HTML content (tin tức) qua HTMLPurifier
- File upload: whitelist MIME (jpg, png, webp, mp4), max 64MB
- SQL injection: Eloquent parameterized queries only

### CORS

```php
'allowed_origins' => [env('FRONTEND_URL')],
'allowed_methods' => ['GET', 'POST', 'PUT', 'DELETE'],
'supports_credentials' => true,
```

### Headers (Nginx)

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=63072000 (production SSL)
Content-Security-Policy: default-src 'self'; ...
```

## Audit Trail

Mọi thao tác admin được ghi vào `audit.audit_logs`:

| Field | Mô tả |
|-------|--------|
| user_id | Ai thực hiện |
| action | create / update / delete / login / publish |
| entity_type + entity_id | Đối tượng bị tác động |
| old_values / new_values | JSON diff |
| ip_address | IP client |
| user_agent | Browser/device |

Retention: 1 năm. Super Admin xem qua `/admin/audit`.

## Recycle Bin Security

- Soft delete 30 ngày trước khi purge
- Chỉ Super Admin xóa vĩnh viễn
- Restore ghi audit log
- Scheduled job purge expired items daily

## Backup Security

### Backup

- Script `scripts/backup.sh` chạy qua cron
- Database dump encrypted (optional GPG)
- Storage backup tar.gz
- Retention: 30 ngày (cấu hình `BACKUP_RETENTION_DAYS`)
- Lưu offsite (S3/Google Drive) khuyến nghị

### Restore

- Yêu cầu xác nhận `yes` trước khi ghi đè
- Chỉ Super Admin hoặc DevOps chạy restore
- Ghi audit log mỗi lần restore

```bash
# Encrypt backup (optional)
gpg --symmetric --cipher-algo AES256 backups/db_*.sql.gz
```

## Docker Security

- Containers chạy non-root user (`www`, `nextjs`)
- Không expose PostgreSQL/Redis ports trong production
- Secrets qua `docker/.env`, không commit vào git
- `.env` trong `.gitignore`
- Regular image updates (`docker compose pull`)

## Environment Variables

| Variable | Bảo mật |
|----------|---------|
| `JWT_SECRET` | Random 64 chars, rotate annually |
| `APP_KEY` | Laravel encryption key |
| `POSTGRES_PASSWORD` | Strong, unique per environment |
| `REVERB_APP_SECRET` | Random, không share |
| `AWS_SECRET_ACCESS_KEY` | IAM least privilege |

## Security Checklist (Production)

- [ ] `APP_DEBUG=false`
- [ ] Strong passwords cho DB, JWT, Redis
- [ ] SSL/TLS enabled
- [ ] Rate limiting active
- [ ] CORS restricted to frontend domain
- [ ] File upload validation
- [ ] Audit logging enabled
- [ ] Backup cron configured + tested restore
- [ ] Dependencies updated (`composer audit`, `npm audit`)
- [ ] Error pages không leak stack trace

## Incident Response

1. Phát hiện → isolate (disable account / block IP)
2. Review audit logs
3. Rotate secrets nếu bị lộ
4. Restore từ backup nếu data corruption
5. Post-mortem document
