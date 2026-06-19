"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { playerApi, teamApi } from "@/lib/api";
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

export default function AdminPlayersPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-players"], queryFn: () => playerApi.list() });
  const { data: teams = [] } = useQuery({ queryKey: ["admin-teams"], queryFn: () => teamApi.list() });
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", team_id: 0, jersey_number: 1, position: "Tiền đạo" });

  const createMut = useMutation({
    mutationFn: playerApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-players"] }); toast.success("Đã thêm cầu thủ"); setModalOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: number[]) => { for (const id of ids) await playerApi.delete(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-players"] }); toast.success("Đã xóa"); setConfirmIds(null); },
  });

  return (
    <div>
      <AdminHeader title="Quản lý cầu thủ" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setForm({ ...form, team_id: teams[0]?.id || 0 }); setModalOpen(true); }}>
          <Plus className="h-4 w-4" /> Thêm cầu thủ
        </Button>
      </div>
      <DataTable
        data={data}
        searchable
        searchKeys={["name"]}
        onDelete={(ids) => setConfirmIds(ids)}
        columns={[
          { key: "name", header: "Tên" },
          { key: "team", header: "Đội", render: (r) => r.team?.name || "—" },
          { key: "jersey_number", header: "Số áo" },
          { key: "goals", header: "Bàn" },
        ]}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm cầu thủ">
        <div className="space-y-4">
          <Input label="Tên" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Đội" value={String(form.team_id)} onChange={(e) => setForm({ ...form, team_id: Number(e.target.value) })}
            options={teams.map((t) => ({ value: String(t.id), label: t.name }))} />
          <Input label="Số áo" type="number" value={form.jersey_number} onChange={(e) => setForm({ ...form, jersey_number: Number(e.target.value) })} />
          <Button onClick={() => createMut.mutate(form)} disabled={!form.name || !form.team_id}>Lưu</Button>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirmIds} title="Xóa cầu thủ" message={`Xóa ${confirmIds?.length} cầu thủ?`}
        onConfirm={() => confirmIds && deleteMut.mutate(confirmIds)} onCancel={() => setConfirmIds(null)} />
    </div>
  );
}
