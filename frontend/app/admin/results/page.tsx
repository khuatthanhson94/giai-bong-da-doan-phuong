"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { matchApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { useState } from "react";
import { formatScore } from "@/lib/utils";
import type { Match } from "@/lib/types";

export default function AdminResultsPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin-results"],
    queryFn: () => matchApi.list({ status: "finished" }),
  });
  const { data: pending = [] } = useQuery({
    queryKey: ["admin-pending-matches"],
    queryFn: () => matchApi.list({ status: "scheduled" }),
  });
  const [selected, setSelected] = useState<Match | null>(null);
  const [scores, setScores] = useState({ score_a: 0, score_b: 0 });

  const saveMut = useMutation({
    mutationFn: ({ id, ...data }: { id: number; score_a: number; score_b: number }) =>
      matchApi.saveResult(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-results"] });
      qc.invalidateQueries({ queryKey: ["admin-pending-matches"] });
      toast.success("Đã lưu kết quả");
      setSelected(null);
    },
  });

  const publishMut = useMutation({
  mutationFn: (id: number) => matchApi.publish(id),
  onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-results"] }); toast.success("Đã công bố"); },
});

  const allMatches = [...pending, ...data];

  return (
    <div>
      <AdminHeader title="Kết quả trận đấu" description="Nhập và công bố kết quả" />
      <DataTable
        data={allMatches as (Match & { id: number })[]}
        columns={[
          { key: "match", header: "Trận", render: (r) => `${r.team_a?.name} vs ${r.team_b?.name}` },
          { key: "score", header: "Tỉ số", render: (r) => formatScore(r.score_a, r.score_b) },
          { key: "status", header: "Trạng thái" },
          {
            key: "actions",
            header: "Thao tác",
            render: (r) => (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => { setSelected(r); setScores({ score_a: r.score_a ?? 0, score_b: r.score_b ?? 0 }); }}>
                  Nhập
                </Button>
                {r.status === "finished" && !r.published && (
                  <Button size="sm" onClick={() => publishMut.mutate(r.id)}>Công bố</Button>
                )}
              </div>
            ),
          },
        ]}
      />
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Nhập kết quả">
        {selected && (
          <div className="space-y-4">
            <p className="font-medium">{selected.team_a?.name} vs {selected.team_b?.name}</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label={selected.team_a?.name || "Đội A"} type="number" min={0} value={scores.score_a}
                onChange={(e) => setScores({ ...scores, score_a: Number(e.target.value) })} />
              <Input label={selected.team_b?.name || "Đội B"} type="number" min={0} value={scores.score_b}
                onChange={(e) => setScores({ ...scores, score_b: Number(e.target.value) })} />
            </div>
            <Button onClick={() => saveMut.mutate({ id: selected.id, ...scores })}>Lưu kết quả</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
