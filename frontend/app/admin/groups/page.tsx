"use client";

import { useEffect, useState, useCallback } from "react";
import { groupApi, teamApi, publicApi } from "@/lib/api";
import type { GroupWithTeams } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";
import type { Team } from "@/lib/types";

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<GroupWithTeams[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [groupCount, setGroupCount] = useState(2);
  const [newGroupName, setNewGroupName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [g, t] = await Promise.all([groupApi.list(), teamApi.list()]);
    setGroups(g);
    setTeams(t);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const assignedIds = new Set(groups.flatMap((g) => (g.teams ?? []).map((t) => t.id)));
  const unassigned = teams.filter((t) => !assignedIds.has(t.id));

  const handleGenerate = async () => {
    try {
      await groupApi.generate(groupCount);
      toast.success("Đã tạo bảng và phân đội tự động");
      await loadData();
    } catch {
      toast.error("Không thể tạo bảng");
    }
  };

  const handleCreate = async () => {
    if (!newGroupName.trim()) return;
    try {
      await groupApi.create(newGroupName.trim());
      setNewGroupName("");
      toast.success("Đã thêm bảng");
      await loadData();
    } catch {
      toast.error("Không thể thêm bảng");
    }
  };

  const assignTeam = async (groupId: number, teamId: number) => {
    try {
      await groupApi.assignTeams(groupId, [teamId]);
      await loadData();
    } catch {
      toast.error("Không thể gán đội");
    }
  };

  const removeTeam = async (groupId: number, teamId: number) => {
    try {
      await groupApi.removeTeam(groupId, teamId);
      await loadData();
    } catch {
      toast.error("Không thể xóa đội khỏi bảng");
    }
  };

  if (loading) return <p>Đang tải...</p>;

  return (
    <div className="space-y-6">
      <AdminHeader title="Quản lý bảng đấu" description="Phân bảng và gán đội bóng" />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Số bảng tự động</label>
            <Input type="number" min={1} max={8} value={groupCount} onChange={(e) => setGroupCount(Number(e.target.value))} />
          </div>
          <Button onClick={handleGenerate}>Tạo bảng & phân đội ngẫu nhiên</Button>
          <div className="flex flex-1 gap-2">
            <Input placeholder="Tên bảng mới..." value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            <Button variant="outline" onClick={handleCreate}>Thêm bảng</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.id}>
            <CardContent className="p-4">
              <h3 className="mb-3 font-bold">{g.name}</h3>
              <ul className="space-y-2">
                {(g.teams ?? []).map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <span>{t.name}</span>
                    <Button size="sm" variant="ghost" onClick={() => removeTeam(g.id, t.id)}>Xóa</Button>
                  </li>
                ))}
                {(g.teams ?? []).length === 0 && (
                  <p className="text-sm italic text-muted-foreground">Chưa có đội</p>
                )}
              </ul>
              {unassigned.length > 0 && (
                <select
                  className="mt-3 w-full rounded border px-2 py-2 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) assignTeam(g.id, id);
                    e.target.value = "";
                  }}
                >
                  <option value="">+ Gán đội vào bảng</option>
                  {unassigned.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {unassigned.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 font-semibold">Đội chưa phân bảng ({unassigned.length})</h3>
            <p className="text-sm text-muted-foreground">{unassigned.map((t) => t.name).join(", ")}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
