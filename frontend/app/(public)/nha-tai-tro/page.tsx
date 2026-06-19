"use client";

import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent } from "@/components/ui/Card";

export default function NhaTaiTroPage() {
  const { settings } = useTournament();
  const sponsors = (settings.sponsors || "").split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Nhà tài trợ</h1>
      {sponsors.length === 0 ? (
        <p className="text-muted-foreground">Danh sách nhà tài trợ sẽ được cập nhật sớm.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sponsors.map((name) => (
            <Card key={name}>
              <CardContent className="flex h-32 items-center justify-center p-6 text-center font-semibold">
                {name}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {settings.sponsor_info && (
        <Card><CardContent className="p-6 text-sm text-muted-foreground">{settings.sponsor_info}</CardContent></Card>
      )}
    </div>
  );
}
