# Backend API (Express + SQLite)

API production chạy trên **Render** từ thư mục `server/`.

Frontend Next.js (`frontend/`) gọi API qua biến môi trường `NEXT_PUBLIC_API_URL`.

## Deploy Render

- **Root Directory:** `server`
- **Build:** `npm install`
- **Start:** `npm start`
- **Health check:** `/api/health`

### Biến môi trường Render

| Biến | Mô tả |
|------|--------|
| `JWT_SECRET` | Secret ký JWT (bắt buộc production) |
| `FRONTEND_URL` | URL Vercel, ví dụ `https://your-app.vercel.app` |

## Local

```bash
cd server
npm install
npm run seed
npm run dev
```

API: http://localhost:3004/api

## Tài khoản demo

| Username | Password | Quyền |
|----------|----------|-------|
| admin | admin123 | Super Admin |
| bientap | bientap123 | Biên tập |
| nhapketqua | ketqua123 | Nhập kết quả |

> Thư mục `backend/` (Laravel) là scaffold V3 tương lai — **chưa** dùng trên Render.
