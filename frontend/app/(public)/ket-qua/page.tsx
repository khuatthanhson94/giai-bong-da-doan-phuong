"use client";

import { useQuery } from "@tanstack/react-query";
import { matchApi } from "@/lib/api";
import { MatchCard } from "@/components/matches/MatchCard";
import { Skeleton } from "@/components/ui/Skeleton";

export default function KetQuaPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["matches-finished"],
    queryFn: () => matchApi.list({ status: "finished", published: "1" }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Kết quả</h1>
      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : (data ?? []).length === 0 ? (
        <p className="text-muted-foreground">Chưa có kết quả.</p>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((m) => <MatchCard key={m.id} match={m} showScore />)}
        </div>
      )}
    </div>
  );
}
