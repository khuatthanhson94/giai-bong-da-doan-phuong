"use client";

import Link from "next/link";
import Image from "next/image";
import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { resolveMediaUrl, getInitials } from "@/lib/utils";

export function TopScorers() {
  const { homeData } = useTournament();
  const scorers = homeData?.topScorers ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Vua phá lưới</CardTitle>
        <Link href="/cau-thu" className="text-sm text-primary hover:underline">Danh sách</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu ghi bàn.</p>
        ) : (
          scorers.map((p, i) => {
            const photo = resolveMediaUrl(p.photo);
            return (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
                {photo ? (
                  <Image src={photo} alt={p.name} width={36} height={36} className="rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                    {getInitials(p.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.team_name}</p>
                </div>
                <span className="font-bold text-primary">{p.goals ?? 0}</span>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
