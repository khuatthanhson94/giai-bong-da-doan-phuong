"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { playerApi } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getInitials, resolveMediaUrl } from "@/lib/utils";

export default function CauThuDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: player, isLoading } = useQuery({
    queryKey: ["player", slug],
    queryFn: () => playerApi.get(slug),
    enabled: !!slug,
  });

  if (isLoading) return <Skeleton className="h-64" />;
  if (!player) return <p className="text-muted-foreground">Không tìm thấy cầu thủ.</p>;

  const photo = resolveMediaUrl(player.photo);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center p-8 text-center">
          {photo ? (
            <Image src={photo} alt={player.name} width={120} height={120} className="rounded-full object-cover" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full field-gradient text-3xl font-bold text-white">
              {getInitials(player.name)}
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold">{player.name}</h1>
          <p className="text-muted-foreground">{player.team?.name}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {player.jersey_number != null && <Badge>#{player.jersey_number}</Badge>}
            {player.position && <Badge variant="secondary">{player.position}</Badge>}
          </div>
          <div className="mt-6 grid w-full grid-cols-4 gap-2 text-center">
            {[
              { label: "Bàn", value: player.goals ?? 0 },
              { label: "Kiến", value: player.assists ?? 0 },
              { label: "Vàng", value: player.yellow_cards ?? 0 },
              { label: "Đỏ", value: player.red_cards ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-muted/50 p-2">
                <p className="text-xl font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
