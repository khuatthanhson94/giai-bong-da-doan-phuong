# Frontend (Next.js)

Deploy trên **Vercel** — đặt **Root Directory** = `frontend`.

## Biến môi trường Vercel

```
NEXT_PUBLIC_API_URL=https://giai-bong-da-doan-phuong-backend.onrender.com/api
NEXT_PUBLIC_UPLOAD_URL=https://giai-bong-da-doan-phuong-backend.onrender.com
```

Thay URL bằng domain Render thực tế của bạn nếu khác.

## Local

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin/login

Chạy song song API Express (`server/` port 3004).
