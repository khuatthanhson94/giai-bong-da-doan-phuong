"use client";

import { useState } from "react";
import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";

export default function LienHePage() {
  const { settings } = useTournament();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Đã gửi liên hệ! Ban tổ chức sẽ phản hồi sớm.");
    setForm({ name: "", email: "", message: "" });
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Liên hệ</h1>
        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            {settings.contact_address && <p>📍 {settings.contact_address}</p>}
            {settings.contact_phone && <p>📞 {settings.contact_phone}</p>}
            {settings.contact_email && <p>✉️ {settings.contact_email}</p>}
            {settings.organizer && <p><strong>BTC:</strong> {settings.organizer}</p>}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Họ tên" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nội dung</label>
              <textarea
                required
                rows={4}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Button type="submit" className="w-full">Gửi liên hệ</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
