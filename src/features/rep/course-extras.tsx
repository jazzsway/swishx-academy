"use client";

import { Children, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Award, Briefcase, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Film, Headphones, History, Image as ImageIcon, Lock, Mic, Pill, Presentation, Sparkles, Stethoscope, Syringe, TrendingUp, Trophy, Zap, UserRound } from "lucide-react";
import { useApp } from "@/store/app-store";
import { Sheet } from "@/components/ui/sheet";
import { lookForsOf } from "@/lib/objectives";
import { materialOptional, noMaterial } from "@/lib/direct-material";
import { fileLength } from "@/features/media/file-view";
import { modulesOf } from "./use-rep";
import { cn } from "@/lib/cn";
import { allScenarios } from "@/data/scenarios";
import { CHARACTERS, characterOf, screeningOf } from "@/lib/scenario-set";
import { callPlan, coverageOf, scenarioStatus, type ObjectivePlanState, type PlannedCall } from "./situations";
import { PracticeCallTabs } from "./session-replay";
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

/* Each kind of file has its own tile colour, so a list of lessons reads at a glance. */
const KIND: Record<string, { label: string; icon: typeof Mic; tile: string }> = {
  video: { label: "Video", icon: Film, tile: "bg-peach-bg text-brand-deep" }, audio: { label: "Audio", icon: Headphones, tile: "bg-lilac-bg text-accent-violet" },
  image: { label: "Image", icon: ImageIcon, tile: "bg-sage-bg text-ok" }, slides: { label: "Slides", icon: Presentation, tile: "bg-lilac-bg text-accent-violet" },
  pdf: { label: "PDF", icon: FileText, tile: "bg-sun-bg text-warn" }, doc: { label: "Document", icon: FileText, tile: "bg-sun-bg text-warn" },
  data: { label: "File", icon: FileText, tile: "bg-subtle text-ink-2" }, other: { label: "File", icon: FileText, tile: "bg-subtle text-ink-2" },
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
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-micro font-bold",
    tone === "ok" ? "bg-sage-bg text-ok" : tone === "danger" ? "bg-danger-bg text-danger" : tone === "warn" ? "bg-sun-bg text-warn" : tone === "brand" ? "bg-tint text-brand-deep" : "bg-subtle text-ink-3")}>{children}</span>;
}

/** One stage of the journey: a numbered marker on the rail, its title and status, then its content. */
/* Only the stage you're on is open; the others fold to one line with a short summary, and open on a tap. */
function Stage({ n, title, status, done, current, locked, last, summary, children }: { n: number; title: string; status?: React.ReactNode; done?: boolean; current?: boolean; locked?: boolean; last?: boolean; summary?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(!!current);
  useEffect(() => { if (current) setOpen(true); }, [current]);
  /* false/null children (a stage with nothing to show yet) don't count. */
  const hasBody = Children.toArray(children).length > 0;
  const canFold = hasBody && !current;
  return (
    <li className={cn("flex flex-col gap-3 rounded-card p-4 transition-shadow", current ? "bg-card shadow-soft ring-2 ring-tint-line" : locked ? "bg-card/55" : "bg-card shadow-hair")} data-last={last || undefined}>
      <div className={cn("flex items-center gap-3", canFold && "cursor-pointer")} onClick={canFold ? () => setOpen(!open) : undefined}
        role={canFold ? "button" : undefined} tabIndex={canFold ? 0 : undefined} aria-expanded={canFold ? open : undefined}
        onKeyDown={canFold ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(!open); } } : undefined}>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-body font-extrabold",
          done ? "bg-sage text-white" : current ? "bg-cta text-white" : "bg-subtle text-ink-4")}>
          {done ? <Check className="size-5" aria-hidden="true" /> : locked ? <Lock className="size-4" aria-hidden="true" /> : n}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text as="h3" size="subhead" weight="extrabold" className={cn(locked && "text-ink-3")}>{title}</Text>
          {summary && !open && <Text size="caption" tone="subtle" truncate>{summary}</Text>}
        </span>
        {status}
        {canFold && <ChevronDown className={cn("size-4 shrink-0 text-ink-4 transition-transform", open && "rotate-180")} aria-hidden="true" />}
      </div>
      {hasBody && open && <div className="flex flex-col gap-2.5">{children}</div>}
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
  const practice = useApp((x) => x.practice);
  /* Back from a practice call on an objective (?ob=…): that objective opens again, with its new coverage. */
  const openOb = useSearchParams().get("ob");
  const mods = modulesOf(c);
  const base = `/rep/course/${c.id}`;
  const practiceOnly = p.mode === "practice";
  /* Optional material (set in the training's settings): on hand to look through, not a step, and it doesn't hold the assessments back. */
  const optionalMaterial = materialOptional(c, p);
  const certified = p.state === "certified";
  const screens = c.settings.screening && !practiceOnly;
  const run = scenarioStatus(c, p);
  const screen = screeningOf(c, run.scs);
  const part = p.screeningPart ?? [];
  const screened = !!p.screening;
  const pathIds = p.path?.moduleIds;
  const needed = practiceOnly || noMaterial(c) ? [] : screened && pathIds ? mods.filter((m) => pathIds.includes(m.id)) : mods;
  const skipped = screened && pathIds && !noMaterial(c) ? mods.filter((m) => !pathIds.includes(m.id)) : [];
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
  /* The stages in order, for the overview: which are done and which one you're on. */
  const stages = [
    ...(screens && screen.length > 0 ? [{ t: "Screening", done: screened }] : []),
    ...(!practiceOnly && !optionalMaterial && needed.length > 0 ? [{ t: "Materials", done: filesDone }] : []),
    ...(plan.objectives.length > 0 ? [{ t: "Practice", done }] : []),
    { t: "Certified", done: certified },
  ];
  const at = stages.findIndex((x) => !x.done);
  /* The level map: every step a node; objectives fill with practice coverage until their final is passed. */
  type Node = { key: string; kind: "screen" | "files" | "ob" | "cert"; done: boolean; pct: number; label: string; n?: number };
  const obCovs = plan.objectives.map((o) => coverageOf(c, p.userId, o.bank, practice));
  const obCov = obCovs.map((x) => x.pct);
  const nodes: Node[] = [
    ...(screens && screen.length > 0 ? [{ key: "screen", kind: "screen" as const, done: screened, pct: screened ? 100 : 0, label: screened ? `Screening done, baseline ${p.screening!.overall}` : "Screening call" }] : []),
    ...(!practiceOnly && !optionalMaterial && needed.length > 0 ? [{ key: "files", kind: "files" as const, done: filesDone, pct: needed.length ? Math.round((lessonsDone / needed.length) * 100) : 0, label: `Materials, ${lessonsDone} of ${needed.length}` }] : []),
    ...plan.objectives.map((o, k) => ({ key: o.ob?.id ?? `ob${k}`, kind: "ob" as const, n: k + 1, done: o.state === "passed", pct: obCov[k], label: `Objective ${k + 1}: ${o.state === "passed" ? "passed" : `${obCov[k]}% covered`}` })),
    { key: "cert", kind: "cert" as const, done: certified, pct: certified ? 100 : 0, label: certified ? "Certified" : "Certificate" },
  ];
  const cur = nodes.findIndex((x) => !x.done);
  /* Overall: each node counts the same; an objective's practice gets it halfway, its final the rest. */
  const overall = Math.round((nodes.reduce((sum, x) => sum + (x.done ? 1 : x.kind === "ob" ? x.pct / 200 : x.kind === "files" ? x.pct / 100 : 0), 0) / nodes.length) * 100);
  const curNode = nodes[cur];
  const left = curNode?.kind === "ob" ? obCovs[(curNode.n ?? 1) - 1].total - obCovs[(curNode.n ?? 1) - 1].covered : 0;
  const hint = !curNode ? "Every step done. You're certified."
    : curNode.kind === "screen" ? "Take a 3-minute call to set your baseline. It isn't graded."
    : curNode.kind === "files" ? `Finish ${needed.length - lessonsDone} more material${needed.length - lessonsDone === 1 ? "" : "s"} to open practice.`
    : curNode.kind === "cert" ? "Every objective passed. Collect your certificate."
    : curNode.pct >= 100 ? `Objective ${curNode.n}'s final assessment is unlocked. Take it when you're ready.`
    : `Practise ${left} more situation${left === 1 ? "" : "s"} to unlock Objective ${curNode.n}'s final assessment.`;

  return (
    <section className="flex flex-col gap-3" aria-label="Your journey">
      {/* Where you are, compact and for any number of objectives: the steps before practice as icons, one
          segment per objective (filling with practice coverage, solid once its final is passed), then the certificate. */}
      <div className="relative flex flex-col gap-3 overflow-hidden rounded-card bg-sage p-4 text-white shadow-soft">
        <div className="drift pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-white/15 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-caption font-bold text-white/85">{at < 0 ? "All done" : `Step ${at + 1} of ${stages.length} · ${stages[at].t}`}</span>
          {screened && <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-1 text-micro font-bold">Baseline {p.screening!.overall}</span>}
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-micro font-extrabold tabular-nums text-sage"><Zap className="size-3 fill-current" aria-hidden="true" />{overall}%</span>
        </div>
        <span className="relative text-title font-extrabold leading-tight tracking-tight">{at < 0 ? "You're certified" : at === stages.length - 1 && done ? "Get your certificate" : stages[at].t === "Screening" ? "Start with a short call" : stages[at].t === "Materials" ? "Go through the materials" : stages[at].t === "Practice" ? "Practise each objective" : "Get certified"}</span>
        <div className="relative flex items-center gap-1.5" role="img" aria-label={nodes.map((x) => x.label).join(". ")}>
          {nodes.filter((x) => x.kind === "screen" || x.kind === "files").map((x) => (
            <span key={x.key} className={cn("grid size-6 shrink-0 place-items-center rounded-full", x.done ? "bg-white text-sage" : nodes[cur] === x ? "now-glow bg-white/30" : "bg-white/20")}>
              {x.done ? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" /> : x.kind === "screen" ? <Mic className="size-3" aria-hidden="true" /> : <FileText className="size-3" aria-hidden="true" />}
            </span>
          ))}
          <span className="flex min-w-0 flex-1 gap-[3px]">
            {nodes.filter((x) => x.kind === "ob").map((x) => (
              <span key={x.key} className={cn("relative h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/20", nodes[cur] === x && "ring-2 ring-white/70 ring-offset-1 ring-offset-sage")}>
                <span className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700", x.done ? "bg-white" : "bg-white/55")} style={{ width: `${x.done ? 100 : x.pct}%` }} />
              </span>
            ))}
          </span>
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", certified ? "bg-white text-sage" : "bg-white/20")}><Trophy className="size-3.5" aria-hidden="true" /></span>
        </div>
        <div className="relative flex items-start gap-2 text-caption font-semibold leading-snug">
          <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 text-white/95">{hint}</span>
          {plan.objectives.length > 0 && <span className="shrink-0 tabular-nums text-white/80">{passedObs}/{plan.objectives.length} passed</span>}
        </div>
      </div>
      <ol className="flex flex-col gap-3">
        {screens && screen.length > 0 && (
          <Stage n={++n} title="Screening call" done={screened} current={!screened} summary={screened ? `Baseline ${p.screening!.overall}` : "3 min · not graded"}
            status={screened ? <Pill_ tone="ok">Baseline {p.screening!.overall}</Pill_> : part.length ? <Pill_ tone="warn">Paused · {part.length} of {screen.length}</Pill_> : <Pill_ tone="brand">Up next</Pill_>}>
            <div className="flex items-center gap-3 rounded-panel bg-subtle/70 p-3">
              <span className="flex -space-x-2">{screen.map((x) => { const I = ROLE[characterOf(x)]; return <span key={x.id} className="grid size-10 place-items-center rounded-full border-2 border-card bg-peach text-white"><I className="size-4.5" aria-hidden="true" /></span>; })}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <Text size="body" weight="semibold" truncate>{screen.map((x) => x.persona.name.replace(/,.*$/, "")).join(" and ")}</Text>
                <Text size="caption" tone="subtle">{screened ? (optionalMaterial || !needed.length && !skipped.length ? "Baseline set" : skipped.length ? `Skips ${skipped.length} lesson${skipped.length === 1 ? "" : "s"} you know` : "Every lesson stays") : part.length ? `${part.length} of ${screen.length} done · saved` : "3 min · not graded"}</Text>
              </span>
              {screened
                ? <Link href={`${base}/results`} className="shrink-0 text-caption font-bold text-brand-deep hover:underline">Results</Link>
                : <Link href={`${base}/screening`} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-cta px-4 text-body font-bold text-white"><Mic className="size-4" aria-hidden="true" />{part.length ? "Resume" : "Start"}</Link>}
            </div>
          </Stage>
        )}

        {/* Mandatory material is a step between screening and the assessments. None, or optional: no step here. */}
        {!practiceOnly && !optionalMaterial && needed.length > 0 && (
          <Stage n={++n} title="Materials" done={filesDone && needed.length > 0} current={!waitScreen && !filesDone} locked={waitScreen} summary={`${needed.length} file${needed.length === 1 ? "" : "s"} to go through`}
            status={waitScreen ? <Pill_ tone="muted">After screening</Pill_> : <Pill_ tone={filesDone ? "ok" : "muted"}>{lessonsDone} of {needed.length} done</Pill_>}>
            <ul className="flex flex-col gap-1.5">
              {needed.map((m) => {
                const meta = fileMeta(m);
                const done = isDone(m);
                const cur = !waitScreen && m.id === nextFile?.id;
                const body = (
                  <>
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-[14px]", done ? "bg-sage text-white" : meta.tile)}>{done ? <Check className="size-5" aria-hidden="true" /> : <meta.icon className="size-5" aria-hidden="true" />}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <Text size="body" weight="semibold" truncate className={done ? "text-ink-2" : undefined}>{m.title}</Text>
                      <Text size="caption" tone="subtle" truncate>{meta.label} · {meta.len}</Text>
                    </span>
                    {cur ? <Pill_ tone="brand">{p.completedBlocks.some((b) => m.blocks.some((x) => x.id === b)) ? "Continue" : "Next"}</Pill_> : !waitScreen && <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />}
                  </>
                );
                return (
                  <li key={m.id}>
                    {waitScreen
                      ? <div className="flex items-center gap-3 rounded-panel p-1.5 opacity-70">{body}</div>
                      : <Link href={`${base}/learn?module=${m.id}`} className={cn("flex items-center gap-3 rounded-panel p-1.5 transition-colors hover:bg-subtle", cur && "bg-tint/60")}>{body}</Link>}
                  </li>
                );
              })}
            </ul>
            {skipped.length > 0 && <Text size="caption" tone="subtle">Skipped, you already know: {skipped.map((m) => m.title).join(", ")}. <Link href={`${base}/learn?module=${skipped[0].id}&optional=1`} className="font-semibold text-brand-deep hover:underline">Open anyway</Link></Text>}
          </Stage>
        )}

        {plan.objectives.length > 0 && (
          <Stage n={++n} title="Practice and complete" done={done} current={!callsLocked && !done} locked={callsLocked} summary={`${plan.objectives.length} objective${plan.objectives.length === 1 ? "" : "s"} · practise, then the final`}
            status={callsLocked ? <Pill_ tone="muted">{optionalMaterial || !needed.length ? "After screening" : "After the materials"}</Pill_> : <Pill_ tone={done ? "ok" : "muted"}><span className="tabular-nums" aria-label={`${passedObs} of ${plan.objectives.length} objectives complete`}>{passedObs}/{plan.objectives.length}</span></Pill_>}>
            {/* The rules, as chips rather than a sentence. */}
            <div className="flex flex-wrap gap-1.5">
              {[`Pass ${c.settings.passRoleplay}`, `${c.settings.attempts} ${c.settings.attempts === 1 ? "try" : "tries"} each`, ...(c.settings.finalNoHints === false ? ["Hints on"] : [])].map((x) => (
                <span key={x} className="rounded-full bg-subtle px-2.5 py-1 text-micro font-bold text-ink-2">{x}</span>
              ))}
            </div>
            {/* One assessment per objective. A tap shows what to expect: the objective, who you'll meet, what counts, and its situations. */}
            <ul className="flex flex-col gap-2" aria-label="Your objectives">
              {plan.objectives.map((o, i) => <ObjectiveTile key={o.ob?.id ?? "loose"} c={c} p={p} o={o} i={i} total={plan.objectives.length} locked={callsLocked} startOpen={!!o.ob && openOb === o.ob.id} lockNote={optionalMaterial || !needed.length ? "Opens after your screening call" : "Opens after the materials"} />)}
            </ul>
            {/* v1-hidden: one call per person, covering several objectives (CallCard, callsOf). Each objective is now its own assessment. */}
          </Stage>
        )}

        {/* Optional material: not a step. It sits just above the certificate, to look through any time. */}
        {!practiceOnly && optionalMaterial && mods.length > 0 && (
          <Stage n={++n} title="Materials" summary={`${mods.length} file${mods.length === 1 ? "" : "s"} · any time`} status={<Pill_ tone="muted">Optional</Pill_>}>
            <Text size="caption" tone="subtle" className="-mt-1">Look through any of it, any time. It isn&apos;t a step, and practice doesn&apos;t wait for it.</Text>
            <ul className="flex flex-col gap-1.5">
              {mods.map((m) => {
                const meta = fileMeta(m);
                const seen = isDone(m);
                return (
                  <li key={m.id}>
                    <Link href={`${base}/learn?module=${m.id}`} className="squircle flex items-center gap-3 rounded-panel p-1.5 transition-colors hover:bg-subtle">
                      <span className={cn("grid size-11 shrink-0 place-items-center rounded-[14px]", seen ? "bg-sage text-white" : meta.tile)}>{seen ? <Check className="size-5" aria-hidden="true" /> : <meta.icon className="size-5" aria-hidden="true" />}</span>
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
          </Stage>
        )}

        <Stage n={++n} title="Certified" last done={certified} current={done && !certified} locked={!done && !certified}
          status={certified ? <Pill_ tone="ok">Done</Pill_> : done ? <Pill_ tone="brand">Ready</Pill_> : undefined}>
          {(certified || done) && <Text size="caption" tone="subtle" className="-mt-1">{certified ? "It's on your record." : "Every objective passed. Your certificate is ready."}</Text>}
          {done && !certified && <Link href={`${base}/attest`} className="flex h-11 items-center justify-center gap-1.5 self-start rounded-full bg-cta px-5 text-body font-bold text-white"><Award className="size-4" aria-hidden="true" />Get your certificate</Link>}
        </Stage>
      </ol>

    </section>
  );
}

const OB_STATUS: Record<ObjectivePlanState, { label: string; tone: "ok" | "danger" | "warn" | "brand" | "muted" }> = {
  todo: { label: "Not started", tone: "muted" }, started: { label: "In progress", tone: "brand" }, passed: { label: "Passed", tone: "ok" },
  retry: { label: "Retry", tone: "danger" }, waiting: { label: "Retry later", tone: "warn" }, out: { label: "No tries left", tone: "danger" },
};
type Plan = ReturnType<typeof callPlan>;

/**
 * One objective, to practise and complete. Practice calls cover its situations one by one (each finished
 * call covers its situation); at 100% coverage the final assessment opens, scored on a situation drawn for
 * the rep. The sheet shows what the objective is about, the coverage, the two ways in, and the past
 * practice calls, each with its score, coverage, a recording and its transcript.
 */
function ObjectiveTile({ c, p, o, i, total, locked, lockNote, startOpen }: { c: Course; p: Progress; o: Plan["objectives"][number]; i: number; total: number; locked: boolean; lockNote: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  /* Coming back to the training on this objective (?ob=…) opens it. After mount, not on the first render:
     sheets portal into the device's overlay layer, which only exists on the client. */
  useEffect(() => { if (startOpen) setOpen(true); }, [startOpen]);
  /* Past practice opens in its own drawer: the list of calls, or one call. */
  const [hist, setHist] = useState<string | null>(null);
  const practice = useApp((x) => x.practice);
  const base = `/rep/course/${c.id}`;
  const st = c.settings;
  const cov = coverageOf(c, p.userId, o.bank, practice);
  const sc = o.next[0] ?? o.tested ?? o.bank[0];
  const people = [...new Set(o.bank.map(characterOf))];
  const I = ROLE[characterOf(sc)];
  const passed = o.state === "passed";
  /* The final opens once every situation has been practised (or if it's been taken already). */
  const finalOpen = cov.pct >= 100 || o.state !== "todo";
  const canFinal = !locked && finalOpen && ["todo", "started", "retry"].includes(o.state) && o.next.length > 0;
  const status = OB_STATUS[o.state];
  const when = o.retryAt?.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
  const note = o.state === "waiting" ? `You can retry the final from ${when}` : o.state === "out" ? "No tries left on the final. Your manager can reset it" : o.state === "retry" ? `${o.triesLeft} ${o.triesLeft === 1 ? "try" : "tries"} left on the final` : undefined;
  const final = `${base}/assessment?call=${characterOf(o.next[0] ?? sc)}${o.ob ? `&ob=${o.ob.id}` : ""}`;
  const practise = `/rep/practice/call?scenario=${cov.next.id}&course=${c.id}${o.ob ? `&ob=${o.ob.id}` : ""}`;
  const title = o.ob?.title ?? "More situations";
  const looks = o.ob ? lookForsOf(o.ob) : [];
  const session = cov.sessions.find((x) => x.id === hist);
  const close = () => { setOpen(false); setHist(null); };
  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, "0")}`;
  const day = (iso: string) => new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <li>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className={cn("flex w-full items-center gap-3 rounded-panel p-3.5 text-left transition-colors", passed ? "bg-sage-bg" : !locked ? "bg-tint/70 hover:bg-tint" : "bg-subtle/70 hover:bg-subtle")}>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-white", passed ? "bg-sage" : !locked ? "bg-peach" : "bg-lilac")}>
          {passed ? <Check className="size-5" aria-hidden="true" /> : <I className="size-5" aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-micro font-bold uppercase tracking-wider text-ink-3">Objective {i + 1}</span>
          <Text size="body" weight="bold" className="leading-snug">{title}</Text>
          {passed ? <Text size="caption" tone="subtle">Final passed{o.tested ? ` · ${p.scenarioRuns?.[o.tested.id]?.score ?? ""}` : ""}</Text> : (
            <span className="flex items-center gap-2">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.07]"><span className="block h-full rounded-full bg-brand" style={{ width: `${cov.pct}%` }} /></span>
              <span className="shrink-0 text-caption font-semibold tabular-nums text-ink-3">{cov.pct}% covered</span>
            </span>
          )}
        </span>
        {passed ? <Pill_ tone="ok">Done</Pill_> : o.state !== "todo" ? <Pill_ tone={status.tone}>{status.label}</Pill_> : finalOpen && !locked ? <Pill_ tone="brand">Final ready</Pill_> : locked ? <Lock className="size-4 shrink-0 text-ink-4" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />}
      </button>

      <Sheet open={open && !hist} onClose={close} label={title}
        title={<span className="flex flex-col gap-1"><span className="text-micro font-bold uppercase tracking-wider text-ink-3">Objective {i + 1} of {total}</span><span className="text-title font-extrabold leading-snug text-ink">{title}</span></span>}
        footer={passed
          ? <div className="flex w-full flex-col gap-2">
              {o.tested && <Link href={`${base}/assessment?report=${o.tested.id}`} className="flex h-12 w-full items-center justify-center rounded-full bg-cta text-body-lg font-bold text-white">See your final</Link>}
              <Link href={practise} className="flex h-11 w-full items-center justify-center gap-2 rounded-full text-body font-bold text-ink-2 hover:bg-subtle"><Mic className="size-4" aria-hidden="true" />Practise again</Link>
            </div>
          : locked
            ? <span aria-disabled="true" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-subtle text-body-lg font-bold text-ink-4"><Lock className="size-4" aria-hidden="true" />{lockNote}</span>
            : <div className="flex w-full flex-col gap-2">
                {/* Practice first; the final joins (and leads) once every situation is covered. */}
                {canFinal && <Link href={final} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-body-lg font-bold text-white"><Award className="size-4.5" aria-hidden="true" />{o.state === "retry" ? "Retry the final assessment" : "Take the final assessment"}</Link>}
                <Link href={practise} className={cn("flex w-full items-center justify-center gap-2 rounded-full font-bold", canFinal ? "h-11 text-body text-ink-2 hover:bg-subtle" : "h-12 bg-cta text-body-lg text-white")}><Mic className="size-4.5" aria-hidden="true" />{cov.pct >= 100 ? "Practise again" : cov.covered ? "Keep practising" : "Start practising"}</Link>
                {!canFinal && <span aria-disabled="true" className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-subtle text-body font-bold text-ink-4"><Lock className="size-4" aria-hidden="true" />{note ?? `Final assessment · opens at 100%`}</span>}
              </div>}>

        {(
          <div className="flex flex-col gap-5 pb-2">
            {o.ob?.description && <Text size="body" tone="muted" className="leading-relaxed">{o.ob.description}</Text>}

            {/* Coverage: the situations practised, towards the final. */}
            <section className="flex flex-col gap-2.5 rounded-[20px] bg-subtle/70 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-caption font-bold uppercase tracking-wider text-ink-3">Coverage</span>
                <span className="text-title font-extrabold tabular-nums text-ink">{cov.pct}%</span>
              </div>
              <div className="flex gap-1.5" aria-hidden="true">
                {Array.from({ length: cov.total }, (_, k) => <span key={k} className={cn("h-2 flex-1 rounded-full", k < cov.covered ? "bg-brand" : "bg-black/[0.08]")} />)}
              </div>
              <Text size="caption" tone="subtle">{passed ? "Final passed. Practise any time to stay sharp." : cov.pct >= 100 ? "Coverage complete. The final assessment is open." : "Practise to complete your coverage and unlock the final assessment."}</Text>
            </section>

            {/* Past practice: opens its own list, each call with its score, coverage, recording and transcript. */}
            <button type="button" onClick={() => setHist("list")} disabled={!cov.sessions.length}
              className="flex items-center gap-3 rounded-[20px] bg-card p-3.5 text-left shadow-hair ring-1 ring-hair transition-colors hover:bg-subtle disabled:opacity-60">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-lilac text-white"><History className="size-4.5" aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body font-bold text-ink">Past practice sessions</span>
                <span className="text-caption text-ink-3">{cov.sessions.length ? `${cov.sessions.length} call${cov.sessions.length === 1 ? "" : "s"} · last ${day(cov.sessions[0].at)}` : "No practice calls yet"}</span>
              </span>
              {cov.sessions.length > 0 && <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />}
            </button>

            <div className="flex flex-wrap gap-1.5">
              {[`Final: pass ${st.passRoleplay}`, `${st.attempts} ${st.attempts === 1 ? "try" : "tries"}`, st.finalNoHints === false ? "Hints on" : "No hints", "Practice isn't graded"].map((x) => (
                <span key={x} className="rounded-full bg-subtle px-2.5 py-1 text-micro font-bold text-ink-2">{x}</span>
              ))}
            </div>
            {note && !passed && <div className="rounded-panel bg-sun-bg px-3.5 py-3 text-body font-semibold text-warn">{note}.</div>}

            <section className="flex flex-col gap-2">
              <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">Who you&apos;ll meet</Text>
              <div className="flex flex-wrap gap-2">
                {people.map((k) => { const R = ROLE[k]; return <span key={k} className="flex items-center gap-2 rounded-full bg-subtle py-1 pl-1 pr-3 text-body font-semibold text-ink-2"><span className="grid size-7 place-items-center rounded-full bg-peach text-white"><R className="size-3.5" aria-hidden="true" /></span>{CHARACTERS[k].label}</span>; })}
              </div>
            </section>

            {looks.length > 0 && (
              <section className="flex flex-col gap-2">
                <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">What counts</Text>
                <ul className="flex flex-col gap-1.5">
                  {looks.map((x) => <li key={x} className="flex items-start gap-2 text-body text-ink-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />{x}</li>)}
                </ul>
              </section>
            )}

          </div>
        )}

      </Sheet>

      {/* Past practice sessions: a drawer of its own, the same height for the list and for one call. */}
      <Sheet open={open && !!hist} onClose={close} className="h-[88%]" label="Past practice sessions"
        title={<span className="flex flex-col gap-1">
          <button type="button" onClick={() => setHist(hist === "list" ? null : "list")} className="flex items-center gap-1 self-start text-caption font-bold text-ink-3 hover:text-ink"><ChevronLeft className="size-3.5" aria-hidden="true" />{hist === "list" ? "Objective" : "Past practice sessions"}</button>
          <span className="text-title font-extrabold leading-snug text-ink">{session ? (allScenarios().find((x) => x.id === session.setup?.scenarioId)?.title ?? session.title) : "Past practice sessions"}</span>
        </span>}>
        {hist === "list" && (
          <ul className="flex flex-col gap-2 pb-2">
            {cov.sessions.map((x) => {
              const sit = allScenarios().find((y) => y.id === x.setup?.scenarioId);
              const R = ROLE[sit ? characterOf(sit) : "doctor"];
              const score = x.result?.score ?? 0;
              /* A call where the rep said nothing: kept, but it covers nothing and has no score. */
              const empty = !x.result?.transcript.some((t) => t.speaker === "rep");
              return (
                <li key={x.id}>
                  <button type="button" onClick={() => setHist(x.id)} className="flex w-full items-center gap-3 rounded-[20px] bg-card p-3 text-left shadow-hair ring-1 ring-hair hover:bg-subtle">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle text-ink-2"><R className="size-4.5" aria-hidden="true" /></span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="truncate text-body font-bold text-ink">{sit?.title ?? x.title}</span>
                      <span className="text-caption text-ink-3">{day(x.at)} · {mmss(x.result?.durationSec ?? 0)} · {empty ? "nothing said, doesn't count" : `coverage ${cov.after.get(x.id) ?? 0}%`}</span>
                    </span>
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-body font-extrabold tabular-nums", empty ? "bg-subtle text-ink-4" : score >= st.passRoleplay ? "bg-sage-bg text-ok" : "bg-peach-bg text-brand-deep")}>{empty ? "–" : score}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {session?.result && (
          <div className="flex flex-col gap-3 pb-2">
            <span className="text-caption text-ink-3">{day(session.at)} · {session.result.transcript.some((t) => t.speaker === "rep") ? `coverage ${cov.after.get(session.id) ?? 0}% after this call` : "nothing said, doesn't count"}</span>
            <PracticeCallTabs x={session} />
          </div>
        )}
      </Sheet>
    </li>
  );
}

/* v1-hidden: the assessment tile, before practice and coverage. */
/**
 * One objective's assessment: a call with one person, on one of the objective's situations (drawn for the
 * rep), or on each of them when the training scores them all. The tile says where it stands; a tap opens
 * a sheet with what to expect before starting: the objective, who they'll meet, what counts, and the
 * situations it can be.
 */
function AssessmentTile({ c, p, o, i, total, locked, lockNote }: { c: Course; p: Progress; o: Plan["objectives"][number]; i: number; total: number; locked: boolean; lockNote: string }) {
  const [open, setOpen] = useState(false);
  const base = `/rep/course/${c.id}`;
  const st = c.settings;
  const all = (st.situationsPerObjective ?? "one") === "all" || !o.ob;
  const sc = o.next[0] ?? o.tested ?? o.bank[0];
  const people = [...new Set(o.bank.map(characterOf))];
  const I = ROLE[characterOf(sc)];
  const passed = o.state === "passed";
  const live = !locked && ["todo", "started", "retry"].includes(o.state) && o.next.length > 0;
  const min = all ? o.bank.reduce((a, x) => a + x.durationMin, 0) : Math.max(3, sc.durationMin);
  const status = OB_STATUS[o.state];
  const when = o.retryAt?.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
  const note = o.state === "waiting" ? `You can retry from ${when}. Go back over the material first.` : o.state === "out" ? "No tries left. Your manager can reset it." : o.state === "retry" ? `${o.triesLeft} ${o.triesLeft === 1 ? "try" : "tries"} left${all || o.bank.length < 2 ? "" : ". Your retry is a different situation"}` : undefined;
  const start = `${base}/assessment?call=${characterOf(o.next[0] ?? sc)}${o.ob ? `&ob=${o.ob.id}` : ""}`;
  const title = o.ob?.title ?? "More situations";
  const looks = o.ob ? lookForsOf(o.ob) : [];
  return (
    <li>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className={cn("flex w-full items-center gap-3 rounded-panel p-3.5 text-left transition-colors", live ? "bg-tint/70 hover:bg-tint" : passed ? "bg-sage-bg" : "bg-subtle/70 hover:bg-subtle")}>
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-white", passed ? "bg-sage" : live ? "bg-peach" : "bg-lilac")}>
          {passed ? <Check className="size-5" aria-hidden="true" /> : <I className="size-5" aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-micro font-bold uppercase tracking-wider text-ink-3">Assessment {i + 1}</span>
          <Text size="body" weight="bold" className="leading-snug">{title}</Text>
          <Text size="caption" tone="subtle">{people.map((k) => CHARACTERS[k].label).join(" or ")} · about {min} min{note ? ` · ${note}` : ""}</Text>
        </span>
        {o.state !== "todo" ? <Pill_ tone={status.tone}>{status.label}</Pill_> : locked ? <Lock className="size-4 shrink-0 text-ink-4" aria-hidden="true" /> : <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />}
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} label={title}
        title={<span className="flex flex-col gap-1"><span className="text-micro font-bold uppercase tracking-wider text-ink-3">Assessment {i + 1} of {total}</span><span className="text-title font-extrabold leading-snug text-ink">{title}</span></span>}
        footer={passed
          ? (o.tested && <Link href={`${base}/assessment?report=${o.tested.id}`} className="flex h-12 w-full items-center justify-center rounded-full bg-cta text-body-lg font-bold text-white">See your report</Link>)
          : live
            ? <Link href={start} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-cta text-body-lg font-bold text-white"><Mic className="size-4.5" aria-hidden="true" />{o.state === "retry" ? "Retry the call" : "Start the call"}</Link>
            : <span aria-disabled="true" className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-subtle text-body-lg font-bold text-ink-4"><Lock className="size-4" aria-hidden="true" />{locked ? lockNote : note ?? "Not open yet"}</span>}>
        <div className="flex flex-col gap-5 pb-2">
          {o.ob?.description && <Text size="body" tone="muted" className="leading-relaxed">{o.ob.description}</Text>}
          <div className="flex flex-wrap gap-1.5">
            {[`About ${min} min`, `Pass ${st.passRoleplay}`, `${st.attempts} ${st.attempts === 1 ? "try" : "tries"}`, st.finalNoHints === false ? "Hints on" : "No hints"].map((x) => (
              <span key={x} className="rounded-full bg-subtle px-2.5 py-1 text-micro font-bold text-ink-2">{x}</span>
            ))}
          </div>
          {passed && <div className="rounded-panel bg-sage-bg px-3.5 py-3 text-body font-semibold text-ok">Passed{o.tested ? ` with “${o.tested.title}”` : ""}.</div>}
          {note && !passed && <div className="rounded-panel bg-sun-bg px-3.5 py-3 text-body font-semibold text-warn">{note}.</div>}

          <section className="flex flex-col gap-2">
            <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">Who you&apos;ll meet</Text>
            <div className="flex flex-wrap gap-2">
              {people.map((k) => { const R = ROLE[k]; return <span key={k} className="flex items-center gap-2 rounded-full bg-subtle py-1 pl-1 pr-3 text-body font-semibold text-ink-2"><span className="grid size-7 place-items-center rounded-full bg-peach text-white"><R className="size-3.5" aria-hidden="true" /></span>{CHARACTERS[k].label}</span>; })}
            </div>
          </section>

          {looks.length > 0 && (
            <section className="flex flex-col gap-2">
              <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">What counts</Text>
              <ul className="flex flex-col gap-1.5">
                {looks.map((x) => <li key={x} className="flex items-start gap-2 text-body text-ink-2"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />{x}</li>)}
              </ul>
            </section>
          )}

          {/* v1-hidden: the objective's situations listed. Reps see the objective and what counts; the
              situation is a surprise on the call, as it would be with a real HCP. */}
          <Text size="caption" tone="subtle">{all ? "Every situation is scored, one call each." : "The situation is picked for you when the call starts."}</Text>
        </div>
      </Sheet>
    </li>
  );
}

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
    <li className={cn("flex flex-col gap-3 rounded-panel p-3.5", live ? "bg-tint/70" : passed ? "bg-sage-bg" : "bg-subtle/70")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-white", passed ? "bg-sage" : live ? "bg-peach" : "bg-lilac")}>{passed ? <Check className="size-5" aria-hidden="true" /> : <I className="size-5" aria-hidden="true" />}</span>
        <span className="flex min-w-0 flex-1 flex-col">
          <Text size="body" weight="bold" truncate>Call {k + 1} · {host.persona.name.replace(/,.*$/, "")}</Text>
          <Text size="caption" tone="subtle">{CHARACTERS[call.key].label} · {n} objective{n === 1 ? "" : "s"} · about {call.minutes} min</Text>
        </span>
        {passed ? <Pill_ tone="ok">Passed</Pill_>
          : live ? <Link href={`/rep/course/${c.id}/assessment?call=${call.key}`} className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-cta px-4 text-body font-bold text-white"><Mic className="size-4" aria-hidden="true" />{retry ? "Retry" : "Start"}</Link>
          : <span aria-disabled="true" title={locked ? lockNote : undefined} className="flex h-10 shrink-0 cursor-not-allowed items-center gap-1.5 rounded-full bg-card px-4 text-body font-bold text-ink-4">{locked ? <Lock className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}Start</span>}
      </div>
      <ol className="flex flex-col gap-2 border-t border-hair pt-2.5">
        {call.items.map((x) => {
          const st = OB_STATUS[x.o.state];
          const when = x.o.retryAt?.toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" });
          const note = x.o.state === "waiting" ? `Retry from ${when}. Go back over the lessons first.` : x.o.state === "out" ? "No tries left. Your manager can reset it." : x.o.state === "retry" ? `${x.o.triesLeft} ${x.o.triesLeft === 1 ? "try" : "tries"} left` : undefined;
          return (
            <li key={x.sc.id} className="flex items-baseline gap-2 text-caption">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-micro font-extrabold tabular-nums text-brand-deep">{x.n + 1}</span>
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
