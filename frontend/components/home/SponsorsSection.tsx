"use client";

import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function SponsorsSection() {
  const { settings } = useTournament();
  const sponsors = (settings.sponsors || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (sponsors.length === 0) return null;

  return (
    <Card>
      <CardHeader><CardTitle>Nhà tài trợ</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {sponsors.map((name) => (
            <div
              key={name}
              className="flex h-16 min-w-[120px] items-center justify-center rounded-lg border border-border bg-muted/50 px-4 text-sm font-medium"
            >
              {name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
