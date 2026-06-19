"use client";

import { Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABELS } from "@/lib/constants";

interface AdminHeaderProps {
  title: string;
  description?: string;
}

export function AdminHeader({ title, description }: AdminHeaderProps) {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="pl-12 lg:pl-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {user && (
          <Badge variant="secondary">{ROLE_LABELS[user.role] || user.role}</Badge>
        )}
        <Button variant="ghost" size="icon" aria-label="Thông báo">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Đổi giao diện">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
