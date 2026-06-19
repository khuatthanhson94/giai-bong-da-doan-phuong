"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { newsApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { useState } from "react";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AdminNewsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-news"], queryFn: newsApi.adminList });
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", content: "", category: "general" });

  const createMut = useMutation({
    mutationFn: newsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-news"] }); toast.success("Đã tạo tin"); setModalOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: number[]) => { for (const id of ids) await newsApi.delete(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-news"] }); toast.success("Đã xóa"); setConfirmIds(null); },
  });

  return (
    <div>
      <AdminHeader title="Quản lý tin tức" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Viết tin</Button>
      </div>
      <DataTable
        data={data}
        searchable
        searchKeys={["title"]}
        onDelete={(ids) => setConfirmIds(ids)}
        columns={[
          { key: "title", header: "Tiêu đề" },
          { key: "category", header: "Danh mục" },
          { key: "created_at", header: "Ngày", render: (r) => formatDate(r.created_at) },
          { key: "published", header: "Công bố", render: (r) => (r.published ? "Có" : "Ẩn") },
        ]}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Tạo tin tức" size="lg">
        <div className="space-y-4">
          <Input label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nội dung</label>
            <textarea rows={6} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
          </div>
          <Button onClick={() => createMut.mutate(form)} disabled={!form.title}>Đăng tin</Button>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirmIds} title="Xóa tin" message={`Xóa ${confirmIds?.length} bài?`}
        onConfirm={() => confirmIds && deleteMut.mutate(confirmIds)} onCancel={() => setConfirmIds(null)} />
    </div>
  );
}
