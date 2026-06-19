"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ImportPreview } from "@/components/admin/ImportPreview";
import { adminApi } from "@/lib/api";
import { toast } from "@/components/ui/Toast";
import { Download, Upload } from "lucide-react";

export default function ImportExportPage() {
  const [preview, setPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result);
      const lines = text.trim().split("\n");
      const headers = lines[0]?.split(",") ?? [];
      const rows = lines.slice(1).map((l) => l.split(","));
      setPreview({ headers, rows });
    };
    reader.readAsText(file);
  };

  const exportStandings = async () => {
    try {
      const blob = await adminApi.exportStandings();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "bang-xep-hang.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất bảng xếp hạng");
    } catch {
      toast.error("Xuất dữ liệu thất bại");
    }
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="Nhập / Xuất dữ liệu" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Download className="h-4 w-4" /> Xuất dữ liệu</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={exportStandings}>Xuất bảng xếp hạng (CSV)</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Upload className="h-4 w-4" /> Nhập dữ liệu</CardTitle></CardHeader>
          <CardContent>
            <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />
            <p className="mt-2 text-xs text-muted-foreground">Hỗ trợ CSV — xem trước trước khi nhập</p>
          </CardContent>
        </Card>
      </div>
      {preview && <ImportPreview headers={preview.headers} rows={preview.rows} />}
    </div>
  );
}
