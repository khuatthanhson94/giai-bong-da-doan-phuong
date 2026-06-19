# MASTER PROMPT — Website Quản lý và Theo dõi Giải Bóng đá Đoàn phường

> **PRODUCTION READY V3.0** — Tài liệu gốc, được bảo toàn nguyên vẹn

---

## 1. MỤC TIÊU DỰ ÁN

Xây dựng một hệ thống Website quản lý và theo dõi giải bóng đá do Đoàn phường tổ chức theo tiêu chuẩn Production Ready, có khả năng triển khai thực tế, dễ mở rộng và sử dụng lâu dài.

Hệ thống không chỉ phục vụ một mùa giải mà phải có khả năng quản lý nhiều mùa giải, nhiều giải đấu và nhiều loại hình thi đấu khác nhau.

- Không được hard-code bất kỳ thông tin nào.
- Toàn bộ dữ liệu phải được cấu hình từ giao diện quản trị.
- Thiết kế theo hướng mở rộng trong tương lai mà không cần sửa đổi kiến trúc hệ thống.

## 2. CÔNG NGHỆ ĐỀ XUẤT

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Laravel 12 |
| Database | PostgreSQL |
| Cache | Redis |
| Realtime | WebSocket |
| Storage | Local Storage hoặc S3 Compatible |
| Authentication | JWT, Refresh Token |
| Deployment | Docker, Docker Compose, Nginx |

## 3. GIAO DIỆN NGƯỜI DÙNG

Website công khai gồm: Trang chủ, Giới thiệu, Điều lệ giải, Tin tức, Lịch thi đấu, Kết quả, Bảng xếp hạng, Danh sách đội bóng, Danh sách cầu thủ, Nhà tài trợ, Thư viện ảnh, Video, Livestream, Liên hệ.

Trang chủ hiển thị: Banner, Logo giải, Tin nổi bật, Trận đấu sắp diễn ra, Kết quả mới nhất, Bảng xếp hạng, Vua phá lưới, MVP, Nhà tài trợ, Bộ đếm ngược, Thư viện ảnh.

Responsive trên Desktop, Tablet và Mobile.

## 4. TRANG QUẢN TRỊ

Dashboard riêng. Đăng nhập bằng tài khoản.

Phân quyền: Super Admin, Admin, Ban tổ chức, Cán bộ nhập kết quả, MC, Media, Editor, Viewer.

Dashboard: Tổng số đội, cầu thủ, trận, bàn thắng, lượt truy cập, biểu đồ thống kê.

## 5. QUẢN LÝ NHIỀU GIẢI ĐẤU SONG SONG

Hỗ trợ đồng thời nhiều giải (Thanh niên, Thiếu niên, Nhi đồng, Cán bộ...). Mỗi giải có dữ liệu riêng nhưng dùng chung hệ thống quản trị. Không giới hạn số lượng giải.

## 6. QUẢN LÝ MÙA GIẢI

CRUD: Thêm, Sửa, Xóa, Xóa nhiều. Thông tin: Tên, Năm, Logo, Banner, Mô tả, Trạng thái. Dữ liệu mỗi mùa hoàn toàn độc lập.

## 7. TOURNAMENT WIZARD (8 bước)

1. Tên giải, Logo, Banner
2. Số lượng đội (không giới hạn)
3. Chọn số bảng
4. Chia bảng: Thủ công / Random / Seed / Ranking (Drag & Drop)
5. Thể thức: Round Robin, League, Knockout, Group+Knockout, Double Round
6. Cấu hình điểm: Thắng / Hòa / Thua
7. Cấu hình đội đi tiếp: Top 2, Top 3, Top 4, Best Third
8. Generate → tự sinh bảng đấu, lịch, BXH, bracket

## 8–10. QUẢN LÝ ĐỘI, CẦU THỦ, IMPORT EXCEL

CRUD đầy đủ + tìm kiếm + lọc + import/export Excel/PDF. Cascade delete cầu thủ khi xóa đội. Import Excel với preview và validate.

## 11. THÙNG RÁC (RECYCLE BIN)

Soft delete 30 ngày. Khôi phục / xóa vĩnh viễn. Bulk actions.

## 12–15. LỊCH, KẾT QUẢ, LIVE SCORE, BXH

Generate fixtures, nhập kết quả chi tiết, live score realtime, BXH tự động tính.

## 16–18. TIN TỨC, THƯ VIỆN, NHÀ TÀI TRỢ

CRUD + SEO + editor + upload. Album ảnh/video. Nhà tài trợ phân hạng Kim cương/Vàng/Bạc/Đồng hành.

## 19–25. AI, QR, THÔNG BÁO, AUDIT, BACKUP, IMPORT/EXPORT, XÓA HÀNG LOẠT

Đầy đủ theo spec gốc.

## 26. YÊU CẦU KỸ THUẬT

Responsive, Mobile First, SEO, Dark Mode, PWA Ready, Docker Ready, Clean Architecture, SOLID, Repository Pattern, Service Layer, Migration, Seeder, Swagger API, Unit/Integration Test.

## 27. YÊU CẦU ĐẦU RA

```
frontend/  backend/  database/  docker/  docs/
scripts/   tests/    nginx/     .github/  README.md
```

Tài liệu: requirements.md, database.md, api.md, ui.md, deployment.md, architecture.md, security.md, testing.md, tasks.md, prompt.md.

Toàn bộ source code phải có chất lượng production, dễ bảo trì, dễ mở rộng và có thể triển khai thực tế ngay cho Đoàn phường.
