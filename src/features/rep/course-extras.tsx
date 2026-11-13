"use client";

import Link from "next/link";
import { Award, Check, ChevronRight, FileText, Film, Flag, Headphones, Image as ImageIcon, Lock, Mic, Presentation, TrendingUp } from "lucide-react";
import { useApp } from "@/store/app-store";
import { fileLength } from "@/features/media/file-view";
import { modulesOf, pathModules } from "./use-rep";
import { cn } from "@/lib/cn";
import { allScenarios } from "@/data/scenarios";
import type { Course, Module, Progress } from "@/data/types";
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
      <Text size="caption" tone="subtle">{practiceOnly ? "You're assigned practice only: skip the modules, rehearse as often as you like, then take the final test." : "Rehearse as often as you like before the final call. Choose assisted or unassisted when you start."}</Text>
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
        <Text size="body" tone="muted">Your trainer assigned this as practice: no modules to work through. Rehearse the call, then take the final test.</Text>
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

/**
 * A direct course, for the rep, as one journey: the training team's files, as they are, then
 * practice with the course's doctor, then the scored final call, then certified.
 */
export function DirectJourney({ c, p }: { c: Course; p: Progress }) {
  const s = useApp();
  const mods = modulesOf(c);
  const practiceOnly = p.mode === "practice";
  const sc = allScenarios().find((x) => x.id === (c.settings.assessmentScenarioId ?? c.scenarioIds[0]));
  /* Screening first: it decides which files this rep still needs. */
  const screens = c.settings.screening && !practiceOnly;
  const filesDone = practiceOnly || ((!screens || !!p.screening) && (p.path ? pathModules(p, c) : mods).every((m) => m.blocks.every((b) => p.completedBlocks.includes(b.id))));
  const practised = !!sc && s.practice.some((x) => x.userId === p.userId && x.title.startsWith(sc.title));
  const passed = !!p.attempts.at(-1)?.passed || p.state === "certified";
  const fails = p.attempts.filter((a) => !a.passed).length;
  const certified = p.state === "certified";
  const screened = !!p.screening;
  const pathIds = p.path?.moduleIds;
  const needed = screened && pathIds ? mods.filter((m) => pathIds.includes(m.id)) : mods;
  const skipped = screened && pathIds ? mods.filter((m) => !pathIds.includes(m.id)) : [];
  const nextFile = needed.find((m) => !m.blocks.every((b) => p.completedBlocks.includes(b.id)));

  type Step = { key: string; done: boolean; current?: boolean; locked?: boolean; href?: string; icon: React.ReactNode; title: string; sub: string; tag?: string };
  const steps: Step[] = [];
  if (screens && sc)
    steps.push(screened
      ? { key: "screen", done: true, href: `/rep/course/${c.id}/results`, icon: <Mic className="size-4" aria-hidden="true" />, title: `Screening call with ${sc.persona.name}`,
          sub: `Baseline ${p.screening!.overall} · ${skipped.length ? `you skip ${skipped.length} file${skipped.length === 1 ? "" : "s"}` : "every file stays in your path"}` }
      : { key: "screen", done: false, current: true, href: `/rep/course/${c.id}/screening`, icon: <Mic className="size-4" aria-hidden="true" />, title: `Screening call with ${sc.persona.name}`,
          sub: "About 5 min · not graded · decides which files you can skip" });
  if (practiceOnly) {
    steps.push({ key: "skip", done: true, icon: <FileText className="size-4" aria-hidden="true" />, title: `${mods.length} files`, sub: "Skipped: you're assigned practice only", tag: "Skipped" });
  } else {
    needed.forEach((m) => {
      const meta = fileMeta(m);
      const done = m.blocks.every((b) => p.completedBlocks.includes(b.id));
      const waiting = screens && !screened;
      steps.push({ key: m.id, done, current: !done && !waiting && m.id === nextFile?.id && p.state !== "not_started", href: waiting ? undefined : `/rep/course/${c.id}/learn?module=${m.id}`,
        icon: <meta.icon className="size-4" aria-hidden="true" />, title: m.title,
        sub: `File ${mods.indexOf(m) + 1} · ${meta.label} · ${meta.len}${m.required ? " · for everyone" : ""}${waiting ? " · after your screening" : ""}` });
    });
    if (skipped.length)
      steps.push({ key: "tested-out", done: true, icon: <FileText className="size-4" aria-hidden="true" />, title: `${skipped.length} file${skipped.length === 1 ? "" : "s"} skipped`,
        sub: `You already know this: ${skipped.map((m) => m.title).join(", ")}`, tag: "Tested out" });
  }
  if (sc && sc.use.includes("practice"))
    steps.push({ key: "practice", done: practised, current: filesDone && !practised && !passed, href: `/rep/practice/call?scenario=${sc.id}`,
      icon: <Mic className="size-4" aria-hidden="true" />, title: `Practise with ${sc.persona.name}`, sub: "Private · assisted or unassisted · as often as you like", tag: "Optional" });
  if (c.settings.completion.assessment && sc)
    steps.push({ key: "final", done: passed, current: filesDone && !passed && (practised || !sc.use.includes("practice")), locked: !filesDone, href: filesDone ? `/rep/course/${c.id}/assessment` : undefined,
      icon: <Flag className="size-4" aria-hidden="true" />, title: `Final call with ${sc.persona.name}`,
      sub: passed ? `Passed · ${p.attempts.filter((a) => a.passed).at(-1)?.overall ?? ""} out of 100` : `Scored · pass ${c.settings.passRoleplay} · ${c.settings.finalNoHints ? "no hints · " : ""}${Math.max(0, c.settings.attempts - fails)} of ${c.settings.attempts} attempts left` });
  steps.push({ key: "cert", done: certified, icon: <Award className="size-4" aria-hidden="true" />, title: "Certified", sub: certified ? "Done. It's on your record." : "Sign once you pass the call" });

  return (
    <section className="flex flex-col gap-2" aria-label="Your journey">
      <div className="flex items-baseline justify-between gap-3">
        <Text as="h2" size="subhead" weight="bold">Your journey</Text>
        <span className="flex items-center gap-1 rounded-chip bg-info-bg px-2 py-0.5 text-caption font-semibold text-info"><FileText className="size-3" aria-hidden="true" />Your team&apos;s files, as they are</span>
      </div>
      <ol className="relative flex flex-col">
        {steps.map((st, i) => {
          const last = i === steps.length - 1;
          const body = (
            <>
              <span className="relative flex flex-col items-center self-stretch">
                <span className={cn("relative z-10 grid size-9 shrink-0 place-items-center rounded-full border-2",
                  st.done ? "border-ok bg-ok text-white" : st.current ? "border-brand bg-brand text-white shadow-brand-lift" : st.locked ? "border-hair-2 bg-subtle text-ink-4" : "border-hair-2 bg-card text-ink-3")}>
                  {st.done ? <Check className="size-4" aria-hidden="true" /> : st.locked ? <Lock className="size-3.5" aria-hidden="true" /> : st.icon}
                </span>
                {!last && <span className={cn("w-0.5 flex-1", st.done ? "bg-ok/50" : "bg-hair-2")} aria-hidden="true" />}
              </span>
              <span className={cn("flex min-w-0 flex-1 flex-col pb-4 pt-1.5", st.current && "pb-5")}>
                <span className="flex items-center gap-2">
                  <span className={cn("truncate text-body-lg font-semibold", st.done ? "text-ink-2" : st.locked ? "text-ink-3" : "text-ink")}>{st.title}</span>
                  {st.tag && <span className="shrink-0 rounded-glyph bg-subtle px-1.5 text-micro font-bold text-ink-3">{st.tag}</span>}
                  {st.current && <span className="shrink-0 rounded-glyph bg-tint px-1.5 text-micro font-bold text-brand-deep">Up next</span>}
                </span>
                <span className="text-caption text-ink-3">{st.sub}</span>
              </span>
              {st.href && !st.locked && <ChevronRight className="mt-2.5 size-4 shrink-0 text-ink-4" aria-hidden="true" />}
            </>
          );
          return (
            <li key={st.key}>
              {st.href && !st.locked
                ? <Link href={st.href} className="-mx-2 flex items-start gap-3 rounded-panel px-2 transition-colors hover:bg-subtle">{body}</Link>
                : <div className="flex items-start gap-3">{body}</div>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
