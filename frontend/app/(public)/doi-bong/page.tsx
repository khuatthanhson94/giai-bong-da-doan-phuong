"use client";

import { useQuery } from "@tanstack/react-query";
import { teamApi } from "@/lib/api";
import { TeamCard } from "@/components/teams/TeamCard";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DoiBongPage() {
  const { data, isLoading } = useQuery({ queryKey: ["teams"], queryFn: () => teamApi.list() });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Đội bóng</h1>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((team) => <TeamCard key={team.id} team={team} />)}
        </div>
      )}
    </div>
  );
}
