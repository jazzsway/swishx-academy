"use client";

import { cn } from "@/lib/cn";
import { competency } from "@/data/org";
import type { Scenario } from "@/data/types";
import { weightsOf } from "@/lib/scenario-set";

/**
 * How a call went on each criterion the scenario measures: the criterion, how much it counts, and the
 * score on it. Used on the trainer's test results and the rep's own results.
 */
export function CriteriaScores({ sc, scores, fallback, pass, dark }: {
  sc: Scenario;
  /** Score per criterion, 0–100. */
  scores: Record<string, number>;
  /** For a criterion with no score of its own: the call's overall score. */
  fallback: number;
  pass: number;
  dark?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Criteria">
      {weightsOf(sc).map((w) => {
        const v = scores[w.competency] ?? fallback;
        const ok = v >= pass;
        return (
          <li key={w.competency} className="grid grid-cols-[minmax(0,1fr)_auto_96px_32px] items-center gap-2.5 text-caption">
            <span className={cn("truncate font-semibold", dark ? "text-white/90" : "text-ink-2")}>{competency(w.competency)?.name ?? w.competency}</span>
            <span className={cn("tabular-nums", dark ? "text-white/50" : "text-ink-4")}>{w.pct}%</span>
            <span className={cn("h-1.5 overflow-hidden rounded-full", dark ? "bg-white/10" : "bg-black/[0.06]")}>
              <span className={cn("block h-full rounded-full", ok ? "bg-ok" : v >= 50 ? "bg-warn" : "bg-danger")} style={{ width: `${v}%` }} />
            </span>
            <b className={cn("text-right tabular-nums", ok ? (dark ? "text-white" : "text-ink") : "text-danger")}>{v}</b>
          </li>
        );
      })}
    </ul>
  );
}
