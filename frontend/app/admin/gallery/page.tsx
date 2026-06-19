"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { galleryApi } from "@/lib/api";
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

export default function AdminGalleryPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-gallery"], queryFn: () => galleryApi.list() });
  const [confirmIds, setConfirmIds] = useState<number[] | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ title: "", image_url: "", album: "Chung", type: "image" });

  const createMut = useMutation({
    mutationFn: galleryApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); toast.success("Đã thêm"); setModalOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: async (ids: number[]) => { for (const id of ids) await galleryApi.delete(id); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-gallery"] }); toast.success("Đã xóa"); setConfirmIds(null); },
  });

  return (
    <div>
      <AdminHeader title="Thư viện ảnh & video" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Thêm media</Button>
      </div>
      <DataTable
        data={data}
        searchable
        searchKeys={["title"]}
        onDelete={(ids) => setConfirmIds(ids)}
        columns={[
          { key: "title", header: "Tiêu đề" },
          { key: "album", header: "Album" },
          { key: "type", header: "Loại" },
        ]}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm media">
        <div className="space-y-4">
          <Input label="Tiêu đề" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <Input label="URL ảnh/video" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
          <Input label="Album" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} />
          <Select label="Loại" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            options={[{ value: "image", label: "Ảnh" }, { value: "video", label: "Video" }]} />
          <Button onClick={() => createMut.mutate(form)}>Lưu</Button>
        </div>
      </Modal>
      <ConfirmDialog open={!!confirmIds} title="Xóa media" message={`Xóa ${confirmIds?.length} mục?`}
        onConfirm={() => confirmIds && deleteMut.mutate(confirmIds)} onCancel={() => setConfirmIds(null)} />
    </div>
  );
}
