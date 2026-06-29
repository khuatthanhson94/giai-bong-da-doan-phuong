# Hướng dẫn triển khai (Deployment Guide)

Hướng dẫn này giúp bạn triển khai ứng dụng lên Vercel (Frontend) và Render (Backend) để hoạt động giống như localhost.

## Cấu trúc triển khai

- **Frontend (Next.js)**: Triển khai trên Vercel
- **Backend (Express API)**: Triển khai trên Render

## Cấu hình đã thực hiện

### 1. Vercel (Frontend)
File `vercel.json` đã được cập nhật để bao gồm các biến môi trường:
- `NEXT_PUBLIC_API_URL`: URL của backend API
- `NEXT_PUBLIC_RENDER_API_URL`: URL của Render backend
- `NEXT_PUBLIC_UPLOAD_URL`: URL cho upload file
- `NEXT_PUBLIC_FRONTEND_URL`: URL của frontend (để CORS)

### 2. Render (Backend)
File `render.yaml` đã được cập nhật với:
- `NODE_ENV`: production
- `JWT_SECRET`: Tự động tạo
- `FRONTEND_URL`: https://giai-bong-da-doan-phuong-tung-thien.vercel.app
- `PORT`: 3004
- **Persistent Disk**: 1GB cho database (để lưu dữ liệu)

### 3. Frontend Constants
File `frontend/lib/constants.ts` đã được cập nhật để xử lý URL production đúng cách.

### 4. Database Configuration
File `server/src/db.js` đã được cập nhật để sử dụng persistent disk trên Render.

## Các bước cấu hình trên Vercel

### 1. Triển khai Frontend lên Vercel

```bash
# Cài đặt Vercel CLI (nếu chưa có)
npm i -g vercel

# Triển khai
vercel
```

Hoặc kết nối GitHub repository với Vercel.

### 2. Cấu hình Environment Variables trên Vercel

Sau khi triển khai, vào Vercel Dashboard → Settings → Environment Variables và thêm:

| Key | Value | Environment |
|-----|-------|-------------|
| `NEXT_PUBLIC_API_URL` | `https://giai-bong-da-doan-phuong-backend.onrender.com/api` | Production |
| `NEXT_PUBLIC_RENDER_API_URL` | `https://giai-bong-da-doan-phuong-backend.onrender.com` | Production |
| `NEXT_PUBLIC_UPLOAD_URL` | `https://giai-bong-da-doan-phuong-backend.onrender.com` | Production |
| `NEXT_PUBLIC_FRONTEND_URL` | `https://giai-bong-da-doan-phuong-tung-thien.vercel.app` | Production |

**Lưu ý**: Thay thế `giai-bong-da-doan-phuong-tung-thien` với tên project thực tế của bạn.

## Các bước cấu hình trên Render

### 1. Triển khai Backend lên Render

```bash
# Cài đặt Render CLI (nếu chưa có)
npm i -g render-cli

# Triển khai
render deploy
```

Hoặc kết nối GitHub repository với Render.

### 2. Cấu hình Environment Variables trên Render

Vào Render Dashboard → Service → Environment và thêm:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | (Tự động tạo hoặc đặt giá trị bảo mật) |
| `FRONTEND_URL` | `https://giai-bong-da-doan-phuong-tung-thien.vercel.app` |
| `PORT` | `3004` |

**Lưu ý**: 
- `FRONTEND_URL` phải trùng với URL của Vercel frontend
- `JWT_SECRET` nên là một chuỗi ngẫu nhiên dài và bảo mật
- **Persistent Disk đã được cấu hình trong render.yaml** - không cần cấu hình thủ công

## Re-deploy sau khi cập nhật cấu hình

Sau khi cập nhật các file cấu hình, bạn cần re-deploy:

### 1. Re-deploy Render (Backend)
```bash
# Push code lên GitHub
git add .
git commit -m "Fix database persistence and CORS configuration"
git push

# Render sẽ tự động re-deploy khi có push mới
```

Hoặc vào Render Dashboard → Manual Deploy

### 2. Re-deploy Vercel (Frontend)
```bash
# Push code lên GitHub
git add .
git commit -m "Fix API URLs configuration"
git push

# Vercel sẽ tự động re-deploy khi có push mới
```

Hoặc vào Vercel Dashboard → Deployments → Redeploy

## Kiểm tra kết nối

### 1. Kiểm tra Backend Health

```bash
curl https://giai-bong-da-doan-phuong-backend.onrender.com/api/health
```

Phải trả về: `{"status":"ok"}`

### 2. Kiểm tra Frontend

Truy cập: `https://giai-bong-da-doan-phuong-tung-thien.vercel.app`

Kiểm tra console browser để đảm bảo không có lỗi kết nối API.

### 3. Kiểm tra Database Persistence

Sau khi re-deploy Render, kiểm tra xem dữ liệu có còn được giữ lại không:
- Tạo một đội bóng mới qua admin panel
- Re-deploy Render
- Kiểm tra xem đội bóng đó còn tồn tại không

## Xử lý sự cố

### Frontend không hiển thị dữ liệu

1. Kiểm tra environment variables trên Vercel
2. Đảm bảo backend URL đúng
3. Kiểm tra console browser xem có lỗi API không
4. Test backend API trực tiếp: `curl https://giai-bong-da-doan-phuong-backend.onrender.com/api/teams`

### Không thể truy cập trang admin

1. Kiểm tra xem đã seed users chưa (admin/admin123)
2. Kiểm tra JWT_SECRET trên Render
3. Xóa cookies và đăng nhập lại

### Dữ liệu bị mất sau khi re-deploy

1. Đảm bảo persistent disk đã được cấu hình trong render.yaml
2. Kiểm tra Render Dashboard → Disks để xem disk có đang hoạt động không
3. Kiểm tra logs trên Render xem có lỗi gì không

### Upload file không hoạt động

1. Kiểm tra `NEXT_PUBLIC_UPLOAD_URL` trên Vercel
2. Đảm bảo backend có quyền ghi vào thư mục uploads
3. Trên Vercel, file uploads được lưu trong `/tmp/uploads` (ephemeral)
4. Trên Render, file uploads được lưu trong `/tmp/uploads` (ephemeral) - cần cấu hình persistent disk cho uploads nếu muốn lưu lâu dài

### CORS errors

Backend đã cấu hình CORS để cho phép:
- `process.env.FRONTEND_URL`
- `http://localhost:3000` (development)
- `http://localhost:5173` (development)
- Tất cả domain `.vercel.app`

Nếu vẫn có lỗi CORS, kiểm tra `FRONTEND_URL` trên Render.

## Cập nhật domain tùy chỉnh

Nếu bạn sử dụng domain tùy chỉnh:

1. Cập nhật `FRONTEND_URL` trong Render với domain mới
2. Cập nhật `NEXT_PUBLIC_FRONTEND_URL` trong Vercel với domain mới
3. Re-deploy cả hai service

## Localhost Development

Để chạy giống như production trên localhost:

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Frontend sẽ tự động kết nối đến `http://localhost:3004/api` trong môi trường development.
