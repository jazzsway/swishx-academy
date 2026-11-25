"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, GitBranch, Layers, Mic, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { CHARACTERS, characterOf } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { useCourse } from "./use-course";
import { StageHeader } from "./stage-ui";
import { ROLE_ICON } from "./scenarios";
import { ObjectiveFlow } from "./roleplay";
import { objectiveBank, screeningMinutes, screeningSet } from "@/lib/objective-call";

/**
 * Test the calls, before publishing. A call is per objective, as reps get it: one of the objective's
 * situations, drawn. Take any objective's call (voice or typing, scored, nothing saved; each go draws
 * again), or open its call flow to see how a call goes, on any of its situations: how the person opens, what they push on,
 * what happens when the rep handles or misses it, and how it's scored.
 */
export function TestStage() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  const custom = useApp((s) => s.scenarios);
  const scs = useMemo(() => allScenarios().filter((x) => data?.course.scenarioIds.includes(x.id)), [data?.course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const [open, setOpen] = useState<string | null>(null);
  if (!data) return null;
  const { course } = data;
  const test = `/trainer/courses/${course.id}/roleplay/test`;
  /* Screening-only situations set the baseline; they're never drawn for an objective's call. */
  const scored = scs.filter((x) => !x.use.includes("screening") || x.use.includes("assessment"));
  const screen = course.settings.screening ? screeningSet(course, scs) : [];
  /* Every objective has a call; with no situations, it's made from the objective itself. */
  const obs = (course.objectives ?? []).map((ob, i) => ({ ob, i, list: scored.filter((x) => x.objectiveId === ob.id), bank: objectiveBank(course, ob, scored) }));
  const pass = course.settings.passRoleplay;
  const calls = obs.length;
  const callBtn = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3.5 text-caption font-bold text-white shadow-brand-lift transition-colors hover:bg-brand-deep";
  const ghostBtn = "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-hair-2 bg-card px-3 text-caption font-bold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep";

  return (
    <div className="flex flex-col gap-4">
      <StageHeader n={5} sub="One call per objective, on a situation drawn for you, as reps get it. Nothing is saved."
        actions={calls > 1 && <Link href={`${test}?run=assessment&from=test`} className="inline-flex h-9 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 text-body font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep"><Layers className="size-4" aria-hidden="true" />Every objective · {calls} calls</Link>} />

      {screen.length > 0 && (
        <section className="squircle flex flex-wrap items-center gap-3 rounded-card border border-hair bg-card p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-info-bg text-info"><ShieldCheck className="size-5" aria-hidden="true" /></span>
          <span className="flex min-w-0 flex-1 flex-col">
            <Text size="body-lg" weight="bold">Screening call</Text>
            <Text size="caption" tone="subtle">About {screeningMinutes(screen.length)} min · sets the baseline · one question per objective</Text>
          </span>
          <Link href={`${test}?run=screening&from=test`} className={callBtn}><Mic className="size-3.5" aria-hidden="true" />Call</Link>
        </section>
      )}

      {obs.map(({ ob, i, list, bank }) => (
        <section key={ob.id} className="squircle flex flex-col overflow-hidden rounded-card border border-hair bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-hair px-4 py-3">
            <span className="grid size-6 shrink-0 place-items-center rounded-glyph bg-brand text-micro font-extrabold tabular-nums text-white">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <Text size="body-lg" weight="bold" className="leading-snug">{ob.title}</Text>
              <Text size="caption" tone="subtle">{list.length > 1 ? `One of ${list.length} situations, drawn` : list.length ? "Its one situation" : "No situations: the call is on the objective itself"} · pass {pass}%</Text>
            </span>
            {/* The call flow is for viewing a live training, not for building or editing one. */}
            {!data.editable && (
              <button type="button" onClick={() => setOpen(open === ob.id ? null : ob.id)} aria-expanded={open === ob.id} className={cn(ghostBtn, open === ob.id && "border-brand text-brand-deep")}>
                <GitBranch className="size-3.5" aria-hidden="true" />Call flow<ChevronDown className={cn("size-3.5 transition-transform", open === ob.id && "rotate-180")} aria-hidden="true" />
              </button>
            )}
            <Link href={`${test}?run=objective&obj=${ob.id}&from=test`} className={callBtn}><Mic className="size-3.5" aria-hidden="true" />Call</Link>
          </div>
          {!data.editable && open === ob.id && <div className="border-b border-hair bg-canvas/40"><ObjectiveFlow scs={bank} passMark={pass} /></div>}
          {/* No situations: the objective's own call stands in. Situations add specific moments and edge cases. */}
          {!list.length && <Text size="caption" tone="subtle" className="px-4 py-3">Add situations for specific moments and edge cases. Until then, reps get a call on the objective itself.</Text>}
          <ul className="flex flex-col divide-y divide-hair">
            {list.map((sc) => {
              const Icon = ROLE_ICON[characterOf(sc)];
              return (
                <li key={sc.id} className="flex flex-col">
                  <div className="flex flex-wrap items-center gap-3 py-2.5 pl-6 pr-4">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-subtle text-ink-3"><Icon className="size-3.5" aria-hidden="true" /></span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Text size="body" weight="medium" className="leading-snug">{sc.title}</Text>
                      <Text size="caption" tone="subtle">{sc.persona.name} · {CHARACTERS[characterOf(sc)].label} · about {sc.durationMin} min</Text>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
