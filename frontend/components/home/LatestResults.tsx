"use client";

import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { MatchCard } from "@/components/matches/MatchCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function LatestResults() {
  const { homeData } = useTournament();
  const match = homeData?.latestMatch;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Kết quả mới nhất</CardTitle>
        <Link href="/ket-qua" className="text-sm text-primary hover:underline">Xem tất cả</Link>
      </CardHeader>
      <CardContent>
        {match ? (
          <MatchCard match={match} showScore />
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có kết quả.</p>
        )}
      </CardContent>
    </Card>
  );
}
