"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Lightbulb, Play, RotateCcw, X } from "lucide-react";
import { CallPlayback } from "@/features/roleplay/call-playback";
import { cn } from "@/lib/cn";
import { scenarioStatus, situationState } from "./situations";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { allScenarios } from "@/data/scenarios";
import type { Attempt, Course, Progress, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, scenarioScore, weightsOf } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ScenarioRun } from "@/features/roleplay/scenario-run";
import { CriteriaScores } from "@/features/roleplay/criteria-scores";

export { scenarioStatus, situationState, type SituationState } from "./situations";

/** Every situation passed: that's the assessment passed, once. */
function settle(courseId: string, progressId: string) {
  const s = useApp.getState();
  const c = s.courses.find((x) => x.id === courseId);
  const p = s.progress.find((x) => x.id === progressId);
  if (!c || !p) return;
  const now = scenarioStatus(c, p);
  if (!now.allPassed || p.attempts.some((a) => a.passed)) return;
  const scores = now.scs.map((x) => now.runs[x.id].score);
  const comp: Record<string, number[]> = {};
  for (const x of now.scs) for (const w of weightsOf(x)) (comp[w.competency] ??= []).push(now.runs[x.id].scores?.[w.competency] ?? now.runs[x.id].score);
  const overall = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const attempt: Attempt = {
    at: new Date().toISOString(), quiz: 0, roleplay: overall, overall, passed: true, failedCompetencies: [],
    competencyScores: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)])),
    call: now.runs[now.scs.at(-1)!.id].call,
  };
  s.submitAssessment(p.id, attempt);
}

/**
 * The scored call for a training built from the trainer's own material. It runs what the training page
 * asked for: one objective's situations (`obj`), a single situation (`sc`), or the report on one
 * (`report`). The situations play back to back; the rep can stop between them, and what's done is kept.
 */
export function ScenarioSession({ courseId }: { courseId: string }) {
  /* A new query (a report's Retry, say) is a new run. */
  const search = useSearchParams();
  return <Session key={search.toString()} courseId={courseId} />;
}

function Session({ courseId }: { courseId: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === courseId);
  const c = s.courses.find((x) => x.id === courseId);
  const back = `/rep/course/${courseId}`;
  const obId = search.get("obj");
  const scId = search.get("sc");
  const report = search.get("report");
  /* Fixed when the page opens, so saving a result mid-run doesn't change what's being run. */
  const [list] = useState<Scenario[]>(() => {
    if (!c || !p || report) return [];
    const { scs } = scenarioStatus(c, p);
    const can = (x: Scenario) => { const v = situationState(c, p, x, s.presenter).state; return v === "todo" || v === "retry"; };
    if (scId) return scs.filter((x) => x.id === scId && can(x));
    const mine = obId ? scs.filter((x) => x.objectiveId === obId) : scs;
    const todo = mine.filter((x) => situationState(c, p, x, s.presenter).state === "todo");
    return todo.length ? todo : mine.filter(can);
  });
  useEffect(() => { if (!report && !list.length) router.replace(back); }, [report, list.length, back, router]);
  if (!p || !c) return null;
  if (report) {
    const sc = allScenarios().find((x) => x.id === report);
    return sc ? <ScenarioReport c={c} p={p} sc={sc} /> : null;
  }
  if (!list.length) return null;
  const st = c.settings;

  return (
    <ScenarioRun scenarios={list} mode="assessment" voiceAllowed={!!s.voiceConsent[me.id]} hints={st.finalNoHints === false}
      onScenarioDone={(sc, r, meta) => {
        const score = scenarioScore(sc, r);
        const ok = score >= st.passRoleplay && !r.flags.some((f) => f.critical);
        s.saveScenarioRun(p.id, sc.id, { score, passed: ok, scores: r.competencyScores, hints: meta.hints, call: { transcript: r.transcript, criteria: r.criteria, flags: r.flags, score, typed: r.typed, durationSec: r.durationSec } });
        return { score, passed: ok };
      }}
      onFinish={(done) => { s.touchStreak(me.id); settle(c.id, p.id); router.push(`${back}?done=${done}&of=${list.length}${obId ? `&obj=${obId}` : ""}`); }}
      onExit={() => router.push(back)} />
  );
}

/** How one situation went: the score and the pass mark, each criterion, what was said that counted, and what's next. */
function ScenarioReport({ c, p, sc }: { c: Course; p: Progress; sc: Scenario }) {
  const router = useRouter();
  const presenter = useApp((x) => x.presenter);
  const [open, setOpen] = useState(false);
  const { run, state, triesLeft, retryAt } = situationState(c, p, sc, presenter);
  const back = `/rep/course/${c.id}`;
  if (!run) return null;
  const st = c.settings;
  const ch = CHARACTERS[characterOf(sc)];
  const ob = c.objectives?.find((o) => o.id === sc.objectiveId);
  const met = run.call?.criteria.filter((x) => x.met) ?? [];
  const missed = run.call?.criteria.filter((x) => !x.met) ?? [];
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const when = retryAt?.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex min-h-full flex-[1_0_auto] flex-col gap-5 px-5 pt-5">
      <button type="button" onClick={() => router.push(back)} aria-label="Back to the training" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Back to the training</button>
      <div className="flex flex-col gap-1">
        {ob && <Text size="caption" weight="bold" tone="brand-deep">{ob.title}</Text>}
        <Text as="h1" size="display" weight="extrabold" tracking="tight" className="leading-tight">{sc.title}</Text>
        <Text size="body" tone="subtle">{sc.persona.name} · {ch.label}</Text>
      </div>

      <div className={cn("squircle flex items-center gap-4 rounded-card p-4", run.passed ? "bg-ok-bg" : "bg-danger-bg/70")}>
        <span className={cn("grid size-16 shrink-0 place-items-center rounded-full text-display font-extrabold tabular-nums text-white", run.passed ? "bg-ok" : "bg-danger")}>{run.score}</span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text size="title" weight="bold">{run.passed ? "Passed" : run.call?.flags.some((f) => f.critical) ? "Not passed: a compliance flag" : "Not passed yet"}</Text>
          <Text size="caption" tone="muted">Pass mark {st.passRoleplay} · try {run.tries} of {st.attempts}{run.call ? ` · ${mmss(run.call.durationSec)}` : ""}{run.hints ? ` · ${run.hints} hint${run.hints === 1 ? "" : "s"} used` : ""}</Text>
        </div>
      </div>

      {run.hints ? <Text size="caption" tone="subtle" className="-mt-3 flex items-center gap-1"><Lightbulb className="size-3.5 shrink-0" aria-hidden="true" />Hints don&apos;t change the score, but your trainer sees how many you used.</Text> : null}

      {run.call?.flags.length ? (
        <section className="flex flex-col gap-2">
          {run.call.flags.map((f, i) => (
            <div key={i} className={cn("squircle flex items-start gap-2.5 rounded-panel border p-3", f.critical ? "border-danger-line bg-danger-bg/50" : "border-warn-line bg-warn-bg")}>
              <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", f.critical ? "text-danger" : "text-warn")} aria-hidden="true" />
              <span className="flex flex-col gap-0.5"><Text size="body" weight="bold">{f.label}</Text><Text size="caption" tone="muted">“{f.quote}”</Text><Text size="caption" tone="subtle">{f.explanation}</Text></span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <Text as="h2" size="body-lg" weight="bold">By criterion</Text>
        <CriteriaScores sc={sc} scores={run.scores ?? {}} fallback={run.score} pass={st.passRoleplay} />
      </section>

      {(met.length > 0 || missed.length > 0) && (
        <section className="flex flex-col gap-2">
          <Text as="h2" size="body-lg" weight="bold">What counted</Text>
          <ul className="flex flex-col gap-1.5">
            {[...met, ...missed].map((x) => (
              <li key={x.id} className="flex items-start gap-2 text-body">
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full", x.met ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger")}>{x.met ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}</span>
                <span className="flex flex-col gap-0.5">
                  <span className={x.met ? "text-ink-2" : "text-ink"}>{x.label}</span>
                  {x.quote && <span className="text-caption italic text-ink-3">“{x.quote}”</span>}
                  {!x.met && sc.rubric.find((r) => r.id === x.id)?.good && <span className="text-caption text-brand-deep">Try: {sc.rubric.find((r) => r.id === x.id)!.good.replace(/^"|"$/g, "")}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {run.call?.transcript.length ? (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <Text as="h2" size="body-lg" weight="bold">The call</Text>
            <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex items-center gap-1 text-caption font-semibold text-ink-3 hover:text-ink">{open ? "Hide" : "Listen and read"}<ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" /></button>
          </div>
          {open ? <CallPlayback result={run.call} who={sc.persona.name} /> : (
            <button type="button" onClick={() => setOpen(true)} className="squircle flex items-center gap-3 rounded-card bg-ink p-4 text-left text-white">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand"><Play className="ml-0.5 size-5" aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-col"><Text size="body" weight="bold" tone="inverse" truncate>Your call with {sc.persona.name.replace(/,.*$/, "")}</Text><Text size="caption" tone="inverse" className="opacity-60">{run.call.transcript.filter((x) => x.speaker === "rep").length} turns · tap a line to hear it</Text></span>
            </button>
          )}
        </section>
      ) : null}

      {/* What's next, always in reach. */}
      <div className="sticky bottom-0 z-10 -mx-5 mt-auto flex flex-col gap-2 border-t border-hair bg-canvas/95 px-5 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur-xl">
        {state === "retry" && <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/assessment?sc=${sc.id}`)}><RotateCcw className="size-4" aria-hidden="true" />Retry · {triesLeft} {triesLeft === 1 ? "try" : "tries"} left</Button>}
        {state === "waiting" && <Text size="body" tone="subtle" className="text-center">You can retry from {when}. Go back over the lessons first.</Text>}
        {state === "out" && <Text size="body" tone="subtle" className="text-center">No tries left on this one. Your manager can reset it.</Text>}
        <Button size="lg" fullWidth variant={state === "retry" ? "secondary" : "primary"} onClick={() => router.push(back)}>Back to the training</Button>
      </div>
    </div>
  );
}
