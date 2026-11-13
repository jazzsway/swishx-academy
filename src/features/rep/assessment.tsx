"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { X, ArrowRight, Check, ChevronDown, ChevronRight, Hourglass, Mic, ShieldAlert, ShieldCheck, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { nowIso, useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { competency } from "@/data/org";
import { scenario as getScenario, prohibited } from "@/data/scenarios";
import type { Attempt, Item, Scenario } from "@/data/types";
import { blendScores, coveredPoints, scoreItems } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Meter, EmptyState } from "@/components/patterns/academy";
import { CallScreen, type CallOutcome } from "@/features/roleplay/call-screen";
import { modulesOf } from "./use-rep";

/** One question per competency first, then the rest; up to two written answers, asked last. */
function pickAssessment(pool: Item[], n: number, comps: string[], seed: number) {
  const rot = <T,>(a: T[]) => a.map((_, i) => a[(i + seed) % a.length]);
  const choice = pool.filter((i) => i.format !== "open");
  const written = rot(pool.filter((i) => i.format === "open")).slice(0, Math.min(2, Math.floor(n / 4)));
  const picked: Item[] = [];
  for (const c of comps) { const it = rot(choice.filter((i) => i.competency === c))[0]; if (it) picked.push(it); }
  for (const it of rot(choice)) { if (picked.length >= n - written.length) break; if (!picked.includes(it)) picked.push(it); }
  return [...picked.slice(0, n - written.length), ...written];
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
  const [answers, setAnswers] = useState<Record<string, number | string | null>>({});
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<Attempt | null>(null);

  if (!p || !c) return <div className="p-4"><EmptyState title="Not assigned" /></div>;
  const st = c.settings;
  const sc = st.assessmentScenarioId ? getScenario(st.assessmentScenarioId) : undefined;
  const attemptNo = p.attempts.length + 1;
  const nWritten = items.filter((i) => i.format === "open").length;
  const failsSoFar = p.attempts.filter((a) => !a.passed).length;
  const attemptsLeft = st.attempts - failsSoFar;
  const lastFail = p.attempts.filter((a) => !a.passed).at(-1);
  const retakeAt = lastFail ? new Date(new Date(lastFail.at).getTime() + st.cooldownHours * 3600_000) : undefined;
  const coolingDown = !resubmit && !s.presenter && !!retakeAt && retakeAt > new Date(nowIso());

  function grade(call?: CallOutcome, ans: Record<string, number | string | null> = answers) {
    const quiz = resubmit ? { overall: p!.attempts.at(-1)?.quiz ?? 0, scores: p!.attempts.at(-1)?.competencyScores ?? {} } : scoreItems(items, ans);
    const scores = blendScores(quiz.scores, call?.competencyScores);
    /* With no questions in the course (a direct course), the call is the whole assessment. */
    const overall = call ? (items.length ? Math.round(quiz.overall * 0.6 + call.score * 0.4) : call.score) : quiz.overall;
    const critFlags = call?.flags.filter((f) => f.critical) ?? [];
    const failed = new Set<string>();
    for (const k of st.criticalCompetencies) if (scores[k] !== undefined && scores[k] < st.passCritical) failed.add(k);
    for (const [k, v] of Object.entries(scores)) if (v < 50) failed.add(k);
    for (const f of critFlags) { const m = modulesOf(c!).find((x) => x.id === prohibited(f.ruleId).approvedRef?.moduleId); if (m) failed.add(m.competency); }
    const reasons: string[] = [];
    if (items.length && overall < st.passOverall) reasons.push(`Overall ${overall}% (needs ${st.passOverall}%)`);
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
    const written = items.filter((it) => it.format === "open" && typeof answers[it.id] === "string");
    const fails = fresh.attempts.filter((a) => !a.passed).length;
    const left = Math.max(0, st.attempts - fails);
    /* Answer keys show only after a pass or the last attempt. */
    const showKey = result.passed || left <= 0;
    const retake = new Date(new Date(result.at).getTime() + st.cooldownHours * 3600_000);
    const callOnly = !items.length;
    const pass = callOnly ? st.passRoleplay : st.passOverall;
    const base = st.baseline && fresh.screening ? fresh.screening.overall : undefined;
    /* Practice-only reps have no files to go back over. */
    const reviewCount = fresh.mode === "practice" ? 0 : fresh.path?.moduleIds.length ?? 0;
    return (
      <ResultView result={result} sc={sc} pass={pass} base={base} callOnly={callOnly} attemptNo={fresh.attempts.length} attempts={st.attempts} left={left}
        retakeAt={s.presenter || st.cooldownHours === 0 ? undefined : retake} courseId={c.id} reviewCount={reviewCount} direct={c.origin === "direct"}
        onAttest={() => router.push(`/rep/course/${c.id}/attest`)}>
        {written.length > 0 && (
          <section className="flex flex-col gap-2.5">
            <Text size="subhead" weight="bold">Your written answers</Text>
            {written.map((it) => (
              <div key={it.id} className="squircle flex flex-col gap-2 rounded-panel border border-hair bg-card p-4">
                <Text size="body-lg" weight="semibold">{it.question}</Text>
                <ul className="flex flex-col gap-1">
                  {coveredPoints(it, String(answers[it.id] ?? "")).map((pt) => (
                    <li key={pt.text} className={cn("flex items-center gap-2 text-body", pt.covered ? "text-ok" : "text-ink-3")}>
                      {pt.covered ? <Check className="size-4 shrink-0" aria-hidden="true" /> : <X className="size-4 shrink-0" aria-hidden="true" />}{pt.text}
                    </li>
                  ))}
                </ul>
                {showKey && <Text size="body" tone="muted"><strong className="text-ink-2">A strong answer: </strong>{it.guide?.suggested}</Text>}
              </div>
            ))}
          </section>
        )}
        {!callOnly && (
          <section className="flex flex-col gap-2.5">
            <Text size="subhead" weight="bold">By competency</Text>
            {Object.entries(result.competencyScores).map(([k, v]) => (
              <div key={k} className="flex flex-col gap-1">
                <div className="flex justify-between text-body"><span className={cn(result.failedCompetencies.includes(k) && "font-semibold text-danger")}>{competency(k)?.name}</span><strong className="tabular-nums">{v}</strong></div>
                <Meter value={v} height={6} tone={v >= 80 ? "ok" : v >= 50 ? "brand-2" : "danger"} label={competency(k)?.name} />
              </div>
            ))}
          </section>
        )}
      </ResultView>
    );
  }

  if (phase === "bridge")
    return (
      <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-8">
        {items.length > 0 && <Chip tone="ok" size="md" className="self-start">Quiz done</Chip>}
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{items.length ? "Last part: the call" : `Your call with ${sc?.persona.name ?? "the doctor"}`}</Text>
        <Text size="subhead" tone="muted" className="leading-relaxed">{sc?.persona.name} is {sc?.persona.traits.slice(0, 2).join(" and ").toLowerCase() ?? "sceptical"}. This call is recorded{st.verify === "manager" ? " and your manager will review it" : ""}. An off-label or risk-minimising statement fails the assessment.</Text>
        <Button size="lg" fullWidth className="mt-auto" onClick={() => setPhase("call")}>Go to the call<ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>
    );

  if (phase === "intro")
    return (
      <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
        <Link href={`/rep/course/${c.id}`} aria-label="Exit" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{resubmit ? "Resubmit your roleplay" : "Final assessment"}</Text>
        <div className="squircle flex flex-col gap-2.5 rounded-panel border border-hair bg-card p-4">
          {!resubmit && items.length > 0 && <Text size="body-lg">· {items.length} questions{nWritten ? `, ${nWritten} of them written in your own words` : ""}, no feedback until the end</Text>}
          {st.finalNoHints && <Text size="body-lg">· No hints and no prompts: this is the real thing</Text>}
          {st.assessmentCall && <Text size="body-lg">· A ~{sc?.durationMin}-minute call with {sc?.persona.name}, recorded</Text>}
          <Text size="body-lg">· Pass: {items.length ? `${st.passOverall}% overall, ${st.passCritical}% on ${st.criticalCompetencies.map((x) => competency(x)?.name.toLowerCase()).join(" and ")}${st.assessmentCall ? `, ${st.passRoleplay}% on the call` : ""}` : `${st.passRoleplay}% on the call`}</Text>
          <Text size="body-lg">· Any critical compliance flag is an automatic fail</Text>
          <Text size="body-lg">· Attempt {attemptNo} of {st.attempts}</Text>
        </div>
        {resubmit && <Text size="body" tone="muted">Your quiz score carries over. Only the call is redone, with your manager&apos;s focus areas in mind.</Text>}
        {coolingDown && retakeAt && <Text size="body" tone="muted">You can retake from {retakeAt.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}, {st.cooldownHours} hours after your last attempt.</Text>}
        <Button size="lg" fullWidth className="mt-auto" disabled={coolingDown} onClick={() => setPhase(resubmit || !items.length ? "bridge" : "quiz")}>Begin</Button>
      </div>
    );

  const q = items[qi];
  function answer(a: number | string) {
    const next = { ...answers, [q.id]: a };
    setAnswers(next);
    if (qi < items.length - 1) setQi(qi + 1);
    else if (st.assessmentCall && sc) setPhase("bridge");
    else grade(undefined, next);
  }
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
        {q.format === "open" ? (
          <div className="flex flex-1 flex-col gap-3">
            <Text size="body-lg" tone="muted">Answer in your own words, as you would say it to the HCP. SwishX marks it against what a good answer covers.</Text>
            <Field multiline aria-label="Your answer" value={draft} onChange={(e) => setDraft(e.target.value)} rows={6} placeholder="Type your answer…" />
            <Button size="lg" fullWidth className="mt-auto" disabled={draft.trim().length < 15} onClick={() => { answer(draft.trim()); setDraft(""); }}>
              {qi < items.length - 1 ? "Next question" : "Submit"}<ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {q.options.map((o, i) => (
              <button key={i} type="button" onClick={() => answer(i)}
                className="squircle flex min-h-[52px] items-center rounded-control border border-hair-2 bg-card px-4 py-3 text-left text-subhead font-medium transition-colors hover:border-brand hover:bg-tint">{o}</button>
            ))}
          </div>
        )}
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
  // v1-hidden (doc number): const ver = c.versions.find((v) => v.version === p.version);
  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-5 pb-8 pt-5">
      <Link href={`/rep/course/${c.id}`} aria-label="Exit" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
      <Text as="h1" size="hero" weight="extrabold" tracking="tight">Attestation</Text>
      <Text size="body" tone="subtle">{c.title} · v{p.version}</Text>
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

const fmtWhen = (d: Date) => d.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

/**
 * The final test's result: the verdict against the pass mark first, then what to work on in the
 * rubric's own words, then what to do next. Built for a call-only test as much as a quiz plus a call.
 */
function ResultView({ result, sc, pass, base, callOnly, attemptNo, attempts, left, retakeAt, courseId, reviewCount, direct, onAttest, children }: {
  result: Attempt; sc?: Scenario; pass: number; base?: number; callOnly: boolean; attemptNo: number; attempts: number; left: number;
  retakeAt?: Date; courseId: string; reviewCount: number; direct: boolean; onAttest: () => void; children?: React.ReactNode;
}) {
  const [transcript, setTranscript] = useState(false);
  const call = result.call;
  const critical = call?.flags.filter((f) => f.critical) ?? [];
  const short = Math.max(0, pass - result.overall);
  const missed = call?.criteria.filter((c) => !c.met) ?? [];
  const met = call?.criteria.filter((c) => c.met) ?? [];
  const goodFor = (id: string) => sc?.rubric.find((r) => r.id === id)?.good;
  const waiting = !!retakeAt && retakeAt > new Date(nowIso());
  const name = sc?.persona.name ?? "the doctor";

  return (
    <div className="flex min-h-full flex-1 flex-col gap-5 px-4 pb-8 pt-5">
      <Link href={`/rep/course/${courseId}`} aria-label="Back to the course" className="grid size-10 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>

      {/* The verdict, on one scale with the pass mark. */}
      <section className={cn("squircle relative overflow-hidden rounded-card p-5", result.passed ? "bg-ok text-white" : "bg-ink text-white")}>
        <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: result.passed ? "radial-gradient(circle at 100% 0%, rgb(255 255 255 / 0.25) 0, transparent 55%)" : "radial-gradient(circle at 100% 0%, var(--color-brand) 0, transparent 55%)" }} />
        <div className="relative flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-caption font-bold uppercase tracking-wider text-white/70">Final {callOnly ? "call" : "assessment"} · attempt {attemptNo} of {attempts}</span>
              <Text as="h1" size="hero-lg" weight="black" tone="inverse" tracking="tight" className="leading-none">{result.passed ? "You passed" : critical.length ? "Not this time" : "Not yet"}</Text>
              <Text size="body-lg" tone="inverse" className="opacity-80">
                {result.passed ? `${result.overall} out of 100. You needed ${pass}.` : critical.length ? "A critical compliance flag ends the call, whatever the score." : `${result.overall} out of 100. ${short} more ${short === 1 ? "point" : "points"} to pass.`}
              </Text>
            </div>
            <span className={cn("grid size-14 shrink-0 place-items-center rounded-full text-title font-extrabold tabular-nums", result.passed ? "bg-white text-ok" : "bg-white/10 text-white")}>
              {result.passed ? <Check className="size-7" aria-hidden="true" /> : result.overall}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="relative h-2.5 rounded-full bg-white/15">
              <div className={cn("absolute inset-y-0 left-0 rounded-full", result.passed ? "bg-white" : "bg-gradient-to-r from-brand-2 to-brand")} style={{ width: `${Math.max(3, result.overall)}%` }} />
              <span className="absolute -top-1.5 h-5.5 w-0.5 rounded-full bg-white" style={{ left: `${pass}%` }} aria-hidden="true" />
              {base !== undefined && <span className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-white/50" style={{ left: `${base}%` }} aria-hidden="true" />}
            </div>
            <div className="relative h-4 text-micro font-bold text-white/70">
              <span className="absolute -translate-x-1/2" style={{ left: `${pass}%` }}>Pass {pass}</span>
              {base !== undefined && Math.abs(base - pass) > 12 && <span className="absolute -translate-x-1/2" style={{ left: `${base}%` }}>Baseline {base}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {call && <span className="rounded-chip bg-white/15 px-2.5 py-1 text-caption font-semibold">Call {call.score}%</span>}
            {!callOnly && <span className="rounded-chip bg-white/15 px-2.5 py-1 text-caption font-semibold">Quiz {result.quiz}%</span>}
            {call && <span className="rounded-chip bg-white/15 px-2.5 py-1 text-caption font-semibold">{met.length} of {call.criteria.length} points hit</span>}
            {call && <span className="rounded-chip bg-white/15 px-2.5 py-1 text-caption font-semibold">{mmss(call.durationSec)} · {call.typed ? "typed" : "voice"}</span>}
            {base !== undefined && <span className="rounded-chip bg-white/15 px-2.5 py-1 text-caption font-semibold">{result.overall - base >= 0 ? "+" : ""}{result.overall - base} since baseline</span>}
          </div>
        </div>
      </section>

      {/* Compliance first: it decides the result on its own. */}
      {critical.map((f) => (
        <section key={f.ruleId} className="squircle flex flex-col gap-1.5 rounded-card border border-danger-line bg-danger-bg p-4">
          <span className="flex items-center gap-2 text-body-lg font-bold text-danger"><ShieldAlert className="size-4.5" aria-hidden="true" />{f.label}</span>
          <Text size="body-lg" className="italic">“{f.quote}”</Text>
          <Text size="body" tone="muted">{f.explanation}</Text>
        </section>
      ))}

      {call && (
        <section className="squircle flex flex-col gap-1 rounded-card border border-hair bg-card p-4">
          <div className="flex items-baseline justify-between pb-1">
            <Text size="subhead" weight="bold">{missed.length && !result.passed ? "What to work on" : "Your call, point by point"}</Text>
            <Text size="caption" tone="subtle">{sc ? `with ${name}` : ""}</Text>
          </div>
          {[...missed, ...met].map((c) => (
            <div key={c.id} className="flex items-start gap-3 border-t border-hair py-2.5 first:border-0">
              <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full", c.met ? "bg-ok text-white" : "bg-brand/10 text-brand-deep")}>
                {c.met ? <Check className="size-3.5" aria-hidden="true" /> : <ArrowRight className="size-3.5" aria-hidden="true" />}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <Text size="body-lg" weight="semibold" tone={c.met ? "muted" : "default"}>{c.label}</Text>
                {c.met && c.quote && <Text size="caption" tone="subtle" clamp={2}>You said: “{c.quote}”</Text>}
                {!c.met && goodFor(c.id) && <Text size="body" tone="muted">Try: {goodFor(c.id)}</Text>}
              </div>
            </div>
          ))}
          {call.flags.filter((f) => !f.critical).map((f) => (
            <div key={f.ruleId} className="flex items-start gap-3 border-t border-hair py-2.5">
              <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
              <div className="flex flex-col"><Text size="body-lg" weight="semibold">{f.label}</Text><Text size="caption" tone="subtle">“{f.quote}” · {f.explanation}</Text></div>
            </div>
          ))}
          <button type="button" onClick={() => setTranscript(!transcript)} className="mt-1 flex items-center gap-1.5 self-start text-body font-semibold text-ink-2">
            <ChevronDown className={cn("size-4 transition-transform", transcript && "rotate-180")} aria-hidden="true" />{transcript ? "Hide" : "Read"} the transcript
          </button>
          {transcript && (
            <ol className="flex flex-col gap-2 pt-1">
              {call.transcript.map((t, i) => (
                <li key={i} className={cn("flex flex-col rounded-control px-3 py-2", t.speaker === "rep" ? "bg-tint" : "bg-subtle")}>
                  <span className="text-micro font-bold uppercase tracking-wider text-ink-3">{t.speaker === "rep" ? "You" : name} · {mmss(t.at)}</span>
                  <span className="text-body text-ink">{t.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {children}

      {/* What next. */}
      <section className="mt-auto flex flex-col gap-2">
        {result.passed ? (
          <>
            <Button size="lg" fullWidth onClick={onAttest}><ShieldCheck className="size-4" aria-hidden="true" />Sign and get certified</Button>
            <Text size="caption" tone="subtle" className="text-center">One last step: confirm you&apos;ll promote only within the approved label.</Text>
          </>
        ) : (
          <>
            <Text size="subhead" weight="bold">Before you try again</Text>
            {sc && (
              <Link href={`/rep/practice/call?scenario=${sc.id}`} className="squircle flex items-center gap-3 rounded-panel border border-tint-line bg-tint p-3.5 transition-colors hover:bg-tint/70">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand text-white"><Mic className="size-4.5" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="bold">Practise with {name}</Text><Text size="caption" tone="subtle">Assisted, private, as often as you like</Text></span>
                <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
              </Link>
            )}
            {reviewCount > 0 && (
              <Link href={`/rep/course/${courseId}`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-3.5 transition-colors hover:bg-subtle">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle text-ink-2"><RotateCcw className="size-4.5" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="bold">{direct ? `Go back over ${reviewCount === 1 ? "a file" : `${reviewCount} files`}` : `Your retake path: ${reviewCount} module${reviewCount === 1 ? "" : "s"}`}</Text><Text size="caption" tone="subtle">{direct ? "The ones that cover what you missed" : "Built from what held you back"}</Text></span>
                <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
              </Link>
            )}
            <div className="squircle flex items-center gap-3 rounded-panel bg-subtle px-3.5 py-3">
              <Hourglass className="size-4.5 shrink-0 text-ink-3" aria-hidden="true" />
              <Text size="body" tone="muted">
                {left <= 0 ? "That was your last attempt. Your trainer has been told and will be in touch." : `${left} attempt${left === 1 ? "" : "s"} left. ${waiting ? `You can retake from ${fmtWhen(retakeAt!)}.` : "You can retake whenever you're ready."}`}
              </Text>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
