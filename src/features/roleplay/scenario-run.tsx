"use client";

import { useState } from "react";
import { Check, Mic, X } from "lucide-react";
import type { Scenario } from "@/data/types";
import { CHARACTERS, characterOf, personInitials } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { CallScreen, type CallMode, type CallOutcome } from "./call-screen";

/**
 * One call, several scenarios back to back. When a scenario ends, the next character joins; between
 * them the rep can carry on or stop. Stopping keeps what's done, so Continue picks up the rest later.
 */
export function ScenarioRun({ scenarios, mode, voiceAllowed, onScenarioDone, onFinish, onExit, showSamples }: {
  scenarios: Scenario[]; mode: CallMode; voiceAllowed: boolean;
  onScenarioDone: (sc: Scenario, r: CallOutcome) => void;
  /** The run ended: every scenario taken, or the rep stopped after `done` of them. */
  onFinish: (done: number) => void;
  onExit: () => void;
  showSamples?: boolean;
}) {
  const [i, setI] = useState(0);
  const [between, setBetween] = useState(false);
  const sc = scenarios[i];
  const next = scenarios[i + 1];
  const n = scenarios.length;

  if (between && next) {
    const ch = CHARACTERS[characterOf(next)];
    return (
      <div className="flex min-h-full flex-1 flex-col gap-6 bg-ink px-5 pb-8 pt-5 text-white">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 rounded-chip bg-ok/20 px-2.5 py-1 text-caption font-semibold text-white"><Check className="size-3.5" aria-hidden="true" />Scenario {i + 1} of {n} done</span>
          <button type="button" aria-label="Exit" onClick={() => onFinish(i + 1)} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </div>
        <ol className="flex gap-1.5" aria-label="Scenarios in this call">
          {scenarios.map((x, k) => <li key={x.id} className={`h-1.5 flex-1 rounded-full ${k <= i ? "bg-ok" : k === i + 1 ? "bg-brand" : "bg-white/15"}`} />)}
        </ol>
        <div className="flex flex-col items-center gap-3 pt-6 text-center">
          <Text size="caption" weight="bold" tone="inverse" uppercase tracking="wider" className="opacity-60">Next on the call</Text>
          <div className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-hero font-extrabold">{personInitials(next.persona.name)}</div>
          <Text size="display-lg" weight="extrabold" tone="inverse">{next.persona.name}</Text>
          <Text size="body-lg" tone="inverse" className="opacity-70">{ch.label}{next.persona.specialty !== ch.label ? ` · ${next.persona.specialty}` : ""} · about {next.durationMin} min</Text>
        </div>
        <div className="squircle flex flex-col gap-2 rounded-panel bg-white/[0.06] p-4">
          <Text size="body-lg" weight="bold" tone="inverse">{next.title}</Text>
          {next.description && <Text size="body" tone="inverse" className="opacity-75">{next.description}</Text>}
          <Text size="caption" weight="bold" tone="inverse" className="pt-1 opacity-60">YOUR OBJECTIVE</Text>
          <Text size="body" tone="inverse">{next.objective}</Text>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Button size="lg" fullWidth onClick={() => { setI(i + 1); setBetween(false); }}><Mic className="size-5" aria-hidden="true" />Continue the call</Button>
          <Button size="lg" fullWidth variant="ghost" className="text-white hover:bg-white/10" onClick={() => onFinish(i + 1)}>
            End for now{mode === "assessment" ? ` · ${n - i - 1} left for later` : ""}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CallScreen key={sc.id} scenario={sc} mode={mode} voiceAllowed={voiceAllowed} skipPrep={i > 0} showSamples={showSamples} onExit={i > 0 ? () => onFinish(i) : onExit}
      run={n > 1 ? { label: `Scenario ${i + 1} of ${n}`, next: next ? `Next: ${next.persona.name} joins` : "Finish the call" } : undefined}
      onComplete={(r) => { onScenarioDone(sc, r); if (next) setBetween(true); else onFinish(n); }} />
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
