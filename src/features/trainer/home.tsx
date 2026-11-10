"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live, current } from "@/store/app-store";
import { heatmap, lift, weakestDomains, daysFromToday, fmtDate, isOverdue } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Card, Dot } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { rollouts, STATUS_LABEL, type Rollout } from "./rollouts";

const STATUS_TONE = { behind: "danger", at_risk: "warn", on_track: "ok", scheduled: "default" } as const;

/**
 * The trainer's morning: is anything I'm running at risk, what do I need to do,
 * and can I prove training works. Everything they run is visible at once.
 */
export function TrainerHome() {
  const router = useRouter();
  const s = useApp();
  const { message, open, showToast } = useToast();

  const list = useMemo(() => rollouts(s), [s]);
  const running = list.filter((r) => r.status !== "scheduled");
  const risky = running.filter((r) => r.status !== "on_track");

  /* Proof covers every personalised course. The full picture is in Analytics. */
  const personalised = s.courses.filter((c) => c.type === "personalised");
  const pps = s.progress.filter((p) => personalised.some((c) => c.id === p.courseId));
  const lf = lift(pps);
  const weakest = weakestDomains(heatmap(s, pps, "assessment"))[0];

  /* One queue of things waiting on the trainer. */
  const actions = useMemo(() => {
    const out: { tone: "danger" | "warn" | "faint"; title: string; sub: string; cta: string; href?: string; onClick?: () => void }[] = [];
    for (const course of s.courses) {
      const v = current(course);
      if (v.state === "changes") out.push({ tone: "danger", title: `MLR changes requested · ${course.title} v${v.version}`, sub: `${v.comments.filter((m) => !m.resolved).length} open comments`, cta: "Fix", href: `/trainer/courses/${course.id}/review` });
      if (v.state === "approved") out.push({ tone: "warn", title: `Approved, ready to publish · ${course.title} v${v.version}`, sub: `Doc ${v.docNumber}`, cta: "Publish", href: `/trainer/courses/${course.id}/review` });
      if (v.state === "in_review" && v.submittedAt) out.push({ tone: "faint", title: `In MLR review for ${-daysFromToday(v.submittedAt)} days · ${course.title}`, sub: v.vaultId ? `Vault ${v.vaultId}` : "Submitted", cta: "Update", href: `/trainer/courses/${course.id}/review` });
      const lv = live(course);
      if (lv?.expiresAt && daysFromToday(lv.expiresAt) <= 30) out.push({ tone: "warn", title: `Approval expires in ${daysFromToday(lv.expiresAt)} days · ${course.title} v${lv.version}`, sub: `Doc ${lv.docNumber} · ${s.progress.filter((p) => p.courseId === course.id && p.state === "certified").length} reps certified on it`, cta: "Review", href: `/trainer/courses/${course.id}/review` });
    }
    /* v1-hidden: no manager sign-off in v1.
    const slow = s.progress.filter((p) => p.state === "awaiting_verify" && p.verify && -daysFromToday(p.verify.requestedAt) > 5);
    if (slow.length) out.push({ tone: "warn", title: `${slow.length} verifications waiting over 5 days`, sub: "Managers haven't acted. You can verify on their behalf.", cta: "Verify", href: "/trainer/verify" });
    */
    const overdue = s.progress.filter(isOverdue);
    if (overdue.length) out.push({ tone: "warn", title: `${overdue.length} reps overdue across ${new Set(overdue.map((p) => p.courseId)).size} courses`, sub: `${overdue.filter((p) => p.state === "not_started").length} haven't started`, cta: "Nudge all",
      onClick: () => { let n = 0; for (const p of overdue) if (s.nudge(p.id, "u-maya")) n++; showToast(n ? `Nudged ${n} reps` : "Already nudged in the last 48 hours"); } });
    const maxed = s.progress.filter((p) => p.attempts.filter((a) => !a.passed).length >= 3);
    if (maxed.length) out.push({ tone: "danger", title: `${maxed.length} reps used every attempt`, sub: "No attempts left. Decide what happens next", cta: "View", href: "/trainer/records" });
    return out;
  }, [s, showToast]);

  const headline = risky.length
    ? `${running.length} required courses rolling out. ${risky.slice(0, 2).map((r) => `${r.name} is ${STATUS_LABEL[r.status].toLowerCase()}`).join("; ")}.`
    : `${running.length} required courses rolling out, all on track.`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">Good morning, Maya</Text>
          <Text as="p" size="subhead" tone="muted">{headline} {actions.length ? `${actions.length} things need you.` : ""}</Text>
        </div>
        <Button size="lg" onClick={() => router.push("/trainer/courses/new")}><Plus className="size-4" aria-hidden="true" />Create course</Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Needs your action" actions={<Chip tone="brand" size="md">{actions.length}</Chip>}>
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

        {/* The headline numbers; everything else lives in Analytics. */}
        <Card tone="ink" eyebrow="Proof of progress" title="Screening to final assessment">
          <Text size="caption" tone="inverse" className="-mt-3 opacity-60">All personalised courses · {lf.n} reps with both scores</Text>
          <div className="flex items-baseline gap-3">
            <Text size="display" tone="inverse" className="opacity-60" tabular>{lf.before}</Text>
            <ArrowRight className="size-5 text-white/40" aria-hidden="true" />
            <Text size="hero-lg" tone="inverse" weight="extrabold" tracking="tight" tabular>{lf.after}</Text>
            <Text size="title" weight="bold" className="text-ok-on-dark">+{lf.lift} pts</Text>
          </div>
          {weakest && <Text size="body" tone="inverse" className="opacity-75">Weakest area: {weakest.domain.name.toLowerCase()} at {weakest.value}.</Text>}
          <Link href="/trainer/analytics" className="mt-auto flex items-center gap-1.5 text-body-lg font-semibold text-brand-light hover:underline">Open analytics <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </Card>
      </div>

      <Card title="Required courses" eyebrow="Who's certified by the due date, riskiest first">
        <ul className="-mx-2 flex flex-col">
          {list.map((r) => <RolloutRow key={r.id} r={r} />)}
        </ul>
      </Card>

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
