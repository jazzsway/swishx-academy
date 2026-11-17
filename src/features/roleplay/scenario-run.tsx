"use client";

import { useState } from "react";
import { Check, Mic, Target, X } from "lucide-react";
import type { Scenario } from "@/data/types";
import { CHARACTERS, characterOf } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { CallScreen, ROLE_ICON, type CallMode, type CallOutcome } from "./call-screen";

/**
 * One call, several scenarios back to back. When a scenario ends, the next character joins; between
 * them the rep can carry on or stop. Stopping keeps what's done, so Continue picks up the rest later.
 */
export function ScenarioRun({ scenarios, mode, voiceAllowed, onScenarioDone, onFinish, onExit, showSamples, hints }: {
  scenarios: Scenario[]; mode: CallMode; voiceAllowed: boolean;
  /** Returns the scored result, when there is one, so the next screen can say how it went. */
  onScenarioDone: (sc: Scenario, r: CallOutcome, meta: { hints: number }) => { score: number; passed: boolean } | void;
  /** Assisted mode: the rep can ask for a hint. */
  hints?: boolean;
  /** The run ended: every scenario taken, or the rep stopped after `done` of them. */
  onFinish: (done: number) => void;
  onExit: () => void;
  showSamples?: boolean;
}) {
  const [i, setI] = useState(0);
  const [between, setBetween] = useState(false);
  const [last, setLast] = useState<{ score: number; passed: boolean } | null>(null);
  const sc = scenarios[i];
  const next = scenarios[i + 1];
  const n = scenarios.length;

  if (between && next) {
    const ch = CHARACTERS[characterOf(next)];
    const Next = ROLE_ICON[characterOf(next)];
    return (
      <div className="flex min-h-full flex-[1_0_auto] flex-col bg-ink text-white">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <span className="flex items-center gap-1.5 rounded-chip bg-ok/20 px-2.5 py-1 text-caption font-semibold text-white"><Check className="size-3.5" aria-hidden="true" />Situation {i + 1} of {n} done</span>
          <button type="button" aria-label="End for now" onClick={() => onFinish(i + 1)} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-4">
          <ol className="flex gap-1.5" aria-label="Situations in this call">
            {scenarios.map((x, k) => <li key={x.id} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-ok" : k === i + 1 ? "bg-brand" : "bg-white/15"}`} />)}
          </ol>
          {/* How the one just finished went. */}
          {last && (
            <div className={`squircle flex items-center gap-3 rounded-panel p-3 ${last.passed ? "bg-ok/15" : "bg-danger/15"}`}>
              <span className={`grid size-10 shrink-0 place-items-center rounded-full text-body font-extrabold tabular-nums ${last.passed ? "bg-ok" : "bg-danger"}`}>{last.score}</span>
              <span className="flex min-w-0 flex-col">
                <Text size="body" weight="bold" tone="inverse">{sc.persona.name.replace(/,.*$/, "")} · {last.passed ? "passed" : "not passed yet"}</Text>
                <Text size="caption" tone="inverse" className="opacity-60">{last.passed ? "Saved to your training." : "Saved. You can retry it from the training page."}</Text>
              </span>
            </div>
          )}

          {/* Who's next. */}
          <span className="pt-1 text-micro font-bold uppercase tracking-wider text-white/50">Next on the call</span>
          <div className="-mt-2 flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand shadow-brand-lift"><Next className="size-7" aria-hidden="true" /></div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <Text size="title" weight="extrabold" tone="inverse" className="leading-tight">{next.persona.name}</Text>
              <Text size="body" tone="inverse" className="opacity-70">{ch.label}{next.persona.specialty !== ch.label ? ` · ${next.persona.specialty}` : ""} · about {next.durationMin} min</Text>
            </div>
          </div>
          <div className="squircle flex flex-col gap-1.5 rounded-panel bg-white/[0.06] p-4">
            <span className="text-micro font-bold uppercase tracking-wider text-white/50">The situation</span>
            <Text size="body-lg" weight="bold" tone="inverse" className="leading-snug">{next.title}</Text>
            {next.description && <Text size="body" tone="inverse" className="leading-relaxed opacity-75">{next.description}</Text>}
          </div>
          <div className="flex gap-3 rounded-panel border border-white/10 p-3.5">
            <Target className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden="true" />
            <div className="flex min-w-0 flex-col gap-1"><span className="text-micro font-bold uppercase tracking-wider text-white/50">Your goal</span><Text size="body" tone="inverse" className="leading-relaxed">{next.objective}</Text></div>
          </div>
        </div>

        {/* Carry on, or stop here: both always in reach. */}
        <div className="sticky bottom-0 z-10 flex flex-col gap-1.5 border-t border-white/10 bg-ink/95 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur">
          <Button size="lg" fullWidth onClick={() => { setI(i + 1); setBetween(false); }}><Mic className="size-5" aria-hidden="true" />Continue: {next.persona.name.replace(/,.*$/, "")} joins</Button>
          <Button size="lg" fullWidth variant="ghost" className="text-white hover:bg-white/10" onClick={() => onFinish(i + 1)}>
            End for now{mode === "assessment" ? ` · ${n - i - 1} left for later` : " · what you've done is saved"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CallScreen key={sc.id} scenario={sc} mode={mode} voiceAllowed={voiceAllowed} skipPrep={i > 0} showSamples={showSamples} hints={hints} onExit={i > 0 ? () => onFinish(i) : onExit}
      run={n > 1 ? { label: `Situation ${i + 1} of ${n}`, next: next ? `Next: ${next.persona.name} joins` : "Finish the call" } : undefined}
      onComplete={(r, meta) => { setLast(onScenarioDone(sc, r, { hints: meta.hints }) ?? null); if (next) setBetween(true); else onFinish(n); }} />
  );
}

/** Several scenarios' outcomes as one: the screening call's baseline is all of them together. */
export function combineOutcomes(rs: CallOutcome[]): CallOutcome | undefined {
  if (!rs.length) return undefined;
  const comp: Record<string, number[]> = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.competencyScores)) (comp[k] ??= []).push(v);
  return {
    transcript: rs.flatMap((r) => r.transcript), criteria: rs.flatMap((r) => r.criteria), flags: rs.flatMap((r) => r.flags),
    score: Math.round(rs.reduce((a, r) => a + r.score, 0) / rs.length), typed: rs.some((r) => r.typed), durationSec: rs.reduce((a, r) => a + r.durationSec, 0),
    competencyScores: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)])),
  };
}
