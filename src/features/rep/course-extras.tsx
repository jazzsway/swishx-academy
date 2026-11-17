"use client";

import Link from "next/link";
import { Award, BarChart3, Briefcase, Check, ChevronRight, FileText, Film, Headphones, Image as ImageIcon, Lock, Mic, Pill, Presentation, RotateCcw, Stethoscope, Syringe, TrendingUp, UserRound } from "lucide-react";
import { useApp } from "@/store/app-store";
import { fileLength } from "@/features/media/file-view";
import { modulesOf, pathModules } from "./use-rep";
import { cn } from "@/lib/cn";
import { allScenarios } from "@/data/scenarios";
import { CHARACTERS, characterOf, screeningOf } from "@/lib/scenario-set";
import { objectiveGroups, scenarioStatus, type ObjectiveState } from "./situations";
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
  const pass = c.settings.passOverall;
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
  const filesDone = !waitScreen && lessonsDone === needed.length;
  const nextFile = needed.find((m) => !isDone(m));
  const groups = objectiveGroups(c, p, presenter);
  const total = groups.reduce((a, g) => a + g.scs.length, 0);
  const passedAll = groups.reduce((a, g) => a + g.passed, 0);
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
                <Text size="caption" tone="subtle">{screened ? (skipped.length ? `You skip ${skipped.length} lesson${skipped.length === 1 ? "" : "s"} you already know` : "Every lesson stays in your path") : part.length ? `${part.length} of ${screen.length} done · what you did is saved` : "About 3 min · not graded · decides which lessons you skip"}</Text>
              </span>
              {screened
                ? <Link href={`${base}/results`} className="shrink-0 text-caption font-bold text-brand-deep hover:underline">Results</Link>
                : <Link href={`${base}/screening`} className="flex h-8 shrink-0 items-center gap-1 rounded-control bg-brand px-3 text-caption font-bold text-white"><Mic className="size-3.5" aria-hidden="true" />{part.length ? "Resume" : "Start"}</Link>}
            </div>
          </Stage>
        )}

        {!practiceOnly && (
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

        {groups.length > 0 && (
          <Stage n={++n} title="The calls" done={run.allPassed} current={!callsLocked && !run.allPassed} locked={callsLocked}
            status={callsLocked ? <Pill_ tone="muted">After the lessons</Pill_> : <Pill_ tone={run.allPassed ? "ok" : "muted"}>{passedAll} of {total} passed</Pill_>}>
            <Text size="caption" tone="subtle" className="-mt-1">Scored · pass {c.settings.passRoleplay} on each situation · {c.settings.attempts} {c.settings.attempts === 1 ? "try" : "tries"} each{c.settings.finalNoHints === false ? " · hints allowed" : ""}. Stop between situations any time; what you&apos;ve done is kept.</Text>
            <ul className="flex flex-col gap-2.5">
              {groups.map((g, gi) => <ObjectiveCard key={g.ob?.id ?? "loose"} c={c} g={g} i={gi} locked={callsLocked} />)}
            </ul>
          </Stage>
        )}

        <Stage n={++n} title="Certified" last done={certified} current={run.allPassed && !certified} locked={!run.allPassed && !certified}
          status={certified ? <Pill_ tone="ok">Done</Pill_> : run.allPassed ? <Pill_ tone="brand">Sign now</Pill_> : undefined}>
          <Text size="caption" tone="subtle" className="-mt-1">{certified ? "It's on your record." : run.allPassed ? "Every situation passed. Sign the statement to get certified." : "Pass every situation, then sign once."}</Text>
          {run.allPassed && !certified && <Link href={`${base}/attest`} className="flex h-9 items-center justify-center gap-1.5 self-start rounded-control bg-brand px-4 text-body font-bold text-white"><Award className="size-4" aria-hidden="true" />Sign and get certified</Link>}
        </Stage>
      </ol>
    </section>
  );
}

const OB_STATUS: Record<ObjectiveState, { label: string; tone: "ok" | "danger" | "warn" | "brand" | "muted" }> = {
  todo: { label: "Not started", tone: "muted" }, started: { label: "In progress", tone: "brand" }, passed: { label: "Passed", tone: "ok" },
  retry: { label: "Retry", tone: "danger" }, waiting: { label: "Retry later", tone: "warn" }, out: { label: "No tries left", tone: "danger" },
};

/** An objective on the rep's side: where they stand on it, its situations, and the one thing to do. */
function ObjectiveCard({ c, g, i, locked }: { c: Course; g: ReturnType<typeof objectiveGroups>[number]; i: number; locked: boolean }) {
  const base = `/rep/course/${c.id}`;
  const st = OB_STATUS[g.state];
  const retry = g.each.filter((x) => x.state === "retry");
  const action = locked ? null
    : g.todo > 0 ? { label: g.state === "started" ? `Continue · ${g.todo} left` : "Start", href: `${base}/assessment${g.ob ? `?obj=${g.ob.id}` : ""}`, icon: Mic }
    : retry.length ? { label: retry.length > 1 ? `Retry ${retry.length}` : "Retry", href: `${base}/assessment${g.ob ? `?obj=${g.ob.id}` : `?sc=${retry[0].sc.id}`}`, icon: RotateCcw }
    : null;
  return (
    <li className={cn("squircle flex flex-col overflow-hidden rounded-card border bg-card", g.state === "passed" ? "border-ok-line" : g.state === "retry" || g.state === "out" ? "border-danger-line" : "border-hair")}>
      <div className="flex items-start gap-3 p-3.5 pb-3">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-control text-caption font-extrabold tabular-nums", g.state === "passed" ? "bg-ok text-white" : "bg-tint text-brand-deep")}>{g.state === "passed" ? <Check className="size-4" aria-hidden="true" /> : String(i + 1).padStart(2, "0")}</span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="body" weight="bold" className="leading-snug">{g.ob?.title ?? "More situations"}</Text>
          <Text size="caption" tone="subtle">{g.passed} of {g.scs.length} passed · about {g.scs.reduce((a, x) => a + x.durationMin, 0)} min</Text>
        </span>
        <Pill_ tone={st.tone}>{st.label}</Pill_>
      </div>
      <ul className="flex flex-col border-t border-hair">
        {g.each.map(({ sc, state, run, triesLeft, retryAt }) => {
          const I = ROLE[characterOf(sc)];
          return (
            <li key={sc.id} className="flex items-center gap-2.5 border-b border-hair px-3.5 py-2.5 last:border-0">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-subtle text-ink-2"><I className="size-3.5" aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col">
                <Text size="caption" weight="semibold" truncate className="text-ink">{sc.title}</Text>
                <Text size="micro" tone="subtle" truncate>
                  {sc.persona.name.replace(/,.*$/, "")} · {CHARACTERS[characterOf(sc)].label}
                  {state === "retry" ? ` · ${triesLeft} ${triesLeft === 1 ? "try" : "tries"} left` : state === "waiting" ? ` · retry ${retryAt!.toLocaleString("en-US", { weekday: "short", hour: "numeric" })}` : state === "out" ? " · no tries left" : ""}
                </Text>
              </span>
              {run && <span className={cn("shrink-0 rounded-chip px-1.5 py-0.5 text-micro font-extrabold tabular-nums", run.passed ? "bg-ok text-white" : "bg-danger-bg text-danger")}>{run.score}</span>}
              {run
                ? <Link href={`${base}/assessment?report=${sc.id}`} className="flex h-7 shrink-0 items-center gap-1 rounded-control border border-hair-2 px-2 text-micro font-bold text-ink-2 hover:bg-subtle"><BarChart3 className="size-3" aria-hidden="true" />Report</Link>
                : <Text size="micro" tone="subtle" className="shrink-0">Not taken</Text>}
              {state === "retry" && !locked && <Link href={`${base}/assessment?sc=${sc.id}`} aria-label={`Retry ${sc.title}`} className="grid size-7 shrink-0 place-items-center rounded-control bg-danger-bg text-danger hover:bg-danger/15"><RotateCcw className="size-3.5" aria-hidden="true" /></Link>}
            </li>
          );
        })}
      </ul>
      {action && (
        <Link href={action.href} className="flex h-10 items-center justify-center gap-1.5 border-t border-hair bg-tint/50 text-body font-bold text-brand-deep transition-colors hover:bg-tint">
          <action.icon className="size-4" aria-hidden="true" />{action.label}
        </Link>
      )}
      {!action && g.state === "waiting" && <Text size="caption" tone="subtle" className="border-t border-hair px-3.5 py-2">Go back over the lessons; retries open after {c.settings.cooldownHours} hours.</Text>}
      {!action && g.state === "out" && <Text size="caption" tone="subtle" className="border-t border-hair px-3.5 py-2">Out of tries on a situation. Your manager can reset it.</Text>}
    </li>
  );
}
