"use client";

import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function AdminTournamentsPage() {
  return (
    <div>
      <AdminHeader title="Giải đấu" />
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-muted-foreground">Sử dụng trình hướng dẫn để thiết lập giải mới.</p>
          <Link href="/admin/tournament-wizard"><Button>Mở trình thiết lập giải</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
