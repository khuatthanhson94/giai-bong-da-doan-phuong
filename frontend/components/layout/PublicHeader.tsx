"use client";

import Link from "next/link";
import { Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { NAV_LINKS } from "@/lib/constants";
import { useTournament } from "@/hooks/useTournament";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const { tournamentName } = useTournament();
  const { isDark, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-primary">
          <span className="flex h-9 w-9 items-center justify-center rounded-full field-gradient text-sm text-white">
            ⚽
          </span>
          <span className="hidden max-w-[200px] truncate sm:inline">{tournamentName}</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Đổi giao diện">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Link href="/livestream" className="hidden sm:block">
            <Button size="sm" variant="secondary">🔴 Trực tiếp</Button>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(!open)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      <div className={cn("border-t border-border lg:hidden", open ? "block" : "hidden")}>
        <nav className="flex flex-col gap-1 p-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2 text-sm hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
