"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { matchApi } from "@/lib/api";
import { LiveScoreBoard } from "@/components/matches/LiveScoreBoard";
import { MatchTimeline } from "@/components/matches/MatchTimeline";
import { MatchStats } from "@/components/matches/MatchStats";
import { Skeleton } from "@/components/ui/Skeleton";

export default function KetQuaDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: match, isLoading } = useQuery({
    queryKey: ["match", id],
    queryFn: () => matchApi.get(id),
    enabled: !!id,
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!match) return <p className="text-muted-foreground">Không tìm thấy trận đấu.</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <LiveScoreBoard match={match} />
      <MatchStats match={match} />
      <MatchTimeline match={match} />
      {match.notes && (
        <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">{match.notes}</p>
      )}
    </div>
  );
}
