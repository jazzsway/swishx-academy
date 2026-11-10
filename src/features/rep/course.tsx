"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Lock, ChevronDown, ChevronRight, CircleCheck, Hourglass, MessageSquareQuote, Award, PlayCircle, Flag, BookOpen, Library as LibraryIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe, fmtDate, daysFromToday, isOverdue, ASSIGN_LABEL } from "@/store/selectors";
import { competency, DIVISIONS } from "@/data/org";
import type { Course, Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Ring, EmptyState } from "@/components/patterns/academy";
import { modulesOf, nextStepFor, pathDone, pathModules, pathProgress } from "./use-rep";
import { libraryCourses, unmetPrereqs } from "@/features/library/library-data";
import { MediaSummary } from "./watch";

const TAG: Record<Progress["assignType"], { label: string; tone: "brand" | "default" | "ok" | "warn" }> = {
  default: { label: "Start here", tone: "brand" }, required: { label: "Required", tone: "warn" }, recommended: { label: "Recommended", tone: "default" }, self: { label: "You chose", tone: "ok" },
};

/**
 * My learning, in three parts: what's assigned to you (with due dates), what you're certified on,
 * and the Library of open courses you can take any time, for your team or for everyone.
 */
export function RepLearn() {
  const me = useMe();
  const s = useApp();
  const [filter, setFilter] = useState<"all" | "team" | "everyone">("all");
  const mine = s.progress.filter((p) => p.userId === me.id);
  const courseOf = (p: Progress) => s.courses.find((x) => x.id === p.courseId)!;
  const due = (p: Progress) => (isOverdue(p) ? "0" : p.dueAt ?? "9999");
  const assigned = mine.filter((p) => p.assignType !== "self" && p.state !== "certified").sort((a, b) => due(a).localeCompare(due(b)));
  const certified = mine.filter((p) => p.state === "certified");
  const overdue = assigned.filter(isOverdue).length;
  const nextDue = assigned.find((p) => p.dueAt && !isOverdue(p));

  /* The Library: open courses for your team or everyone, minus anything already on your list. */
  const team = DIVISIONS.find((d) => d.id === me.divisionId)?.name ?? "your team";
  const onList = new Set(mine.filter((p) => p.assignType !== "self").map((p) => p.courseId));
  const library = libraryCourses(s, me).filter((c) => !onList.has(c.id)).map((c) => ({ c, everyone: c.visibility === "everyone", p: mine.find((p) => p.courseId === c.id) }));
  const shown = library.filter((x) => filter === "all" || (filter === "everyone") === x.everyone);

  return (
    <div className="flex flex-col gap-7 px-4 pb-6 pt-5">
      <div className="flex flex-col gap-1">
        <Text as="h1" size="hero" weight="extrabold" tracking="tight">My learning</Text>
        <Text size="body" tone={overdue ? "danger" : "subtle"}>
          {assigned.length ? `${assigned.length} assigned to finish${overdue ? ` · ${overdue} overdue` : nextDue ? ` · next due ${fmtDate(nextDue.dueAt)}` : ""}` : "Nothing assigned right now. Pick something from the Library."}
        </Text>
      </div>

      {assigned.length > 0 && (
        <section className="flex flex-col gap-2.5" aria-labelledby="assigned-h">
          <div className="flex flex-col gap-0.5">
            <Text as="h2" id="assigned-h" size="title" weight="bold">Assigned to you</Text>
            <Text size="caption" tone="subtle">Set by your training team. Finish each by its due date.</Text>
          </div>
          {assigned.map((p) => <CourseRow key={p.id} p={p} c={courseOf(p)} tag={TAG[p.assignType]} />)}
        </section>
      )}

      {certified.length > 0 && (
        <section className="flex flex-col gap-2.5" aria-labelledby="cert-h">
          <div className="flex flex-col gap-0.5">
            <Text as="h2" id="cert-h" size="title" weight="bold">Certified</Text>
            <Text size="caption" tone="subtle">You&apos;ll be reminded before a certificate runs out.</Text>
          </div>
          {certified.map((p) => <CourseRow key={p.id} p={p} c={courseOf(p)} />)}
        </section>
      )}

      <section className="flex flex-col gap-2.5 border-t border-hair pt-6" aria-labelledby="lib-h">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-control bg-ink text-white"><LibraryIcon className="size-4.5" aria-hidden="true" /></span>
          <div className="flex min-w-0 flex-col">
            <Text as="h2" id="lib-h" size="title" weight="bold">Library</Text>
            <Text size="caption" tone="subtle">Optional courses. Take any of them whenever you like.</Text>
          </div>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
          {([["all", `All · ${library.length}`], ["team", `For ${team} · ${library.filter((x) => !x.everyone).length}`], ["everyone", `For everyone · ${library.filter((x) => x.everyone).length}`]] as const).map(([k, label]) => (
            <Chip key={k} size="md" selected={filter === k} onClick={() => setFilter(k)}>{label}</Chip>
          ))}
        </div>
        {shown.length === 0 && <Text size="body" tone="subtle">Nothing here yet. Your training team adds courses over time.</Text>}
        {shown.map(({ c, everyone, p }) => {
          const mods = modulesOf(c);
          const pr = p && pathProgress(p, c);
          return (
            <Link key={c.id} href={`/rep/course/${c.id}`} className="squircle flex items-center gap-3.5 rounded-panel border border-hair bg-card p-4 hover:bg-subtle">
              {p && pr ? <Ring value={pr.pct} size={44} label={`${pr.pct}%`}><Text size="micro" weight="bold">{pr.pct}%</Text></Ring>
                : <span className="grid size-11 shrink-0 place-items-center rounded-full bg-subtle text-ink-3"><BookOpen className="size-5" aria-hidden="true" /></span>}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Text size="body-lg" weight="bold" className="leading-snug">{c.title}</Text>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Chip size="xs" tone={everyone ? "default" : "brand"}>{everyone ? "Everyone" : team}</Chip>
                  {p && <Chip size="xs" tone="ok">In progress</Chip>}
                  <Text size="caption" tone="subtle">{mods.reduce((a, m) => a + m.minutes, 0)} min · {mods.length} module{mods.length === 1 ? "" : "s"}</Text>
                </span>
              </div>
              <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
            </Link>
          );
        })}
      </section>
    </div>
  );
}

function CourseRow({ p, c, tag }: { p: Progress; c: Course; tag?: { label: string; tone: "brand" | "default" | "ok" | "warn" } }) {
  const pr = pathProgress(p, c);
  const cert = p.state === "certified";
  return (
    <Link href={`/rep/course/${c.id}`} className={cn("squircle flex items-center gap-3.5 rounded-panel border bg-card p-4 hover:bg-subtle", isOverdue(p) ? "border-danger-line" : "border-hair")}>
      {cert ? <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ok-bg text-ok"><Award className="size-5" aria-hidden="true" /></span>
        : <Ring value={p.state === "not_started" ? 0 : pr.pct} size={44} label={`${pr.pct}%`}><Text size="micro" weight="bold">{p.state === "not_started" ? "0" : pr.pct}%</Text></Ring>}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <Text size="body-lg" weight="bold" className="leading-snug">{c.title}</Text>
        <span className="flex flex-wrap items-center gap-1.5">
          {tag && <Chip size="xs" tone={tag.tone}>{tag.label}</Chip>}
          <Text size="caption" tone={isOverdue(p) ? "danger" : "subtle"} weight={isOverdue(p) ? "semibold" : undefined}>
            {cert ? `Certified ${fmtDate(p.certifiedAt)} · valid to ${fmtDate(p.certExpiresAt, true)}` : p.dueAt ? (isOverdue(p) ? `Overdue since ${fmtDate(p.dueAt)}` : `Due ${fmtDate(p.dueAt)}`) : "No due date"}
          </Text>
        </span>
      </div>
      <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
    </Link>
  );
}

export function RepCourse() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const [showOut, setShowOut] = useState(false);
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  if (!c) return <div className="p-4"><EmptyState title="Course not found" /></div>;
  if (!p) return <CourseExplore courseId={c.id} />;
  const locked = unmetPrereqs(s, me.id, c);
  const mods = modulesOf(c);
  // v1-hidden (doc number): const ver = c.versions.find((v) => v.version === p.version);
  const step = nextStepFor(p, c);
  const pr = pathProgress(p, c);
  const pm = pathModules(p, c);
  const out = p.path ? mods.filter((m) => !p.path!.moduleIds.includes(m.id)) : [];
  const manager = s.users.find((u) => u.id === me.managerId);
  const lastAttempt = p.attempts.at(-1);
  const attemptsLeft = c.settings.attempts - p.attempts.filter((a) => !a.passed).length;
  const celebrate = search.get("celebrate") === "1" && p.state === "certified";
  /* Why it's on their list: the campaign it belongs to, in the rep's view. */
  const campaign = undefined as { name: string } | undefined; // v1-hidden: s.campaigns.find((x) => x.id === p.campaignId && x.status === "active")

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <Link href="/rep/learn" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3"><ArrowLeft className="size-4" aria-hidden="true" />My learning</Link>
      <div className="flex flex-col gap-1.5">
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{c.title}</Text>
        <Text size="body" tone="subtle">v{p.version} · {ASSIGN_LABEL[p.assignType]}{p.dueAt ? ` · due ${fmtDate(p.dueAt)}` : ""}{p.dueAt && p.state !== "certified" && isOverdue(p) ? " · overdue" : ""}</Text>
        {/* v1-hidden: campaigns aren't in v1, so `campaign` is always undefined. */}
        {campaign && p.state !== "certified" && (
          <span className="flex items-center gap-1.5 self-start rounded-chip bg-tint px-2.5 py-1 text-caption font-semibold text-brand-deep">
            <Flag className="size-3.5" aria-hidden="true" />Part of {campaign.name}
          </span>
        )}
      </div>

      {p.state === "certified" && (
        <div className="relative overflow-hidden">
          {celebrate && <Confetti />}
          <div className="squircle flex flex-col items-center gap-3 rounded-card border border-ok-line bg-ok-bg p-6 text-center">
            <div className="success-pop grid size-16 place-items-center rounded-full bg-ok text-white"><Award className="size-8" aria-hidden="true" /></div>
            <Text size="display" weight="extrabold">You&apos;re certified</Text>
            <Text size="body-lg" tone="muted">{c.title} · v{p.version}</Text>
            <Text size="body" tone="subtle">Certified {fmtDate(p.certifiedAt, true)} · valid to {fmtDate(p.certExpiresAt, true)}{p.verify?.by ? ` · verified by ${s.users.find((u) => u.id === p.verify!.by)?.name}` : ""}</Text>
            <Link href="/rep/me" className="text-body-lg font-semibold text-ok underline">View certificate</Link>
          </div>
        </div>
      )}

      {p.state === "awaiting_verify" && (
        <div className="squircle flex items-start gap-3 rounded-card border border-warn-line bg-warn-bg p-5">
          <Hourglass className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <Text size="subhead" weight="bold">You passed. {manager?.first ?? "Your manager"} is reviewing your call.</Text>
            <Text size="body" tone="muted">Score {lastAttempt?.overall}%. You'll be certified as soon as it's signed off, usually within 3 days.</Text>
          </div>
        </div>
      )}

      {p.state === "needs_coaching" && (
        <div className="squircle flex flex-col gap-2 rounded-card border border-tint-line bg-tint p-5">
          <div className="flex items-center gap-2"><MessageSquareQuote className="size-5 text-brand-deep" aria-hidden="true" /><Text size="subhead" weight="bold">Coaching from {s.users.find((u) => u.id === p.verify?.by)?.first ?? "your manager"}</Text></div>
          <Text size="body-lg" className="leading-relaxed">“{p.verify?.note}”</Text>
          <div className="flex flex-wrap gap-1.5">{p.verify?.focus?.map((f) => <Chip key={f} tone="brand" size="md">{competency(f)?.name}</Chip>)}</div>
          <Text size="body" tone="muted">Work through the modules below, then resubmit your roleplay.</Text>
        </div>
      )}

      {p.state === "remediation" && lastAttempt && !lastAttempt.passed && (
        <div className="squircle flex flex-col gap-2 rounded-card border border-hair bg-card p-5">
          <Text size="subhead" weight="bold">Your retake path · {pm.length} modules · ~{pr.minutesLeft} min</Text>
          <Text size="body" tone="muted">Built from what held you back last time{lastAttempt.call?.flags.some((f) => f.critical) ? ", including the compliance flag" : ""}. {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left.</Text>
        </div>
      )}

      {p.state === "not_started" && c.settings.screening && locked.length > 0 && <PrereqLock courses={locked} />}
      {p.state === "not_started" && c.settings.screening && locked.length === 0 && (
        <div className="squircle flex flex-col gap-4 rounded-card bg-ink p-5 text-white">
          <Text size="display" weight="extrabold" tone="inverse">Get certified</Text>
          <Text size="body-lg" tone="inverse" className="opacity-80">Start with a ~10-minute quiz and a 5-minute call with an AI doctor. It isn't graded. It finds what you already know, so your path covers only your gaps, plus the safety content everyone takes.</Text>
          <div className="flex flex-wrap gap-2 text-caption">
            <span className="rounded-chip bg-white/10 px-2.5 py-1">Full course {pr.fullMinutes} min</span>
            <span className="rounded-chip bg-white/10 px-2.5 py-1">{mods.length} modules</span>
            <span className="rounded-chip bg-white/10 px-2.5 py-1">{mods.filter((m) => m.required).length} required for everyone</span>
          </div>
          <Button size="lg" fullWidth onClick={() => { s.startCourse(p.id); router.push(`/rep/course/${c.id}/screening`); }}>Start with screening</Button>
          <button type="button" onClick={() => { s.skipScreening(p.id); }} className="text-body font-semibold text-white/70 underline">Take the full course instead</button>
        </div>
      )}

      {step && p.state !== "not_started" && (
        <Link href={step.href} className="squircle flex items-center gap-3 rounded-card bg-brand-deep p-5 text-white">
          <PlayCircle className="size-8 shrink-0" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col"><Text size="caption" tone="inverse" className="opacity-75">Up next</Text><Text size="title" weight="bold" tone="inverse">{step.title}</Text><Text size="caption" tone="inverse" className="opacity-80">{step.why}</Text></div>
        </Link>
      )}
      {p.state === "not_started" && !c.settings.screening && step && (
        <Button size="lg" fullWidth onClick={() => { s.startCourse(p.id); router.push(step.href); }}>Start the course · {pr.fullMinutes} min</Button>
      )}

      {/* v1-hidden: {p.state === "not_started" && c.allowExplore && <ExploreModules courseId={c.id} />} */}

      {pathDone(p, c) && c.settings.completion.assessment && ["learning", "remediation", "needs_coaching"].includes(p.state) && (
        <div className="squircle flex flex-col gap-2 rounded-card border border-hair bg-card p-5">
          <Text size="subhead" weight="bold">Final assessment</Text>
          <Text size="body" tone="muted">{c.settings.assessmentItems} questions{c.settings.assessmentCall ? " plus a short call" : ""}. Pass: {c.settings.passOverall}% overall, {c.settings.passCritical}% on {c.settings.criticalCompetencies.map((x) => competency(x)?.name.toLowerCase()).join(" and ")}, and no critical compliance flag. {attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left.</Text>
        </div>
      )}

      {p.state === "certified" && (
        <section className="flex flex-col gap-2">
          <button type="button" onClick={() => setShowOut(!showOut)} className="flex items-center gap-1.5 self-start text-body-lg font-semibold text-ink-2">
            <ChevronDown className={cn("size-4 transition-transform", showOut && "rotate-180")} aria-hidden="true" />Review any module ({mods.length})
          </button>
          {showOut && mods.map((m) => (
            <Link key={m.id} href={`/rep/course/${c.id}/learn?module=${m.id}&optional=1`} className="squircle flex items-center justify-between gap-3 rounded-panel border border-hair bg-card px-4 py-3">
              <Text size="body-lg" weight="semibold">{m.title}</Text><Text size="caption" tone="subtle">{m.minutes} min</Text>
            </Link>
          ))}
        </section>
      )}

      {p.path && p.state !== "certified" && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <Text as="h2" size="subhead" weight="bold">{p.path.kind === "full" ? "All modules" : p.path.kind === "remediation" ? "Retake path" : "Your path"}</Text>
            <Text size="caption" tone="subtle">{pr.modulesDone} of {pr.modules} done · ~{pr.minutesLeft} min left</Text>
          </div>
          <ol className="flex flex-col gap-2">
            {pm.map((m, i) => {
              const done = m.blocks.every((b) => p.completedBlocks.includes(b.id));
              const reason = p.path!.reasons[m.id];
              return (
                <li key={m.id}>
                  <Link href={`/rep/course/${c.id}/learn?module=${m.id}`} className={cn("squircle flex items-center gap-3 rounded-panel border p-3.5", done ? "border-ok-line bg-ok-bg/60" : "border-hair bg-card")}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold", done ? "bg-ok text-white" : "bg-black/[0.06] text-ink-2")}>{done ? <Check className="size-4" aria-hidden="true" /> : i + 1}</span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Text size="body-lg" weight="semibold">{m.title}</Text>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Chip size="xs" tone={reason?.startsWith("Required") ? "warn" : reason?.startsWith("Coaching") ? "brand" : "default"} iconLeft={reason?.startsWith("Required") ? <Lock className="size-2.5" aria-hidden="true" /> : undefined}>{reason}</Chip>
                        <Text size="micro" tone="subtle">{m.minutes} min</Text>
                        <MediaSummary module={m} />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
          {out.length > 0 && (
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setShowOut(!showOut)} className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-2">
                <ChevronDown className={cn("size-4 transition-transform", showOut && "rotate-180")} aria-hidden="true" />{out.length} modules you tested out of (optional)
              </button>
              {showOut && out.map((m) => (
                <Link key={m.id} href={`/rep/course/${c.id}/learn?module=${m.id}&optional=1`} className="squircle flex items-center gap-3 rounded-panel border border-dashed border-hair-2 bg-subtle p-3">
                  <CircleCheck className="size-5 text-ok" aria-hidden="true" />
                  <div className="flex flex-col"><Text size="body" weight="semibold" tone="muted">{m.title}</Text><Text size="micro" tone="subtle">{p.path!.reasons[m.id]}</Text></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {p.screening && (
        <Link href={`/rep/course/${c.id}/results`} className="squircle flex items-center justify-between rounded-panel border border-hair bg-card px-4 py-3">
          <div className="flex flex-col"><Text size="body-lg" weight="semibold">My screening results</Text><Text size="caption" tone="subtle">{fmtDate(p.screening.at)} · {p.screening.overall}% overall</Text></div>
          <Text size="body" weight="semibold" tone="brand-deep">View</Text>
        </Link>
      )}
      {p.coachingNotes.length > 0 && p.state !== "needs_coaching" && (
        <section className="flex flex-col gap-2">
          <Text as="h2" size="subhead" weight="bold">Notes from your manager</Text>
          {p.coachingNotes.map((n, i) => <div key={i} className="squircle rounded-panel bg-subtle px-4 py-3"><Text size="body-lg">“{n.text}”</Text><Text size="caption" tone="subtle">{fmtDate(n.at)}</Text></div>)}
        </section>
      )}
      {p.dueAt && p.state !== "certified" && <Text size="caption" tone="subtle" className="text-center">{daysFromToday(p.dueAt) >= 0 ? `${daysFromToday(p.dueAt)} days until your due date` : "Past your due date. Your manager has been notified."}</Text>}
    </div>
  );
}

function PrereqLock({ courses }: { courses: { id: string; title: string }[] }) {
  const s = useApp();
  const me = useMe();
  return (
    <div className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
      <div className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-full bg-subtle text-ink-2"><Lock className="size-4" aria-hidden="true" /></span>
        <Text size="title" weight="bold">Screening unlocks after your foundations</Text></div>
      <Text size="body" tone="muted">Finish these first.{/* v1-hidden: You can explore this course while you wait; anything you watch or read now counts later. */}</Text>
      <div className="flex flex-col gap-2">
        {courses.map((pc) => {
          const pp = s.progress.find((x) => x.userId === me.id && x.courseId === pc.id);
          const course = s.courses.find((x) => x.id === pc.id)!;
          const pr = pp ? pathProgress(pp, course) : null;
          return (
            <Link key={pc.id} href={`/rep/course/${pc.id}`} className="squircle flex items-center justify-between gap-3 rounded-panel bg-subtle px-4 py-3 hover:bg-tint">
              <span className="flex flex-col"><span className="text-body-lg font-semibold">{pc.title}</span><span className="text-caption text-ink-3">{pp && pr ? (pp.state === "not_started" ? "Not started" : `${pr.modules - pr.modulesDone} module${pr.modules - pr.modulesDone === 1 ? "" : "s"} left`) : "Not assigned yet"}</span></span>
              <span className="text-body font-semibold text-brand-deep">Continue</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** RL-2: every module, open in any order, not for credit. What you open now is ticked off later. */
/** v1-hidden: explore before starting. Exported so it stays compiled while nothing renders it. */
export function ExploreModules({ courseId }: { courseId: string }) {
  const s = useApp();
  const me = useMe();
  const c = s.courses.find((x) => x.id === courseId)!;
  const mods = modulesOf(c);
  const explored = s.explored[me.id] ?? [];
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between"><Text as="h2" size="subhead" weight="bold">Explore the course</Text><Text size="caption" tone="subtle">Not for credit</Text></div>
      <ol className="flex flex-col gap-2">
        {mods.map((m, i) => {
          const seen = m.blocks.filter((b) => explored.includes(b.id)).length;
          return (
            <li key={m.id}>
              <Link href={`/rep/course/${c.id}/learn?module=${m.id}&explore=1`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-3.5 hover:bg-subtle">
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-caption font-bold", seen === m.blocks.length ? "bg-ok text-white" : "bg-black/[0.06] text-ink-2")}>{seen === m.blocks.length ? <Check className="size-4" aria-hidden="true" /> : i + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Text size="body-lg" weight="semibold">{m.title}</Text>
                  <div className="flex flex-wrap items-center gap-2"><Text size="micro" tone="subtle">{m.minutes} min{seen ? ` · ${seen}/${m.blocks.length} seen` : ""}</Text><MediaSummary module={m} /></div>
                </div>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** A Library course the rep hasn't started: browse it, or get certified on it. */
function CourseExplore({ courseId }: { courseId: string }) {
  const s = useApp();
  const me = useMe();
  const router = useRouter();
  const c = s.courses.find((x) => x.id === courseId)!;
  if (!libraryCourses(s, me).some((x) => x.id === c.id)) return <div className="p-4"><EmptyState title="This course isn't in your Library" body="It's assigned only, or it's for another team." /></div>;
  const mods = modulesOf(c);
  const locked = unmetPrereqs(s, me.id, c);
  // v1-hidden (version line): const lv = c.versions.find((v) => v.state === "published");
  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
      <Link href="/rep/learn" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3"><ArrowLeft className="size-4" aria-hidden="true" />My learning</Link>
      <div className="flex flex-col gap-1.5">
        <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{c.title}</Text>
        <Text size="body" tone="subtle">Optional · {mods.length} module{mods.length === 1 ? "" : "s"} · {mods.reduce((a, m) => a + m.minutes, 0)} min</Text>
        <Text size="body-lg" tone="muted" className="leading-relaxed">{c.objective}</Text>
      </div>
      {c.settings.screening && locked.length > 0 ? <PrereqLock courses={locked} /> : (
        <div className="squircle flex flex-col gap-3 rounded-card bg-ink p-5 text-white">
          <Text size="title" weight="bold" tone="inverse">Take this course</Text>
          <Text size="body" tone="inverse" className="opacity-80">{c.settings.screening ? "A short screening first, then only the modules you need. Finish it to get a certificate." : "Nobody assigned it, so there's no due date. Finish it to get a certificate."}</Text>
          <Button size="lg" fullWidth onClick={() => { s.selfEnroll(c.id, me.id); router.push(`/rep/course/${c.id}`); }}>Start the course</Button>
        </div>
      )}
      <section className="flex flex-col gap-2">
        <Text as="h2" size="subhead" weight="bold">What&apos;s inside</Text>
        {mods.map((m, i) => (
          <div key={m.id} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-subtle text-micro font-bold text-ink-3">{i + 1}</span>
            <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">{m.title}</Text><Text size="caption" tone="subtle">{m.summary}</Text></span>
            <Text size="caption" tone="subtle" tabular className="shrink-0">{m.minutes} min</Text>
          </div>
        ))}
      </section>
      {/* v1-hidden: {c.allowExplore && <ExploreModules courseId={c.id} />} */}
    </div>
  );
}

export function Confetti() {
  const colors = ["var(--color-brand)", "var(--color-brand-2)", "var(--color-ok)", "var(--color-lime)", "var(--color-ink)"];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0" aria-hidden="true">
      {Array.from({ length: 36 }, (_, i) => (
        <span key={i} className="confetti-piece" style={{
          left: `${(i * 37) % 100}%`, background: colors[i % colors.length], animationDelay: `${(i % 9) * 60}ms`,
          ["--confetti-drift" as string]: `${((i * 53) % 120) - 60}px`, ["--confetti-spin" as string]: `${(i * 97) % 720}deg`,
        }} />
      ))}
    </div>
  );
}
