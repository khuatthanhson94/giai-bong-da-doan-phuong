"use client";

import Link from "next/link";
import Image from "next/image";
import type { Team } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/Card";
import { resolveMediaUrl } from "@/lib/utils";

interface TeamCardProps {
  team: Team;
}

export function TeamCard({ team }: TeamCardProps) {
  const logo = resolveMediaUrl(team.logo);
  const slug = team.id;

  return (
    <Link href={`/doi-bong/${slug}`}>
      <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="flex flex-col items-center p-6 text-center">
          {logo ? (
            <Image src={logo} alt={team.name} width={64} height={64} className="rounded-full object-cover" />
          ) : (
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-2xl text-white"
              style={{ backgroundColor: team.jersey_color || "#15803d" }}
            >
              ⚽
            </div>
          )}
          <h3 className="mt-3 font-semibold">{team.name}</h3>
          <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
            <span>{team.played ?? 0} trận</span>
            <span>{team.points ?? 0} điểm</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
