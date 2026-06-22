/** Backend Express trên Render (hoặc localhost khi dev) */
const RENDER_API =
  process.env.NEXT_PUBLIC_RENDER_API_URL ||
  "https://giai-bong-da-doan-phuong-backend.onrender.com";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3004/api"
    : `${RENDER_API.replace(/\/$/, "")}/api`);

export const UPLOAD_URL =
  process.env.NEXT_PUBLIC_UPLOAD_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3004"
    : RENDER_API.replace(/\/$/, ""));

/** Frontend URL cho CORS configuration */
export const FRONTEND_URL =
  process.env.NEXT_PUBLIC_FRONTEND_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000"
    : "");

export const AUTH_TOKEN_KEY = "gbddp_token";
export const AUTH_USER_KEY = "gbddp_user";
export const AUTH_COOKIE = "gbddp_auth";

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  EDITOR: "editor",
  SCOREKEEPER: "scorekeeper",
} as const;

export const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  editor: "Biên tập viên",
  scorekeeper: "Nhập kết quả",
};

export const MATCH_STATUS_LABELS: Record<string, string> = {
  scheduled: "Sắp diễn ra",
  live: "Đang diễn ra",
  finished: "Kết thúc",
  postponed: "Hoãn",
};

export const NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/gioi-thieu", label: "Giới thiệu" },
  { href: "/lich-thi-dau", label: "Lịch thi đấu" },
  { href: "/ket-qua", label: "Kết quả" },
  { href: "/bang-xep-hang", label: "Bảng xếp hạng" },
  { href: "/doi-bong", label: "Đội bóng" },
  { href: "/cau-thu", label: "Cầu thủ" },
  { href: "/tin-tuc", label: "Tin tức" },
  { href: "/thu-vien", label: "Thư viện" },
  { href: "/lien-he", label: "Liên hệ" },
] as const;

/** Menu admin — khớp client cũ (Express API) */
export const ADMIN_NAV = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "LayoutDashboard", roles: ["super_admin", "admin", "editor", "scorekeeper"] },
  { href: "/admin/teams", label: "Đội bóng", icon: "Shield", roles: ["super_admin", "admin"] },
  { href: "/admin/groups", label: "Bảng (Groups)", icon: "Trophy", roles: ["super_admin", "admin"] },
  { href: "/admin/players", label: "Cầu thủ", icon: "Users", roles: ["super_admin", "admin"] },
  { href: "/admin/matches", label: "Lịch thi đấu", icon: "Calendar", roles: ["super_admin", "admin"] },
  { href: "/admin/results", label: "Nhập kết quả", icon: "ClipboardList", roles: ["super_admin", "admin", "scorekeeper"] },
  { href: "/admin/news", label: "Tin tức", icon: "Newspaper", roles: ["super_admin", "admin", "editor"] },
  { href: "/admin/gallery", label: "Thư viện", icon: "Image", roles: ["super_admin", "admin", "editor"] },
  { href: "/admin/users", label: "Tài khoản", icon: "UserCog", roles: ["super_admin"] },
  { href: "/admin/settings", label: "Cài đặt", icon: "Settings", roles: ["super_admin", "admin"] },
  { href: "/admin/schedule", label: "Lịch knockout", icon: "Wand2", roles: ["super_admin", "admin"] },
] as const;
