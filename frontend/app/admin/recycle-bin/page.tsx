"use client";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";

export default function RecycleBinPage() {
  return (
    <div>
      <AdminHeader title="Thùng rác" description="Mục đã xóa gần đây" />
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Chưa có mục nào trong thùng rác. Các bản ghi xóa sẽ hiển thị tại đây khi tính năng được kích hoạt trên server.
        </CardContent>
      </Card>
    </div>
  );
}
