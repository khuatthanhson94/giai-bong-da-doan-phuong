"use client";

import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function GioiThieuPage() {
  const { settings, loading } = useTournament();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Giới thiệu</h1>
      {loading ? (
        <Skeleton className="h-48" />
      ) : (
        <Card>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none p-6">
            <p>{settings.about || settings.site_description || "Ban tổ chức giải bóng đá đoàn phường — nơi kết nối đam mê thể thao cộng đồng."}</p>
            {settings.organizer && <p><strong>Ban tổ chức:</strong> {settings.organizer}</p>}
            {settings.season_name && <p><strong>Mùa giải:</strong> {settings.season_name}</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
