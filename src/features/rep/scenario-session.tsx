"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Lightbulb, Play, RotateCcw, X } from "lucide-react";
import { CallPlayback } from "@/features/roleplay/call-playback";
import { cn } from "@/lib/cn";
import { callPlan, situationState, type PlannedCall } from "./situations";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { allScenarios, objection } from "@/data/scenarios";
import type { Attempt, Course, Progress, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, scenarioScore, weightsOf } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { CriteriaScores } from "@/features/roleplay/criteria-scores";

export { scenarioStatus, situationState, type SituationState } from "./situations";
import { CallScreen } from "@/features/roleplay/call-screen";
import { callQueue, scoreCall } from "@/features/roleplay/engine";

/** Every objective passed: that's the assessment passed, once. */
function settle(courseId: string, progressId: string) {
  const s = useApp.getState();
  const c = s.courses.find((x) => x.id === courseId);
  const p = s.progress.find((x) => x.id === progressId);
  if (!c || !p) return;
  const plan = callPlan(c, p);
  if (!plan.allPassed || p.attempts.some((a) => a.passed)) return;
  const runs = p.scenarioRuns ?? {};
  const passed = Object.entries(runs).filter(([, r]) => r.passed);
  const comp: Record<string, number[]> = {};
  for (const [id, r] of passed) { const sc = allScenarios().find((x) => x.id === id); if (sc) for (const w of weightsOf(sc)) (comp[w.competency] ??= []).push(r.scores?.[w.competency] ?? r.score); }
  const overall = Math.round(passed.reduce((a, [, r]) => a + r.score, 0) / Math.max(1, passed.length));
  const attempt: Attempt = {
    at: new Date().toISOString(), quiz: 0, roleplay: overall, overall, passed: true, failedCompetencies: [],
    competencyScores: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)])),
    call: passed.at(-1)?.[1].call,
  };
  s.submitAssessment(p.id, attempt);
}

/**
 * One call with one person that covers several situations: the first situation's person hosts, and
 * raises each situation's moments in turn. Scoring still happens per situation, against its own rubric.
 */
function chainedScenario(items: PlannedCall["items"]): { sc: Scenario; objectionIds: string[] } {
  const host = items[0].sc;
  const uniq = <T,>(xs: T[], key: (x: T) => string) => xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i);
  if (items.length === 1) return { sc: host, objectionIds: callQueue(host, "assessment") };
  /* Each situation brings what it's scored on: the objections (and moments) that test its criteria. */
  const pick = (x: Scenario) => {
    const q = callQueue(x, "assessment");
    const ws = weightsOf(x).map((w) => w.competency);
    const fit = q.filter((id) => ws.includes(objection(id)?.competency ?? ""));
    return (fit.length ? fit : q).slice(0, 2);
  };
  /* The same moment from two situations ("a patient got a rash") comes up once. */
  const objectionIds = uniq(items.flatMap((x) => pick(x.sc)), (id) => objection(id)?.line ?? id);
  const sc: Scenario = {
    ...host,
    id: `${host.id}-chain`,
    title: `${items.length} objectives with ${host.persona.name.replace(/,.*$/, "")}`,
    description: undefined,
    objective: "Handle each thing as it comes up: on-label, in balance, and with a next step at the end.",
    rubric: uniq(items.flatMap((x) => x.sc.rubric), (r) => r.id),
    prohibitedIds: uniq(items.flatMap((x) => x.sc.prohibitedIds), (x) => x),
    durationMin: Math.min(15, items.reduce((a, x) => a + Math.ceil(x.sc.durationMin * 0.7), 0)),
    custom: host.custom ? { ...host.custom, objections: uniq(items.flatMap((x) => x.sc.custom?.objections ?? []), (o) => o.id) } : host.custom,
  };
  return { sc, objectionIds };
}

/**
 * The scored calls for a training built from the trainer's own material. `call` is who the rep meets
 * (one call per person); it covers every objective drawn for them, or just `ob` when retrying one.
 * `report` is how one situation went.
 */
export function ScenarioSession({ courseId }: { courseId: string }) {
  /* A new query (a report's Retry, say) is a new call. */
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
  const who = search.get("call");
  const only = search.get("ob");
  const report = search.get("report");
  /* Fixed when the page opens: saving results as the call ends mustn't change the call. */
  const [call] = useState<PlannedCall | null>(() => {
    if (!c || !p || report || !who) return null;
    const found = callPlan(c, p, s.presenter).calls.find((x) => x.key === who);
    if (!found) return null;
    const items = only ? found.items.filter((x) => x.ob?.id === only) : found.items;
    return items.length ? { ...found, items } : null;
  });
  /* The draws are the rep's: kept, so the same situation waits for them if they leave before starting. */
  useEffect(() => {
    if (call && p) s.setDraws(p.id, Object.fromEntries(call.items.filter((x) => x.ob).map((x) => [x.ob!.id, x.sc.id])));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!report && !call) router.replace(back); }, [report, call, back, router]);
  if (!p || !c) return null;
  if (report) {
    const sc = allScenarios().find((x) => x.id === report);
    return sc ? <ScenarioReport c={c} p={p} sc={sc} /> : null;
  }
  if (!call) return null;
  const st = c.settings;
  const chain = chainedScenario(call.items);

  return (
    <CallScreen scenario={chain.sc} objectionIds={chain.objectionIds} mode="assessment" voiceAllowed={!!s.voiceConsent[me.id]} hints={st.finalNoHints === false}
      covers={call.items.length > 1 ? call.items.map((x) => ({ objective: x.ob?.title ?? x.sc.title, situation: x.sc.title })) : undefined}
      onExit={() => router.push(back)}
      onComplete={(r, meta) => {
        /* Each situation on the call is scored on its own criteria, so a slip on one only fails its objective. */
        let ok = 0;
        for (const { sc } of call.items) {
          const ri = scoreCall(sc, r.transcript, r.typed);
          const score = scenarioScore(sc, ri);
          const passed = score >= st.passRoleplay && !ri.flags.some((f) => f.critical);
          if (passed) ok += 1;
          s.saveScenarioRun(p.id, sc.id, { score, passed, scores: ri.competencyScores, hints: meta.hints, call: { transcript: r.transcript, criteria: ri.criteria, flags: ri.flags, score, typed: r.typed, durationSec: r.durationSec } });
        }
        s.touchStreak(me.id);
        settle(c.id, p.id);
        router.push(`${back}?took=${call.items.length}&passed=${ok}`);
      }} />
  );
}

/** How one situation went: the score and the pass mark, each criterion, what was said that counted, and what's next. */
function ScenarioReport({ c, p, sc }: { c: Course; p: Progress; sc: Scenario }) {
  const router = useRouter();
  const presenter = useApp((x) => x.presenter);
  const [open, setOpen] = useState(false);
  const { run } = situationState(c, p, sc, presenter);
  /* Retries are per objective: its plan says whether, when, and with which situation. */
  const plan = callPlan(c, p, presenter);
  const op = plan.objectives.find((o) => (sc.objectiveId ? o.ob?.id === sc.objectiveId : !o.ob));
  const state = op?.state === "passed" ? "passed" : op?.state ?? "passed";
  const triesLeft = op?.triesLeft ?? 0;
  const retryAt = op?.retryAt;
  const retryCall = plan.calls.find((x) => x.items.some((i) => (op?.ob ? i.ob?.id === op.ob.id : i.sc.id === sc.id)));
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
        {state === "retry" && retryCall && <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/assessment?call=${retryCall.key}${op?.ob ? `&ob=${op.ob.id}` : ""}`)}><RotateCcw className="size-4" aria-hidden="true" />Retry this objective · {triesLeft} {triesLeft === 1 ? "try" : "tries"} left</Button>}
        {state === "retry" && (c.settings.situationsPerObjective ?? "one") === "one" && op?.ob && op.bank.length > 1 && <Text size="caption" tone="subtle" className="-mt-1 text-center">Your retry draws a different situation from this objective.</Text>}
        {state === "waiting" && <Text size="body" tone="subtle" className="text-center">You can retry from {when}. Go back over the lessons first.</Text>}
        {state === "out" && <Text size="body" tone="subtle" className="text-center">No tries left on this one. Your manager can reset it.</Text>}
        <Button size="lg" fullWidth variant={state === "retry" ? "secondary" : "primary"} onClick={() => router.push(back)}>Back to the training</Button>
      </div>
    </div>
  );
}
