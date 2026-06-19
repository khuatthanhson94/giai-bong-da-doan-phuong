"use client";

import Link from "next/link";
import Image from "next/image";
import type { Match } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { MATCH_STATUS_LABELS } from "@/lib/constants";
import { cn, formatDateTime, formatScore, resolveMediaUrl } from "@/lib/utils";

interface MatchCardProps {
  match: Match;
  compact?: boolean;
  showScore?: boolean;
}

export function MatchCard({ match, compact, showScore }: MatchCardProps) {
  const teamA = match.team_a?.name || match.team_a_name || "Đội A";
  const teamB = match.team_b?.name || match.team_b_name || "Đội B";
  const logoA = resolveMediaUrl(match.team_a?.logo || match.team_a_logo);
  const logoB = resolveMediaUrl(match.team_b?.logo || match.team_b_logo);
  const isFinished = match.status === "finished";
  const displayScore = showScore || isFinished;

  return (
    <Link
      href={`/ket-qua/${match.id}`}
      className={cn(
        "block rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40",
        compact && "p-3"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{match.round}</span>
        <Badge variant={match.status === "live" ? "live" : isFinished ? "success" : "secondary"}>
          {MATCH_STATUS_LABELS[match.status] || match.status}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-3">
        <TeamSide name={teamA} logo={logoA} align="left" />
        <div className="text-center">
          {displayScore ? (
            <p className="text-xl font-bold tabular-nums">{formatScore(match.score_a, match.score_b)}</p>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">VS</p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(match.match_date, match.match_time)}</p>
        </div>
        <TeamSide name={teamB} logo={logoB} align="right" />
      </div>
      {!compact && <p className="mt-2 text-xs text-muted-foreground">📍 {match.venue}</p>}
    </Link>
  );
}

function TeamSide({ name, logo, align }: { name: string; logo: string | null; align: "left" | "right" }) {
  return (
    <div className={cn("flex flex-1 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      {logo ? (
        <Image src={logo} alt={name} width={32} height={32} className="rounded-full object-cover" />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs">⚽</div>
      )}
      <span className="line-clamp-2 text-sm font-medium">{name}</span>
    </div>
  );
}
