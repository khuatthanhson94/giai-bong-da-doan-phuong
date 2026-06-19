"use client";

import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/lib/api";
import { StandingsTable } from "@/components/standings/StandingsTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";

export default function BangXepHangPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["standings"],
    queryFn: publicApi.getStandings,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Bảng xếp hạng</h1>
      <Card>
        <CardContent className="p-0 pt-2">
          {isLoading ? <Skeleton className="m-4 h-64" /> : <StandingsTable standings={data ?? []} />}
        </CardContent>
      </Card>
    </div>
  );
}
