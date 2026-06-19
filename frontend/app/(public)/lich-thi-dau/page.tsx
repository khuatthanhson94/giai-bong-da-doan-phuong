"use client";

import { useQuery } from "@tanstack/react-query";
import { matchApi } from "@/lib/api";
import { MatchCard } from "@/components/matches/MatchCard";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Match } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";

export default function LichThiDauPage() {
  const { data, isLoading } = useQuery<Match[]>({
    queryKey: ["matches-scheduled"],
    queryFn: () => matchApi.list({ status: "scheduled", published: "1" }),
  });

  const matches: Match[] = data ?? [];
  const rounds: string[] = [...new Set(matches.map((m: Match) => m.round))];

  const defaultRound = rounds.length > 0 ? rounds[0] : "all";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Lịch thi đấu</h1>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : matches.length === 0 ? (
        <p className="text-muted-foreground">Chưa có lịch thi đấu.</p>
      ) : (
        <Tabs defaultValue={defaultRound}>
          <TabsList className="flex-wrap">
            {rounds.map((r) => (
              <TabsTrigger key={r} value={r}>{r}</TabsTrigger>
            ))}
          </TabsList>
          {rounds.map((r) => (
            <TabsContent key={r} value={r}>
              <div className="space-y-3">
                {matches.filter((m) => m.round === r).map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}
