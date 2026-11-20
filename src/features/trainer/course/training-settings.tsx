"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, Minus, Plus, Settings2, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { COMPETENCIES, competency, domainOf } from "@/data/org";
import type { Course, Scenario } from "@/data/types";
import { screeningOf } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/patterns/academy";
import { useCourse } from "./use-course";
import { StageHeader } from "./stage-ui";
import { Toggle } from "./settings";
// v1-hidden (situations per objective): import { Segmented, SegmentedButton } from "@/components/patterns/segmented";

const SEG = ["bg-brand", "bg-info", "bg-ok", "bg-warn", "bg-ink-3", "bg-brand-2"];

/**
 * Stage 3, settings, for a training with the trainer's own material. Only what a trainer has to
 * decide: what reps are scored on and what they can't miss, then the rules of the call. The rest
 * follows from those: screening sets the baseline and lets reps skip what they know; the scored
 * call never has hints.
 */
export function TrainingSettings() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  const custom = useApp((s) => s.scenarios);
  const scs = useMemo(() => allScenarios().filter((x) => data?.course.scenarioIds.includes(x.id)), [data?.course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  return (
    <div className="flex flex-col gap-4">
      <StageHeader n={3} sub="The rules of the call, and what reps are scored on. The defaults work." />
      <Rules course={data.course} scs={scs} />
      <Scoring course={data.course} scs={scs} />
    </div>
  );
}

/**
 * The organisation's criteria (Settings → Criteria), as this training uses them. Every criterion it scores, in one list: what it means, how much it counts across the
 * training (objectives with more situations count for more), where it's tested, and whether it's
 * must-pass. The weights are set on each objective; the floors are set here.
 */
/** v1-hidden: must-pass criteria with a minimum score. */
const MUST_PASS_ON = false;
/** v1-hidden: listing the organisation's criteria this training doesn't test. */
const UNTESTED_ON = false;

function Scoring({ course, scs }: { course: Course; scs: Scenario[] }) {
  const updateSettings = useApp((s) => s.updateSettings);
  const st = course.settings;
  const base = `/trainer/courses/${course.id}`;
  const obs = course.objectives ?? [];
  const rows = obs.map((ob, i) => ({ ob, i, n: Math.max(1, scs.filter((x) => x.objectiveId === ob.id).length) }));
  const total = rows.reduce((a, r) => a + r.n, 0);
  const list = [...new Set(obs.flatMap((o) => o.weights.map((w) => w.competency)))]
    .map((c) => ({
      c,
      pct: Math.round(rows.reduce((a, r) => a + (r.ob.weights.find((w) => w.competency === c)?.pct ?? 0) * r.n, 0) / Math.max(1, total)),
      in: rows.flatMap((r) => { const w = r.ob.weights.find((x) => x.competency === c); return w ? [{ ...r, pct: w.pct }] : []; }),
    }))
    .sort((a, b) => b.pct - a.pct);
  const top = Math.max(1, ...list.map((x) => x.pct));
  const untested = COMPETENCIES.filter((c) => !list.some((x) => x.c === c.id));
  const [more, setMore] = useState(false);
  const must = st.criticalCompetencies.filter((c) => list.some((x) => x.c === c));

  return (
    <Card title="How reps are scored" eyebrow="Criteria"
      actions={<Link href="/trainer/settings/competencies" className="flex items-center gap-1.5 text-caption font-semibold text-brand-deep hover:underline"><Settings2 className="size-3.5" aria-hidden="true" />Your organisation&apos;s criteria</Link>}>
      {!list.length ? (
        <Text size="body" tone="subtle">Each objective is scored on its own criteria. <Link href={`${base}/roleplay`} className="font-semibold text-brand-deep hover:underline">Add objectives</Link> to see them here.</Text>
      ) : (
        <>
          <Text size="body" tone="subtle" className="-mt-2 max-w-[68ch]">This training tests {list.length} of your organisation&apos;s criteria. Here&apos;s what each counts for across the training. Ask the agent to change the weights.</Text>
          <ul className="flex flex-col">
            {list.map(({ c, pct }, k) => (
              <li key={c} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-t border-hair py-3.5 first:border-0 first:pt-0">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2.5 shrink-0 rounded-full", SEG[k % SEG.length])} aria-hidden="true" />
                    <span className="text-body-lg font-semibold text-ink">{competency(c)?.name}</span>
                  </span>
                  <Text size="caption" tone="subtle" className="pl-[18px] leading-relaxed">{competency(c)?.description}</Text>
                </div>
                <span className="flex items-baseline gap-1"><span className="text-title font-extrabold tabular-nums text-ink">{pct}%</span><span className="text-micro text-ink-4">of the score</span></span>
                <span className="col-span-2 ml-[18px] h-1.5 overflow-hidden rounded-full bg-subtle" aria-hidden="true">
                  <span className={cn("block h-full rounded-full", SEG[k % SEG.length])} style={{ width: `${(pct / top) * 100}%` }} />
                </span>
              </li>
            ))}
            {/* v1-hidden: on each criterion, its domain tag, the objectives that test it (as chips) and a must-pass toggle. */}
          </ul>
          {/* v1-hidden: the criteria this training doesn't test. */}
          {UNTESTED_ON && untested.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-hair pt-3">
              <button type="button" aria-expanded={more} onClick={() => setMore(!more)} className="flex items-center gap-1.5 self-start text-caption font-semibold text-ink-3 hover:text-ink">
                <ChevronDown className={cn("size-3.5 transition-transform", more && "rotate-180")} aria-hidden="true" />{untested.length} more not tested in this training
              </button>
              {more && (
                <ul className="flex flex-col gap-1.5">
                  {untested.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-baseline gap-x-2 pl-5 text-caption">
                      <span className="font-semibold text-ink-2">{c.name}</span>
                      <span className="text-ink-4">{domainOf(c.id)?.short}</span>
                      <span className="min-w-0 flex-1 basis-[240px] text-ink-3">{c.description}</span>
                    </li>
                  ))}
                  <li className="pl-5 pt-1 text-caption text-ink-3">To test one, add an objective that covers it, or ask the agent to put weight on it.</li>
                </ul>
              )}
            </div>
          )}
          {/* v1-hidden: must-pass criteria and their minimum. */}
          {MUST_PASS_ON && <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-panel bg-subtle px-4 py-3">
            <ShieldAlert className="size-4 shrink-0 text-danger" aria-hidden="true" />
            <Text size="body" className="min-w-[220px] flex-1">
              {must.length
                ? <>A situation fails if the rep scores below the minimum on <b>{must.map((c) => competency(c)?.name).join(", ")}</b>, even when the total passes.</>
                : "No must-pass criteria, so only the pass mark counts. Mark the ones where a gap is a compliance risk."}
            </Text>
            {must.length > 0 && <Stepper label="Must-pass minimum" value={st.passCritical} step={5} min={10} max={100} suffix="%" onChange={(n) => updateSettings(course.id, { passCritical: n })} />}
          </div>}
        </>
      )}
    </Card>
  );
}

/** The rules of the call, one line each: passing, retries, screening, certification. */
function Rules({ course, scs }: { course: Course; scs: Scenario[] }) {
  const updateSettings = useApp((s) => s.updateSettings);
  const updateCourse = useApp((s) => s.updateCourse);
  const st = course.settings;
  const set = (patch: Parameters<typeof updateSettings>[1]) => updateSettings(course.id, patch);
  const screen = screeningOf(course, scs);
  return (
    <Card title="Rules of the call" eyebrow="Passing and certification">
      <ul className="-mt-1 flex flex-col">
        {/* v1-hidden: pass mark, retries and situations per objective. SwishX sets them.
        <Line label="Pass mark" hint="On each situation, from its weighted criteria. A critical compliance flag always fails it.">
          <Stepper label="Pass mark" value={st.passRoleplay} step={5} min={10} max={100} suffix="%" onChange={(n) => set({ passRoleplay: n })} />
        </Line>
        <Line label="Retries" hint="Per objective. A failed objective is retried on its own; passed ones stay passed.">
          <Stepper label="Tries" value={st.attempts} min={1} max={10} suffix={st.attempts === 1 ? "try" : "tries"} onChange={(n) => set({ attempts: n })} />
          {st.attempts > 1 && <><Text size="caption" tone="subtle">every</Text><Stepper label="Hours between tries" value={st.cooldownHours} step={12} min={0} max={168} suffix="h" onChange={(n) => set({ cooldownHours: n })} /></>}
        </Line>
        <Line label="Situations per objective" hint={(st.situationsPerObjective ?? "one") === "one" ? "Each rep is scored on one situation per objective, drawn for them (closest to their screening gaps). A retry draws another. Objectives with the same person share one call." : "Each rep is scored on every situation. More calls, full coverage."}>
          <Segmented aria-label="Situations per objective">
            <SegmentedButton active={(st.situationsPerObjective ?? "one") === "one"} onClick={() => set({ situationsPerObjective: "one" })}>1, drawn</SegmentedButton>
            <SegmentedButton active={st.situationsPerObjective === "all"} onClick={() => set({ situationsPerObjective: "all" })}>All</SegmentedButton>
          </Segmented>
        </Line>
        */}
        <Line label="Assisted mode" hint={st.finalNoHints === false ? "Reps can tap a bulb for a hint during the scored call. It doesn't change the score; you see how many they used. Screening never has hints." : "Off: the scored call has no hints, like the real thing. Reps can still practise with hints."}>
          <Toggle label="Assisted mode" on={st.finalNoHints === false} onChange={(v) => set({ finalNoHints: !v })} />
        </Line>
        <Line label="Screening call" hint={st.screening ? `3 minutes, not graded, from ${screen.length} situation${screen.length === 1 ? "" : "s"} SwishX picks. It sets each rep's baseline, and lessons they already know become optional.` : "Off: every rep takes every lesson, in order, with no baseline."}>
          <Toggle label="Screening" on={st.screening} onChange={(v) => { set(v ? { screening: true, screeningCall: true, baseline: true } : { screening: false, screeningCall: false, baseline: false }); updateCourse(course.id, { type: v ? "personalised" : "linear" }); }} />
        </Line>
        <Line label="Recertify" hint="Reps take the scored call again; the certificate lapses if they don't.">
          <Text size="caption" tone="subtle">every</Text>
          <Stepper label="Recertify months" value={st.recertMonths} min={1} max={36} suffix="mo" onChange={(n) => set({ recertMonths: n })} />
        </Line>
{/* v1-hidden: attestation. Reps certify without signing.
        <Line label="Attestation" hint="Reps type their full name under the statement before they certify.">
          <Toggle label="Attestation" on={st.completion.attestation} onChange={(v) => set({ completion: { ...st.completion, attestation: v } })} />
        </Line>
        */}
      </ul>
    </Card>
  );
}

export function Line({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-hair py-3 first:border-0">
      <div className="flex min-w-[220px] flex-1 basis-[260px] flex-col gap-0.5"><Text size="body" weight="semibold">{label}</Text><Text size="caption" tone="subtle" className="leading-relaxed">{hint}</Text></div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </li>
  );
}

/** A number with − and + either side: quicker than a field for the small ranges settings use. */
function Stepper({ value, onChange, step = 1, min, max, suffix, label }: { value: number; onChange: (n: number) => void; step?: number; min: number; max: number; suffix?: string; label: string }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  return (
    <span className="inline-flex h-9 items-center rounded-control border border-hair-2 bg-card">
      <button type="button" aria-label={`Less ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))} className="grid h-full w-8 place-items-center rounded-l-control text-ink-3 hover:bg-subtle hover:text-ink disabled:opacity-30"><Minus className="size-3.5" /></button>
      <span className="flex min-w-[56px] items-baseline justify-center gap-0.5 px-1">
        <input aria-label={label} inputMode="numeric" value={value} onChange={(e) => { const n = Number(e.target.value.replace(/\D/g, "")); if (!Number.isNaN(n)) onChange(clamp(n)); }}
          className="w-8 bg-transparent text-right text-body font-bold tabular-nums text-ink outline-none" />
        {suffix && <span className="text-caption text-ink-3">{suffix}</span>}
      </span>
      <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))} className="grid h-full w-8 place-items-center rounded-r-control text-ink-3 hover:bg-subtle hover:text-ink disabled:opacity-30"><Plus className="size-3.5" /></button>
    </span>
  );
}
