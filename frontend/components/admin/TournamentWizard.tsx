"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Team, GroupAssignment } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export interface WizardStepProps {
  state: import("@/lib/types").TournamentWizardState;
  onChange: (patch: Partial<import("@/lib/types").TournamentWizardState>) => void;
  teams: Team[];
}

export function Step1BasicInfo({ state, onChange }: WizardStepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Input label="Tên mùa giải" value={state.seasonName} onChange={(e) => onChange({ seasonName: e.target.value })} />
      <Input label="Tên giải đấu" value={state.tournamentName} onChange={(e) => onChange({ tournamentName: e.target.value })} />
      <Input label="Ngày bắt đầu" type="date" value={state.startDate} onChange={(e) => onChange({ startDate: e.target.value })} />
      <Input label="Ngày kết thúc" type="date" value={state.endDate} onChange={(e) => onChange({ endDate: e.target.value })} />
    </div>
  );
}

export function Step2Venue({ state, onChange }: WizardStepProps) {
  return (
    <Input label="Sân đấu chính" value={state.venue} onChange={(e) => onChange({ venue: e.target.value })} placeholder="VD: Sân nhà văn hóa phường" />
  );
}

export function Step3Format({ state, onChange }: WizardStepProps) {
  return (
    <Select
      label="Thể thức thi đấu"
      value={state.format}
      onChange={(e) => onChange({ format: e.target.value as typeof state.format })}
      options={[
        { value: "round-robin", label: "Vòng tròn một lượt" },
        { value: "knockout", label: "Loại trực tiếp" },
        { value: "group-knockout", label: "Chia bảng + Loại trực tiếp" },
      ]}
    />
  );
}

export function Step4Teams({ teams, state, onChange }: WizardStepProps) {
  const toggle = (team: Team) => {
    const exists = state.teams.some((t) => t.id === team.id);
    onChange({ teams: exists ? state.teams.filter((t) => t.id !== team.id) : [...state.teams, team] });
  };

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {teams.map((team) => {
        const selected = state.teams.some((t) => t.id === team.id);
        return (
          <button
            key={team.id}
            type="button"
            onClick={() => toggle(team)}
            className={cn(
              "rounded-lg border p-3 text-left transition-colors",
              selected ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
            )}
          >
            <span className="font-medium">{team.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Step5Groups({ state, onChange }: WizardStepProps) {
  return (
    <Input
      label="Số bảng đấu"
      type="number"
      min={1}
      value={state.numGroups}
      onChange={(e) => onChange({ numGroups: Number(e.target.value) })}
    />
  );
}

function SortableTeam({ id, name }: { id: number; name: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: String(id) });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
    >
      <button type="button" {...attributes} {...listeners} className="cursor-grab text-muted-foreground">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-sm">{name}</span>
    </div>
  );
}

export function Step6GroupAssignment({ state, onChange, teams }: WizardStepProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t.name]));
  const groups = state.groups.length
    ? state.groups
    : Array.from({ length: state.numGroups }, (_, i) => ({ groupId: i + 1, teamIds: [] }));

  const handleDragEnd = (event: DragEndEvent, groupIdx: number) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const updated = [...groups];
    const ids = [...updated[groupIdx].teamIds];
    const oldIndex = ids.indexOf(Number(active.id));
    const newIndex = ids.indexOf(Number(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    ids.splice(oldIndex, 1);
    ids.splice(newIndex, 0, Number(active.id));
    updated[groupIdx] = { ...updated[groupIdx], teamIds: ids };
    onChange({ groups: updated });
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group, idx) => (
        <Card key={group.groupId}>
          <CardHeader><CardTitle>Bảng {group.groupId}</CardTitle></CardHeader>
          <CardContent>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, idx)}>
              <SortableContext items={group.teamIds.map(String)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {group.teamIds.map((tid) => (
                    <SortableTeam key={tid} id={tid} name={teamMap[tid] || `Đội #${tid}`} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function Step7SchedulePreview({ state }: WizardStepProps) {
  const n = state.teams.length;
  const matches = (n * (n - 1)) / 2;
  return (
    <div className="rounded-lg bg-muted/50 p-6 text-center">
      <p className="text-3xl font-bold text-primary">{matches}</p>
      <p className="text-sm text-muted-foreground">trận dự kiến (vòng tròn)</p>
      <p className="mt-4 text-sm">{state.teams.length} đội · {state.numGroups} bảng</p>
    </div>
  );
}

export function Step8Review({ state }: WizardStepProps) {
  return (
    <div className="space-y-3 text-sm">
      <p><strong>Giải:</strong> {state.tournamentName || "—"}</p>
      <p><strong>Mùa:</strong> {state.seasonName || "—"}</p>
      <p><strong>Thời gian:</strong> {state.startDate} → {state.endDate}</p>
      <p><strong>Sân:</strong> {state.venue || "—"}</p>
      <p><strong>Đội tham gia:</strong> {state.teams.length}</p>
      <p><strong>Thể thức:</strong> {state.format}</p>
    </div>
  );
}

export const WIZARD_STEPS = [
  { title: "Thông tin cơ bản", Component: Step1BasicInfo },
  { title: "Địa điểm", Component: Step2Venue },
  { title: "Thể thức", Component: Step3Format },
  { title: "Chọn đội", Component: Step4Teams },
  { title: "Số bảng", Component: Step5Groups },
  { title: "Phân bảng", Component: Step6GroupAssignment },
  { title: "Lịch thi đấu", Component: Step7SchedulePreview },
  { title: "Xác nhận", Component: Step8Review },
] as const;

export function WizardNav({
  step,
  total,
  onPrev,
  onNext,
  onFinish,
}: {
  step: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}) {
  return (
    <div className="mt-6 flex justify-between">
      <Button variant="outline" onClick={onPrev} disabled={step <= 1}>Quay lại</Button>
      {step < total ? (
        <Button onClick={onNext}>Tiếp tục</Button>
      ) : (
        <Button onClick={onFinish}>Hoàn tất thiết lập</Button>
      )}
    </div>
  );
}
