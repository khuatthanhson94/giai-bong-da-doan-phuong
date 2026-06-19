"use client";

import Link from "next/link";
import { useTournament } from "@/hooks/useTournament";
import { MatchCard } from "@/components/matches/MatchCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export function UpcomingMatches() {
  const { homeData, loading } = useTournament();
  const matches = homeData?.upcomingMatches ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-4">
        <CardTitle>Trận sắp diễn ra</CardTitle>
        <Link href="/lich-thi-dau" className="text-sm text-primary hover:underline">Xem tất cả</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có lịch thi đấu.</p>
        ) : (
          matches.map((m) => <MatchCard key={m.id} match={m} compact />)
        )}
      </CardContent>
    </Card>
  );
}
