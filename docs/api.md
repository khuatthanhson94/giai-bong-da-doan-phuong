# API Documentation — Giải Bóng đá Đoàn phường

> Base URL: `/api/v1` | Auth: Bearer JWT | Format: JSON

## Quy ước chung

### Headers

```
Authorization: Bearer {access_token}
Accept: application/json
Content-Type: application/json
```

### Response format

```json
{
  "success": true,
  "data": { },
  "meta": { "page": 1, "per_page": 20, "total": 100 }
}
```

### Error format

```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "errors": { "field": ["Validation message"] }
}
```

### HTTP Status Codes

| Code | Ý nghĩa |
|------|---------|
| 200 | Thành công |
| 201 | Tạo mới thành công |
| 204 | Xóa thành công (no content) |
| 400 | Request không hợp lệ |
| 401 | Chưa đăng nhập / token hết hạn |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 422 | Validation error |
| 429 | Rate limit |
| 500 | Lỗi server |

---

## Auth

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| POST | `/auth/login` | Public | Đăng nhập |
| POST | `/auth/refresh` | Public | Refresh token |
| POST | `/auth/logout` | Required | Đăng xuất |
| GET | `/auth/me` | Required | Thông tin user hiện tại |
| POST | `/auth/change-password` | Required | Đổi mật khẩu |
| GET | `/auth/users` | Super Admin | Danh sách user |
| POST | `/auth/users` | Super Admin | Tạo user |
| PUT | `/auth/users/{id}` | Super Admin | Cập nhật user |
| DELETE | `/auth/users/{id}` | Super Admin | Xóa user |

### POST `/auth/login`

```json
// Request
{ "username": "admin", "password": "admin123" }

// Response
{
  "success": true,
  "data": {
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "expires_in": 3600,
    "user": { "id": "uuid", "username": "admin", "role": "super_admin" }
  }
}
```

---

## Public (không cần auth)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| GET | `/public/home` | Dữ liệu trang chủ |
| GET | `/public/standings` | Bảng xếp hạng |
| GET | `/public/standings?group_id={id}` | BXH theo bảng |
| GET | `/public/statistics` | Thống kê tổng hợp |
| GET | `/public/top-scorers` | Vua phá lưới |
| GET | `/public/settings` | Cấu hình công khai |
| GET | `/public/qrcode?type=website&target={id}` | QR code PNG/base64 |
| GET | `/public/export/standings?format=csv` | Xuất BXH CSV |

---

## Seasons

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/seasons` | Admin+ | Danh sách mùa giải |
| POST | `/seasons` | Admin+ | Tạo mùa giải |
| GET | `/seasons/{id}` | Admin+ | Chi tiết |
| PUT | `/seasons/{id}` | Admin+ | Cập nhật |
| DELETE | `/seasons/{id}` | Super Admin | Xóa |
| DELETE | `/seasons/bulk` | Super Admin | Xóa nhiều |

---

## Tournaments

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/tournaments` | Admin+ | Danh sách giải |
| POST | `/tournaments` | Organizer+ | Tạo giải |
| GET | `/tournaments/{id}` | Admin+ | Chi tiết |
| PUT | `/tournaments/{id}` | Admin+ | Cập nhật |
| DELETE | `/tournaments/{id}` | Admin+ | Xóa (→ recycle bin) |
| POST | `/tournaments/wizard` | Organizer+ | Tournament Wizard 8 bước |
| POST | `/tournaments/{id}/generate-fixtures` | Organizer+ | Sinh lịch thi đấu |
| GET | `/tournaments/{id}/bracket` | Public | Nhánh knockout |

---

## Groups

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/tournaments/{id}/groups` | Admin+ | Danh sách bảng |
| POST | `/tournaments/{id}/groups/assign` | Organizer+ | Chia bảng (manual/random/seed) |
| PUT | `/groups/{id}` | Admin+ | Cập nhật bảng |

---

## Teams

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/teams?tournament_id={id}` | Public | Danh sách đội |
| GET | `/teams/{id}` | Public | Chi tiết đội + cầu thủ |
| POST | `/teams` | Admin+ | Tạo đội |
| PUT | `/teams/{id}` | Admin+ | Cập nhật |
| DELETE | `/teams/{id}` | Admin+ | Xóa (cascade cầu thủ) |
| DELETE | `/teams/bulk` | Admin+ | Xóa nhiều |
| POST | `/teams/import` | Admin+ | Import Excel |
| GET | `/teams/export?format=xlsx` | Admin+ | Export Excel |
| POST | `/teams/{id}/logo` | Admin+ | Upload logo (multipart) |

---

## Players

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/players?team_id={id}` | Public | Danh sách cầu thủ |
| GET | `/players/{id}` | Public | Chi tiết cầu thủ |
| POST | `/players` | Admin+ | Tạo cầu thủ |
| PUT | `/players/{id}` | Admin+ | Cập nhật |
| DELETE | `/players/{id}` | Admin+ | Xóa |
| DELETE | `/players/bulk` | Admin+ | Xóa nhiều |
| POST | `/players/import` | Admin+ | Import Excel |

---

## Matches

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/matches?tournament_id={id}&status=scheduled` | Public | Danh sách trận |
| GET | `/matches/rounds?tournament_id={id}` | Public | Danh sách vòng |
| GET | `/matches/{id}` | Public | Chi tiết trận + events |
| POST | `/matches` | Admin+ | Tạo trận |
| PUT | `/matches/{id}` | Admin+ | Cập nhật (đổi giờ, sân, hoãn) |
| DELETE | `/matches/{id}` | Admin+ | Xóa |
| POST | `/matches/{id}/result` | Scorekeeper+ | Nhập kết quả |
| POST | `/matches/{id}/publish` | Scorekeeper+ | Công bố kết quả |
| POST | `/matches/{id}/live/start` | Scorekeeper+ | Bắt đầu live |
| POST | `/matches/{id}/live/event` | Scorekeeper+ | Thêm sự kiện live |
| POST | `/matches/{id}/vote` | Public | Bình chọn MVP |

### POST `/matches/{id}/result`

```json
{
  "score_home": 2,
  "score_away": 1,
  "goals": [
    { "player_id": "uuid", "minute": 23, "is_own_goal": false },
    { "player_id": "uuid", "minute": 67, "is_penalty": true }
  ],
  "yellow_cards": [{ "player_id": "uuid", "minute": 45 }],
  "red_cards": [],
  "motm_player_id": "uuid"
}
```

---

## News

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/news` | Public | Tin đã publish |
| GET | `/news/{slug}` | Public | Chi tiết tin |
| GET | `/news/admin/all` | Editor+ | Tất cả tin (kể cả draft) |
| POST | `/news` | Editor+ | Tạo tin |
| PUT | `/news/{id}` | Editor+ | Cập nhật |
| DELETE | `/news/{id}` | Editor+ | Xóa → recycle bin |

---

## Gallery

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/gallery/albums` | Public | Danh sách album |
| GET | `/gallery/albums/{id}` | Public | Chi tiết album |
| POST | `/gallery/albums` | Media+ | Tạo album |
| POST | `/gallery/items` | Media+ | Thêm ảnh/video |
| DELETE | `/gallery/items/bulk` | Media+ | Xóa nhiều |

---

## Sponsors

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/sponsors` | Public | Danh sách nhà tài trợ |
| POST | `/sponsors` | Admin+ | Tạo |
| PUT | `/sponsors/{id}` | Admin+ | Cập nhật |
| DELETE | `/sponsors/{id}` | Admin+ | Xóa |

---

## Settings & Dashboard

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/settings` | Admin+ | Cấu hình hệ thống |
| PUT | `/settings` | Super Admin | Cập nhật cấu hình |
| GET | `/dashboard` | Admin+ | Thống kê dashboard |

---

## Recycle Bin

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/recycle-bin` | Admin+ | Danh sách đã xóa |
| POST | `/recycle-bin/{id}/restore` | Admin+ | Khôi phục |
| DELETE | `/recycle-bin/{id}` | Super Admin | Xóa vĩnh viễn |
| DELETE | `/recycle-bin/bulk` | Super Admin | Xóa vĩnh viễn nhiều |

---

## Audit Logs

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| GET | `/audit-logs?entity_type=match&from=2026-01-01` | Super Admin | Nhật ký hệ thống |

---

## AI Content

| Method | Endpoint | Role | Mô tả |
|--------|----------|------|--------|
| POST | `/ai/generate` | Editor+ | Sinh nội dung (tin, social, poster) |

---

## WebSocket (Reverb)

| Channel | Event | Mô tả |
|---------|-------|--------|
| `match.{id}` | `MatchUpdated` | Cập nhật tỷ số live |
| `match.{id}` | `MatchEventAdded` | Bàn thắng, thẻ mới |
| `tournament.{id}` | `StandingsUpdated` | BXH thay đổi |
| `tournament.{id}` | `FixturesUpdated` | Lịch thi đấu mới |

### Kết nối

```
ws://localhost/ws/app/{REVERB_APP_KEY}
```

Subscribe: `{ "event": "pusher:subscribe", "data": { "channel": "match.{id}" } }`

---

## Health

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|--------|
| GET | `/health` | Public | Health check |

Swagger UI: `/api/documentation` (khi bật L5-Swagger)
