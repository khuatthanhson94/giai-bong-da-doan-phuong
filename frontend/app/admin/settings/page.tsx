"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi, publicApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import { useState, useEffect } from "react";

export default function AdminSettingsPage() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: publicApi.getSettings });
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["settings"] }); toast.success("Đã lưu cài đặt"); },
  });

  const fields = [
    { key: "tournament_name", label: "Tên giải đấu" },
    { key: "season_name", label: "Mùa giải" },
    { key: "site_description", label: "Mô tả trang" },
    { key: "hero_subtitle", label: "Phụ đề trang chủ" },
    { key: "organizer", label: "Ban tổ chức" },
    { key: "contact_email", label: "Email liên hệ" },
    { key: "contact_phone", label: "Điện thoại" },
    { key: "contact_address", label: "Địa chỉ" },
    { key: "livestream_url", label: "URL livestream" },
    { key: "sponsors", label: "Nhà tài trợ (phân cách bằng dấu phẩy)" },
    { key: "about", label: "Giới thiệu" },
    { key: "rules", label: "Điều lệ" },
  ];

  return (
    <div>
      <AdminHeader title="Cài đặt giải đấu" />
      <Card>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          {fields.map((f) => (
            <Input key={f.key} label={f.label} value={form[f.key] || ""}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          ))}
          <div className="sm:col-span-2">
            <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending}>Lưu cài đặt</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
