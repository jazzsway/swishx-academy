"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { X, ArrowRight, ShieldCheck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { competency } from "@/data/org";
import { scenario as getScenario, prohibited } from "@/data/scenarios";
import type { Attempt, Item } from "@/data/types";
import { blendScores, scoreItems, pathMinutes } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Meter, Ring, EmptyState } from "@/components/patterns/academy";
import { CallScreen, type CallOutcome } from "@/features/roleplay/call-screen";
import { Scorecard } from "@/features/roleplay/scorecard";
import { modulesOf } from "./use-rep";

function pickAssessment(pool: Item[], n: number, comps: string[], seed: number) {
  const rot = <T,>(a: T[]) => a.map((_, i) => a[(i + seed) % a.length]);
  const picked: Item[] = [];
  for (const c of comps) { const it = rot(pool.filter((i) => i.competency === c))[0]; if (it) picked.push(it); }
  for (const it of rot(pool)) { if (picked.length >= n) break; if (!picked.includes(it)) picked.push(it); }
  return picked.slice(0, n);
}

export function Assessment() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  const resubmit = p?.state === "needs_coaching";
  const items = useMemo(() => (c && p ? pickAssessment(c.items.filter((i) => i.pool === "assessment"), c.settings.assessmentItems, c.competencyIds, p.attempts.length * 3) : []), [c, p]);
  const [phase, setPhase] = useState<"intro" | "quiz" | "bridge" | "call" | "result">("intro");
  const [qi, setQi] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [result, setResult] = useState<Attempt | null>(null);

  if (!p || !c) return <div className="p-4"><EmptyState title="Not assigned" /></div>;
  const st = c.settings;
  const sc = st.assessmentScenarioId ? getScenario(st.assessmentScenarioId) : undefined;
  const attemptNo = p.attempts.length + 1;
  const failsSoFar = p.attempts.filter((a) => !a.passed).length;
  const attemptsLeft = st.attempts - failsSoFar;

  function grade(call?: CallOutcome, ans: Record<string, number | null> = answers) {
    const quiz = resubmit ? { overall: p!.attempts.at(-1)?.quiz ?? 0, scores: p!.attempts.at(-1)?.competencyScores ?? {} } : scoreItems(items, ans);
    const scores = blendScores(quiz.scores, call?.competencyScores);
    const overall = call ? Math.round(quiz.overall * 0.6 + call.score * 0.4) : quiz.overall;
    const critFlags = call?.flags.filter((f) => f.critical) ?? [];
    const failed = new Set<string>();
    for (const k of st.criticalCompetencies) if (scores[k] !== undefined && scores[k] < st.passCritical) failed.add(k);
    for (const [k, v] of Object.entries(scores)) if (v < 50) failed.add(k);
    for (const f of critFlags) { const m = modulesOf(c!).find((x) => x.id === prohibited(f.ruleId).approvedRef?.moduleId); if (m) failed.add(m.competency); }
    const reasons: string[] = [];
    if (overall < st.passOverall) reasons.push(`Overall ${overall}% (needs ${st.passOverall}%)`);
    for (const k of st.criticalCompetencies) if (scores[k] !== undefined && scores[k] < st.passCritical) reasons.push(`${competency(k)?.name} ${scores[k]}% (needs ${st.passCritical}%)`);
    if (call && call.score < st.passRoleplay) reasons.push(`Roleplay ${call.score}% (needs ${st.passRoleplay}%)`);
    if (critFlags.length) reasons.push("Critical compliance flag");
    const passed = reasons.length === 0;
    const attempt: Attempt = {
      at: new Date().toISOString(), quiz: quiz.overall, roleplay: call?.score, overall, passed, competencyScores: scores,
      failedCompetencies: passed ? [] : [...failed], reason: reasons.join(" · ") || undefined,
      call: call ? { transcript: call.transcript, criteria: call.criteria, flags: call.flags, score: call.score, typed: call.typed, durationSec: call.durationSec } : undefined,
    };
    s.submitAssessment(p!.id, attempt);
    s.touchStreak(me.id);
    setResult(attempt);
    setPhase("result");
  }

  if (phase === "call" && sc)
    return <CallScreen scenario={sc} mode="assessment" voiceAllowed={!!s.voiceConsent[me.id]} onExit={() => router.push(`/rep/course/${c.id}`)} onComplete={(r) => grade(r)} />;

  if (phase === "result" && result) {
    const fresh = useApp.getState().progress.find((x) => x.id === p.id)!;
    const mods = modulesOf(c);
    return (
      <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-8">
        <div className="flex items-center gap-4">
          <Ring value={result.overall} size={84} stroke={8} tone={result.passed ? "ok" : "brand"} label={`Overall ${result.overall}%`}><Text size="display" weight="extrabold" tabular>{result.overall}</Text></Ring>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-none">{result.passed ? "You passed" : "Not yet"}</Text>
            <Text size="body-lg" tone="muted">Quiz {result.quiz}%{result.roleplay !== undefined ? ` · call ${result.roleplay}%` : ""} · attempt {fresh.attempts.length}</Text>
          </div>
        </div>
        {!result.passed && result.reason && (
          <div className="squircle flex flex-col gap-1.5 rounded-panel border border-hair bg-card p-4">
            <Text size="caption" weight="bold" tone="subtle">WHAT HELD YOU BACK</Text>
            {result.reason.split(" · ").map((r) => <Text key={r} size="body-lg">· {r}</Text>)}
          </div>
        )}
        {result.call && <Scorecard result={result.call} mode="assessment" approvedHref={(m) => `/rep/course/${c.id}/learn?module=${m}&optional=1`} />}
        <section className="flex flex-col gap-2.5">
          <Text size="subhead" weight="bold">By competency</Text>
          {Object.entries(result.competencyScores).map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <div className="flex justify-between text-body"><span className={cn(result.failedCompetencies.includes(k) && "font-semibold text-danger")}>{competency(k)?.name}</span><strong className="tabular-nums">{v}</strong></div>
              <Meter value={v} height={6} tone={v >= 80 ? "ok" : v >= 50 ? "brand-2" : "danger"} label={competency(k)?.name} />
            </div>
          ))}
        </section>
        <div className="mt-auto flex flex-col gap-2 pt-2">
          {result.passed ? (
            <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/attest`)}><ShieldCheck className="size-4" aria-hidden="true" />Sign attestation</Button>
          ) : fresh.path ? (
            <>
              <div className="squircle flex flex-col gap-1 rounded-panel bg-tint p-4">
                <Text size="body-lg" weight="bold">Your next path: {fresh.path.moduleIds.length} modules · ~{pathMinutes(mods, fresh.path.moduleIds)} min</Text>
                <Text size="body" tone="muted">{attemptsLeft - 1 > 0 ? `${attemptsLeft - 1} attempt${attemptsLeft - 1 === 1 ? "" : "s"} left. ` : "That was your last attempt; your manager and trainer have been told. "}In a live rollout you'd retake after {st.cooldownHours} hours; the demo lets you retake straight away.</Text>
              </div>
              <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}`)}><RotateCcw className="size-4" aria-hidden="true" />Start my retake path</Button>
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (phase === "bridge")
    return (
      <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-8">
        <Chip tone="ok" size="md" className="self-start">Quiz done</Chip>
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">Last part: the call</Text>
        <Text size="subhead" tone="muted" className="leading-relaxed">{sc?.persona.name} is cost-focused and sceptical. This call is recorded{st.verify === "manager" ? " and your manager will review it" : ""}. An off-label or risk-minimising statement fails the assessment.</Text>
        <Button size="lg" fullWidth className="mt-auto" onClick={() => setPhase("call")}>Go to the call<ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>
    );

  if (phase === "intro")
    return (
      <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
        <Link href={`/rep/course/${c.id}`} aria-label="Exit" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{resubmit ? "Resubmit your roleplay" : "Final assessment"}</Text>
        <div className="squircle flex flex-col gap-2.5 rounded-panel border border-hair bg-card p-4">
          {!resubmit && <Text size="body-lg">· {items.length} questions, no feedback until the end</Text>}
          {st.assessmentCall && <Text size="body-lg">· A ~{sc?.durationMin}-minute call with {sc?.persona.name}, recorded</Text>}
          <Text size="body-lg">· Pass: {st.passOverall}% overall, {st.passCritical}% on {st.criticalCompetencies.map((x) => competency(x)?.name.toLowerCase()).join(" and ")}, {st.passRoleplay}% on the call</Text>
          <Text size="body-lg">· Any critical compliance flag is an automatic fail</Text>
          <Text size="body-lg">· Attempt {attemptNo} of {st.attempts}</Text>
        </div>
        {resubmit && <Text size="body" tone="muted">Your quiz score carries over. Only the call is redone, with your manager&apos;s focus areas in mind.</Text>}
        <Button size="lg" fullWidth className="mt-auto" onClick={() => setPhase(resubmit ? "bridge" : "quiz")}>Begin</Button>
      </div>
    );

  const q = items[qi];
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      <div className="flex items-center gap-3">
        <Link href={`/rep/course/${c.id}`} aria-label="Exit" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex justify-between text-caption text-ink-3"><span>Final assessment</span><span>{qi + 1} of {items.length}</span></div>
          <Meter value={(qi / items.length) * 100} height={6} label="Assessment progress" />
        </div>
      </div>
      <div key={q.id} className="rise-in flex flex-1 flex-col gap-5">
        <Text as="h1" size="display" weight="bold" className="leading-snug">{q.question}</Text>
        <div className="flex flex-col gap-2.5">
          {q.options.map((o, i) => (
            <button key={i} type="button" onClick={() => {
              const next = { ...answers, [q.id]: i };
              setAnswers(next);
              if (qi < items.length - 1) setQi(qi + 1);
              else if (st.assessmentCall && sc) setPhase("bridge");
              else grade(undefined, next);
            }} className="squircle flex min-h-[52px] items-center rounded-control border border-hair-2 bg-card px-4 py-3 text-left text-subhead font-medium transition-colors hover:border-brand hover:bg-tint">{o}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Attestation() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  const [name, setName] = useState("");
  if (!p || !c) return <div className="p-4"><EmptyState title="Not assigned" /></div>;
  const ok = name.trim().toLowerCase() === me.name.toLowerCase();
  const ver = c.versions.find((v) => v.version === p.version);
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      <Link href={`/rep/course/${c.id}`} aria-label="Exit" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
      <Text as="h1" size="hero" weight="extrabold" tracking="tight">Attestation</Text>
      <Text size="body" tone="subtle">{c.title} · v{p.version}{ver?.docNumber ? ` · ${ver.docNumber}` : ""}</Text>
      <div className="squircle rounded-panel border border-hair bg-card p-5"><Text as="p" size="subhead" className="leading-relaxed">{c.settings.attestation}</Text></div>
      <Field label={`Type your full name (${me.name}) to sign`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      <Text size="caption" tone="subtle">Your signature and the time are stored in your training record.</Text>
      <Button size="lg" fullWidth className="mt-auto" disabled={!ok} onClick={() => {
        s.attest(p.id, name.trim());
        const after = useApp.getState().progress.find((x) => x.id === p.id)!;
        router.replace(after.state === "certified" ? `/rep/course/${c.id}?celebrate=1` : `/rep/course/${c.id}`);
      }}>Sign</Button>
    </div>
  );
}
