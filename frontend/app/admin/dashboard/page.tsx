"use client";

import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { adminApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Users, Shield, Calendar, Trophy } from "lucide-react";

const COLORS = ["#15803d", "#22c55e", "#4ade80", "#86efac"];

export default function DashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: adminApi.dashboard });

  const stats = [
    { label: "Đội bóng", value: data?.totalTeams ?? 0, icon: Shield },
    { label: "Cầu thủ", value: data?.totalPlayers ?? 0, icon: Users },
    { label: "Tổng trận", value: data?.totalMatches ?? 0, icon: Calendar },
    { label: "Đã kết thúc", value: data?.finishedMatches ?? 0, icon: Trophy },
  ];

  const chartData = (data?.standings ?? []).slice(0, 6).map((s) => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
    points: s.points,
  }));

  const pieData = [
    { name: "Đã kết thúc", value: data?.finishedMatches ?? 0 },
    { name: "Sắp diễn ra", value: data?.scheduledMatches ?? 0 },
  ];

  return (
    <div>
      <AdminHeader title="Tổng quan" description="Thống kê nhanh giải đấu" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="rounded-lg bg-primary/15 p-3 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold">{isLoading ? "—" : s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Điểm các đội</CardTitle></CardHeader>
          <CardContent className="h-64">
            {isLoading ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="points" fill="#15803d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Trạng thái trận đấu</CardTitle></CardHeader>
          <CardContent className="h-64">
            {isLoading ? <Skeleton className="h-full" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Nhật ký gần đây</CardTitle></CardHeader>
        <CardContent>
          {(data?.logs ?? []).slice(0, 10).map((log) => (
            <div key={log.id} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
              <span>{log.username || "Hệ thống"} — {log.action}</span>
              <span className="text-muted-foreground">{log.created_at}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
