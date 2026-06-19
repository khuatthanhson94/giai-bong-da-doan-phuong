# Yêu cầu hệ thống — Giải Bóng đá Đoàn phường

> Phiên bản tài liệu: 3.0 | Cập nhật: 2026

## 1. Mục tiêu dự án

Xây dựng hệ thống Website quản lý và theo dõi giải bóng đá do Đoàn phường tổ chức theo tiêu chuẩn **Production Ready**, có khả năng triển khai thực tế, dễ mở rộng và sử dụng lâu dài.

### Nguyên tắc cốt lõi

- **Không hard-code** bất kỳ thông tin nào — toàn bộ dữ liệu cấu hình từ giao diện quản trị
- Hỗ trợ **nhiều mùa giải**, **nhiều giải đấu** và **nhiều loại hình thi đấu** song song
- Thiết kế mở rộng trong tương lai mà không cần sửa đổi kiến trúc hệ thống
- Responsive trên Desktop, Tablet và Mobile

## 2. Công nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Laravel 12, PHP 8.3 |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 |
| Realtime | Laravel Reverb (WebSocket) |
| Auth | JWT + Refresh Token |
| Storage | Local / S3 Compatible |
| Deployment | Docker, Docker Compose, Nginx |
| CI/CD | GitHub Actions |

## 3. Trang công khai

### Danh sách trang

| Trang | URL | Mô tả |
|-------|-----|--------|
| Trang chủ | `/` | Banner, tin nổi bật, lịch, BXH, vua phá lưới |
| Giới thiệu | `/gioi-thieu` | Thông tin giải, ban tổ chức |
| Điều lệ | `/dieu-le` | Quy định giải đấu |
| Tin tức | `/tin-tuc` | Danh sách + chi tiết bài viết |
| Lịch thi đấu | `/lich-thi-dau` | Lọc theo vòng, ngày, đội |
| Kết quả | `/ket-qua` | Trận đã kết thúc |
| Chi tiết trận | `/tran-dau/[id]` | Tỷ số, sự kiện, timeline, live |
| Bảng xếp hạng | `/bang-xep-hang` | BXH tự động, lọc theo bảng |
| Đội bóng | `/doi-bong` | Danh sách + chi tiết đội |
| Cầu thủ | `/cau-thu` | Danh sách + hồ sơ cầu thủ |
| Thống kê | `/thong-ke` | Biểu đồ, vua phá lưới, thẻ |
| Nhà tài trợ | `/nha-tai-tro` | Logo theo hạng |
| Thư viện | `/thu-vien` | Album ảnh, video |
| Livestream | `/live` | Trận đang diễn ra |
| Liên hệ | `/lien-he` | Form liên hệ, bản đồ |

### Trang chủ — Widgets

- Banner + Logo giải (cấu hình từ admin)
- Tin nổi bật (carousel)
- Trận sắp diễn ra (3 trận gần nhất)
- Kết quả mới nhất
- Bảng xếp hạng top 5
- Vua phá lưới top 5
- MVP tuần
- Nhà tài trợ
- Bộ đếm ngược đến trận khai mạc
- Thư viện ảnh nổi bật

## 4. Trang quản trị

### Phân quyền (RBAC)

| Vai trò | Quyền hạn |
|---------|-----------|
| Super Admin | Toàn quyền, quản lý user, cấu hình hệ thống |
| Admin | Quản lý giải, đội, lịch, tin tức |
| Ban tổ chức | Tạo giải, wizard, cấu hình thể thức |
| Cán bộ nhập kết quả | Nhập & công bố kết quả trận đấu |
| MC | Xem lịch, thông tin trận (read-only + live) |
| Media | Quản lý tin tức, thư viện ảnh/video |
| Editor | Biên tập tin tức |
| Viewer | Chỉ xem dashboard, không sửa |

### Dashboard

- Tổng số đội, cầu thủ, trận, bàn thắng
- Lượt truy cập (analytics)
- Biểu đồ thống kê theo tuần/tháng
- Trận sắp diễn ra hôm nay
- Hoạt động gần đây (audit log)

## 5. Quản lý giải đấu

### Mùa giải (Seasons)

CRUD đầy đủ: thêm, sửa, xóa, xóa nhiều. Thông tin: tên, năm, logo, banner, mô tả, trạng thái. Dữ liệu mỗi mùa hoàn toàn độc lập.

### Nhiều giải song song

Ví dụ: Giải Thanh niên, Thiếu niên, Nhi đồng, Cán bộ — mỗi giải có đội, cầu thủ, lịch, BXH, tin tức riêng nhưng dùng chung hệ thống quản trị.

### Tournament Wizard (8 bước)

1. Tên giải, logo, banner
2. Số lượng đội (không giới hạn)
3. Chọn số bảng (1, 2, 3, 4... tùy ý)
4. Chia bảng: thủ công / random / seed / ranking (Drag & Drop)
5. Thể thức: Round Robin, League, Knockout, Group+Knockout, Double Round
6. Cấu hình điểm: thắng / hòa / thua
7. Cấu hình đội đi tiếp: Top 2, Top 3, Best Third...
8. Generate: tự sinh bảng đấu, lịch, BXH, bracket

## 6. Quản lý đội & cầu thủ

### Đội bóng

CRUD + tìm kiếm + lọc + import/export Excel/PDF. Thông tin: tên, logo, banner, đội trưởng, HLV, màu áo, giới thiệu. **Cascade delete**: xóa đội → xóa toàn bộ cầu thủ.

### Cầu thủ

CRUD + tìm kiếm + lọc + import/export. Thông tin: ảnh, họ tên, ngày sinh, số áo, vị trí, chiều cao, cân nặng, đội bóng.

### Import Excel

- Tải file mẫu
- Xem trước trước khi lưu
- Tự tạo đội + cầu thủ + gán đội
- Kiểm tra trùng lặp, báo lỗi chi tiết

## 7. Lịch thi đấu & Kết quả

### Lịch thi đấu

CRUD + generate fixtures tự động. Hỗ trợ: đổi giờ, đổi sân, hoãn trận.

### Nhập kết quả

Nhập: tỷ số, người ghi bàn, phút, kiến tạo, penalty, phản lưới, thẻ vàng/đỏ, MVP. Sau công bố tự động cập nhật: BXH, hiệu số, điểm, thống kê, vua phá lưới.

### Live Score

Realtime qua WebSocket: đồng hồ, bàn thắng, thẻ, timeline, thay người, MVP.

## 8. Bảng xếp hạng

Tự động tính: trận, thắng, hòa, thua, bàn thắng, bàn thua, hiệu số, điểm. Cấu hình tiêu chí xếp hạng (điểm → hiệu số → bàn thắng → đối đầu).

## 9. Nội dung & Media

- **Tin tức**: CRUD, rich editor, SEO, upload ảnh/video
- **Thư viện**: Album, ảnh, video — CRUD + xóa nhiều
- **Nhà tài trợ**: CRUD, phân loại Kim cương / Vàng / Bạc / Đồng hành

## 10. Tính năng bổ sung

| Tính năng | Mô tả |
|-----------|--------|
| Thùng rác | Soft delete 30 ngày, khôi phục / xóa vĩnh viễn |
| AI hỗ trợ | Sinh nội dung tin, Facebook, Zalo, caption, poster |
| QR Code | Website, đội, cầu thủ, trận, BXH |
| Push Notification | Lịch mới, kết quả mới, trận sắp diễn ra |
| Nhật ký hệ thống | User, thời gian, IP, thiết bị, nội dung thay đổi |
| Backup/Restore | Tự động hàng ngày, restore thủ công |
| Import/Export | Excel, CSV, PDF |
| Xóa hàng loạt | Chọn nhiều, chọn tất cả, xác nhận |

## 11. Yêu cầu kỹ thuật

- Responsive, Mobile First
- SEO friendly (meta tags, sitemap, structured data)
- Dark Mode
- PWA Ready
- Docker Ready
- Clean Architecture, SOLID
- Repository Pattern, Service Layer
- Migration + Seeder
- Swagger/OpenAPI documentation
- Unit Test + Integration Test + E2E

## 12. Tiêu chí nghiệm thu

- [ ] Triển khai Docker production thành công
- [ ] Tạo giải qua Wizard end-to-end
- [ ] Import 20+ đội từ Excel
- [ ] Nhập kết quả → BXH cập nhật realtime
- [ ] Live score WebSocket hoạt động
- [ ] RBAC đúng cho 8 vai trò
- [ ] Backup & restore thành công
- [ ] CI pass (test + lint + build)
- [ ] Responsive trên mobile
- [ ] Audit log ghi đầy đủ thao tác admin
