"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { matchApi, teamApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { Match } from "@/lib/types";

export default function AdminMatchesPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-matches"], queryFn: () => matchApi.list() });
  const { data: teams = [] } = useQuery({ queryKey: ["admin-teams"], queryFn: () => teamApi.list() });
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ round: "Vòng bảng", match_date: "", match_time: "15:00", venue: "", team_a_id: 0, team_b_id: 0 });

  const createMut = useMutation({
    mutationFn: matchApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-matches"] }); toast.success("Đã tạo trận"); setModalOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: number[]) => { for (const id of ids) await matchApi.delete(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-matches"] }); toast.success("Đã xóa"); setConfirmIds(null); },
  });

  return (
    <div>
      <AdminHeader title="Lịch thi đấu" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Tạo trận</Button>
      </div>
      <DataTable
        data={data as (Match & { id: number })[]}
        searchable
        searchKeys={["round"]}
        onDelete={(ids) => setConfirmIds(ids)}
        columns={[
          { key: "round", header: "Vòng" },
          { key: "match", header: "Trận", render: (r) => `${r.team_a?.name || "?"} vs ${r.team_b?.name || "?"}` },
          { key: "date", header: "Thời gian", render: (r) => formatDateTime(r.match_date, r.match_time) },
          { key: "status", header: "Trạng thái" },
        ]}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo trận đấu" size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Vòng" value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} />
          <Input label="Sân" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
          <Input label="Ngày" type="date" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} />
          <Input label="Giờ" type="time" value={form.match_time} onChange={(e) => setForm({ ...form, match_time: e.target.value })} />
          <Select label="Đội A" value={String(form.team_a_id)} onChange={(e) => setForm({ ...form, team_a_id: Number(e.target.value) })}
            options={[{ value: "0", label: "Chọn đội" }, ...teams.map((t) => ({ value: String(t.id), label: t.name }))]} />
          <Select label="Đội B" value={String(form.team_b_id)} onChange={(e) => setForm({ ...form, team_b_id: Number(e.target.value) })}
            options={[{ value: "0", label: "Chọn đội" }, ...teams.map((t) => ({ value: String(t.id), label: t.name }))]} />
          <Button className="sm:col-span-2" onClick={() => createMut.mutate(form)}>Lưu</Button>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirmIds} title="Xóa trận" message={`Xóa ${confirmIds?.length} trận?`}
        onConfirm={() => confirmIds && deleteMut.mutate(confirmIds)} onCancel={() => setConfirmIds(null)} />
    </div>
  );
}
