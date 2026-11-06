"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/store/app-store";
import { competency } from "@/data/org";
import { SCENARIOS } from "@/data/scenarios";
import type { CourseSettings } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card } from "@/components/patterns/academy";
import { useCourse } from "./use-course";

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-hair py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex max-w-[52ch] flex-col gap-0.5"><Text size="body-lg" weight="semibold">{label}</Text>{hint && <Text size="caption" tone="subtle">{hint}</Text>}</div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-40 ${on ? "bg-brand" : "bg-black/15"}`}>
      <span className={`absolute top-1 size-5 rounded-full bg-white shadow-hair transition-all ${on ? "left-6" : "left-1"}`} />
    </button>
  );
}

function Num({ value, onChange, suffix, disabled, label }: { value: number; onChange: (n: number) => void; suffix?: string; disabled?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-24"><Field aria-label={label} type="number" size="sm" value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} /></div>
      {suffix && <Text size="body" tone="subtle">{suffix}</Text>}
    </div>
  );
}

export function CourseSettingsTab() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  const update = useApp((s) => s.updateSettings);
  if (!data) return null;
  const { course, editable } = data;
  const s = course.settings;
  const set = (p: Partial<CourseSettings>) => update(course.id, p);
  const personalised = course.type === "personalised";
  const d = !editable;

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Completion" eyebrow="What “complete” means">
        <div className="-mt-2 flex flex-col">
          <Row label="All blocks in the rep's path" hint="Required blocks are always in the path."><Toggle label="Path" on={s.completion.path} disabled={d} onChange={(v) => set({ completion: { ...s.completion, path: v } })} /></Row>
          {personalised && <Row label="Final assessment passed"><Toggle label="Assessment" on={s.completion.assessment} disabled={d} onChange={(v) => set({ completion: { ...s.completion, assessment: v } })} /></Row>}
          {!personalised && <Row label="Knowledge checks" hint="Minimum share answered correctly first time."><Num label="Knowledge checks" value={s.completion.checks} suffix="%" disabled={d} onChange={(n) => set({ completion: { ...s.completion, checks: n } })} /></Row>}
          <Row label="Attestation signed" hint="A sober screen, no XP. The rep types their full name."><Toggle label="Attestation" on={s.completion.attestation} disabled={d} onChange={(v) => set({ completion: { ...s.completion, attestation: v } })} /></Row>
          <Field label="Attestation statement" multiline rows={2} value={s.attestation} disabled={d} onChange={(e) => set({ attestation: (e.target as unknown as HTMLTextAreaElement).value })} />
          <Row label="Recertify every"><Num label="Recertify months" value={s.recertMonths} suffix="months" disabled={d} onChange={(n) => set({ recertMonths: n })} /></Row>
        </div>
      </Card>

      {personalised && (
        <Card title="Screening" eyebrow="The baseline (call one)">
          <div className="-mt-2 flex flex-col">
            <Row label="Screen before learning" hint="Reps skip modules they already know."><Toggle label="Screening" on={s.screening} disabled={d} onChange={(v) => set({ screening: v })} /></Row>
            <Row label="Adaptive quiz length" hint="Starts at medium difficulty; at least one question per competency."><Num label="Screening items" value={s.screeningItems} suffix="questions" disabled={d} onChange={(n) => set({ screeningItems: n })} /></Row>
            <Row label="Voice call with an AI doctor" hint="~5 minutes. Typed fallback if the mic isn't available."><Toggle label="Screening call" on={s.screeningCall} disabled={d} onChange={(v) => set({ screeningCall: v })} /></Row>
            {s.screeningCall && <Row label="Scenario"><select aria-label="Screening scenario" disabled={d} value={s.screeningScenarioId} onChange={(e) => set({ screeningScenarioId: e.target.value })} className="h-10 rounded-control border border-hair-2 bg-card px-3 text-body">{SCENARIOS.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></Row>}
            <Row label="Let AI reorder the path" hint="Weakest competencies first, within prerequisites. Order only, never content."><Toggle label="AI reorder" on={s.aiReorder} disabled={d} onChange={(v) => set({ aiReorder: v })} /></Row>
          </div>
        </Card>
      )}

      {personalised && (
        <Card title="Final assessment" eyebrow="Pass criteria">
          <div className="-mt-2 flex flex-col">
            <Row label="Quiz length"><Num label="Assessment items" value={s.assessmentItems} suffix="questions" disabled={d} onChange={(n) => set({ assessmentItems: n })} /></Row>
            <Row label="Roleplay call"><Toggle label="Assessment call" on={s.assessmentCall} disabled={d} onChange={(v) => set({ assessmentCall: v })} /></Row>
            <Row label="Overall score at least"><Num label="Pass overall" value={s.passOverall} suffix="%" disabled={d} onChange={(n) => set({ passOverall: n })} /></Row>
            <Row label="Each critical competency at least"><Num label="Pass critical" value={s.passCritical} suffix="%" disabled={d} onChange={(n) => set({ passCritical: n })} /></Row>
            <div className="flex flex-wrap gap-1.5 pb-3">{course.competencyIds.map((c) => (
              <Chip key={c} size="md" selected={s.criticalCompetencies.includes(c)} onClick={d ? undefined : () => set({ criticalCompetencies: s.criticalCompetencies.includes(c) ? s.criticalCompetencies.filter((x) => x !== c) : [...s.criticalCompetencies, c] })}>{competency(c)?.name}</Chip>
            ))}</div>
            <Row label="Roleplay rubric at least"><Num label="Pass roleplay" value={s.passRoleplay} suffix="%" disabled={d} onChange={(n) => set({ passRoleplay: n })} /></Row>
            <Row label="Critical compliance violation" hint="Off-label population, minimising risk, guarantees."><Chip tone="danger" size="md">Always an automatic fail</Chip></Row>
            <Row label="Attempts"><Num label="Attempts" value={s.attempts} disabled={d} onChange={(n) => set({ attempts: n })} /><Text tone="subtle" size="body">with</Text><Num label="Cooldown" value={s.cooldownHours} suffix="h cooldown" disabled={d} onChange={(n) => set({ cooldownHours: n })} /></Row>
          </div>
        </Card>
      )}

      {personalised && (
        <Card title="Verify" eyebrow="The readiness gate">
          <Segmented aria-label="Verify mode">
            <SegmentedButton active={s.verify === "auto"} disabled={d} onClick={() => set({ verify: "auto" })}>Automatic on pass</SegmentedButton>
            <SegmentedButton active={s.verify === "manager"} disabled={d} onClick={() => set({ verify: "manager" })}>Manager signs off</SegmentedButton>
          </Segmented>
          <Text size="body" tone="muted">{s.verify === "manager" ? "After a pass, the rep's manager reviews the recorded roleplay and approves, or sends it back with coaching. If they don't act in 5 days, you can verify on their behalf." : "Passing the assessment certifies the rep immediately."}</Text>
          <Row label="Managers may assign this course to their team"><Toggle label="Managers may assign" on={s.managersMayAssign} disabled={d} onChange={(v) => set({ managersMayAssign: v })} /></Row>
        </Card>
      )}
      {d && <Text size="caption" tone="subtle" className="xl:col-span-2">Settings are part of the approved version and are locked with it.</Text>}
    </div>
  );
}
