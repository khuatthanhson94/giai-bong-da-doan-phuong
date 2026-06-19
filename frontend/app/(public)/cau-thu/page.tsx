"use client";

import { useQuery } from "@tanstack/react-query";
import { playerApi } from "@/lib/api";
import { PlayerCard } from "@/components/teams/PlayerCard";
import { Skeleton } from "@/components/ui/Skeleton";
import { Input } from "@/components/ui/Input";
import { useState } from "react";

export default function CauThuPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({ queryKey: ["players"], queryFn: () => playerApi.list() });

  const filtered = (data ?? []).filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.team?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cầu thủ</h1>
      <Input placeholder="Tìm cầu thủ hoặc đội..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" />
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => <PlayerCard key={p.id} player={p} />)}
        </div>
      )}
    </div>
  );
}
