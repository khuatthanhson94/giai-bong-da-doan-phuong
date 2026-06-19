"use client";

import { useTournament } from "@/hooks/useTournament";
import { Card, CardContent } from "@/components/ui/Card";

export default function DieuLePage() {
  const { settings } = useTournament();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Điều lệ giải đấu</h1>
      <Card>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap p-6">
          {settings.rules || settings.regulations || "Nội dung điều lệ sẽ được ban tổ chức cập nhật. Vui lòng liên hệ BTC để biết thêm chi tiết."}
        </CardContent>
      </Card>
    </div>
  );
}
