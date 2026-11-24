"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, ChevronRight, CheckCircle2, ArrowRight, Sparkle, ScanSearch, BookOpen, ClipboardCheck, Award, Library, Stethoscope, Syringe, Pill, Briefcase, UserRound, type LucideIcon } from "lucide-react"; // v1-hidden: ListChecks, Library as LibraryIcon, Lock, Headphones, Flame
// v1-hidden (ask bar): import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { fmtDate, isOverdue, opensLater, daysFromToday } from "@/store/selectors";
import { product } from "@/data/org";
import type { Character, Course, Progress } from "@/data/types";
import { CHARACTERS } from "@/lib/scenario-set";
import { callPlan } from "./situations";
import { JourneySteps, ProgressRing, VoiceWave, type JourneyStep } from "./hero-visuals";
import { libraryCourses } from "@/features/library/library-data";
// v1-hidden: import { allScenarios } from "@/data/scenarios";
import { Text } from "@/components/ui/text";
import { FictionalNote } from "@/components/patterns/academy";
import { materialOptional } from "@/lib/direct-material";
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
          cta="Have a look" href={`/rep/course/${suggested.id}`} minutes={modulesOf(suggested).reduce((x, m) => x + moduleMinutes(suggested, m), 0)}
          pct={0} steps={[{ label: "Start", state: "now" }, { label: "Certified", state: "todo" }]} visual={{ kind: "lesson", who: `${modulesOf(suggested).length} lessons`, sub: "Open to everyone on your team" }} />
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
  const pct = c.origin === "direct" ? pr.overall : p.path || !c.settings.screening ? pr.pct : 0;
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
  const c = next.course;
  const pr = pathProgress(p, c);
  const tag = isAssigned(p)
    ? { icon: Sparkle, label: p.state === "needs_coaching" ? "Your manager asked for this" : p.state === "remediation" ? "Retake path" : p.assignType === "required" ? "Required for you" : "Assigned to you" }
    : { icon: Library, label: isStarted(p) ? "You started this" : "You picked this" };
  const days = p.dueAt ? daysFromToday(p.dueAt) : undefined;
  const due = p.dueAt ? { text: isOverdue(p) ? `Overdue ${Math.abs(days!)} day${Math.abs(days!) === 1 ? "" : "s"}` : days === 0 ? "Due today" : `Due ${fmtDate(p.dueAt)}`, late: isOverdue(p) } : undefined;
  return (
    <UpNextCard tag={tag} due={due} course={c.title} stage={stageOf(next)} title={next.title} why={next.why}
      unlocks={next.unlocks} practiceOnly={p.mode === "practice"} cta={next.cta} href={next.href} minutes={next.minutes}
      pct={pr.overall} steps={journeyOf(p, c)} visual={visualOf(next)} />
  );
}

/** The training's steps for the card, as the rep goes through them. */
function journeyOf(p: Progress, c: Course): JourneyStep[] {
  const pr = pathProgress(p, c);
  const raw: { label: string; done: boolean; sub?: string }[] = [];
  if (c.settings.screening) raw.push({ label: "Screening", done: !!p.screening });
  if (c.origin === "direct") {
    if (pr.modules > 0 && !materialOptional(c, p)) raw.push({ label: "Materials", done: pr.modulesDone >= pr.modules, sub: `${pr.modulesDone}/${pr.modules}` });
    const plan = callPlan(c, p);
    const passed = plan.objectives.filter((o) => o.state === "passed").length;
    raw.push({ label: "Assessments", done: plan.allPassed, sub: `${passed}/${plan.objectives.length}` });
  } else {
    if (pr.modules > 0) raw.push({ label: "Lessons", done: pr.modulesDone >= pr.modules, sub: `${pr.modulesDone}/${pr.modules}` });
    raw.push({ label: "Final", done: p.attempts.some((a) => a.passed) });
  }
  raw.push({ label: "Certified", done: p.state === "certified" });
  const now = raw.findIndex((x) => !x.done);
  return raw.map((x, i) => ({ label: x.label, sub: x.sub, state: x.done ? "done" : i === now ? "now" : "todo" }));
}

/** What the next step looks like: a call (who, how long), a lesson, or the certificate. */
function visualOf(st: NextStep): Visual {
  const who = st.href.match(/call=([a-z]+)/)?.[1] as Character | undefined;
  if (st.href.includes("/screening")) return { kind: "call", who: "Screening call", sub: `about ${st.minutes ?? 3} min · not graded`, role: "doctor" };
  if (st.href.includes("/assessment")) return { kind: "call", who: `${CHARACTERS[who ?? "doctor"].label} call`, sub: `about ${st.minutes ?? 5} min · scored`, role: who ?? "doctor" };
  if (st.href.includes("/learn")) return { kind: "lesson", who: stageOf(st).label, sub: st.minutes ? `${st.minutes} min left` : "Your team's material" };
  if (st.href.includes("/attest")) return { kind: "cert", who: "Every objective passed", sub: "Your certificate is ready" };
  return { kind: "call", who: "Practice call", sub: "not graded", role: "doctor" };
}

type Visual = { kind: "call" | "lesson" | "cert"; who: string; sub: string; role?: Character };
const ROLE_ICON: Record<Character, LucideIcon> = { doctor: Stethoscope, nurse: Syringe, pharmacist: Pill, manager: Briefcase, patient: UserRound };

/**
 * The one thing to do next, made to be seen: the training and the step, how far through you are (a ring
 * that draws itself), what the step looks like (a call with a live voice, a lesson, the certificate),
 * where it sits in the training's steps, and the way in.
 */
function UpNextCard({ tag, due, course, stage, title, practiceOnly, cta, href, minutes, pct, steps, visual }: {
  tag: { icon: LucideIcon; label: string }; due?: { text: string; late: boolean }; course: string; stage: { icon: LucideIcon; label: string };
  title: string; why: string; unlocks?: string; practiceOnly?: boolean; cta: string; href: string; minutes?: number;
  pct: number; steps: JourneyStep[]; visual: Visual;
}) {
  const Tag = tag.icon;
  const sameTitle = title.toLowerCase() === stage.label.toLowerCase();
  const Who = visual.kind === "call" ? ROLE_ICON[visual.role ?? "doctor"] : visual.kind === "lesson" ? BookOpen : Award;
  return (
    <section className="relative overflow-hidden rounded-card bg-ink p-5 text-white shadow-float">
      <div className="drift pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand/50 blur-3xl" />
      <div className="drift pointer-events-none absolute -bottom-28 -left-16 size-56 rounded-full bg-brand-2/30 blur-3xl" style={{ animationDelay: "-5s" }} />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-caption font-bold text-white/75"><Tag className="size-3.5" aria-hidden="true" />{tag.label}</span>
          {due && <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", due.late ? "bg-[#ff8a6b]/20 text-[#ffb59f]" : "bg-white/10 text-white/80")}>{due.text}</span>}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Text size="display-lg" weight="extrabold" tone="inverse" tracking="tight" className="leading-tight">{course}</Text>
            {!sameTitle && <Text size="body" weight="semibold" tone="inverse" className="line-clamp-2 opacity-80">{title}</Text>}
            {practiceOnly && <span className="self-start rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/80">Practice only</span>}
          </div>
          <ProgressRing pct={pct}><span className="flex flex-col items-center leading-none"><span className="text-subhead font-extrabold tabular-nums">{pct}%</span><span className="mt-0.5 text-[10px] font-bold text-white/60">done</span></span></ProgressRing>
        </div>

        {/* What's next, drawn: a call with a live voice, a lesson, or the certificate. */}
        <div className="flex items-center gap-3 rounded-[20px] bg-white/8 p-3">
          <span className="relative grid size-12 shrink-0 place-items-center">
            {visual.kind !== "lesson" && <span className="pulse-ring absolute inset-0 rounded-full bg-white/20" />}
            <span className={cn("relative grid size-12 place-items-center rounded-full text-white", visual.kind === "cert" ? "bg-sage" : visual.kind === "lesson" ? "bg-lilac" : "bg-peach")}><Who className="size-5" aria-hidden="true" /></span>
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body font-bold text-white">{visual.who}</span>
            <span className="truncate text-caption text-white/65">{visual.sub}</span>
          </span>
          {visual.kind === "call" && <VoiceWave bars={9} className="h-8 w-16 shrink-0" barClass="bg-white/70" />}
        </div>

        <JourneySteps steps={steps} />

        {/* One line, always: the card above already names who and what, so the button keeps just the verb. */}
        <Link href={href} className="focus-ring flex h-14 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-5 text-subhead font-bold text-ink transition-transform active:scale-[0.98]">
          <span className="truncate">{cta.split(" · ")[0]}</span>{minutes ? <span className="shrink-0 font-semibold text-ink-3">· {minutes} min</span> : null}<ArrowRight className="size-4 shrink-0" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
