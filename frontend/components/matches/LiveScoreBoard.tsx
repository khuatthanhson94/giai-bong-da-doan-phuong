"use client";

import type { Match } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { formatScore } from "@/lib/utils";

interface LiveScoreBoardProps {
  match: Match;
}

export function LiveScoreBoard({ match }: LiveScoreBoardProps) {
  const teamA = match.team_a?.name || match.team_a_name || "Đội A";
  const teamB = match.team_b?.name || match.team_b_name || "Đội B";

  return (
    <div className="rounded-2xl field-gradient p-6 text-white sm:p-8">
      <div className="mb-4 flex items-center justify-center gap-2">
        {match.status === "live" && <Badge variant="live">TRỰC TIẾP</Badge>}
        <span className="text-sm text-green-100">{match.round}</span>
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
        <div>
          <p className="text-lg font-bold sm:text-xl">{teamA}</p>
        </div>
        <div>
          <p className="text-4xl font-black tabular-nums sm:text-5xl">
            {formatScore(match.score_a, match.score_b)}
          </p>
          <p className="mt-1 text-xs text-green-100">{match.match_time?.slice(0, 5)} · {match.venue}</p>
        </div>
        <div>
          <p className="text-lg font-bold sm:text-xl">{teamB}</p>
        </div>
      </div>
    </div>
  );
}
