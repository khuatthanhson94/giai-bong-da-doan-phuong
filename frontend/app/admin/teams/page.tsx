"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { teamApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";

export default function AdminTeamsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-teams"], queryFn: () => teamApi.list() });
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", jersey_color: "#15803d", description: "" });

  const createMut = useMutation({
    mutationFn: teamApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-teams"] }); toast.success("Đã thêm đội"); setModalOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: number[]) => { for (const id of ids) await teamApi.delete(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-teams"] }); toast.success("Đã xóa"); setConfirmIds(null); },
  });

  return (
    <div>
      <AdminHeader title="Quản lý đội bóng" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Thêm đội</Button>
      </div>
      {isLoading ? <p>Đang tải...</p> : (
        <DataTable
          data={data}
          searchable
          searchKeys={["name"]}
          onDelete={(ids) => setConfirmIds(ids)}
          columns={[
            { key: "name", header: "Tên đội" },
            { key: "played", header: "Trận" },
            { key: "points", header: "Điểm" },
          ]}
        />
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm đội mới">
        <div className="space-y-4">
          <Input label="Tên đội" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label="Màu áo" type="color" value={form.jersey_color} onChange={(e) => setForm({ ...form, jersey_color: e.target.value })} />
          <Input label="Mô tả" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Button onClick={() => createMut.mutate(form)} disabled={!form.name}>Lưu</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!confirmIds}
        title="Xóa đội"
        message={`Xóa ${confirmIds?.length} đội đã chọn?`}
        onConfirm={() => confirmIds && deleteMut.mutate(confirmIds)}
        onCancel={() => setConfirmIds(null)}
      />
    </div>
  );
}
