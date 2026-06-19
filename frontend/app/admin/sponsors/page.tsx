"use client";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";

export default function AdminSponsorsPage() {
  return (
    <div>
      <AdminHeader title="Nhà tài trợ" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Quản lý danh sách nhà tài trợ tại{" "}
          <Link href="/admin/settings" className="text-primary hover:underline">Cài đặt → Nhà tài trợ</Link>.
        </CardContent>
      </Card>
    </div>
  );
}
