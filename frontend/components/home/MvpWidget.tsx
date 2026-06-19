"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { publicApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { resolveMediaUrl, getInitials } from "@/lib/utils";

export function MvpWidget() {
  const { data, isLoading } = useQuery({
    queryKey: ["statistics"],
    queryFn: publicApi.getStatistics,
  });

  const mvp = data?.topScorers?.[0];

  return (
    <Card>
      <CardHeader><CardTitle>Cầu thủ nổi bật</CardTitle></CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32" />
        ) : mvp ? (
          <div className="flex flex-col items-center text-center">
            {resolveMediaUrl(mvp.photo) ? (
              <Image src={resolveMediaUrl(mvp.photo)!} alt={mvp.name} width={80} height={80} className="rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full field-gradient text-2xl font-bold text-white">
                {getInitials(mvp.name)}
              </div>
            )}
            <p className="mt-3 font-semibold">{mvp.name}</p>
            <p className="text-sm text-muted-foreground">{mvp.team_name}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{mvp.goals ?? 0} bàn</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
        )}
      </CardContent>
    </Card>
  );
}
