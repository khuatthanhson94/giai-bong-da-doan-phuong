"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { teamApi } from "@/lib/api";
import { PlayerCard } from "@/components/teams/PlayerCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { resolveMediaUrl } from "@/lib/utils";

export default function DoiBongDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: team, isLoading } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => teamApi.get(slug),
    enabled: !!slug,
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!team) return <p className="text-muted-foreground">Không tìm thấy đội.</p>;

  const logo = resolveMediaUrl(team.logo);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {logo ? (
          <Image src={logo} alt={team.name} width={80} height={80} className="rounded-full" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full field-gradient text-3xl text-white">⚽</div>
        )}
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <p className="text-muted-foreground">{team.points ?? 0} điểm · {team.played ?? 0} trận</p>
        </div>
      </div>
      {team.description && (
        <Card><CardContent className="p-4 text-sm text-muted-foreground">{team.description}</CardContent></Card>
      )}
      <div>
        <h2 className="mb-4 text-xl font-semibold">Danh sách cầu thủ</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(team.players ?? []).map((p) => <PlayerCard key={p.id} player={{ ...p, team: { id: team.id, name: team.name } }} />)}
        </div>
      </div>
    </div>
  );
}
