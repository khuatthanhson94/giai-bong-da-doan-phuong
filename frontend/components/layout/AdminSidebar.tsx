"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarRange,
  ClipboardList,
  Database,
  Download,
  Handshake,
  Image,
  LayoutDashboard,
  LogOut,
  Menu,
  Newspaper,
  ScrollText,
  Settings,
  Shield,
  Trash2,
  Trophy,
  UserCog,
  Users,
  Wand2,
  X,
} from "lucide-react";
import { useState } from "react";
import { ADMIN_NAV } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Shield,
  Users,
  Calendar,
  CalendarRange,
  ClipboardList,
  Handshake,
  Trophy,
  Newspaper,
  Image,
  Wand2,
  Settings,
  UserCog,
  Download,
  ScrollText,
  Trash2,
  Database,
};

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const Nav = () => (
    <>
      <div className="border-b border-white/10 p-4">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-sidebar-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">⚽</span>
          Quản trị giải
        </Link>
        {user && (
          <p className="mt-2 truncate text-xs text-sidebar-foreground/70">{user.username}</p>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {ADMIN_NAV.filter((item) => !user?.role || (item.roles as readonly string[]).includes(user.role)).map((item) => {
          const Icon = ICONS[item.icon] || LayoutDashboard;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-white/10 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3 space-y-2">
        <Link href="/" className="block rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-white/10">
          ← Về trang chủ
        </Link>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-white/10" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
        </Button>
      </div>
    </>
  );

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed left-4 top-4 z-50 lg:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar lg:flex">
        <Nav />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col bg-sidebar">
            <Button variant="ghost" size="icon" className="absolute right-2 top-2 text-sidebar-foreground" onClick={() => setMobileOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
            <Nav />
          </aside>
        </div>
      )}
    </>
  );
}
