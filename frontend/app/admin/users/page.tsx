"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { toast } from "@/components/ui/Toast";
import { ROLE_LABELS } from "@/lib/constants";
import { useState } from "react";
import { Plus } from "lucide-react";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin-users"], queryFn: authApi.getUsers });
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "admin" });

  const createMut = useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); toast.success("Đã tạo user"); setModalOpen(false); },
  });

  return (
    <div>
      <AdminHeader title="Quản lý người dùng" description="Phân quyền hệ thống" />
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setModalOpen(true)}><Plus className="h-4 w-4" /> Thêm user</Button>
      </div>
      <DataTable
        data={data}
        columns={[
          { key: "username", header: "Tên đăng nhập" },
          { key: "role", header: "Vai trò", render: (r) => <Badge>{ROLE_LABELS[r.role] || r.role}</Badge> },
          { key: "created_at", header: "Ngày tạo" },
        ]}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Thêm người dùng">
        <div className="space-y-4">
          <Input label="Tên đăng nhập" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label="Mật khẩu" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Select label="Vai trò" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
            options={Object.entries(ROLE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
          <Button onClick={() => createMut.mutate(form)}>Tạo</Button>
        </div>
      </Modal>
    </div>
  );
}
