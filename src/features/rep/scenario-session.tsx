"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Mic, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { nowIso, useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { allScenarios } from "@/data/scenarios";
import type { Attempt, Course, Progress, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, personInitials, scenarioScore, weightsOf } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Meter } from "@/components/patterns/academy";
import { ScenarioRun } from "@/features/roleplay/scenario-run";

/** A training's scenarios, in order, and where this rep stands on each. */
export function scenarioStatus(c: Course, p: Progress) {
  const scs = allScenarios().filter((x) => c.scenarioIds.includes(x.id)).sort((a, b) => c.scenarioIds.indexOf(a.id) - c.scenarioIds.indexOf(b.id));
  const runs = p.scenarioRuns ?? {};
  const todo = scs.filter((x) => !runs[x.id]);
  const failed = scs.filter((x) => runs[x.id] && !runs[x.id].passed);
  const passed = scs.filter((x) => runs[x.id]?.passed);
  return { scs, runs, todo, failed, passed, allPassed: scs.length > 0 && passed.length === scs.length };
}

/**
 * The rep's scenario call: every scenario back to back, in one call. The rep can stop between them;
 * Continue picks up the ones not done yet, and a failed scenario gets Retry on its own. Passing every
 * scenario passes the training's assessment.
 */
export function ScenarioSession({ courseId }: { courseId: string }) {
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const [running, setRunning] = useState<Scenario[] | null>(null);
  const [session, setSession] = useState<{ done: number; passed: number } | null>(null);
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === courseId);
  const c = s.courses.find((x) => x.id === courseId);
  if (!p || !c) return null;
  const st = c.settings;
  const { scs, runs, todo, failed, passed, allPassed } = scenarioStatus(c, p);
  const triesLeft = (sc: Scenario) => st.attempts - (runs[sc.id]?.tries ?? 0);
  const retryAt = (sc: Scenario) => runs[sc.id] ? new Date(new Date(runs[sc.id].at).getTime() + st.cooldownHours * 3600_000) : undefined;
  const cooling = (sc: Scenario) => !s.presenter && st.cooldownHours > 0 && (retryAt(sc)?.getTime() ?? 0) > new Date(nowIso()).getTime();
  const retryable = failed.filter((x) => triesLeft(x) > 0 && !cooling(x));

  /* Every scenario passed: that's the assessment passed, once. */
  function settle() {
    const fresh = useApp.getState().progress.find((x) => x.id === p!.id)!;
    const now = scenarioStatus(c!, fresh);
    if (!now.allPassed || fresh.attempts.some((a) => a.passed)) return;
    const scores = now.scs.map((x) => now.runs[x.id].score);
    const comp: Record<string, number[]> = {};
    for (const x of now.scs) for (const w of weightsOf(x)) (comp[w.competency] ??= []).push(now.runs[x.id].score);
    const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const attempt: Attempt = {
      at: new Date().toISOString(), quiz: 0, roleplay: overall, overall, passed: true, failedCompetencies: [],
      competencyScores: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)])),
      call: now.runs[now.scs.at(-1)!.id].call,
    };
    s.submitAssessment(p!.id, attempt);
  }

  if (running)
    return (
      <ScenarioRun scenarios={running} mode="assessment" voiceAllowed={!!s.voiceConsent[me.id]}
        onScenarioDone={(sc, r) => {
          const score = scenarioScore(sc, r);
          const ok = score >= st.passRoleplay && !r.flags.some((f) => f.critical);
          s.saveScenarioRun(p.id, sc.id, { score, passed: ok, call: { transcript: r.transcript, criteria: r.criteria, flags: r.flags, score, typed: r.typed, durationSec: r.durationSec } });
          setSession((x) => ({ done: (x?.done ?? 0) + 1, passed: (x?.passed ?? 0) + (ok ? 1 : 0) }));
        }}
        onFinish={() => { setRunning(null); s.touchStreak(me.id); settle(); }}
        onExit={() => setRunning(null)} />
    );

  const certified = p.state === "certified";
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      <Link href={`/rep/course/${c.id}`} aria-label="Exit" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
      <div className="flex flex-col gap-2">
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">The scenario call</Text>
        <Text size="subhead" tone="muted" className="leading-relaxed">{scs.length} people, back to back in one call. Stop between them whenever you need to; Continue picks up where you left off. Each scenario passes at {st.passRoleplay}%.</Text>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-caption font-semibold text-ink-3"><span>{passed.length} of {scs.length} passed</span>{failed.length > 0 && <span className="text-danger">{failed.length} to retry</span>}</div>
        <Meter value={(passed.length / Math.max(1, scs.length)) * 100} height={8} tone="ok" label="Scenarios passed" />
      </div>
      {session && (
        <div className="squircle rise-in flex items-start gap-3 rounded-panel bg-subtle p-3.5">
          <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />
          <Text size="body" tone="muted">Saved: you took {session.done} scenario{session.done === 1 ? "" : "s"} and passed {session.passed}.{todo.length ? ` ${todo.length} still to go.` : ""}</Text>
        </div>
      )}
      <ol className="flex flex-col gap-2" aria-label="Scenarios">
        {scs.map((sc, i) => {
          const r = runs[sc.id];
          const ch = CHARACTERS[characterOf(sc)];
          const next = !r && sc.id === todo[0]?.id;
          return (
            <li key={sc.id} className={cn("squircle flex items-center gap-3 rounded-panel border p-3", r?.passed ? "border-ok-line bg-ok-bg/50" : r ? "border-danger-line bg-danger-bg/40" : next ? "border-tint-line bg-tint/50" : "border-hair bg-card")}>
              <span className="relative grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-body font-extrabold text-white">
                {personInitials(sc.persona.name)}
                <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full border-2 border-card bg-ink text-[10px] font-bold text-white">{i + 1}</span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-lg font-semibold text-ink">{sc.title}</span>
                <span className="truncate text-caption text-ink-3">{sc.persona.name} · {ch.label} · about {sc.durationMin} min</span>
              </span>
              {r?.passed && <span className="flex shrink-0 items-center gap-1 rounded-chip bg-ok px-2 py-0.5 text-caption font-bold text-white"><Check className="size-3.5" aria-hidden="true" />{r.score}</span>}
              {r && !r.passed && (
                triesLeft(sc) > 0
                  ? <Button size="sm" variant="secondary" disabled={cooling(sc)} onClick={() => { setSession(null); setRunning([sc]); }} title={cooling(sc) ? `From ${retryAt(sc)!.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}` : undefined}>
                      <RotateCcw className="size-3.5" aria-hidden="true" />{cooling(sc) ? "Later" : `Retry · ${r.score}`}
                    </Button>
                  : <span className="shrink-0 rounded-chip bg-danger-bg px-2 py-0.5 text-caption font-bold text-danger">{r.score} · no tries left</span>
              )}
              {!r && <span className={cn("shrink-0 rounded-chip px-2 py-0.5 text-caption font-bold", next ? "bg-brand text-white" : "bg-subtle text-ink-3")}>{next ? "Up next" : "Not yet"}</span>}
            </li>
          );
        })}
      </ol>
      {failed.length > 0 && retryable.length < failed.length && (
        <Text size="caption" tone="subtle">{failed.some((x) => triesLeft(x) <= 0) ? "Out of tries on a scenario? Your manager can reset it." : `A failed scenario can be retried after ${st.cooldownHours} hours. Go back over the lessons first.`}</Text>
      )}
      <div className="mt-auto flex flex-col gap-2 pt-2">
        {allPassed ? (
          <>
            <div className="squircle flex items-center gap-3 rounded-panel bg-ok-bg p-4"><Check className="size-5 shrink-0 text-ok" aria-hidden="true" /><Text size="body-lg" weight="semibold">All {scs.length} scenarios passed.</Text></div>
            {certified
              ? <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}`)}>Back to the training</Button>
              : <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/attest`)}>Sign and get certified<ArrowRight className="size-4" aria-hidden="true" /></Button>}
          </>
        ) : todo.length ? (
          <Button size="lg" fullWidth onClick={() => { setSession(null); setRunning(todo); }}><Mic className="size-5" aria-hidden="true" />{todo.length === scs.length ? "Start the call" : `Continue the call · ${todo.length} left`}</Button>
        ) : retryable.length ? (
          <Button size="lg" fullWidth onClick={() => { setSession(null); setRunning(retryable); }}><RotateCcw className="size-4" aria-hidden="true" />Retry the {retryable.length} you missed</Button>
        ) : null}
        <Text size="caption" tone="subtle" className="text-center">The call is recorded. An off-label or risk-minimising statement fails that scenario.</Text>
      </div>
    </div>
  );
}
