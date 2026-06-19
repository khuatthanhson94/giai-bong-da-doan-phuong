"use client";

import { useEffect, useState } from "react";
import { tournamentApi, matchApi, publicApi } from "@/lib/api";
import { Match, Team } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface Tournament {
  id: number;
  name: string;
  is_published: boolean;
  status: string;
  groups?: Group[];
}

interface Group {
  id: number;
  name: string;
  code: string;
  teams?: Team[];
}

export default function GroupSchedule() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);

  // Load tournaments on mount
  useEffect(() => {
    setLoading(true);
    // Fetch active tournament first to auto-select
    publicApi.getHome()
      .then((homeData) => {
        const activeId = homeData.activeTournament?.id;
        tournamentApi.list()
          .then((list) => {
            setTournaments(list);
            if (activeId && list.some((t: Tournament) => t.id === activeId)) {
              setSelectedTournamentId(String(activeId));
            } else if (list.length > 0) {
              setSelectedTournamentId(String(list[0].id));
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        // Fallback if home API fails
        tournamentApi.list()
          .then((list) => {
            setTournaments(list);
            if (list.length > 0) {
              setSelectedTournamentId(String(list[0].id));
            }
          })
          .catch(() => {});
      })
      .finally(() => setLoading(false));
  }, []);

  // Load groups when tournament selection changes
  useEffect(() => {
    if (!selectedTournamentId) {
      setGroups([]);
      setSelectedGroupId("");
      setMatches([]);
      return;
    }
    tournamentApi.get(Number(selectedTournamentId))
      .then((data) => {
        const grps = data.groups || [];
        setGroups(grps);
        if (grps.length > 0) {
          setSelectedGroupId(String(grps[0].id));
        } else {
          setSelectedGroupId("");
          setMatches([]);
        }
      })
      .catch(() => {
        setGroups([]);
        setSelectedGroupId("");
        setMatches([]);
      });
  }, [selectedTournamentId]);

  // Load matches for the selected group
  const loadMatches = (groupId: string) => {
    if (!groupId || !selectedTournamentId) {
      setMatches([]);
      return;
    }
    matchApi.list({
      tournament_id: Number(selectedTournamentId),
      group_id: Number(groupId)
    })
      .then((data) => {
        setMatches(data);
      })
      .catch(() => {
        setMatches([]);
      });
  };

  useEffect(() => {
    loadMatches(selectedGroupId);
  }, [selectedGroupId, selectedTournamentId]);

  const handleAutoGenerate = async () => {
    if (!selectedGroupId) {
      alert("Vui lòng chọn một bảng đấu trước khi tự động tạo lịch.");
      return;
    }
    setGenerating(true);
    try {
      await matchApi.generateGroupSchedule(Number(selectedGroupId));
      loadMatches(selectedGroupId);
      alert("Lịch vòng bảng đã được tự động tạo thành công.");
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || "Có lỗi khi tạo lịch vòng bảng.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card border p-4 rounded-xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-foreground">Quản lý lịch vòng bảng</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Chọn giải đấu và bảng đấu để tự động sinh lịch thi đấu vòng tròn</p>
        </div>
        <Button
          onClick={handleAutoGenerate}
          disabled={generating || !selectedGroupId}
          className="w-full sm:w-auto"
        >
          {generating ? "Đang tạo lịch..." : "Tự động tạo lịch cho bảng"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chọn giải đấu</label>
          <select
            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedTournamentId}
            onChange={(e) => setSelectedTournamentId(e.target.value)}
            disabled={loading}
          >
            <option value="">-- Chọn giải đấu --</option>
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.status === "active" ? "(Đang diễn ra)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Chọn bảng đấu</label>
          <select
            className="flex h-10 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            disabled={loading || groups.length === 0}
          >
            <option value="">-- Chọn bảng --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground text-xs uppercase font-semibold">
                <th className="py-3 px-4">Vòng</th>
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4">Giờ</th>
                <th className="py-3 px-4">Đội A</th>
                <th className="py-3 px-4">Đội B</th>
                <th className="py-3 px-4">Địa điểm</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {matches.map((m) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="py-3 px-4 font-medium">{m.round}</td>
                  <td className="py-3 px-4">{m.match_date}</td>
                  <td className="py-3 px-4">{m.match_time}</td>
                  <td className="py-3 px-4 font-semibold text-primary">{m.team_a_name}</td>
                  <td className="py-3 px-4 font-semibold text-primary">{m.team_b_name}</td>
                  <td className="py-3 px-4">{m.venue}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        m.published
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : m.status === "finished"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}
                    >
                      {m.published ? "Đã công bố" : m.status === "finished" ? "Đã kết quả" : "Chưa đấu"}
                    </span>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted-foreground py-8 italic">
                    Chưa có lịch thi đấu nào cho bảng này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
