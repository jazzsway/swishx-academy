"use client";

import Link from "next/link";
import { Award, Briefcase, Check, ChevronRight, FileText, Film, Headphones, Image as ImageIcon, Lock, Mic, Pill, Presentation, Stethoscope, Syringe, TrendingUp, UserRound } from "lucide-react";
import { useApp } from "@/store/app-store";
import { fileLength } from "@/features/media/file-view";
import { modulesOf } from "./use-rep";
import { cn } from "@/lib/cn";
import { allScenarios } from "@/data/scenarios";
import { CHARACTERS, characterOf, screeningOf } from "@/lib/scenario-set";
import { callPlan, scenarioStatus, type ObjectivePlanState, type PlannedCall } from "./situations";
import type { Character, Course, Module, Progress } from "@/data/types";
import { Text } from "@/components/ui/text";

const initials = (name: string) => name.replace(/^Dr\.?\s*/, "").split(" ").map((x) => x[0]).join("").slice(0, 2);

/** The course's practice doctors, one tap from the course: private, unlimited, no score kept. */
export function PracticeCalls({ c, p }: { c: Course; p: Progress }) {
  const scs = allScenarios().filter((x) => c.scenarioIds.includes(x.id) && x.use.includes("practice"));
  if (!scs.length) return null;
  const practiceOnly = p.mode === "practice";
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <Text as="h2" size="subhead" weight="bold">{practiceOnly ? "Your practice" : "Practise the call"}</Text>
        <span className="flex items-center gap-1 text-caption font-semibold text-ink-3"><Lock className="size-3" aria-hidden="true" />Only you see it</span>
      </div>
      {scs.map((sc) => (
        <Link key={sc.id} href={`/rep/practice/call?scenario=${sc.id}`}
          className="squircle group relative flex items-center gap-3.5 overflow-hidden rounded-card bg-ink p-4 text-white shadow-float">
          <span className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 100% 0%, var(--color-brand) 0, transparent 55%)" }} />
          <span className="relative grid size-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-body-lg font-extrabold">{initials(sc.persona.name)}</span>
          <span className="relative flex min-w-0 flex-1 flex-col">
            <Text size="body-lg" weight="bold" tone="inverse" truncate>{sc.persona.name}</Text>
            <Text size="caption" tone="inverse" className="opacity-70" truncate>{sc.persona.specialty} · about {sc.durationMin} min · {sc.objectionIds.length} objections</Text>
          </span>
          <span className="relative flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-white px-3 text-body font-bold text-ink transition-transform group-active:scale-95"><Mic className="size-4" aria-hidden="true" />Practise</span>
        </Link>
      ))}
      <Text size="caption" tone="subtle">{practiceOnly ? "You're assigned practice only: skip the lessons, rehearse as often as you like, then take the final test." : "Rehearse as often as you like before the final call. Choose assisted or unassisted when you start."}</Text>
    </section>
  );
}

/** Where the rep started, where they are, and the pass mark, on one scale. */
export function BaselineCard({ c, p }: { c: Course; p: Progress }) {
  if (!c.settings.baseline || !p.screening) return null;
  const base = p.screening.overall;
  const best = p.attempts.length ? Math.max(...p.attempts.map((a) => a.overall)) : undefined;
  const pass = c.origin === "direct" ? c.settings.passRoleplay : c.settings.passOverall;
  const now = best ?? base;
  const gain = best !== undefined ? best - base : 0;
  return (
    <section className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-4" aria-label="Your progress from baseline">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-brand-deep" aria-hidden="true" />
        <Text size="body-lg" weight="bold" className="flex-1">Your progress</Text>
        {best !== undefined && <span className={cn("rounded-chip px-2 py-0.5 text-caption font-bold", gain >= 0 ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger")}>{gain >= 0 ? "+" : ""}{gain} since baseline</span>}
      </div>
      <div className="relative h-3 rounded-full bg-black/[0.06]">
        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-2 to-brand transition-[width] duration-700" style={{ width: `${now}%` }} />
        <span className="absolute -top-1 h-5 w-0.5 rounded-full bg-ink" style={{ left: `${base}%` }} aria-hidden="true" />
        <span className="absolute -top-1 h-5 w-0.5 rounded-full bg-ok" style={{ left: `${pass}%` }} aria-hidden="true" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="flex flex-col"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">Baseline</Text><Text size="display" weight="extrabold" tabular>{base}</Text></div>
        <div className="flex flex-col"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{best !== undefined ? "Best so far" : "Now"}</Text><Text size="display" weight="extrabold" tabular tone={best !== undefined ? "brand-deep" : "default"}>{best ?? "–"}</Text></div>
        <div className="flex flex-col"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">Pass</Text><Text size="display" weight="extrabold" tabular tone="ok">{pass}</Text></div>
      </div>
      <Text size="caption" tone="subtle">{best !== undefined ? "Your best final-test score against your screening score, out of 100." : "Your screening score is your starting point. The final test shows how far you've come."}</Text>
    </section>
  );
}

/** Practice-only assignments say so up front, so the rep doesn't look for modules. */
export function PracticeOnlyNote() {
  return (
    <div className="squircle flex items-start gap-3 rounded-card border border-tint-line bg-tint p-4">
      <Mic className="mt-0.5 size-5 shrink-0 text-brand-deep" aria-hidden="true" />
      <div className="flex flex-col gap-0.5">
        <Text size="body-lg" weight="bold">Practice only</Text>
        <Text size="body" tone="muted">Your trainer assigned this as practice: no lessons to work through. Rehearse the call, then take the final test.</Text>
      </div>
    </div>
  );
}

const KIND: Record<string, { label: string; icon: typeof Mic }> = {
  video: { label: "Video", icon: Film }, audio: { label: "Audio", icon: Headphones }, image: { label: "Image", icon: ImageIcon },
  slides: { label: "Slides", icon: Presentation }, pdf: { label: "PDF", icon: FileText }, doc: { label: "Document", icon: FileText },
  data: { label: "File", icon: FileText }, other: { label: "File", icon: FileText },
};

/** What a direct-course file is and how long it takes, in the rep's words. */
function fileMeta(m: Module) {
  const b = m.blocks[0];
  if (b?.type === "file" && b.file) {
    const k = KIND[b.file.format];
    const len = b.file.format === "video" || b.file.format === "audio" ? `${m.minutes} min` : b.file.format === "image" ? "1 image" : `${fileLength(b.file).pages} pages`;
    return { ...k, len };
  }
  if (b?.type === "visualaid") return { ...KIND.slides, len: `${b.visualaid?.pages.length ?? 0} slides` };
  if (b?.type === "document") return { ...KIND.pdf, len: `${b.document?.pages.length ?? 0} pages` };
  return { ...KIND.other, len: `${m.minutes} min` };
}

const ROLE: Record<Character, typeof Mic> = { doctor: Stethoscope, nurse: Syringe, manager: Briefcase, pharmacist: Pill, patient: UserRound };

/** A small status pill, the same everywhere on the journey. */
function Pill_({ tone, children }: { tone: "ok" | "danger" | "warn" | "brand" | "muted"; children: React.ReactNode }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-chip px-2 py-0.5 text-micro font-bold",
    tone === "ok" ? "bg-ok-bg text-ok" : tone === "danger" ? "bg-danger-bg text-danger" : tone === "warn" ? "bg-warn-bg text-warn" : tone === "brand" ? "bg-tint text-brand-deep" : "bg-subtle text-ink-3")}>{children}</span>;
}

/** One stage of the journey: a numbered marker on the rail, its title and status, then its content. */
function Stage({ n, title, status, done, current, locked, last, children }: { n: number; title: string; status?: React.ReactNode; done?: boolean; current?: boolean; locked?: boolean; last?: boolean; children?: React.ReactNode }) {
  return (
    <li className="relative flex gap-3">
      <span className="relative flex flex-col items-center">
        <span className={cn("relative z-10 grid size-8 shrink-0 place-items-center rounded-full border-2 text-caption font-extrabold",
          done ? "border-ok bg-ok text-white" : current ? "border-brand bg-brand text-white shadow-brand-lift" : locked ? "border-hair-2 bg-subtle text-ink-4" : "border-hair-2 bg-card text-ink-3")}>
          {done ? <Check className="size-4" aria-hidden="true" /> : locked ? <Lock className="size-3.5" aria-hidden="true" /> : n}
        </span>
        {!last && <span className={cn("w-0.5 flex-1", done ? "bg-ok/50" : "bg-hair-2")} aria-hidden="true" />}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 pb-6">
        <div className="flex min-h-8 items-center gap-2">
          <Text as="h3" size="body-lg" weight="bold" className={cn("min-w-0 flex-1", locked && "text-ink-3")}>{title}</Text>
          {status}
        </div>
        {children}
      </div>
    </li>
  );
}

/**
 * A training built from the trainer's own material, for the rep: the screening call (which can be
 * stopped and resumed), the lessons it leaves in, then the scored calls, objective by objective. Every
 * situation says where the rep stands on it (not taken, passed, to retry, waiting, out of tries) and
 * what they can do: start, retry, or open the report.
 */
export function DirectJourney({ c, p }: { c: Course; p: Progress }) {
  const presenter = useApp((x) => x.presenter);
  const mods = modulesOf(c);
  const base = `/rep/course/${c.id}`;
  const practiceOnly = p.mode === "practice";
  /* Optional material: on hand to look through, but not a step, and it doesn't hold the calls back. */
  const optionalMaterial = p.mode === "optional";
  const certified = p.state === "certified";
  const screens = c.settings.screening && !practiceOnly;
  const run = scenarioStatus(c, p);
  const screen = screeningOf(c, run.scs);
  const part = p.screeningPart ?? [];
  const screened = !!p.screening;
  const pathIds = p.path?.moduleIds;
  const needed = practiceOnly ? [] : screened && pathIds ? mods.filter((m) => pathIds.includes(m.id)) : mods;
  const skipped = screened && pathIds ? mods.filter((m) => !pathIds.includes(m.id)) : [];
  const isDone = (m: Module) => m.blocks.every((b) => p.completedBlocks.includes(b.id));
  const lessonsDone = needed.filter(isDone).length;
  const waitScreen = screens && !screened;
  const filesDone = !waitScreen && (optionalMaterial || lessonsDone === needed.length);
  const nextFile = needed.find((m) => !isDone(m));
  const plan = callPlan(c, p, presenter);
  const passedObs = plan.objectives.filter((o) => o.state === "passed").length;
  const done = plan.allPassed;
  const callsLocked = !filesDone;
  let n = 0;

  return (
    <section className="flex flex-col gap-3" aria-label="Your journey">
      <div className="flex items-baseline justify-between gap-3">
        <Text as="h2" size="subhead" weight="bold">Your journey</Text>
        <span className="flex items-center gap-1 rounded-chip bg-info-bg px-2 py-0.5 text-caption font-semibold text-info"><FileText className="size-3" aria-hidden="true" />Your team&apos;s material</span>
      </div>
      <ol className="flex flex-col">
        {screens && screen.length > 0 && (
          <Stage n={++n} title="Screening call" done={screened} current={!screened}
            status={screened ? <Pill_ tone="ok">Baseline {p.screening!.overall}</Pill_> : part.length ? <Pill_ tone="warn">Paused · {part.length} of {screen.length}</Pill_> : <Pill_ tone="brand">Up next</Pill_>}>
            <div className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-3">
              <span className="flex -space-x-1.5">{screen.map((x) => { const I = ROLE[characterOf(x)]; return <span key={x.id} className="grid size-8 place-items-center rounded-full border-2 border-card bg-tint text-brand-deep"><I className="size-3.5" aria-hidden="true" /></span>; })}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <Text size="body" weight="semibold" truncate>{screen.map((x) => x.persona.name.replace(/,.*$/, "")).join(" and ")}</Text>
                <Text size="caption" tone="subtle">{screened ? (optionalMaterial ? "Your baseline is set" : skipped.length ? `You skip ${skipped.length} lesson${skipped.length === 1 ? "" : "s"} you already know` : "Every lesson stays in your path") : part.length ? `${part.length} of ${screen.length} done · what you did is saved` : optionalMaterial ? "About 3 min · not graded · sets your baseline" : "About 3 min · not graded · decides which lessons you skip"}</Text>
              </span>
              {screened
                ? <Link href={`${base}/results`} className="shrink-0 text-caption font-bold text-brand-deep hover:underline">Results</Link>
                : <Link href={`${base}/screening`} className="flex h-8 shrink-0 items-center gap-1 rounded-control bg-brand px-3 text-caption font-bold text-white"><Mic className="size-3.5" aria-hidden="true" />{part.length ? "Resume" : "Start"}</Link>}
            </div>
          </Stage>
        )}

        {!practiceOnly && !optionalMaterial && (
          <Stage n={++n} title="Lessons" done={filesDone && needed.length > 0} current={!waitScreen && !filesDone} locked={waitScreen}
            status={waitScreen ? <Pill_ tone="muted">After screening</Pill_> : <Pill_ tone={filesDone ? "ok" : "muted"}>{lessonsDone} of {needed.length} done</Pill_>}>
            <ul className="flex flex-col gap-1.5">
              {needed.map((m) => {
                const meta = fileMeta(m);
                const done = isDone(m);
                const cur = !waitScreen && m.id === nextFile?.id;
                const body = (
                  <>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-control", done ? "bg-ok-bg text-ok" : cur ? "bg-tint text-brand-deep" : "bg-subtle text-ink-3")}>{done ? <Check className="size-4" aria-hidden="true" /> : <meta.icon className="size-4" aria-hidden="true" />}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Text size="body" weight="semibold" truncate className={done ? "text-ink-2" : undefined}>{m.title}</Text>
                      <Text size="caption" tone="subtle" truncate>{meta.label} · {meta.len}{m.required ? " · for everyone" : ""}</Text>
                    </span>
                    {cur ? <Pill_ tone="brand">{p.completedBlocks.some((b) => m.blocks.some((x) => x.id === b)) ? "Continue" : "Next"}</Pill_> : !waitScreen && <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />}
                  </>
                );
                return (
                  <li key={m.id}>
                    {waitScreen
                      ? <div className="flex items-center gap-3 rounded-panel px-1 py-1 opacity-70">{body}</div>
                      : <Link href={`${base}/learn?module=${m.id}`} className={cn("squircle flex items-center gap-3 rounded-panel px-1 py-1 transition-colors hover:bg-subtle", cur && "bg-tint/40")}>{body}</Link>}
                  </li>
                );
              })}
            </ul>
            {skipped.length > 0 && <Text size="caption" tone="subtle">Skipped, you already know: {skipped.map((m) => m.title).join(", ")}. <Link href={`${base}/learn?module=${skipped[0].id}&optional=1`} className="font-semibold text-brand-deep hover:underline">Open anyway</Link></Text>}
          </Stage>
        )}

        {plan.objectives.length > 0 && (
          <Stage n={++n} title="The calls" done={done} current={!callsLocked && !done} locked={callsLocked}
            status={callsLocked ? <Pill_ tone="muted">{optionalMaterial ? "After screening" : "After the lessons"}</Pill_> : <Pill_ tone={done ? "ok" : "muted"}>{passedObs} of {plan.objectives.length} objectives</Pill_>}>
            <Text size="caption" tone="subtle" className="-mt-1">
              Scored · pass {c.settings.passRoleplay} · {(c.settings.situationsPerObjective ?? "one") === "one" ? "one situation per objective, drawn for you" : "every situation"} · {c.settings.attempts} {c.settings.attempts === 1 ? "try" : "tries"} per objective{c.settings.finalNoHints === false ? " · hints allowed" : ""}. One call per person; each objective is scored on its own.
            </Text>
            {/* The calls to take, from the start: one per person, each with its objectives and where they stand. Start opens after the lessons. */}
            <ul className="flex flex-col gap-2" aria-label="Your calls">
              {callsOf(plan).map((call, k) => <CallCard key={call.key} c={c} call={call} k={k} plan={plan} locked={callsLocked} lockNote={optionalMaterial ? "Opens after screening" : "Opens after the lessons"} />)}
            </ul>
            {/* v1-hidden: the separate objectives list. Each call now shows its objectives' status.
            <ul className="squircle flex flex-col divide-y divide-hair overflow-hidden rounded-card border border-hair bg-card" aria-label="Objectives">
              {plan.objectives.map((o, i) => <ObjectiveRow key={o.ob?.id ?? "loose"} c={c} p={p} o={o} i={i} plan={plan} locked={callsLocked} />)}
            </ul>
            */}
          </Stage>
        )}

        <Stage n={++n} title="Certified" last done={certified} current={done && !certified} locked={!done && !certified}
          status={certified ? <Pill_ tone="ok">Done</Pill_> : done ? <Pill_ tone="brand">Ready</Pill_> : undefined}>
          <Text size="caption" tone="subtle" className="-mt-1">{certified ? "It's on your record." : done ? "Every objective passed. Your certificate is ready." : "Pass every objective to get certified."}</Text>
          {done && !certified && <Link href={`${base}/attest`} className="flex h-9 items-center justify-center gap-1.5 self-start rounded-control bg-brand px-4 text-body font-bold text-white"><Award className="size-4" aria-hidden="true" />Get your certificate</Link>}
        </Stage>
      </ol>

      {optionalMaterial && mods.length > 0 && (
        <section className="squircle flex flex-col gap-2 rounded-card border border-hair bg-card p-4" aria-labelledby="material-h">
          <div className="flex items-baseline justify-between gap-3">
            <Text as="h3" id="material-h" size="body-lg" weight="bold">The material</Text>
            <Pill_ tone="muted">Optional</Pill_>
          </div>
          <Text size="caption" tone="subtle" className="-mt-1">Look through any of it, any time. It isn&apos;t a step, and the calls don&apos;t wait for it.</Text>
          <ul className="flex flex-col gap-1.5">
            {mods.map((m) => {
              const meta = fileMeta(m);
              const seen = isDone(m);
              return (
                <li key={m.id}>
                  <Link href={`${base}/learn?module=${m.id}`} className="squircle flex items-center gap-3 rounded-panel px-1 py-1 transition-colors hover:bg-subtle">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-control", seen ? "bg-ok-bg text-ok" : "bg-subtle text-ink-3")}>{seen ? <Check className="size-4" aria-hidden="true" /> : <meta.icon className="size-4" aria-hidden="true" />}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Text size="body" weight="semibold" truncate>{m.title}</Text>
                      <Text size="caption" tone="subtle" truncate>{meta.label} · {meta.len}</Text>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </section>
  );
}

const OB_STATUS: Record<ObjectivePlanState, { label: string; tone: "ok" | "danger" | "warn" | "brand" | "muted" }> = {
  todo: { label: "Not started", tone: "muted" }, started: { label: "In progress", tone: "brand" }, passed: { label: "Passed", tone: "ok" },
  retry: { label: "Retry", tone: "danger" }, waiting: { label: "Retry later", tone: "warn" }, out: { label: "No tries left", tone: "danger" },
};
type Plan = ReturnType<typeof callPlan>;

type JourneyCall = { key: Character; items: { o: Plan["objectives"][number]; sc: PlannedCall["items"][number]["sc"]; n: number }[]; minutes: number };

/** Every call the rep has to take, whether or not it's open yet: each objective's situation (drawn, last tried, or the first in its bank), one call per person. */
function callsOf(plan: Plan): JourneyCall[] {
  const out: JourneyCall[] = [];
  plan.objectives.forEach((o, n) => {
    const scs = o.ob ? [o.next[0] ?? o.tested ?? o.bank[0]] : o.bank;
    for (const sc of scs.filter(Boolean)) {
      const key = characterOf(sc);
      const call = out.find((x) => x.key === key) ?? (out.push({ key, items: [], minutes: 0 }), out.at(-1)!);
      call.items.push({ o, sc, n });
    }
  });
  for (const call of out) call.minutes = plan.calls.find((x) => x.key === call.key)?.minutes ?? Math.min(15, Math.max(3, call.items.reduce((a, x) => a + Math.ceil(x.sc.durationMin * 0.7), 0)));
  return out;
}

/** A call to take: who the rep meets, the objectives it covers and where each stands. Start shows from the beginning and opens once the lessons are done. */
function CallCard({ c, call, k, plan, locked, lockNote }: { c: Course; call: JourneyCall; k: number; plan: Plan; locked: boolean; lockNote: string }) {
  const I = ROLE[call.key];
  const host = call.items[0].sc;
  const ready = plan.calls.some((x) => x.key === call.key);
  const passed = call.items.every((x) => x.o.state === "passed");
  const retry = ready && call.items.some((x) => x.o.state === "retry");
  const live = ready && !locked;
  const n = call.items.length;
  return (
    <li className={cn("squircle flex flex-col gap-3 rounded-card border p-3.5", live ? "border-tint-line bg-tint/40" : passed ? "border-ok-line bg-ok-bg/40" : "border-hair bg-card")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-white", passed ? "bg-ok" : live ? "bg-gradient-to-br from-brand-2 to-brand" : "bg-ink-4")}>{passed ? <Check className="size-4.5" aria-hidden="true" /> : <I className="size-4.5" aria-hidden="true" />}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="body" weight="bold" truncate>Call {k + 1} · {host.persona.name.replace(/,.*$/, "")}</Text>
          <Text size="caption" tone="subtle">{CHARACTERS[call.key].label} · {n} objective{n === 1 ? "" : "s"} · about {call.minutes} min</Text>
        </span>
        {passed ? <Pill_ tone="ok">Passed</Pill_>
          : live ? <Link href={`/rep/course/${c.id}/assessment?call=${call.key}`} className="flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-brand px-3.5 text-caption font-bold text-white shadow-brand-lift"><Mic className="size-3.5" aria-hidden="true" />{retry ? "Retry" : "Start"}</Link>
          : <span aria-disabled="true" title={locked ? lockNote : undefined} className="flex h-9 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-control bg-subtle px-3.5 text-caption font-bold text-ink-4">{locked ? <Lock className="size-3.5" aria-hidden="true" /> : <Mic className="size-3.5" aria-hidden="true" />}Start</span>}
      </div>
      <ol className={cn("flex flex-col gap-1.5 border-t pt-2.5", live ? "border-tint-line" : "border-hair")}>
        {call.items.map((x) => {
          const st = OB_STATUS[x.o.state];
          const when = x.o.retryAt?.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
          const note = x.o.state === "waiting" ? `Retry from ${when}. Go back over the lessons first.` : x.o.state === "out" ? "No tries left. Your manager can reset it." : x.o.state === "retry" ? `${x.o.triesLeft} ${x.o.triesLeft === 1 ? "try" : "tries"} left` : undefined;
          return (
            <li key={x.sc.id} className="flex items-baseline gap-2 text-caption">
              <span className="w-5 shrink-0 font-extrabold tabular-nums text-brand-deep">{String(x.n + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-ink-2">{x.o.ob?.title ?? x.sc.title}</span>{note && <span className="text-ink-3">{note}</span>}</span>
              {x.o.state !== "todo" && <Pill_ tone={st.tone}>{st.label}</Pill_>}
            </li>
          );
        })}
      </ol>
    </li>
  );
}

/** v1-hidden (the objectives list is off). An objective, for the rep: where they stand, and the situation it was (or will be) tested with. */
function ObjectiveRow({ c, p, o, i, plan, locked }: { c: Course; p: Progress; o: Plan["objectives"][number]; i: number; plan: Plan; locked: boolean }) {
  const base = `/rep/course/${c.id}`;
  const st = OB_STATUS[o.state];
  const run = o.tested ? p.scenarioRuns?.[o.tested.id] : undefined;
  const inCall = plan.calls.findIndex((call) => call.items.some((x) => x.ob?.id === o.ob?.id));
  const all = (c.settings.situationsPerObjective ?? "one") === "all" || !o.ob;
  const when = o.retryAt?.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
  const line = o.state === "passed" ? `Passed with “${o.tested?.title}”`
    : o.state === "retry" ? `${o.tested ? `“${o.tested.title}” not passed · ` : ""}${o.triesLeft} ${o.triesLeft === 1 ? "try" : "tries"} left${all || o.bank.length < 2 ? "" : "; your retry draws another situation"}`
    : o.state === "waiting" ? `Retry from ${when}. Go back over the lessons first.`
    : o.state === "out" ? "No tries left. Your manager can reset it."
    : locked ? `${o.bank.length} situation${o.bank.length === 1 ? "" : "s"} in the bank${all ? "" : "; one is drawn for you"}`
    : inCall >= 0 ? `In call ${inCall + 1}${all || o.bank.length < 2 ? "" : `, with one of its ${o.bank.length} situations`}` : "";
  return (
    <li className="flex flex-col gap-2 p-3.5">
      <div className="flex items-start gap-3">
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-control text-micro font-extrabold tabular-nums", o.state === "passed" ? "bg-ok text-white" : "bg-tint text-brand-deep")}>{o.state === "passed" ? <Check className="size-3.5" aria-hidden="true" /> : String(i + 1).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="body" weight="bold" className="leading-snug">{o.ob?.title ?? "More situations"}</Text>
          {line && <Text size="caption" tone="subtle">{line}</Text>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <Pill_ tone={st.tone}>{st.label}</Pill_>
          {run && !all && (
            <Link href={`${base}/assessment?report=${o.tested!.id}`} className="flex items-center gap-1 text-micro font-bold text-ink-2 hover:text-brand-deep">
              <span className={cn("rounded-chip px-1.5 py-0.5 tabular-nums", run.passed ? "bg-ok text-white" : "bg-danger-bg text-danger")}>{run.score}</span>Report
            </Link>
          )}
        </span>
      </div>
      {/* "All": every situation counts, so each shows on its own. */}
      {all && (
        <ul className="ml-10 flex flex-col gap-1">
          {o.bank.map((sc) => {
            const r = p.scenarioRuns?.[sc.id];
            const I = ROLE[characterOf(sc)];
            return (
              <li key={sc.id} className="flex items-center gap-2 text-caption">
                <I className="size-3.5 shrink-0 text-ink-4" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-ink-2">{sc.title}</span>
                {r ? <Link href={`${base}/assessment?report=${sc.id}`} className="flex items-center gap-1 font-bold text-ink-2 hover:text-brand-deep"><span className={cn("rounded-chip px-1.5 py-0.5 text-micro tabular-nums", r.passed ? "bg-ok text-white" : "bg-danger-bg text-danger")}>{r.score}</span>Report</Link> : <span className="text-ink-4">Not taken</span>}
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}
