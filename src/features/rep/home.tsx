"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, ChevronRight, CheckCircle2, ArrowRight, Sparkle, ScanSearch, BookOpen, ClipboardCheck, Award, Library, type LucideIcon } from "lucide-react"; // v1-hidden: ListChecks, Library as LibraryIcon, Lock, Headphones, Flame
// v1-hidden (ask bar): import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { fmtDate, isOverdue, opensLater } from "@/store/selectors";
import { product } from "@/data/org";
import type { Course, Progress } from "@/data/types";
import { libraryCourses } from "@/features/library/library-data";
// v1-hidden: import { allScenarios } from "@/data/scenarios";
import { Text } from "@/components/ui/text";
import { FictionalNote } from "@/components/patterns/academy";
// v1-hidden (ask bar): import { useCopilot } from "@/features/copilot/copilot-store";
import { useRep, pathProgress, isAssigned, isStarted, modulesOf, moduleMinutes, type NextStep } from "./use-rep"; // v1-hidden: pathModules
// v1-hidden: import { QuickWatchRail } from "./watch";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export function RepHome() {
  const router = useRouter();
  const { me, s, mine, active, next, suggested, courseOf } = useRep();
  const onboarded = s.onboarded[me.id];
  /* Only a rep is sent to onboarding: while switching persona to the trainer, this must not race the navigation away. */
  const isRep = me.roles.includes("rep");
  useEffect(() => { if (!onboarded && isRep) router.replace("/rep/onboarding"); }, [onboarded, isRep, router]);
  if (!onboarded) return null;

  /* Home is My learning too: what's on your list, what to do next, and a window on the Library. */
  const assigned = active.filter((p) => !opensLater(p) || isAssigned(p));
  const overdue = assigned.filter(isOverdue).length;
  const nextDue = assigned.filter((p) => p.dueAt && !isOverdue(p)).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0];
  const onList = new Set(mine.map((p) => p.courseId));
  const library = libraryCourses(s, me).filter((c) => !onList.has(c.id) && c.id !== suggested?.id).slice(0, 8);
  const lastCall = s.practice.filter((x) => x.userId === me.id && x.kind === "roleplay").at(0);
  const others = assigned.filter((p) => p.courseId !== next?.course.id);

  return (
    <div className="flex flex-col gap-7 px-4 pb-4 pt-3">
      {/* v1-hidden: the date line above the greeting, and the "Ask SwishX" bar (the raised SwishX tab does the same). */}
      <header className="flex flex-col gap-1">
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{greeting()}, {me.first}</Text>
        <Text size="body" tone={overdue ? "danger" : "subtle"} weight={overdue ? "semibold" : undefined}>
          {assigned.length ? `${assigned.length} to finish${overdue ? ` · ${overdue} overdue` : nextDue ? ` · next due ${fmtDate(nextDue.dueAt)}` : ""}` : "Nothing on your list right now."}
        </Text>
      </header>

      {/* Up next: the one course to work on now, and where you are in it. */}
      {next ? <UpNext next={next} /> : suggested ? (
        <UpNextCard tag={{ icon: Library, label: "From the library" }} course={suggested.title} stage={{ icon: BookOpen, label: "Not started" }}
          title={suggested.objective || `${modulesOf(suggested).length} lessons`} why="Nothing is assigned to you right now. This is the one most of your team is taking."
          cta="Have a look" href={`/rep/course/${suggested.id}`} minutes={modulesOf(suggested).reduce((x, m) => x + moduleMinutes(suggested, m), 0)} />
      ) : (
        <section className="flex items-center gap-3 rounded-card bg-ink p-5 text-white">
          <CheckCircle2 className="size-7 shrink-0 text-ok-on-dark" aria-hidden="true" />
          <Text size="body-lg" tone="inverse">You&apos;re all caught up. Rehearse your next meeting?</Text>
        </section>
      )}

      {/* The rest of the list: everything but the course already in Up next. */}
      {others.length > 0 && (
        <Rail title="Also on your list" href="/rep/learn" all="See all">
          {others.map((p) => <TrainingCard key={p.id} p={p} c={courseOf(p)} />)}
        </Rail>
      )}

      <PractiseCard last={lastCall?.result ? { id: lastCall.id, score: lastCall.result.score, title: lastCall.title } : undefined} />

      {library.length > 0 && (
        <Rail title="From the library" href="/rep/learn#library" all="Browse all">
          {library.map((c, i) => <LibraryCard key={c.id} c={c} i={i} />)}
        </Rail>
      )}

      <FictionalNote className="pb-2" />
    </div>
  );
}

/* v1-hidden: Home's "Ask SwishX" bar; the raised SwishX tab does the same.
/** Home's way into SwishX: looks like a search field, opens the agent. The waveform goes straight to voice. *\/
function AskBar() {
  const launch = useCopilot((x) => x.launch);
  return (
    <div className="flex items-center gap-2 rounded-full bg-card p-1.5 pl-4 shadow-soft ring-1 ring-hair">
      <button type="button" onClick={() => launch({ mode: "chat" })} className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-full py-2 text-left">
        <AgentIcon className="size-5 shrink-0 text-brand" />
        <span className="truncate text-body-lg font-medium text-ink-4">Ask SwishX anything…</span>
      </button>
      <button type="button" onClick={() => launch({ mode: "voice" })} aria-label="Talk to SwishX"
        className="focus-ring grid size-11 shrink-0 place-items-center rounded-full bg-cta text-white transition-transform active:scale-95">
        <AudioLines className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
*/

/** A horizontal rail with a title and a See all. */
function Rail({ title, href, all, children }: { title: string; href: string; all: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <Text as="h2" size="title" weight="extrabold" tracking="tight">{title}</Text>
        <Link href={href} className="flex shrink-0 items-center gap-0.5 text-body font-bold text-brand-deep">{all}<ChevronRight className="size-4" aria-hidden="true" /></Link>
      </div>
      <div className="-mx-4 -my-3 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
    </section>
  );
}

const TAG: Record<Progress["assignType"], { label: string; cls: string }> = {
  default: { label: "Start here", cls: "bg-tint text-brand-deep" },
  required: { label: "Required", cls: "bg-sun-bg text-warn" },
  recommended: { label: "Recommended", cls: "bg-subtle text-ink-2" },
  self: { label: "You picked", cls: "bg-sage-bg text-ok" },
};

function TrainingCard({ p, c }: { p: Progress; c: Course }) {
  const pr = pathProgress(p, c);
  const pct = p.path || !c.settings.screening ? pr.pct : 0;
  const tag = TAG[p.assignType];
  return (
    <Link href={`/rep/course/${c.id}`} className="flex w-[220px] shrink-0 snap-start flex-col gap-3 rounded-card bg-card p-4 shadow-soft transition-transform active:scale-[0.98]">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2.5 py-1 text-micro font-bold", tag.cls)}>{tag.label}</span>
        {p.dueAt && <span className={cn("text-caption font-semibold", isOverdue(p) ? "text-danger" : "text-ink-3")}>{isOverdue(p) ? "Overdue" : `Due ${fmtDate(p.dueAt)}`}</span>}
      </div>
      <span className="line-clamp-2 min-h-[2.6em] text-body-lg font-bold leading-snug text-ink">{c.title}</span>
      <div className="mt-auto flex items-center gap-2.5">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle"><div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} /></div>
        <span className="text-caption font-bold tabular-nums text-ink-3">{pct}%</span>
      </div>
    </Link>
  );
}

/* Library covers cycle through the tile colours, so neighbours never match. */
const COVERS = ["bg-sage", "bg-peach", "bg-lilac", "bg-sun"];
function LibraryCard({ c, i }: { c: Course; i: number }) {
  const mods = modulesOf(c);
  const about = product(c.productId)?.brand ?? "Company";
  const cover = COVERS[i % COVERS.length];
  return (
    <Link href={`/rep/course/${c.id}`} className="flex w-[200px] shrink-0 snap-start flex-col overflow-hidden rounded-card bg-card shadow-soft transition-transform active:scale-[0.98]">
      <div className={cn("relative flex h-20 items-end p-3", cover)}>
        <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-micro font-bold text-ink">{about}</span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="line-clamp-2 text-body font-bold leading-snug text-ink">{c.title}</span>
        <span className="mt-auto text-caption text-ink-3">{mods.reduce((x, m) => x + moduleMinutes(c, m), 0)} min</span>
      </div>
    </Link>
  );
}

/** One compact way into practice, with the last call's score when there is one. */
function PractiseCard({ last }: { last?: { id: string; score: number; title: string } }) {
  return (
    <Link href="/rep/practice/prep" className="flex items-center gap-3.5 rounded-card bg-lilac p-4 text-white shadow-soft transition-transform active:scale-[0.99]">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/20"><Mic className="size-6" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-subhead font-extrabold leading-tight">Rehearse a meeting</span>
        <span className="text-caption font-semibold text-white/85">{last ? `Last call ${last.score} · private` : "With an AI doctor · private"}</span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink"><ArrowRight className="size-4.5" aria-hidden="true" /></span>
    </Link>
  );
}

/** Which stage of the course the next step is in, from where it leads. */
function stageOf(st: NextStep): { icon: LucideIcon; label: string } {
  if (st.href.includes("/screening")) return { icon: ScanSearch, label: "Screening" };
  if (st.href.includes("/learn")) {
    const pr = pathProgress(st.progress, st.course);
    return { icon: BookOpen, label: pr.modules ? `Lesson ${Math.min(pr.modulesDone + 1, pr.modules)} of ${pr.modules}` : "Lessons" };
  }
  if (st.href.includes("/assessment")) return { icon: ClipboardCheck, label: "Assessment" };
  if (st.href.includes("/attest")) return { icon: Award, label: "Certificate" };
  return { icon: Mic, label: "Practice" };
}

function UpNext({ next }: { next: NextStep }) {
  const p = next.progress;
  const pr = pathProgress(p, next.course);
  const tag = isAssigned(p)
    ? { icon: Sparkle, label: p.state === "needs_coaching" ? "Your manager asked for this" : p.state === "remediation" ? "Retake path" : p.assignType === "required" ? "Required for you" : "Assigned to you" }
    : { icon: Library, label: isStarted(p) ? "You started this" : "You picked this" };
  const due = p.dueAt ? { text: isOverdue(p) ? "Overdue" : `Due ${fmtDate(p.dueAt)}`, late: isOverdue(p) } : undefined;
  return (
    <UpNextCard tag={tag} due={due} course={next.course.title} stage={stageOf(next)} title={next.title} why={next.why}
      unlocks={next.unlocks} practiceOnly={p.mode === "practice"} cta={next.cta} href={next.href} minutes={next.minutes}
      bar={p.mode !== "optional" && (p.path || !next.course.settings.screening) && pr.modules > 0 ? { pct: pr.pct, label: `${pr.modulesDone}/${pr.modules} lessons` } : undefined} />
  );
}

/** The course first, then the stage you're at in it and the one thing to do. */
function UpNextCard({ tag, due, course, stage, title, why, unlocks, practiceOnly, bar, cta, href, minutes }: {
  tag: { icon: LucideIcon; label: string }; due?: { text: string; late: boolean }; course: string; stage: { icon: LucideIcon; label: string };
  title: string; why: string; unlocks?: string; practiceOnly?: boolean; bar?: { pct: number; label: string }; cta: string; href: string; minutes?: number;
}) {
  const Tag = tag.icon, Stage = stage.icon;
  const sameTitle = title.toLowerCase() === stage.label.toLowerCase();
  return (
    <section className="relative overflow-hidden rounded-card bg-ink p-5 text-white shadow-float">
      <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-brand/45 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-10 size-48 rounded-full bg-brand-2/25 blur-2xl" />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 text-caption font-bold text-white/75">
          <span className="flex items-center gap-1.5"><Tag className="size-3.5" aria-hidden="true" />{tag.label}</span>
          {due && <span className={cn("shrink-0", due.late && "text-brand-light")}>{due.text}</span>}
        </div>
        <div className="flex flex-col gap-2">
          <Text size="display-lg" weight="extrabold" tone="inverse" tracking="tight" className="leading-tight">{course}</Text>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-caption font-bold text-white"><Stage className="size-3.5" aria-hidden="true" />{stage.label}</span>
            {practiceOnly && <span className="rounded-full bg-white/10 px-3 py-1 text-caption font-semibold text-white/80">Practice only</span>}
            {!sameTitle && <Text size="body-lg" weight="semibold" tone="inverse" className="min-w-0">{title}</Text>}
          </div>
          {/* v1-hidden: the "why" sentence and "Finishing it unlocks…" line; the button already says how long it takes.
          <Text size="body" tone="inverse" className="opacity-75">{why}</Text>
          {unlocks && <span className="flex items-center gap-1.5 text-caption text-white/65"><Lock className="size-3" aria-hidden="true" />Finishing it unlocks {unlocks}</span>} */}
        </div>
        {bar && (
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand-2" style={{ width: `${bar.pct}%` }} /></div>
            <Text size="caption" tone="inverse" className="opacity-75" tabular>{bar.label}</Text>
          </div>
        )}
        {/* One line, always: the card above already names who and what, so the button keeps just the verb ("Start call · Dana · 1 objective" → "Start call"). */}
        <Link href={href} className="focus-ring flex h-14 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 text-subhead font-bold text-ink transition-transform active:scale-[0.98]">
          <span className="truncate">{cta.split(" · ")[0]}</span>{minutes ? <span className="shrink-0 font-semibold text-ink-3">· {minutes} min</span> : null}<ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
