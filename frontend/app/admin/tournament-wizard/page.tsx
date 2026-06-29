"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { teamApi, groupApi, adminApi } from "@/lib/api";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { WIZARD_STEPS, WizardNav } from "@/components/admin/TournamentWizard";
import type { TournamentWizardState } from "@/lib/types";
import { toast } from "@/components/ui/Toast";

const initialState: TournamentWizardState = {
  step: 1,
  seasonName: "",
  tournamentName: "",
  startDate: "",
  endDate: "",
  venue: "",
  format: "group-knockout",
  numGroups: 2,
  teams: [],
  groups: [],
};

export default function TournamentWizardPage() {
  const [state, setState] = useState<TournamentWizardState>(initialState);
  const { data: teams = [] } = useQuery({ queryKey: ["admin-teams"], queryFn: () => teamApi.list() });
  const step = state.step;
  const StepComponent = WIZARD_STEPS[step - 1].Component;

  const onChange = (patch: Partial<TournamentWizardState>) => setState((s) => ({ ...s, ...patch }));

  const onFinish = async () => {
    try {
      await adminApi.updateSettings({
        tournament_name: state.tournamentName,
        season_name: state.seasonName,
      });
      if (state.numGroups) {
        await groupApi.generate(state.numGroups);
      }
      toast.success("Hoàn tất thiết lập giải đấu!");
      setState(initialState);
    } catch {
      toast.error("Có lỗi khi lưu thiết lập");
    }
  };

  return (
    <div>
      <AdminHeader title="Thiết lập giải đấu" description="Trình hướng dẫn 8 bước" />
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {WIZARD_STEPS.map((s, i) => (
          <div
            key={s.title}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${i + 1 === step ? "bg-primary text-primary-foreground" : i + 1 < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
          >
            {i + 1}. {s.title}
          </div>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Bước {step}: {WIZARD_STEPS[step - 1].title}</CardTitle></CardHeader>
        <CardContent>
          <StepComponent state={state} onChange={onChange} teams={teams} />
          <WizardNav
            step={step}
            total={WIZARD_STEPS.length}
            onPrev={() => onChange({ step: Math.max(1, step - 1) })}
            onNext={() => onChange({ step: Math.min(WIZARD_STEPS.length, step + 1) })}
            onFinish={onFinish}
          />
        </CardContent>
      </Card>
    </div>
  );
}
