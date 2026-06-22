"use client";

import { useEffect, useState, useCallback } from "react";
import { groupApi, matchApi } from "@/lib/api";
import type { GroupWithTeams } from "@/lib/api";
import type { Match } from "@/lib/types";
import { Button } from "@/components/ui/Button";

export default function GroupSchedule() {
  const [groups, setGroups] = useState<GroupWithTeams[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const loadGroups = useCallback(async () => {
    const data = await groupApi.list();
    setGroups(data);
    if (data.length > 0 && !selectedGroupId) {
      setSelectedGroupId(String(data[0].id));
    }
  }, [selectedGroupId]);

  const loadMatches = useCallback(async (groupId: string) => {
    if (!groupId) {
      setMatches([]);
      return;
    }
    const group = groups.find((g) => String(g.id) === groupId);
    const teamIds = new Set((group?.teams ?? []).map((t) => t.id));
    const all = await matchApi.list();
    const filtered = all.filter(
      (m) =>
        teamIds.has(m.team_a_id) &&
        teamIds.has(m.team_b_id) &&
        /bảng|lượt|group/i.test(String(m.round))
    );
    setMatches(filtered);
  }, [groups]);

  useEffect(() => {
    loadGroups().finally(() => setLoading(false));
  }, [loadGroups]);

  useEffect(() => {
    if (selectedGroupId) loadMatches(selectedGroupId);
  }, [selectedGroupId, groups, loadMatches]);

  const handleAutoGenerate = async () => {
    setGenerating(true);
    try {
      await matchApi.generateGroupSchedule();
      await loadMatches(selectedGroupId);
      alert("Lịch vòng bảng đã được tạo thành công cho tất cả các bảng.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Có lỗi khi tạo lịch";
      alert(msg);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Quản lý lịch vòng bảng</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Tự động sinh lịch vòng tròn cho tất cả bảng đã phân đội
          </p>
        </div>
        <Button onClick={handleAutoGenerate} disabled={generating || groups.length === 0}>
          {generating ? "Đang tạo lịch..." : "Tự động tạo lịch vòng bảng"}
        </Button>
      </div>

      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Xem lịch theo bảng
        </label>
        <select
          className="flex h-10 w-full max-w-md rounded-lg border border-border bg-card px-3 text-sm"
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
          disabled={loading}
        >
          <option value="">-- Chọn bảng --</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name} ({g.teams?.length ?? 0} đội)
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-semibold uppercase text-muted-foreground">
              <th className="px-4 py-3">Vòng</th>
              <th className="px-4 py-3">Ngày</th>
              <th className="px-4 py-3">Giờ</th>
              <th className="px-4 py-3">Đội A</th>
              <th className="px-4 py-3">Đội B</th>
              <th className="px-4 py-3">Địa điểm</th>
              <th className="px-4 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matches.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{m.round}</td>
                <td className="px-4 py-3">{m.match_date}</td>
                <td className="px-4 py-3">{m.match_time}</td>
                <td className="px-4 py-3 font-semibold text-primary">{m.team_a_name || m.team_a?.name}</td>
                <td className="px-4 py-3 font-semibold text-primary">{m.team_b_name || m.team_b?.name}</td>
                <td className="px-4 py-3">{m.venue}</td>
                <td className="px-4 py-3">{m.status}</td>
              </tr>
            ))}
            {matches.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center italic text-muted-foreground">
                  Chưa có lịch thi đấu cho bảng này.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
