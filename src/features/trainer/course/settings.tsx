"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useParams } from "next/navigation";
import { useApp } from "@/store/app-store";
import { competency, product } from "@/data/org";
import { SCENARIOS } from "@/data/scenarios";
import type { CourseSettings } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
// v1-hidden: import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
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
  const updateCourse = useApp((s) => s.updateCourse);
  const courses = useApp((s) => s.courses);
  const [advanced, setAdvanced] = useState(false);
  if (!data) return null;
  const { course, editable } = data;
  const s = course.settings;
  const set = (p: Partial<CourseSettings>) => update(course.id, p);
  const personalised = course.type === "personalised";
  const d = !editable;
  const hasScenario = course.scenarioIds.length > 0;

  // Prerequisites only make sense within the same audience: same division, or company-wide courses.
  const divisionOf = (c: { productId?: string; divisionId?: string }) => product(c.productId)?.divisionId ?? c.divisionId;
  const myDiv = divisionOf(course);
  const others = courses.filter((x) => x.id !== course.id && x.versions.some((v) => v.state === "published") && (!divisionOf(x) || divisionOf(x) === myDiv));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Essentials" eyebrow="The decisions that matter">
          <div className="-mt-2 flex flex-col">
            {personalised && <Row label="Screen before learning" hint="Reps skip modules they already know."><Toggle label="Screening" on={s.screening} disabled={d} onChange={(v) => set({ screening: v })} /></Row>}
            {/* v1-hidden: no manager sign-off in v1, so passing the assessment always certifies.
            {personalised && (
              <Row label="Who certifies" hint={s.verify === "manager" ? "The manager reviews the recorded call. After 5 days you can verify on their behalf." : "Passing the assessment certifies the rep."}>
                <Segmented aria-label="Verify mode">
                  <SegmentedButton active={s.verify === "auto"} disabled={d} onClick={() => set({ verify: "auto" })}>Automatic</SegmentedButton>
                  <SegmentedButton active={s.verify === "manager"} disabled={d} onClick={() => set({ verify: "manager" })}>Manager</SegmentedButton>
                </Segmented>
              </Row>
            )}
            */}
            {personalised
              ? <Row label="Pass mark" hint="Overall assessment score. A critical compliance violation always fails."><Num label="Pass overall" value={s.passOverall} suffix="%" disabled={d} onChange={(n) => set({ passOverall: n })} /></Row>
              : <Row label="Knowledge checks" hint="Minimum share answered correctly first time."><Num label="Knowledge checks" value={s.completion.checks} suffix="%" disabled={d} onChange={(n) => set({ completion: { ...s.completion, checks: n } })} /></Row>}
            {personalised && <Row label="Attempts"><Num label="Attempts" value={s.attempts} disabled={d} onChange={(n) => set({ attempts: n })} /></Row>}
            <Row label="Recertify every"><Num label="Recertify months" value={s.recertMonths} suffix="months" disabled={d} onChange={(n) => set({ recertMonths: n })} /></Row>
          </div>
        </Card>

        {personalised && <Card title="Prerequisites" eyebrow="What comes first">
          <Text size="body" tone="subtle" className="-mt-2">Not content, so you can change it on an approved version.</Text>
          <div className="-mt-1 flex flex-col">
            {/* v1-hidden: Library visibility and explore-before-starting (no Library in v1).
            <Row label="Library visibility" hint="Only the published, in-date version is ever shown.">
              <Segmented aria-label="Library visibility">
                <SegmentedButton active={course.visibility === "assigned"} onClick={() => updateCourse(course.id, { visibility: "assigned" })}>Assigned</SegmentedButton>
                <SegmentedButton active={course.visibility === "audience"} onClick={() => updateCourse(course.id, { visibility: "audience" })}>Audience</SegmentedButton>
                <SegmentedButton active={course.visibility === "everyone"} onClick={() => updateCourse(course.id, { visibility: "everyone" })}>Everyone</SegmentedButton>
              </Segmented>
            </Row>
            <Row label="Reps can explore before starting" hint="Not for credit. What they open counts later on the same version."><Toggle label="Allow explore" on={course.allowExplore} onChange={(v) => updateCourse(course.id, { allowExplore: v })} /></Row>
            */}
            {personalised && (
              <div className="flex flex-col gap-2 py-4">
                <Text size="body-lg" weight="semibold">Screening unlocks after</Text>
                <Text size="caption" tone="subtle">{others.length ? "Reps must be certified on these first." : "No other published courses for this audience yet."}</Text>
                <div className="flex flex-wrap gap-2">{others.map((o) => (
                  <Chip key={o.id} size="lg" selected={course.prerequisites.includes(o.id)} onClick={() => updateCourse(course.id, { prerequisites: course.prerequisites.includes(o.id) ? course.prerequisites.filter((x) => x !== o.id) : [...course.prerequisites, o.id] })}>{o.title}</Chip>
                ))}</div>
              </div>
            )}
          </div>
        </Card>}
      </div>

      <button type="button" aria-expanded={advanced} onClick={() => setAdvanced(!advanced)} className="flex items-center gap-1.5 self-start text-body-lg font-semibold text-ink-2 hover:text-ink">
        <ChevronDown className={`size-4 transition-transform ${advanced ? "rotate-180" : ""}`} aria-hidden="true" />Advanced settings
      </button>

      {advanced && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Completion" eyebrow="What “complete” means">
            <div className="-mt-2 flex flex-col">
              <Row label="All blocks in the rep's path" hint="Required blocks are always in the path."><Toggle label="Path" on={s.completion.path} disabled={d} onChange={(v) => set({ completion: { ...s.completion, path: v } })} /></Row>
              {personalised && <Row label="Final assessment passed"><Toggle label="Assessment" on={s.completion.assessment} disabled={d} onChange={(v) => set({ completion: { ...s.completion, assessment: v } })} /></Row>}
              <Row label="Attestation signed" hint="The rep types their full name."><Toggle label="Attestation" on={s.completion.attestation} disabled={d} onChange={(v) => set({ completion: { ...s.completion, attestation: v } })} /></Row>
              <Field label="Attestation statement" multiline rows={2} value={s.attestation} disabled={d} onChange={(e) => set({ attestation: (e.target as unknown as HTMLTextAreaElement).value })} />
            </div>
          </Card>

          {personalised && (
            <Card title="Screening" eyebrow="The baseline">
              <div className="-mt-2 flex flex-col">
                <Row label="Adaptive quiz length" hint="At least one question per competency."><Num label="Screening items" value={s.screeningItems} suffix="questions" disabled={d} onChange={(n) => set({ screeningItems: n })} /></Row>
                <Row label="Voice call with an AI doctor" hint={hasScenario ? "~5 minutes. Typed fallback if the mic isn't available." : "Add a roleplay scenario for this product first."}><Toggle label="Screening call" on={s.screeningCall} disabled={d || !hasScenario} onChange={(v) => set({ screeningCall: v })} /></Row>
                {s.screeningCall && hasScenario && <Row label="Scenario"><select aria-label="Screening scenario" disabled={d} value={s.screeningScenarioId} onChange={(e) => set({ screeningScenarioId: e.target.value })} className="h-10 rounded-control border border-hair-2 bg-card px-3 text-body">{SCENARIOS.filter((x) => course.scenarioIds.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}</select></Row>}
              </div>
            </Card>
          )}

          {personalised && (
            <Card title="Final assessment" eyebrow="Pass criteria" className="xl:col-span-2">
              <div className="-mt-2 flex flex-col">
                <Row label="Quiz length"><Num label="Assessment items" value={s.assessmentItems} suffix="questions" disabled={d} onChange={(n) => set({ assessmentItems: n })} /></Row>
                <Row label="Roleplay call" hint={hasScenario ? undefined : "Add a roleplay scenario for this product first."}><Toggle label="Assessment call" on={s.assessmentCall && hasScenario} disabled={d || !hasScenario} onChange={(v) => set({ assessmentCall: v })} /></Row>
                {/* Must-pass competencies: a floor per topic, on top of the overall pass mark. */}
                <div className="flex flex-col gap-3 border-b border-hair py-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div className="flex max-w-[52ch] flex-col gap-0.5">
                      <Text size="body-lg" weight="semibold">Must-pass topics</Text>
                      <Text size="caption" tone="subtle">A rep fails if they score below this on any topic you tick, even when their overall score passes. Use it for topics where a gap is a compliance risk.</Text>
                    </div>
                    <div className="flex shrink-0 items-center gap-2"><Text size="body" tone="subtle">Minimum on each</Text><Num label="Minimum score on each must-pass topic" value={s.passCritical} suffix="%" disabled={d} onChange={(n) => set({ passCritical: n })} /></div>
                  </div>
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Must-pass topics">{course.competencyIds.map((c) => {
                    const on = s.criticalCompetencies.includes(c);
                    return (
                      <Chip key={c} size="md" selected={on} iconLeft={on ? <Check className="size-3.5" aria-hidden="true" /> : undefined}
                        onClick={d ? undefined : () => set({ criticalCompetencies: on ? s.criticalCompetencies.filter((x) => x !== c) : [...s.criticalCompetencies, c] })}>{competency(c)?.name}</Chip>
                    );
                  })}</div>
                  <Text size="caption" tone="muted">
                    {(() => {
                      const picked = s.criticalCompetencies.filter((c) => course.competencyIds.includes(c));
                      return picked.length
                        ? `Example: a rep who scores ${s.passOverall}% overall but ${Math.max(0, s.passCritical - 10)}% on ${competency(picked[0])?.name.toLowerCase()} fails.`
                        : `None ticked, so only the ${s.passOverall}% overall pass mark applies.`;
                    })()}
                  </Text>
                </div>
                {/* v1-hidden: roleplay pass score and cooldown; the defaults apply.
                {hasScenario && <Row label="Roleplay call score at least" hint="Share of the rubric points the rep hits on the recorded call."><Num label="Pass roleplay" value={s.passRoleplay} suffix="%" disabled={d} onChange={(n) => set({ passRoleplay: n })} /></Row>}
                <Row label="Cooldown between attempts"><Num label="Cooldown" value={s.cooldownHours} suffix="hours" disabled={d} onChange={(n) => set({ cooldownHours: n })} /></Row>
                */}
              </div>
            </Card>
          )}
        </div>
      )}
      {d && <Text size="caption" tone="subtle">Settings are part of the approved version and are locked with it.</Text>}
    </div>
  );
}
