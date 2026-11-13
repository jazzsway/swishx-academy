"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, ChevronRight, PencilLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live, current } from "@/store/app-store";
import { daysFromToday, fmtDate, isOverdue, opensLater } from "@/store/selectors";
import { courseMinutes } from "@/lib/learning";
import { TODAY } from "@/data/org";
import type { Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Avatar, Card, Dot } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { runChecks } from "./course/checks";
import { rollouts, STATUS_LABEL, type Rollout } from "./rollouts";
import { NewCourseModal } from "./course-start";

const STATUS_TONE = { behind: "danger", at_risk: "warn", on_track: "ok", scheduled: "default" } as const;
const WEEK = 7;

/**
 * The trainer's day, not their dashboard: what needs doing now, which deadlines are close,
 * what they're building, and what changed this week. Trends and proof live in Analytics.
 */
export function TrainerHome() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const s = useApp();
  const { message, open, showToast } = useToast();
  const users = useMemo(() => new Map(s.users.map((u) => [u.id, u])), [s.users]);
  const courseOf = (p: Progress) => s.courses.find((c) => c.id === p.courseId)!;

  /* Deadlines: courses still rolling out. Upcoming ones soonest first; ones past their date with stragglers after. */
  const today = TODAY.toISOString().slice(0, 10);
  const all = useMemo(() => rollouts(s).filter((r) => r.status !== "scheduled"), [s]);
  const deadlines = all.filter((r) => !r.dueAt || r.dueAt >= today).sort((a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"));
  const pastDue = all.filter((r) => r.dueAt && r.dueAt < today && r.certified < r.total).sort((a, b) => b.dueAt!.localeCompare(a.dueAt!));
  const atRisk = deadlines.filter((r) => r.status !== "on_track");

  /* Drafts: anything not live yet, with what stands between it and publishing. */
  const drafts = s.courses.filter((c) => current(c).state !== "published" && current(c).state !== "withdrawn" && c.modules.length)
    .map((c) => ({ c, red: runChecks(c).filter((f) => f.severity === "red").length, live: live(c) }))
    .sort((a, b) => b.c.updatedAt.localeCompare(a.c.updatedAt));

  /* The to-do list: only things a trainer can act on today, each with the button that does it. */
  const actions = useMemo(() => {
    const out: { tone: "danger" | "warn" | "faint"; title: string; sub: string; cta: string; href?: string; onClick?: () => void }[] = [];
    const stuck = s.progress.filter((p) => p.state !== "certified" && p.attempts.length && !p.attempts.at(-1)!.passed);
    const last = stuck.filter((p) => courseOf(p).settings.attempts - p.attempts.length <= 1);
    if (stuck.length) out.push({ tone: last.length ? "danger" : "warn", title: `${stuck.length} rep${stuck.length === 1 ? "" : "s"} didn't pass their final`, sub: last.length ? `${last.length} on their last attempt. A coaching note before the retake helps.` : "Each has a retake path built from what held them back.", cta: "See who", href: "/trainer/analytics" });
    const overdue = s.progress.filter(isOverdue);
    if (overdue.length) out.push({ tone: "warn", title: `${overdue.length} reps overdue across ${new Set(overdue.map((p) => p.courseId)).size} courses`, sub: `${overdue.filter((p) => p.state === "not_started").length} haven't started`, cta: "Nudge all",
      onClick: () => { let n = 0; for (const p of overdue) if (s.nudge(p.id, "u-maya")) n++; showToast(n ? `Nudged ${n} reps` : "Already nudged in the last 48 hours"); } });
    const idle = s.progress.filter((p) => p.state === "not_started" && !opensLater(p) && !isOverdue(p) && -daysFromToday(p.assignedAt) >= WEEK);
    if (idle.length) out.push({ tone: "faint", title: `${idle.length} assigned a week ago and not started`, sub: "Not overdue yet. A reminder now keeps them on track.", cta: "Nudge",
      onClick: () => { let n = 0; for (const p of idle) if (s.nudge(p.id, "u-maya")) n++; showToast(n ? `Nudged ${n} reps` : "Already nudged in the last 48 hours"); } });
    const ready = drafts.filter((d) => d.red === 0);
    if (ready.length) out.push({ tone: "warn", title: `${ready.length} draft${ready.length === 1 ? " is" : "s are"} ready to publish`, sub: ready.map((d) => `${d.c.title} v${current(d.c).version}`).join(" · "), cta: "Publish", href: `/trainer/courses/${ready[0].c.id}/review` });
    const gaps = s.searches.filter((x) => x.results === 0).sort((a, b) => b.count - a.count);
    if (gaps.length) out.push({ tone: "faint", title: `Reps asked about “${gaps[0].q}” ${gaps[0].count} times`, sub: "Nothing approved covers it. See what else reps are looking for.", cta: "Review", href: "/trainer/analytics" });
    return out;
  }, [s, drafts, showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  /* This week, as a feed: certifications, misses, people starting and picking courses themselves. */
  const since = new Date(TODAY.getTime() - WEEK * 86400000).toISOString().slice(0, 10);
  const feed = useMemo(() => s.progress.flatMap((p) => {
    const u = users.get(p.userId);
    if (!u) return [];
    const c = courseOf(p);
    const e: { at: string; who: typeof u; text: string; tone: "ok" | "danger" | "brand" | "faint" }[] = [];
    if (p.certifiedAt && p.certifiedAt >= since) e.push({ at: p.certifiedAt, who: u, text: `got certified on ${c.title}`, tone: "ok" });
    p.attempts.filter((a) => a.at >= since && !a.passed).forEach((a) => e.push({ at: a.at, who: u, text: `didn't pass ${c.title} (${a.overall}%)`, tone: "danger" }));
    if (p.assignType === "self" && p.assignedAt >= since) e.push({ at: p.assignedAt, who: u, text: `picked ${c.title} from the Library`, tone: "brand" });
    if (p.screening && p.screening.at >= since) e.push({ at: p.screening.at, who: u, text: `took the ${c.title} screening (${p.screening.overall}%)`, tone: "faint" });
    return e;
  }).sort((a, b) => b.at.localeCompare(a.at)), [s.progress, users, since]); // eslint-disable-line react-hooks/exhaustive-deps
  const certifiedThisWeek = feed.filter((e) => e.tone === "ok").length;

  const summary = [
    actions.length ? `${actions.length} thing${actions.length === 1 ? "" : "s"} need you` : "Nothing needs you right now",
    atRisk.length ? `${atRisk.map((r) => r.name).slice(0, 2).join(" and ")} ${atRisk.length === 1 ? "is" : "are"} behind or at risk` : deadlines.length ? "every deadline is on track" : "",
    certifiedThisWeek ? `${certifiedThisWeek} certified this week` : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">Good morning, Maya</Text>
          <Text as="p" size="subhead" tone="muted">{summary}.</Text>
        </div>
        <Button size="lg" onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden="true" />Create course</Button>
        <NewCourseModal open={creating} onClose={() => setCreating(false)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Needs your action" actions={<Chip tone="brand" size="md">{actions.length}</Chip>}>
          {actions.length === 0 ? <Text tone="subtle">Nothing waiting on you. Nice.</Text> : (
            <ul className="flex flex-col">
              {actions.map((a, i) => (
                <li key={i} className="flex items-center gap-3.5 border-b border-hair py-3 last:border-0">
                  <Dot tone={a.tone} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <Text size="body-lg" weight="semibold">{a.title}</Text>
                    <Text size="caption" tone="subtle">{a.sub}</Text>
                  </div>
                  <Button size="sm" variant={i === 0 ? "primary" : "secondary"} onClick={() => (a.href ? router.push(a.href) : a.onClick?.())}>{a.cta}</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="This week" eyebrow={`Since ${fmtDate(since)}`} actions={<Link href="/trainer/analytics" className="flex items-center gap-1 text-body font-semibold text-brand-deep hover:underline">Analytics <ArrowRight className="size-4" aria-hidden="true" /></Link>}>
          {feed.length === 0 ? <Text tone="subtle">Quiet week so far.</Text> : (
            <ul className="-mx-1 flex flex-col">
              {feed.slice(0, 7).map((e, i) => (
                <li key={i}>
                  <Link href={`/trainer/people/${e.who.id}`} className="flex items-center gap-2.5 rounded-control px-1 py-1.5 hover:bg-subtle">
                    <Avatar initials={e.who.initials} size={28} />
                    <Text size="body" className="min-w-0 flex-1 leading-snug"><strong className="font-semibold text-ink">{e.who.name}</strong> <span className={cn(e.tone === "danger" ? "text-danger" : "text-ink-2")}>{e.text}</span></Text>
                    <Text size="micro" tone="subtle" className="shrink-0">{fmtDate(e.at)}</Text>
                  </Link>
                </li>
              ))}
              {feed.length > 7 && <Text size="caption" tone="subtle" className="px-1 pt-1">and {feed.length - 7} more this week</Text>}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Deadlines" eyebrow="Courses rolling out, soonest due first">
        {deadlines.length === 0 ? <Text tone="subtle">No upcoming deadlines.</Text> : (
          <ul className="-mx-2 flex flex-col">
            {deadlines.map((r) => <RolloutRow key={r.id} r={r} />)}
          </ul>
        )}
        {pastDue.length > 0 && (
          <div className="flex flex-col gap-1 border-t border-hair pt-3">
            <Text size="caption" weight="bold" tone="subtle">Past their due date, still not finished</Text>
            <ul className="-mx-2 flex flex-col">
              {pastDue.map((r) => (
                <li key={r.id}>
                  <Link href={`${r.href}/people`} className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-panel px-2 py-2.5 hover:bg-subtle">
                    <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold" truncate>{r.name}</Text>
                      <Text size="caption" tone="subtle">{r.kind} · was due {fmtDate(r.dueAt, true)}</Text></span>
                    <Text size="body" weight="semibold" className="text-danger" tabular>{r.total - r.certified} of {r.total} still not certified</Text>
                    <ChevronRight className="size-4 shrink-0 text-ink-4 group-hover:text-ink" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {drafts.length > 0 && (
        <Card title="Continue building" eyebrow={`${drafts.length} draft${drafts.length === 1 ? "" : "s"}, not live yet`}>
          <ul className="-mx-2 flex flex-col">
            {drafts.map(({ c, red, live: lv }) => (
              <li key={c.id}>
                <Link href={`/trainer/courses/${c.id}`} className="group flex flex-wrap items-center gap-x-4 gap-y-1 rounded-panel px-2 py-3 hover:bg-subtle">
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-subtle text-ink-3"><PencilLine className="size-4" aria-hidden="true" /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <Text size="body-lg" weight="semibold" truncate>{c.title} <span className="font-normal text-ink-3">v{current(c).version}</span></Text>
                    <Text size="caption" tone="subtle">{c.modules.length} modules · {courseMinutes(c)} min · updated {fmtDate(c.updatedAt)}{lv ? ` · v${lv.version} stays live meanwhile` : ""}</Text>
                  </span>
                  <Chip size="sm" tone={red ? "danger" : "ok"}>{red ? `${red} to fix before publishing` : "Ready to publish"}</Chip>
                  <ChevronRight className="size-4 shrink-0 text-ink-4 group-hover:text-ink" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Toast message={message} open={open} />
    </div>
  );
}

function RolloutRow({ r }: { r: Rollout }) {
  const scheduled = r.status === "scheduled";
  return (
    <li>
      <Link href={r.href} className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 rounded-panel px-2 py-3 transition-colors hover:bg-subtle md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_120px_auto]">
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-2"><Text size="body-lg" weight="bold" truncate>{r.name}</Text></span>
          <Text size="caption" tone="subtle" truncate>{r.kind} · {r.audience}{r.dueAt && !scheduled ? ` · due ${fmtDate(r.dueAt)}` : ""}</Text>
        </span>
        <span className="col-span-2 row-start-2 flex min-w-0 flex-col gap-1.5 md:col-span-1 md:row-start-auto">
          {scheduled ? <Text size="body" tone="subtle">{r.blocker.text}</Text> : (
            <>
              {/* Certified so far, with a tick where the target sits. */}
              <span className="relative block h-2 rounded-full bg-black/[0.07]">
                <span className={cn("absolute inset-y-0 left-0 rounded-full", r.status === "behind" ? "bg-danger" : r.status === "at_risk" ? "bg-warn" : "bg-ok")} style={{ width: `${r.ready}%` }} />
                <span className="absolute -top-1 h-4 w-0.5 rounded-full bg-ink/40" style={{ left: `${r.target}%` }} aria-hidden="true" />
              </span>
              <Text size="caption" tone={r.blocker.tone === "danger" ? "danger" : "subtle"} truncate>{r.blocker.text}</Text>
            </>
          )}
        </span>
        <span className="hidden flex-col items-end md:flex">
          {!scheduled && <><Text size="subhead" weight="extrabold" tabular>{r.ready}%</Text><Text size="caption" tone="subtle" tabular title={`Projected ${r.projected}% by the due date. Target ${r.target}%, the tick on the bar.`}>→ {r.projected}% projected</Text></>}
        </span>
        <span className="flex items-center gap-2">
          <Chip size="sm" tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Chip>
          <ChevronRight className="size-4 text-ink-4 group-hover:text-ink" aria-hidden="true" />
        </span>
      </Link>
    </li>
  );
}
