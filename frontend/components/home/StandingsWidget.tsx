"use client";

import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function StandingsWidget() {
  const { homeData } = useTournament();
  const standings = homeData?.standings ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Bảng xếp hạng</CardTitle>
        <Link href="/bang-xep-hang" className="text-sm text-primary hover:underline">Chi tiết</Link>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <StandingsTable standings={standings} compact />
      </CardContent>
    </Card>
  );
}
