"use client";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";

export default function AdminSeasonsPage() {
  return (
    <div>
      <AdminHeader title="Mùa giải" description="Quản lý các mùa giải" />
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Cấu hình mùa giải hiện tại tại trang Cài đặt (season_name). Module mùa giải đầy đủ sẽ được mở rộng trong phiên bản tiếp theo.
        </CardContent>
      </Card>
    </div>
  );
}
