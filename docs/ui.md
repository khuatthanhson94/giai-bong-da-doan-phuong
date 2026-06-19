# UI/UX Specifications — Giải Bóng đá Đoàn phường

## Design System

### Màu sắc

| Token | Giá trị | Sử dụng |
|-------|---------|---------|
| `--primary` | #0066CC | CTA, link, header |
| `--primary-dark` | #004C99 | Hover state |
| `--accent` | #FF6600 | Highlight, badge live |
| `--success` | #16A34A | Thắng, xác nhận |
| `--warning` | #EAB308 | Thẻ vàng, cảnh báo |
| `--danger` | #DC2626 | Thua, thẻ đỏ, xóa |
| `--background` | #FFFFFF / #0F172A | Light / Dark mode |
| `--surface` | #F8FAFC / #1E293B | Card background |

### Typography

- **Heading**: Inter / system-ui, font-weight 700
- **Body**: Inter, font-weight 400, line-height 1.6
- **Score display**: Tabular nums, font-weight 800, size 2xl–4xl

### Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| mobile | < 640px | Single column, bottom nav |
| tablet | 640–1024px | 2 columns |
| desktop | > 1024px | Full layout, sidebar admin |

---

## Trang công khai

### Layout chung

```
┌─────────────────────────────────────┐
│  Header: Logo | Nav | Search | 🌙   │
├─────────────────────────────────────┤
│  Tournament Selector (nếu nhiều giải)│
├─────────────────────────────────────┤
│                                     │
│           Main Content              │
│                                     │
├─────────────────────────────────────┤
│  Footer: Links | Social | Sponsors  │
└─────────────────────────────────────┘
```

### Trang chủ

**Sections (top → bottom):**

1. **Hero Banner** — Full-width, overlay gradient, logo giải, countdown timer
2. **Quick Stats** — 4 cards: Số đội, Số trận, Bàn thắng, Cầu thủ
3. **Upcoming Matches** — Horizontal scroll cards, mỗi card: logo 2 đội, ngày giờ, sân
4. **Latest Results** — 3 trận gần nhất với tỷ số lớn
5. **Standings Preview** — Top 5 BXH, link "Xem tất cả"
6. **Top Scorers** — Avatar + tên + số bàn
7. **News Carousel** — 4 tin nổi bật
8. **Gallery Grid** — 6 ảnh thumbnail
9. **Sponsors** — Logo theo tier (Kim cương lớn nhất)

### Lịch thi đấu

- **Filters**: Vòng đấu (dropdown), Ngày (date picker), Đội (searchable select)
- **View modes**: List (default) | Calendar | Grid
- **Match card**: Team A logo + name | VS/time | Team B logo + name | Venue | Status badge

### Chi tiết trận đấu

```
┌──────────────────────────────────────┐
│  Team A Logo    2 - 1    Team B Logo │
│  Team A Name   FT 90'   Team B Name│
│  [LIVE badge nếu đang diễn ra]      │
├──────────────────────────────────────┤
│  Tabs: Timeline | Lineups | Stats    │
├──────────────────────────────────────┤
│  ⚽ 23' Nguyễn Văn A (Team A)        │
│  🟨 45' Trần Văn B (Team B)         │
│  ⚽ 67' Lê Văn C (Team A) - Penalty  │
├──────────────────────────────────────┤
│  MVP Vote: [Player cards with vote]  │
└──────────────────────────────────────┘
```

### Bảng xếp hạng

- Table responsive: sticky header, horizontal scroll on mobile
- Columns: #, Logo, Tên đội, Trận, T, H, B, BT, BB, HS, Đ
- Highlight đội đi tiếp (top N theo cấu hình)
- Group tabs nếu nhiều bảng

### Dark Mode

- Toggle ở header (sun/moon icon)
- Lưu preference vào localStorage
- Respect `prefers-color-scheme` lần đầu

---

## Trang quản trị

### Layout Admin

```
┌──────────┬────────────────────────────┐
│          │  Topbar: User | Notif | 🌙 │
│ Sidebar  ├────────────────────────────┤
│          │                            │
│ - Dash   │     Content Area           │
│ - Giải   │                            │
│ - Đội    │                            │
│ - Cầu thủ│                            │
│ - Lịch   │                            │
│ - Kết quả│                            │
│ - Tin    │                            │
│ - Thư viện                            │
│ - Tài trợ│                            │
│ - Users  │                            │
│ - Audit  │                            │
│ - Thùng rác                           │
│          │                            │
└──────────┴────────────────────────────┘
```

Sidebar collapsible trên tablet/mobile → hamburger menu.

### Dashboard

- 4 stat cards với icon và trend arrow
- Chart: Trận theo tuần (bar chart)
- Chart: Bàn thắng theo đội (horizontal bar)
- Table: Trận hôm nay
- Feed: Audit log 10 mục gần nhất

### Tournament Wizard

Stepper UI 8 bước, progress bar trên cùng:

| Bước | UI Component |
|------|-------------|
| 1 | Form: tên, upload logo/banner |
| 2 | Number input: số đội |
| 3 | Radio/select: số bảng |
| 4 | Drag & Drop board: kéo thả đội vào bảng |
| 5 | Card select: thể thức thi đấu |
| 6 | 3 number inputs: điểm T/H/B |
| 7 | Select: top N đi tiếp |
| 8 | Preview + Confirm → Generate |

### Nhập kết quả

- Chọn trận từ dropdown hoặc lịch hôm nay
- Score input lớn (2 number fields)
- Dynamic form: thêm bàn thắng (+ button) → player select + minute
- Thẻ vàng/đỏ tương tự
- MVP select
- Buttons: **Lưu nháp** | **Công bố** (confirm dialog)

### Recycle Bin

- Table: checkbox, loại, tên, người xóa, thời gian, còn lại (countdown)
- Bulk actions: Khôi phục | Xóa vĩnh viễn
- Filter theo loại entity

### UX Patterns chung

| Pattern | Mô tả |
|---------|--------|
| Toast notifications | Top-right, auto-dismiss 5s |
| Confirm dialogs | Xóa, công bố kết quả, xóa vĩnh viễn |
| Loading skeletons | Table rows, cards khi fetch |
| Empty states | Illustration + CTA ("Tạo giải đầu tiên") |
| Form validation | Inline errors, red border |
| Bulk select | Checkbox column + action bar |
| Search | Debounce 300ms, highlight match |

### Accessibility

- WCAG 2.1 AA contrast ratio
- Keyboard navigation cho forms và modals
- `aria-label` cho icon buttons
- Focus visible ring

### PWA

- `manifest.json` với icons 192/512
- Service worker cache static assets
- "Add to Home Screen" prompt on mobile
