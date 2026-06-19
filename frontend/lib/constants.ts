// Normalize and build the API URL based on env vars
let rawApiUrl =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3004/api"
    : "https://giai-bong-da-doan-phuong-backend.onrender.com/api");

if (rawApiUrl && !rawApiUrl.endsWith("/api") && !rawApiUrl.endsWith("/api/")) {
  rawApiUrl = rawApiUrl.replace(/\/$/, "") + "/api";
}

export const API_URL = rawApiUrl;

let rawUploadUrl =
  process.env.NEXT_PUBLIC_UPLOAD_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3004"
    : "https://giai-bong-da-doan-phuong-backend.onrender.com");

rawUploadUrl = rawUploadUrl.replace(/\/$/, "");
export const UPLOAD_URL = rawUploadUrl;

let rawWsUrl =
  process.env.NEXT_PUBLIC_WS_URL ||
  (process.env.NODE_ENV === "development"
    ? "ws://localhost:3004/ws"
    : "wss://giai-bong-da-doan-phuong-backend.onrender.com/ws");

export const WS_URL = rawWsUrl;

export const AUTH_TOKEN_KEY = "gbddp_token";
export const AUTH_REFRESH_KEY = "gbddp_refresh";
export const AUTH_USER_KEY = "gbddp_user";
export const AUTH_COOKIE = "gbddp_auth";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  ORGANIZER: "organizer",
  SCOREKEEPER: "scorekeeper",
  MC: "mc",
  MEDIA: "media",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  organizer: "Ban tổ chức",
  scorekeeper: "Cán bộ nhập kết quả",
  mc: "MC",
  media: "Truyền thông",
  editor: "Biên tập viên",
  viewer: "Người xem",
};

export const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled: "Sắp diễn ra",
  live: "Đang diễn ra",
  finished: "Kết thúc",
  postponed: "Hoãn",
  cancelled: "Hủy",
};

export const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/dieu-le", label: "Điều lệ" },
  { href: "/lich-thi-dau", label: "Lịch thi đấu" },
  { href: "/ket-qua", label: "Kết quả" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng" },
  { href: "/doi-bong", label: "Đội bóng" },
  { href: "/cau-thu", label: "Cầu thủ" },
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/thu-vien", label: "Thư viện" },
  { href: "/video", label: "Video" },
  { href: "/livestream", label: "Livestream" },
  { href: "/nha-tai-tro", label: "Nhà tài trợ" },
  { href: "/lien-he", label: "Liên hệ" },
] as const;

export const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Tổng quan", icon: "LayoutDashboard" },
  { href: "/admin/seasons", label: "Mùa giải", icon: "CalendarRange" },
  { href: "/admin/tournaments", label: "Giải đấu", icon: "Trophy" },
  { href: "/admin/tournament-wizard", label: "Tournament Wizard", icon: "Wand2" },
  { href: "/admin/teams", label: "Đội bóng", icon: "Shield" },
  { href: "/admin/players", label: "Cầu thủ", icon: "Users" },
  { href: "/admin/matches", label: "Lịch thi đấu", icon: "Calendar" },
  { href: "/admin/schedule", label: "Tạo lịch thi đấu", icon: "Wand2" },
  { href: "/admin/results", label: "Kết quả", icon: "ClipboardList" },
  { href: "/admin/news", label: "Tin tức", icon: "Newspaper" },
  { href: "/admin/gallery", label: "Thư viện", icon: "Image" },
  { href: "/admin/sponsors", label: "Nhà tài trợ", icon: "Handshake" },
  { href: "/admin/users", label: "Người dùng", icon: "UserCog" },
  { href: "/admin/import-export", label: "Nhập/Xuất", icon: "Download" },
  { href: "/admin/audit-logs", label: "Nhật ký", icon: "ScrollText" },
  { href: "/admin/recycle-bin", label: "Thùng rác", icon: "Trash2" },
  { href: "/admin/backups", label: "Sao lưu", icon: "Database" },
  { href: "/admin/settings", label: "Cài đặt", icon: "Settings" },
] as const;
