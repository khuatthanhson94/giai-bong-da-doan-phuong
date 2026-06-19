"use client";

import type { Match } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface MatchStatsProps {
  match: Match;
}

export function MatchStats({ match }: MatchStatsProps) {
  const goalsA = (match.goals ?? []).filter((g) => g.team_name === (match.team_a?.name || match.team_a_name)).length;
  const goalsB = (match.goals ?? []).filter((g) => g.team_name === (match.team_b?.name || match.team_b_name)).length;
  const yellows = match.yellow_cards?.length ?? 0;
  const reds = match.red_cards?.length ?? 0;

  const stats = [
    { label: "Bàn thắng (chủ)", value: match.score_a ?? goalsA },
    { label: "Bàn thắng (khách)", value: match.score_b ?? goalsB },
    { label: "Thẻ vàng", value: yellows },
    { label: "Thẻ đỏ", value: reds },
  ];

  return (
    <Card>
      <CardHeader><CardTitle>Thống kê</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-2xl font-bold text-primary">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        {match.motm && (
          <p className="mt-4 text-sm">
            ⭐ Cầu thủ xuất sắc: <strong>{match.motm.name}</strong>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
