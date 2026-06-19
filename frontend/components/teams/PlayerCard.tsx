"use client";

import Link from "next/link";
import Image from "next/image";
import type { Player } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getInitials, resolveMediaUrl } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const photo = resolveMediaUrl(player.photo);

  return (
    <Link href={`/cau-thu/${player.id}`}>
      <Card className="h-full transition-all hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-4">
          {photo ? (
            <Image src={photo} alt={player.name} width={56} height={56} className="rounded-full object-cover" />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
              {getInitials(player.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {player.jersey_number != null && (
                <Badge variant="secondary">#{player.jersey_number}</Badge>
              )}
              <h3 className="truncate font-semibold">{player.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{player.team?.name || player.team_name}</p>
            {player.position && <p className="text-xs text-muted-foreground">{player.position}</p>}
          </div>
          {(player.goals ?? 0) > 0 && (
            <span className="text-lg font-bold text-primary">{player.goals}</span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
