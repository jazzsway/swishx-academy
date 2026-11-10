"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { X, Lock, ArrowRight } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { competency, COMPETENCIES } from "@/data/org";
import { scenario as getScenario } from "@/data/scenarios";
import type { Item } from "@/data/types";
import { blendScores, scoreItems, bandOf, BAND_LABEL, pathMinutes, courseMinutes } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { BandChip, Meter, EmptyState } from "@/components/patterns/academy";
import { CallScreen, type CallOutcome } from "@/features/roleplay/call-screen";
import { Scorecard } from "@/features/roleplay/scorecard";
import { modulesOf } from "./use-rep";

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
  const [phase, setPhase] = useState<"quiz" | "bridge" | "call">("quiz");

  if (!p || !c) return <div className="p-4"><EmptyState title="Not assigned" /></div>;
  const sc = c.settings.screeningScenarioId ? getScenario(c.settings.screeningScenarioId) : undefined;

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
    const scores = blendScores(quiz.scores, call?.competencyScores);
    const overall = call ? Math.round(quiz.overall * 0.7 + call.score * 0.3) : quiz.overall;
    s.saveScreening(p!.id, { overall, scores, call: call ? { transcript: call.transcript, criteria: call.criteria, flags: call.flags, score: call.score, typed: call.typed, durationSec: call.durationSec } : undefined });
    s.touchStreak(me.id);
    router.replace(`/rep/course/${c!.id}/results?fresh=1`);
  }

  if (phase === "call" && sc)
    return <CallScreen scenario={sc} mode="screening" voiceAllowed={!!s.voiceConsent[me.id]} onExit={() => router.push(`/rep/course/${c.id}`)} onComplete={(r) => finish(answers, r)} />;

  if (phase === "bridge")
    return (
      <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-8">
        <Chip tone="ok" size="md" className="self-start">Quiz done · {total} questions</Chip>
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">Now, a short call</Text>
        <Text size="subhead" tone="muted" className="leading-relaxed">You'll talk to {sc?.persona.name}, an AI dermatologist. Handle it like a real first call. This is your baseline (call one), so nothing here counts against you.</Text>
        <div className="squircle flex items-start gap-3 rounded-panel bg-subtle p-4"><Lock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" /><Text size="body" tone="muted">Your trainer sees your scores by competency, not the recording.</Text></div>
        <div className="mt-auto flex flex-col gap-2">
          <Button size="lg" fullWidth onClick={() => setPhase("call")}>Go to the call<ArrowRight className="size-4" aria-hidden="true" /></Button>
          <Button size="lg" fullWidth variant="ghost" onClick={() => finish(answers)}>Skip the call for now</Button>
        </div>
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
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  if (!p?.screening || !c || !p.path) return <div className="p-4"><EmptyState title="No screening yet" /></div>;
  const mods = modulesOf(c);
  const scores = p.screening.scores;
  const comps = COMPETENCIES.filter((x) => scores[x.id] !== undefined).sort((a, b) => scores[b.id] - scores[a.id]);
  const strongest = comps.slice(0, 2);
  const weakest = [...comps].reverse().slice(0, 2);
  const mins = pathMinutes(mods, p.path.moduleIds);
  const full = courseMinutes({ modules: mods });

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <div className="squircle flex flex-col gap-3 rounded-card bg-ink p-5 text-white">
        <Text size="caption" weight="bold" tone="inverse" className="opacity-60">YOUR PATH IS READY</Text>
        <Text as="h1" size="hero" weight="extrabold" tone="inverse" className="leading-tight">{p.path.moduleIds.length} of {mods.length} modules · ~{mins} min</Text>
        <Text size="body-lg" tone="inverse" className="opacity-80">Full course is {full} min. You tested out of {p.path.testedOut.length} module{p.path.testedOut.length === 1 ? "" : "s"}; {mods.filter((m) => m.required).length} safety modules are required for everyone.</Text>
        <Link href={`/rep/course/${c.id}`} className="mt-1 flex h-12 items-center justify-center gap-2 rounded-control bg-brand text-subhead font-bold text-white"><AgentIcon className="size-4" aria-hidden="true" />Start my path</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="squircle flex flex-col gap-1 rounded-panel bg-ok-bg p-4"><Text size="caption" weight="bold" tone="ok">STRONGEST</Text>{strongest.map((x) => <Text key={x.id} size="body" weight="semibold">{x.name}</Text>)}</div>
        <div className="squircle flex flex-col gap-1 rounded-panel bg-warn-bg p-4"><Text size="caption" weight="bold" tone="warn">TO WORK ON</Text>{weakest.map((x) => <Text key={x.id} size="body" weight="semibold">{x.name}</Text>)}</div>
      </div>
      <section className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
        <div className="flex items-baseline justify-between"><Text size="subhead" weight="bold">By competency</Text><Text size="caption" tone="subtle">{p.screening.overall}% overall</Text></div>
        {comps.map((x) => (
          <div key={x.id} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2"><Text size="body" weight="semibold">{x.name}</Text><span className="flex items-center gap-2"><Text size="body" tabular>{scores[x.id]}</Text><BandChip score={scores[x.id]} size="xs" /></span></div>
            <Meter value={scores[x.id]} tone={bandOf(scores[x.id]) === "not_yet" ? "danger" : bandOf(scores[x.id]) === "developing" ? "brand-2" : "ok"} height={6} label={`${x.name} ${BAND_LABEL[bandOf(scores[x.id])]}`} />
          </div>
        ))}
      </section>
      {p.screening.call && (
        <section className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
          <Text size="subhead" weight="bold">Your call with the AI doctor</Text>
          <Scorecard result={p.screening.call} mode="screening" approvedHref={(m) => `/rep/course/${c.id}/learn?module=${m}&optional=1`} />
        </section>
      )}
      <Text size="caption" tone="subtle" className={cn("pb-2 text-center")}>Your trainer sees these scores, not your call recording.</Text>
    </div>
  );
}
