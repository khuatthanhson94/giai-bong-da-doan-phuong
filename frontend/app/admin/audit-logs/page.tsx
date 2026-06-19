"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { DashboardData, ActivityLog } from "@/lib/types";

export default function AuditLogsPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: adminApi.dashboard,
  });

  return (
    <div>
      <AdminHeader title="Nhật ký hoạt động" />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="m-4 h-48" />
          ) : (
            <div className="divide-y divide-border">
              {(data?.logs ?? []).map((log: ActivityLog) => (
                <div
                  key={log.id}
                  className="flex flex-col gap-1 px-5 py-3 text-sm sm:flex-row sm:justify-between"
                >
                  <div>
                    <span className="font-medium">{log.username || "Hệ thống"}</span>
                    <span className="text-muted-foreground"> — {log.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{log.created_at}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
