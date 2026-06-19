"use client";

import Image from "next/image";
import type { Standing } from "@/lib/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { resolveMediaUrl } from "@/lib/utils";

interface StandingsTableProps {
  standings: Standing[];
  compact?: boolean;
}

export function StandingsTable({ standings, compact }: StandingsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Đội</TableHead>
          {!compact && <TableHead className="text-center">Trận</TableHead>}
          {!compact && <TableHead className="text-center hidden sm:table-cell">T</TableHead>}
          {!compact && <TableHead className="text-center hidden sm:table-cell">H</TableHead>}
          {!compact && <TableHead className="text-center hidden sm:table-cell">B</TableHead>}
          {!compact && <TableHead className="text-center hidden md:table-cell">HS</TableHead>}
          <TableHead className="text-center font-bold">Điểm</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((s, i) => {
          const logo = resolveMediaUrl(s.logo);
          return (
            <TableRow key={s.team_id}>
              <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {logo ? (
                    <Image src={logo} alt={s.name} width={24} height={24} className="rounded-full" />
                  ) : (
                    <span className="text-sm">⚽</span>
                  )}
                  <span className="font-medium">{s.name}</span>
                </div>
              </TableCell>
              {!compact && <TableCell className="text-center">{s.played}</TableCell>}
              {!compact && <TableCell className="text-center hidden sm:table-cell">{s.won}</TableCell>}
              {!compact && <TableCell className="text-center hidden sm:table-cell">{s.drawn}</TableCell>}
              {!compact && <TableCell className="text-center hidden sm:table-cell">{s.lost}</TableCell>}
              {!compact && <TableCell className="text-center hidden md:table-cell">{s.goal_diff > 0 ? `+${s.goal_diff}` : s.goal_diff}</TableCell>}
              <TableCell className="text-center font-bold text-primary">{s.points}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
