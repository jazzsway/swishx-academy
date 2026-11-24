"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { X, Lock, ArrowRight, Check, ChevronDown, Play } from "lucide-react";
import { CallPlayback } from "@/features/roleplay/call-playback";
import { BottomActions } from "@/features/shell/bottom-actions";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { competency, COMPETENCIES } from "@/data/org";
import { scenario as getScenario } from "@/data/scenarios";
import type { Item, Scenario } from "@/data/types";
import { blendScores, scoreItems, bandOf, BAND_LABEL, pathMinutes } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { ScreenTop, BottomBar } from "@/features/shell/screen-chrome";
import { Chip } from "@/components/ui/chip";
import { BandChip, Meter, EmptyState } from "@/components/patterns/academy";
import { CallScreen, type CallOutcome } from "@/features/roleplay/call-screen";
import { ScenarioRun, combineOutcomes } from "@/features/roleplay/scenario-run";
import { allScenarios } from "@/data/scenarios";
import { CRITERIA, screeningOf } from "@/lib/scenario-set";
import { modulesOf } from "./use-rep";
import { materialOptional, noMaterial } from "@/lib/direct-material";

/** SC-1: adaptive pick. Fewest-asked competency first, closest to the target difficulty. */
function pickNext(pool: Item[], asked: string[], target: number) {
  const left = pool.filter((i) => !asked.includes(i.id));
  if (!left.length) return undefined;
  const count = (c: string) => asked.filter((id) => pool.find((i) => i.id === id)?.competency === c).length;
  return [...left].sort((a, b) => count(a.competency) - count(b.competency) || Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target))[0];
}

export function Screening() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  const pool = useMemo(() => c?.items.filter((i) => i.pool === "screening") ?? [], [c]);
  const total = Math.min(c?.settings.screeningItems ?? 12, pool.length);
  const [asked, setAsked] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [target, setTarget] = useState(2);
  const [current, setCurrent] = useState<Item | undefined>(() => pickNext(pool, [], 2));
  /* No screening questions (a direct course): the call is the whole screening. */
  const [phase, setPhase] = useState<"quiz" | "bridge" | "call">(pool.length ? "quiz" : "bridge");
  const outcomes = useRef<CallOutcome[]>([]);
  /* The situations this call runs, fixed when it starts: saving one as it ends mustn't reshuffle the run. */
  const [running, setRunning] = useState<Scenario[] | null>(null);

  if (!p || !c) return <div className="p-4"><EmptyState title="Not assigned" /></div>;
  /* A training with the trainer's own material screens with a short call built from its scenarios. */
  const screenAll = c.origin === "direct" ? screeningOf(c, allScenarios().filter((x) => c.scenarioIds.includes(x.id))).map((x, _i, all) => ({ ...x, durationMin: Math.max(1, Math.round(3 / all.length)) })) : [];
  /* Stopped partway last time: only the situations not taken yet. */
  const part = p.screeningPart ?? [];
  const screenRun = screenAll.filter((x) => !part.some((d) => d.scenarioId === x.id));
  const sc = screenRun[0] ?? (c.settings.screeningScenarioId ? getScenario(c.settings.screeningScenarioId) : undefined);

  function answer(choice: number | null) {
    if (!current) return;
    const nextAsked = [...asked, current.id];
    const nextAnswers = { ...answers, [current.id]: choice };
    const ok = choice === current.answer;
    const t = ok ? Math.min(3, target + 1) : Math.max(1, target - 1);
    setAsked(nextAsked);
    setAnswers(nextAnswers);
    setTarget(t);
    if (nextAsked.length >= total) {
      if (c!.settings.screeningCall && sc) setPhase("bridge");
      else finish(nextAnswers);
      return;
    }
    setCurrent(pickNext(pool, nextAsked, t));
  }

  function finish(ans: Record<string, number | null>, call?: CallOutcome) {
    const quiz = scoreItems(pool, ans);
    const scores = pool.length ? blendScores(quiz.scores, call?.competencyScores) : call?.competencyScores ?? {};
    const overall = call ? (pool.length ? Math.round(quiz.overall * 0.7 + call.score * 0.3) : call.score) : quiz.overall;
    s.saveScreening(p!.id, { overall, scores, call: call ? { transcript: call.transcript, criteria: call.criteria, flags: call.flags, score: call.score, typed: call.typed, durationSec: call.durationSec } : undefined });
    s.touchStreak(me.id);
    router.replace(`/rep/course/${c!.id}/results?fresh=1`);
  }

  if (phase === "call" && running?.length)
    return <ScenarioRun scenarios={running} mode="screening" voiceAllowed={!!s.voiceConsent[me.id]} onExit={() => router.push(`/rep/course/${c.id}`)}
      onScenarioDone={(x, r) => { outcomes.current.push(r); s.saveScreeningPart(p.id, x.id, r); }}
      onFinish={(done) => {
        /* Every situation taken: that's the baseline. Stopped early: what's done is kept for Resume. */
        if (done < running.length) return router.push(`/rep/course/${c.id}?paused=screening`);
        const all = [...part.map((d) => d.result), ...outcomes.current];
        finish(answers, combineOutcomes(all));
      }} />;

  if (phase === "call" && sc)
    return <CallScreen scenario={sc} mode="screening" voiceAllowed={!!s.voiceConsent[me.id]} onExit={() => router.push(`/rep/course/${c.id}`)} onComplete={(r) => finish(answers, r)} />;

  if (phase === "bridge")
    return (
      <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pt-5">
        <ScreenTop title={part.length ? "Pick up your screening" : pool.length ? "Now, a short call" : "Start with a short call"}
          leading={pool.length > 0 ? undefined : <Link href={`/rep/course/${c.id}`} aria-label="Exit" className="focus-ring grid size-11 shrink-0 place-items-center rounded-full border border-hair-3 bg-card/60"><X className="size-5" /></Link>}
          eyebrow={pool.length > 0 ? <Chip tone="ok" size="md">Quiz done · {total} questions</Chip> : undefined} />
        {part.length > 0 && <span className="flex items-center gap-1.5 self-start rounded-chip bg-ok-bg px-2.5 py-1 text-caption font-bold text-ok">{part.length} of {screenAll.length} done · {screenRun.length} left</span>}
        <Text size="subhead" tone="muted" className="leading-relaxed">{part.length ? `Next up: ${screenRun.map((x) => x.persona.name).join(" and ")}. What you've done is saved.` : screenRun.length > 1 ? `You'll meet ${screenRun.map((x) => x.persona.name).join(" and ")}, back to back.` : `You'll talk to ${sc?.persona.name}, an AI ${sc?.persona.specialty.toLowerCase() ?? "doctor"}.`} Treat it like a real first call.</Text>
        {/* What it does, as three short facts rather than a paragraph. */}
        <ul className="flex flex-col divide-y divide-hair overflow-hidden rounded-card bg-card shadow-hair">
          {[["Not graded", "Nothing here counts against you"], ...(pool.length || noMaterial(c) || materialOptional(c, p) || !modulesOf(c).length ? [] : [["Shortens your path", "Skip the lessons you already know"]]), ["About 3 minutes", "Stop any time; it's saved"]].map(([t, d]) => (
            <li key={t} className="flex flex-col px-4 py-3"><Text size="body-lg" weight="bold">{t}</Text><Text size="caption" tone="subtle">{d}</Text></li>
          ))}
        </ul>
        <div className="squircle flex items-start gap-3 rounded-panel bg-subtle p-4"><Lock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" /><Text size="body" tone="muted">Your trainer sees your scores by criterion, not the recording.</Text></div>
        <BottomBar>
          <Button size="lg" fullWidth onClick={() => { setRunning(screenRun); setPhase("call"); }}>{part.length ? "Resume the call" : "Go to the call"}<ArrowRight className="size-4" aria-hidden="true" /></Button>
          <Button size="lg" fullWidth variant="ghost" onClick={() => finish(answers)}>{pool.length ? "Skip the call for now" : noMaterial(c) || materialOptional(c, p) || !modulesOf(c).length ? "Skip it and go to the assessments" : "Skip it and take every lesson"}</Button>
        </BottomBar>
      </div>
    );

  const q = current!;
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      <div className="flex items-center gap-3">
        <Link href={`/rep/course/${c.id}`} aria-label="Save and exit" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex justify-between text-caption text-ink-3"><span>Screening · not graded</span><span>{asked.length + 1} of {total}</span></div>
          <Meter value={(asked.length / total) * 100} height={6} label="Screening progress" />
        </div>
      </div>
      <div key={q.id} className="rise-in flex flex-1 flex-col gap-5">
        <Chip size="sm" className="self-start">{competency(q.competency)?.name}</Chip>
        <Text as="h1" size="display" weight="bold" className="leading-snug">{q.question}</Text>
        <div className="flex flex-col gap-2.5">
          {q.options.map((o, i) => (
            <button key={i} type="button" onClick={() => answer(i)}
              className="squircle flex min-h-[52px] items-center rounded-control border border-hair-2 bg-card px-4 py-3 text-left text-subhead font-medium transition-colors hover:border-brand hover:bg-tint active:scale-[0.99]">{o}</button>
          ))}
          <button type="button" onClick={() => answer(null)} className="squircle flex min-h-[48px] items-center rounded-control border border-dashed border-hair-2 px-4 py-3 text-left text-body-lg text-ink-3 hover:bg-subtle">I don&apos;t know</button>
        </div>
        <Text size="caption" tone="subtle" className="mt-auto text-center">No feedback during screening. It measures; your path teaches.</Text>
      </div>
    </div>
  );
}

export function ScreeningResults() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const [detail, setDetail] = useState(false);
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  if (!p?.screening || !c || !p.path) return <div className="p-4"><EmptyState title="No screening yet" /></div>;
  const mods = modulesOf(c);
  const scores = p.screening.scores;
  const call = p.screening.call;
  const comps = COMPETENCIES.filter((x) => scores[x.id] !== undefined).sort((a, b) => scores[b.id] - scores[a.id]);
  const top = comps.length ? scores[comps[0].id] : 0;
  const even = comps.every((x) => scores[x.id] === top);
  const unit = c.origin === "direct" ? "lesson" : "module";
  const kept = p.path.moduleIds.length;
  const skipped = mods.filter((m) => !p.path!.moduleIds.includes(m.id));
  const mins = pathMinutes(mods, p.path.moduleIds);
  const required = mods.filter((m) => m.required && p.path!.moduleIds.includes(m.id));
  const screenNames = c.origin === "direct" ? screeningOf(c, allScenarios().filter((x) => c.scenarioIds.includes(x.id))).map((x) => x.persona.name.replace(/,.*$/, "")).join(" and ") || "the AI doctor" : getScenario(c.settings.screeningScenarioId ?? "")?.persona.name ?? "the AI doctor";

  /* Three things to work on, most important first: a compliance flag, then the weakest criteria, each with what to say and where it's covered. */
  type Tip = { key: string; eyebrow: string; title: string; why: string; say?: string; danger?: boolean; lesson?: { id: string; title: string } };
  const tips: Tip[] = [];
  for (const f of call?.flags.filter((x) => x.critical) ?? []) tips.push({ key: f.ruleId, eyebrow: "Compliance", title: "Stay on-label", why: `${f.label}: “${f.quote}”`, say: f.explanation, danger: true });
  for (const x of [...comps].reverse()) {
    if (tips.length >= 3 || scores[x.id] >= 80) continue;
    const crit = CRITERIA[x.id];
    const m = mods.find((mm) => mm.competency === x.id && p.path!.moduleIds.includes(mm.id)) ?? mods.find((mm) => mm.competency === x.id);
    const missed = call?.criteria.find((k) => !k.met && k.label === crit?.label);
    tips.push({ key: x.id, eyebrow: `${x.name} · ${scores[x.id]}`, title: crit?.label ?? x.name, why: missed ? "Didn't come up on your call" : `You scored ${scores[x.id]}; the pass mark on calls is ${c.settings.passRoleplay}.`, say: crit?.good.replace(/^"|"$/g, ""), lesson: m ? { id: m.id, title: m.title } : undefined });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-4 pt-5">
      {/* Where the rep starts, and the path that follows from it. */}
      <div className="squircle flex flex-col gap-4 rounded-card bg-ink p-5 text-white">
        <div className="flex items-center gap-4">
          <span className="grid size-[68px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(var(--color-brand) ${p.screening.overall * 3.6}deg, rgba(255,255,255,.12) 0)` }}>
            <span className="grid size-14 place-items-center rounded-full bg-ink"><span className="text-title font-extrabold tabular-nums">{p.screening.overall}</span></span>
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-center gap-1.5 text-caption font-bold text-[#7ee2b0]"><Check className="size-3.5" aria-hidden="true" />Screening done</span>
            <Text size="title" weight="extrabold" tone="inverse" className="leading-tight">Your baseline</Text>
            <Text size="caption" tone="inverse" className="opacity-60">Where you start. Your assessments show how far you&apos;ve come.</Text>
          </div>
        </div>
        {/* No material, or optional material: no path to show; the assessments come next. */}
        {(noMaterial(c) || materialOptional(c, p) || !mods.length) ? (
          <Text size="body" tone="inverse" className="border-t border-white/10 pt-4 opacity-80">Next: your assessments, one call per objective.</Text>
        ) : (
        <div className="flex flex-col gap-2.5 border-t border-white/10 pt-4">
          <div className="flex items-baseline justify-between gap-3">
            <Text size="body-lg" weight="bold" tone="inverse">Your path</Text>
            <Text size="caption" tone="inverse" className="opacity-60">{kept} of {mods.length} {unit}{mods.length === 1 ? "" : "s"} · ~{mins} min</Text>
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {mods.map((m) => {
              const skip = skipped.includes(m);
              return (
                <li key={m.id} className={cn("flex items-center gap-1 rounded-chip px-2.5 py-1 text-caption font-semibold", skip ? "bg-ok/20 text-[#9be7c0]" : "bg-white/10 text-white")}>
                  {skip ? <Check className="size-3" aria-hidden="true" /> : m.required ? <Lock className="size-3 opacity-60" aria-hidden="true" /> : null}{m.title}
                </li>
              );
            })}
          </ul>
          <Text size="caption" tone="inverse" className="leading-relaxed opacity-60">
            {skipped.length ? `Ticked ones you already know, so they're skipped.` : "Every lesson stays in: the call didn't show enough yet to skip one."}
            {required.length ? ` ${required.length === 1 ? "The locked one stays" : "Locked ones stay"} for everyone.` : ""}
          </Text>
        </div>
        )}
      </div>

      <section className="flex flex-col gap-2.5" aria-labelledby="tips-h">
        <div className="flex flex-col gap-0.5">
          <Text as="h2" id="tips-h" size="subhead" weight="bold">{tips.length ? `${tips.length === 1 ? "One thing" : `${tips.length} things`} to work on` : "You're in good shape"}</Text>
          <Text size="caption" tone="subtle">{tips.length ? "From your screening call, most important first." : (noMaterial(c) || materialOptional(c, p) || !mods.length) ? "Every criterion is at 80 or more. Take that into your calls." : "Every criterion is at 80 or more. The lessons will keep it sharp."}</Text>
        </div>
        {tips.length > 0 && (
          <ol className="squircle flex flex-col divide-y divide-hair overflow-hidden rounded-card border border-hair bg-card">
            {tips.map((t, i) => (
              <li key={t.key} className="flex gap-3 p-4">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-caption font-extrabold", t.danger ? "bg-danger text-white" : "bg-brand text-white")}>{i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Text size="body-lg" weight="bold" className="leading-snug">{t.title}</Text>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("rounded-chip px-1.5 py-0.5 text-micro font-bold", t.danger ? "bg-danger-bg text-danger" : "bg-subtle text-ink-2")}>{t.eyebrow}</span>
                    <Text size="caption" tone="subtle">{t.why}</Text>
                  </span>
                  {t.say && <p className="rounded-control bg-tint/60 px-3 py-2 text-body leading-relaxed text-ink-2">{t.danger ? t.say : <><span className="font-bold not-italic text-brand-deep">Try </span><span className="italic">“{t.say}”</span></>}</p>}
                  {t.lesson && <Link href={`/rep/course/${c.id}/learn?module=${t.lesson.id}${p.path!.moduleIds.includes(t.lesson.id) ? "" : "&optional=1"}`} className="flex items-center gap-1 self-start text-caption font-bold text-brand-deep hover:underline">Covered in {t.lesson.title}<ArrowRight className="size-3.5" aria-hidden="true" /></Link>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="crit-h">
        <div className="flex items-baseline justify-between"><Text as="h2" id="crit-h" size="subhead" weight="bold">By criterion</Text><Text size="caption" tone="subtle">{even ? "Even across the board" : "Highest first"}</Text></div>
        <ul className="squircle flex flex-col gap-3.5 rounded-card border border-hair bg-card p-4">
          {comps.map((x, i) => (
            <li key={x.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5"><Text size="body" weight="semibold" truncate>{x.name}</Text>{!even && i === 0 && <Chip size="xs" tone="ok">Strongest</Chip>}</span>
                <span className="flex shrink-0 items-center gap-2"><Text size="body" weight="bold" tabular>{scores[x.id]}</Text><BandChip score={scores[x.id]} size="xs" /></span>
              </div>
              <Meter value={scores[x.id]} tone={bandOf(scores[x.id]) === "not_yet" ? "danger" : bandOf(scores[x.id]) === "developing" ? "brand-2" : "ok"} height={6} label={`${x.name} ${BAND_LABEL[bandOf(scores[x.id])]}`} />
            </li>
          ))}
        </ul>
      </section>

      {call && call.transcript.length > 0 && (
        <section className="flex flex-col gap-2.5" aria-labelledby="call-h">
          <div className="flex items-baseline justify-between gap-3">
            <Text as="h2" id="call-h" size="subhead" weight="bold">Your call</Text>
            <button type="button" aria-expanded={detail} onClick={() => setDetail(!detail)} className="flex items-center gap-1 text-caption font-semibold text-ink-3 hover:text-ink">
              {detail ? "Hide" : "Listen and read"}<ChevronDown className={cn("size-3.5 transition-transform", detail && "rotate-180")} aria-hidden="true" />
            </button>
          </div>
          {detail ? <CallPlayback result={call} who={screenNames} /> : (
            <button type="button" onClick={() => setDetail(true)} className="squircle flex items-center gap-3 rounded-card bg-ink p-4 text-left text-white">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand"><Play className="ml-0.5 size-5" aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-col"><Text size="body" weight="bold" tone="inverse" truncate>Your call with {screenNames}</Text><Text size="caption" tone="inverse" className="opacity-60">{call.transcript.filter((x) => x.speaker === "rep").length} turns · {call.criteria.filter((x) => x.met).length} of {call.criteria.length} criteria met</Text></span>
            </button>
          )}
        </section>
      )}
      <Text size="caption" tone="subtle" className="text-center">Your trainer sees these scores, not your call recording.</Text>
      <BottomActions><Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}`)}><AgentIcon className="size-4" aria-hidden="true" />{noMaterial(c) || materialOptional(c, p) || !mods.length ? "On to the assessments" : "Start my path"}</Button></BottomActions>
    </div>
  );
}
