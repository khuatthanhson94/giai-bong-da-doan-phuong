"use client";

import type { Match } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Goal } from "lucide-react";

interface MatchTimelineProps {
  match: Match;
}

export function MatchTimeline({ match }: MatchTimelineProps) {
  const events = [
    ...(match.goals ?? []).map((g) => ({
      minute: g.minute,
      type: g.is_own_goal ? "own_goal" : "goal",
      label: `${g.player_name}${g.is_own_goal ? " (OG)" : ""}`,
      team: g.team_name,
    })),
    ...(match.yellow_cards ?? []).map((y) => ({
      minute: y.minute,
      type: "yellow",
      label: y.player_name || "",
      team: "",
    })),
    ...(match.red_cards ?? []).map((r) => ({
      minute: r.minute,
      type: "red",
      label: r.player_name || "",
      team: "",
    })),
  ].sort((a, b) => a.minute - b.minute);

  return (
    <Card>
      <CardHeader><CardTitle>Diễn biến trận đấu</CardTitle></CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có sự kiện.</p>
        ) : (
          <ul className="space-y-3">
            {events.map((e, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-10 shrink-0 font-bold text-primary">{e.minute}&apos;</span>
                <span>
                  {e.type === "goal" && <Goal className="mr-1 inline h-4 w-4 text-primary" />}
                  {e.type === "yellow" && "🟨 "}
                  {e.type === "red" && "🟥 "}
                  {e.type === "own_goal" && "⚽ OG "}
                  <strong>{e.label}</strong>
                  {e.team && <span className="text-muted-foreground"> ({e.team})</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
