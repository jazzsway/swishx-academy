"use client";

import Link from "next/link";
import { Lock, Mic, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { allScenarios } from "@/data/scenarios";
import type { Course, Progress } from "@/data/types";
import { Text } from "@/components/ui/text";

const initials = (name: string) => name.replace(/^Dr\.?\s*/, "").split(" ").map((x) => x[0]).join("").slice(0, 2);

/** The course's practice doctors, one tap from the course: private, unlimited, no score kept. */
export function PracticeCalls({ c, p }: { c: Course; p: Progress }) {
  const scs = allScenarios().filter((x) => c.scenarioIds.includes(x.id) && x.use.includes("practice"));
  if (!scs.length) return null;
  const practiceOnly = p.mode === "practice";
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Text as="h2" size="subhead" weight="bold">{practiceOnly ? "Your practice" : "Practise the call"}</Text>
        <span className="flex items-center gap-1 text-caption font-semibold text-ink-3"><Lock className="size-3" aria-hidden="true" />Only you see it</span>
      </div>
      {scs.map((sc) => (
        <Link key={sc.id} href={`/rep/practice/call?scenario=${sc.id}`}
          className="squircle group relative flex items-center gap-3.5 overflow-hidden rounded-card bg-ink p-4 text-white shadow-float">
          <span className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 100% 0%, var(--color-brand) 0, transparent 55%)" }} />
          <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-body-lg font-extrabold">{initials(sc.persona.name)}</span>
          <span className="relative flex min-w-0 flex-1 flex-col">
            <Text size="body-lg" weight="bold" tone="inverse" truncate>{sc.persona.name}</Text>
            <Text size="caption" tone="inverse" className="opacity-70" truncate>{sc.persona.specialty} · about {sc.durationMin} min · {sc.objectionIds.length} objections</Text>
          </span>
          <span className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-white px-3 text-body font-bold text-ink transition-transform group-active:scale-95"><Mic className="size-4" aria-hidden="true" />Practise</span>
        </Link>
      ))}
      <Text size="caption" tone="subtle">{practiceOnly ? "You're assigned practice only: skip the modules, rehearse as often as you like, then take the final test." : "Rehearse as often as you like before the final call. Choose assisted or unassisted when you start."}</Text>
    </section>
  );
}

/** Where the rep started, where they are, and the pass mark, on one scale. */
export function BaselineCard({ c, p }: { c: Course; p: Progress }) {
  if (!c.settings.baseline || !p.screening) return null;
  const base = p.screening.overall;
  const best = p.attempts.length ? Math.max(...p.attempts.map((a) => a.overall)) : undefined;
  const pass = c.settings.passOverall;
  const now = best ?? base;
  const gain = best !== undefined ? best - base : 0;
  return (
    <section className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-4" aria-label="Your progress from baseline">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-brand-deep" aria-hidden="true" />
        <Text size="body-lg" weight="bold" className="flex-1">Your progress</Text>
        {best !== undefined && <span className={cn("rounded-chip px-2 py-0.5 text-caption font-bold", gain >= 0 ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger")}>{gain >= 0 ? "+" : ""}{gain} since baseline</span>}
      </div>
      <div className="relative h-3 rounded-full bg-black/[0.06]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-2 to-brand transition-[width] duration-700" style={{ width: `${now}%` }} />
        <span className="absolute -top-1 h-5 w-0.5 rounded-full bg-ink" style={{ left: `${base}%` }} aria-hidden="true" />
        <span className="absolute -top-1 h-5 w-0.5 rounded-full bg-ok" style={{ left: `${pass}%` }} aria-hidden="true" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">Baseline</Text><Text size="display" weight="extrabold" tabular>{base}</Text></div>
        <div className="flex flex-col"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{best !== undefined ? "Best so far" : "Now"}</Text><Text size="display" weight="extrabold" tabular tone={best !== undefined ? "brand-deep" : "default"}>{best ?? "–"}</Text></div>
        <div className="flex flex-col"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">Pass</Text><Text size="display" weight="extrabold" tabular tone="ok">{pass}</Text></div>
      </div>
      <Text size="caption" tone="subtle">{best !== undefined ? "Your best final-test score against your screening score, out of 100." : "Your screening score is your starting point. The final test shows how far you've come."}</Text>
    </section>
  );
}

/** Practice-only assignments say so up front, so the rep doesn't look for modules. */
export function PracticeOnlyNote() {
  return (
    <div className="squircle flex items-start gap-3 rounded-card border border-tint-line bg-tint p-4">
      <Mic className="mt-0.5 size-5 shrink-0 text-brand-deep" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <Text size="body-lg" weight="bold">Practice only</Text>
        <Text size="body" tone="muted">Your trainer assigned this as practice: no modules to work through. Rehearse the call, then take the final test.</Text>
      </div>
    </div>
  );
}
