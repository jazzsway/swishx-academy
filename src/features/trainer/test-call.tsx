"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CircleDot, Keyboard, Lightbulb, Mic, MessageSquareQuote, RotateCcw, ShieldAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { allScenarios, objection, prohibited, scenario as getScenario } from "@/data/scenarios";
import { competency } from "@/data/org";
import { useApp } from "@/store/app-store";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Card, Ring } from "@/components/patterns/academy";
import { CallScreen, type CallOutcome } from "@/features/roleplay/call-screen";
import { scoreCall, type CallState } from "@/features/roleplay/engine";
import { Scorecard } from "@/features/roleplay/scorecard";
import { useVoice } from "@/features/roleplay/use-voice";

const PASS = 75;
const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;

/**
 * AS-3 AC5: the trainer calls the AI doctor themselves, exactly as a rep would, and watches what
 * SwishX does behind the scenes: which objection comes next, which rubric points are met, what gets flagged.
 * Nothing is saved.
 */
export function TestCall() {
  const search = useSearchParams();
  const sc = getScenario(search.get("scenario") ?? "sc-kim");
  const back = search.get("back") ?? `/trainer/courses/${sc.courseId}/roleplay`;
  const course = useApp((s) => s.courses.find((c) => c.id === sc.courseId));
  const others = allScenarios().filter((x) => x.courseId === sc.courseId && x.id !== sc.id);
  const voice = useVoice();
  const [stage, setStage] = useState<"brief" | "call" | "result">("brief");
  /* Until the trainer picks, talk if this browser can. */
  const [mic, setUseMic] = useState<boolean | null>(null);
  const useMic = mic ?? voice.supported;
  const [hints, setHints] = useState(true);
  const [live, setLive] = useState<{ state: CallState; elapsed: number } | null>(null);
  const [result, setResult] = useState<CallOutcome | null>(null);
  const [run, setRun] = useState(0);
  const onChange = useCallback((state: CallState, elapsed: number) => setLive({ state, elapsed }), []);
  const role = sc.use.includes("screening") ? "screening call" : "final assessment call";
  const start = () => { setResult(null); setLive(null); setRun(run + 1); setStage("call"); };

  const top = (
    <div className="flex flex-wrap items-center gap-3">
      <Link href={back} className="flex items-center gap-1.5 text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />AI roleplay</Link>
      <span className="text-ink-4">/</span>
      <Text size="body" weight="semibold" className="text-ink-2">{course?.title}</Text>
      <Chip size="sm" className="ml-auto">Test call · nothing is saved</Chip>
    </div>
  );

  /* ── Briefing ── */
  if (stage === "brief") {
    return (
      <div className="flex flex-col gap-5">
        {top}
        <div className="flex flex-col gap-1">
          <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Test call: {sc.persona.name}</Text>
          <Text size="body-lg" tone="subtle">The {role} reps take in {course?.title}. Talk to the doctor as a rep would; SwishX scores it the same way.</Text>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Card>
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-title font-extrabold text-white">{initials(sc.persona.name)}</span>
              <div className="flex min-w-0 flex-col">
                <Text size="title" weight="bold">{sc.persona.name}</Text>
                <Text size="body" tone="subtle">{sc.persona.specialty} · {sc.persona.setting}</Text>
                <div className="mt-1.5 flex flex-wrap gap-1.5">{sc.persona.traits.map((t) => <Chip key={t} size="sm">{t}</Chip>)}</div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">The rep's objective</Text>
              <Text size="body-lg">{sc.objective} · about {sc.durationMin} min</Text>
            </div>
            <div className="squircle flex gap-2.5 rounded-panel bg-subtle px-4 py-3">
              <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
              <Text size="body-lg" tone="muted">“{sc.persona.opening}”</Text>
            </div>
            <div className="flex flex-col gap-2">
              <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">The doctor raises, in order</Text>
              <ol className="flex flex-col gap-1.5">
                {sc.objectionIds.map((o, i) => (
                  <li key={o} className="flex items-start gap-2.5">
                    <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-black/[0.06] text-micro font-bold text-ink-3">{i + 1}</span>
                    <span className="flex flex-col"><Text size="body" weight="semibold">{objection(o).label}</Text><Text size="caption" tone="subtle">If the answer misses, they push back once, then move on.</Text></span>
                  </li>
                ))}
              </ol>
            </div>
          </Card>

          <div className="flex flex-col gap-5">
            <Card title="What SwishX scores" eyebrow={`Pass at ${PASS}%`}>
              <ul className="-mt-1 flex flex-col gap-2">
                {sc.rubric.map((r) => (
                  <li key={r.id} className="flex items-start gap-3">
                    <Text size="body" weight="bold" tone="brand-deep" className="w-10 shrink-0 tabular-nums">{r.weight}%</Text>
                    <span className="flex flex-col"><Text size="body" weight="semibold">{r.label}</Text><Text size="caption" tone="subtle">{competency(r.competency)?.name}</Text></span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1.5 border-t border-hair pt-3">
                {sc.prohibitedIds.map((id) => {
                  const p = prohibited(id);
                  return <Chip key={id} size="sm" tone={p.critical ? "danger" : "warn"} iconLeft={<ShieldAlert className="size-3" aria-hidden="true" />}>{p.label}</Chip>;
                })}
              </div>
            </Card>

            <Card title="How you'll test it">
              <div className="-mt-1 flex flex-col gap-3">
                <div className="flex gap-2" role="radiogroup" aria-label="Answer by">
                  <ModeOption on={useMic} disabled={!voice.supported} onClick={() => setUseMic(true)} icon={<Mic className="size-4.5" aria-hidden="true" />} title="Talk" sub={voice.supported ? "The doctor answers out loud" : "Not available in this browser"} />
                  <ModeOption on={!useMic} onClick={() => setUseMic(false)} icon={<Keyboard className="size-4.5" aria-hidden="true" />} title="Type" sub="Quiet, and quicker to test" />
                </div>
                <label className="flex cursor-pointer items-start gap-3 rounded-panel border border-hair px-3.5 py-3">
                  <input type="checkbox" checked={hints} onChange={(e) => setHints(e.target.checked)} className="mt-1 size-4 accent-[var(--color-brand)]" />
                  <span className="flex flex-col"><Text size="body" weight="semibold">Show sample answers</Text><Text size="caption" tone="subtle">Tap an approved answer, a vague one, or one that breaks the rules, and watch how the doctor and the score react.</Text></span>
                </label>
                <div className="squircle flex gap-2.5 rounded-panel bg-tint px-4 py-3">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-deep" aria-hidden="true" />
                  <Text size="body" tone="muted">Try it twice: once as a strong rep, once as a weak one. The live panel shows each rubric point and flag the moment it happens.</Text>
                </div>
              </div>
            </Card>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={start}>{useMic ? <Mic className="size-4" aria-hidden="true" /> : <Keyboard className="size-4" aria-hidden="true" />}Start test call</Button>
          {others.map((o) => <Link key={o.id} href={`/trainer/test-call?scenario=${o.id}&back=${encodeURIComponent(back)}`} className="text-body font-semibold text-brand-deep hover:underline">Or test {o.persona.name} instead</Link>)}
        </div>
      </div>
    );
  }

  /* ── The call, with SwishX's view next to it ── */
  if (stage === "call") {
    return (
      <div className="flex flex-col gap-4">
        {top}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="h-[calc(100dvh-210px)] min-h-[520px] overflow-hidden rounded-card shadow-float">
            <CallScreen key={run} scenario={sc} mode="test" voiceAllowed={useMic} skipPrep showSamples={hints}
              onChange={onChange} onExit={() => setStage("brief")} onComplete={(r) => { setResult(r); setStage("result"); }} />
          </div>
          <LivePanel live={live} sc={sc} />
        </div>
      </div>
    );
  }

  /* ── Result ── */
  const passed = (result?.score ?? 0) >= PASS && !result?.flags.some((f) => f.critical);
  return (
    <div className="flex flex-col gap-5">
      {top}
      <div className="flex flex-col gap-1">
        <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Your test call with {sc.persona.name}</Text>
        <Text size="body-lg" tone="subtle">This is the scorecard a rep would see. Nothing was saved.</Text>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card>{result && <Scorecard result={result} mode="assessment" />}</Card>
        <div className="flex flex-col gap-4">
          <Card title="What this would mean for a rep">
            <div className="-mt-1 flex items-center gap-3">
              <Ring value={result?.score ?? 0} size={56} stroke={6} tone={passed ? "ok" : "brand"} label={`${result?.score}%`}><Text size="body-lg" weight="extrabold" tabular>{result?.score}</Text></Ring>
              <Text size="body" tone="muted">
                {sc.use.includes("screening")
                  ? "Screening isn't pass or fail. These scores, with the screening questions, decide which modules the rep can skip."
                  : passed
                    ? `Passes the call (${PASS}% needed). It counts for 40% of the final assessment.`
                    : result?.flags.some((f) => f.critical) ? "Fails: a critical compliance flag fails the assessment, whatever the score." : `Doesn't pass the call: ${PASS}% needed.`}
              </Text>
            </div>
            {result && Object.keys(result.competencyScores).length > 0 && (
              <ul className="flex flex-col gap-1.5 border-t border-hair pt-3">
                {Object.entries(result.competencyScores).map(([k, v]) => (
                  <li key={k} className="flex justify-between text-body"><span className="text-ink-2">{competency(k)?.name}</span><strong className={cn("tabular-nums", v < 50 && "text-danger")}>{v}</strong></li>
                ))}
              </ul>
            )}
          </Card>
          <div className="flex flex-col gap-2">
            <Button size="lg" onClick={start}><RotateCcw className="size-4" aria-hidden="true" />Call again</Button>
            <Button size="lg" variant="secondary" onClick={() => setStage("brief")}>Change how you test</Button>
            {others.map((o) => <Link key={o.id} href={`/trainer/test-call?scenario=${o.id}&back=${encodeURIComponent(back)}`} className="py-1 text-center text-body font-semibold text-brand-deep hover:underline">Test {o.persona.name} next</Link>)}
            <Link href={back} className="py-1 text-center text-body font-semibold text-ink-3 hover:text-ink">Back to AI roleplay</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const initials = (name: string) => name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("");

function ModeOption({ on, disabled, onClick, icon, title, sub }: { on: boolean; disabled?: boolean; onClick: () => void; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <button type="button" role="radio" aria-checked={on} disabled={disabled} onClick={onClick}
      className={cn("squircle flex flex-1 items-start gap-2.5 rounded-panel border px-3.5 py-3 text-left transition-colors disabled:opacity-40", on ? "border-brand bg-tint" : "border-hair hover:bg-subtle")}>
      <span className={cn("mt-0.5", on ? "text-brand-deep" : "text-ink-3")}>{icon}</span>
      <span className="flex flex-col"><Text size="body" weight="semibold">{title}</Text><Text size="caption" tone="subtle">{sub}</Text></span>
    </button>
  );
}

/** What SwishX is doing during the call: the objection it's on, rubric points as they're met, flags as they happen. */
function LivePanel({ live, sc }: { live: { state: CallState; elapsed: number } | null; sc: CallState["scenario"] }) {
  const state = live?.state;
  const now = state ? scoreCall(sc, state.turns, true) : undefined;
  const met = now?.criteria.filter((c) => c.met).length ?? 0;
  return (
    <aside className="flex flex-col gap-4 lg:sticky lg:top-[84px] lg:self-start">
      <div className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-4">
        <div className="flex items-center justify-between">
          <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">Behind the scenes</Text>
          <Text size="caption" tone="subtle" tabular>{mmss(live?.elapsed ?? 0)} / {sc.durationMin}:00</Text>
        </div>
        <div className="flex flex-col gap-1.5">
          <Text size="body" weight="bold">Objections</Text>
          {sc.objectionIds.map((o, i) => {
            const idx = state?.idx ?? -1;
            const st = state?.done || i < idx ? "done" : i === idx ? (state?.pushedBack ? "pushed" : "now") : "next";
            return (
              <div key={o} className={cn("flex items-center gap-2.5 rounded-control px-2.5 py-1.5", st === "now" || st === "pushed" ? "bg-tint" : "")}>
                {st === "done" ? <Check className="size-4 shrink-0 text-ok" aria-hidden="true" /> : <CircleDot className={cn("size-4 shrink-0", st === "next" ? "text-ink-4" : "text-brand")} aria-hidden="true" />}
                <span className="min-w-0 flex-1 truncate text-body">{objection(o).label}</span>
                <span className={cn("text-micro font-bold", st === "pushed" ? "text-warn" : st === "now" ? "text-brand-deep" : "text-ink-4")}>{st === "done" ? "Done" : st === "pushed" ? "Pushed back" : st === "now" ? "Raised" : "Next"}</span>
              </div>
            );
          })}
          {state?.done && <Text size="caption" tone="subtle" className="px-2.5">The doctor has wrapped up. End the call to see the scorecard.</Text>}
        </div>
      </div>

      <div className="squircle flex flex-col gap-2 rounded-card border border-hair bg-card p-4">
        <div className="flex items-center justify-between"><Text size="body" weight="bold">Rubric</Text><Text size="caption" tone="subtle" tabular>{met} of {sc.rubric.length} · {now?.score ?? 0}%</Text></div>
        {sc.rubric.map((r) => {
          const c = now?.criteria.find((x) => x.id === r.id);
          return (
            <div key={r.id} className={cn("flex items-start gap-2.5 rounded-control px-2.5 py-1.5 transition-colors", c?.met && "bg-ok-bg")}>
              {c?.met ? <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" /> : <span className="mt-1 size-3.5 shrink-0 rounded-full border-2 border-hair-3" aria-hidden="true" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("text-body", c?.met ? "font-semibold text-ok" : "text-ink-2")}>{r.label}</span>
                {c?.met && c.quote && <span className="truncate text-caption text-ink-3">“{c.quote}”</span>}
              </span>
              <span className="text-micro font-bold tabular-nums text-ink-4">{r.weight}%</span>
            </div>
          );
        })}
      </div>

      <div className="squircle flex flex-col gap-2 rounded-card border border-hair bg-card p-4">
        <Text size="body" weight="bold">Compliance</Text>
        {now?.flags.length ? now.flags.map((f) => (
          <div key={f.ruleId} className={cn("squircle flex flex-col gap-0.5 rounded-panel px-3 py-2", f.critical ? "bg-danger-bg" : "bg-warn-bg")}>
            <span className={cn("flex items-center gap-1.5 text-body font-semibold", f.critical ? "text-danger" : "text-warn")}><ShieldAlert className="size-4" aria-hidden="true" />{f.label}{f.critical && " · fails an assessment"}</span>
            <span className="text-caption text-ink-2">“{f.quote}”</span>
          </div>
        )) : <span className="flex items-center gap-2 text-body text-ink-3"><X className="size-4 text-ink-4" aria-hidden="true" />Nothing flagged so far</span>}
      </div>
    </aside>
  );
}
