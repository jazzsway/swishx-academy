"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Plus, ArrowRight, FileDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live, current } from "@/store/app-store";
import { heatmap, lift, minutesSaved, timeToCertified, firstTry, weakestDomains, daysFromToday, fmtDate, isOverdue } from "@/store/selectors";
import { DOMAINS, TODAY } from "@/data/org";
import { PRACTICE_AGGREGATE } from "@/data/seed";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, Dot, bandCellClass } from "@/components/patterns/academy";
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
  const [hmSource, setHmSource] = useState<"assessment" | "screening">("assessment");

  const list = useMemo(() => rollouts(s), [s]);
  const running = list.filter((r) => r.status !== "scheduled");
  const risky = running.filter((r) => r.status !== "on_track");

  /* Proof and gaps cover every personalised course, not one campaign. */
  const personalised = s.courses.filter((c) => c.type === "personalised");
  const pps = s.progress.filter((p) => personalised.some((c) => c.id === p.courseId));
  const lf = lift(pps);
  const saved = Math.round(personalised.reduce((a, c) => a + minutesSaved(pps.filter((p) => p.courseId === c.id), c), 0) / 60);
  const rows = heatmap(s, pps, hmSource);
  const weakest = weakestDomains(rows)[0];

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
    const slow = s.progress.filter((p) => p.state === "awaiting_verify" && p.verify && -daysFromToday(p.verify.requestedAt) > 5);
    if (slow.length) out.push({ tone: "warn", title: `${slow.length} verifications waiting over 5 days`, sub: "Managers haven't acted. You can verify on their behalf.", cta: "Verify", href: "/trainer/verify" });
    const overdue = s.progress.filter(isOverdue);
    if (overdue.length) out.push({ tone: "warn", title: `${overdue.length} reps overdue across ${new Set(overdue.map((p) => p.courseId)).size} courses`, sub: `${overdue.filter((p) => p.state === "not_started").length} haven't started`, cta: "Nudge all",
      onClick: () => { let n = 0; for (const p of overdue) if (s.nudge(p.id, "u-maya")) n++; showToast(n ? `Nudged ${n} reps` : "Already nudged in the last 48 hours"); } });
    const maxed = s.progress.filter((p) => p.attempts.filter((a) => !a.passed).length >= 3);
    if (maxed.length) out.push({ tone: "danger", title: `${maxed.length} reps used every attempt`, sub: "Escalated to their managers", cta: "View", href: "/trainer/records" });
    return out;
  }, [s, showToast]);

  const headline = risky.length
    ? `${running.length} rollouts running. ${risky.slice(0, 2).map((r) => `${r.name} is ${STATUS_LABEL[r.status].toLowerCase()}`).join("; ")}.`
    : `${running.length} rollouts running, all on track.`;

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
        <Card className="lg:col-span-2" title="Skill gaps by region" actions={
          <Segmented aria-label="Score source">
            <SegmentedButton active={hmSource === "assessment"} onClick={() => setHmSource("assessment")}>Latest assessment</SegmentedButton>
            <SegmentedButton active={hmSource === "screening"} onClick={() => setHmSource("screening")}>Screening</SegmentedButton>
          </Segmented>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[440px] border-separate border-spacing-1 text-body">
              <thead>
                <tr className="text-left text-caption text-ink-3">
                  <th scope="col" className="px-1 font-semibold" />
                  {DOMAINS.filter((d) => d.id !== "compliance").map((d) => <th key={d.id} scope="col" className="px-1 font-semibold">{d.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <th scope="row" className="px-1 text-left font-semibold">{r.name}</th>
                    {r.cells.map((cell) => (
                      <td key={cell.domain} className={`rounded-chip px-1.5 py-2.5 text-center font-bold tabular-nums ${bandCellClass(cell.value)}`}>{cell.value ?? "–"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {weakest && <Text as="p" size="body-lg" tone="muted">{weakest.domain.name} is the weakest area at {weakest.value}. A short booster on it would reach the most reps.</Text>}
        </Card>

        <Card title="Signals" eyebrow="Worth a look this week">
          <Link href="/trainer/courses/c-lumora-launch?module=lm4" className="group flex items-start gap-3">
            <Dot tone="danger" />
            <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">Reps stop the LUMEN results video at 1:40</Text><Text size="caption" tone="subtle">62% of the last 120 viewers. Consider splitting it.</Text></span>
            <ChevronRight className="mt-1 size-4 text-ink-4 group-hover:text-ink" aria-hidden="true" />
          </Link>
          <Link href="/trainer/courses/c-lumora-launch/questions" className="group flex items-start gap-3">
            <Dot tone="danger" />
            <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">A dosing question only 31% get right</Text><Text size="caption" tone="subtle">Hepatic impairment. The wording may be unclear.</Text></span>
            <ChevronRight className="mt-1 size-4 text-ink-4 group-hover:text-ink" aria-hidden="true" />
          </Link>
          <div className="flex items-start gap-3 border-t border-hair pt-4">
            <Lock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
            <span className="flex min-w-0 flex-1 flex-col">
              <Text size="body-lg" weight="semibold">{PRACTICE_AGGREGATE.sessionsThisWeek} practice sessions this week</Text>
              <Text size="caption" tone="subtle">Most missed: {PRACTICE_AGGREGATE.missed[0].criterion.toLowerCase()} ({PRACTICE_AGGREGATE.missed[0].hit}%). Anonymous, groups of 5+.</Text>
            </span>
          </div>
        </Card>
      </div>
      <Card title="Rollouts" eyebrow="Everything you're running, riskiest first"
        actions={<Link href="/trainer/campaigns/new" className="text-body-lg font-semibold text-brand-deep hover:underline">New campaign</Link>}>
        <ul className="-mx-2 flex flex-col">
          {list.map((r) => <RolloutRow key={r.id} r={r} />)}
        </ul>
      </Card>

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

        <Card tone="ink" eyebrow="Proof of progress" title="Screening to final assessment">
          <Text size="caption" tone="inverse" className="-mt-3 opacity-60">All personalised courses · {lf.n} reps with both scores</Text>
          <div className="flex items-baseline gap-3">
            <Text size="display" tone="inverse" className="opacity-60" tabular>{lf.before}</Text>
            <ArrowRight className="size-5 text-white/40" aria-hidden="true" />
            <Text size="hero-lg" tone="inverse" weight="extrabold" tracking="tight" tabular>{lf.after}</Text>
            <Text size="title" weight="bold" className="text-ok-on-dark">+{lf.lift} pts</Text>
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 pt-4 text-body-lg">
            {[
              ["Reps who improved", `${lf.improved}%`],
              ["Median days to certified", `${timeToCertified(pps)}`],
              ["Time saved by personalisation", `${saved} h`],
              ["First-try pass rate", `${firstTry(pps)}%`],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><span className="text-white/65">{k}</span><span className="font-bold tabular-nums">{v}</span></div>
            ))}
          </div>
          <Button variant="ghost" className="mt-auto border-white/20 text-white hover:bg-white/10 hover:text-white" fullWidth onClick={exportProof}>
            <FileDown className="size-4" aria-hidden="true" />Export proof pack
          </Button>
        </Card>
      </div>

      <Toast message={message} open={open} />
    </div>
  );

  function exportProof() {
    const csv = [
      "Metric,Value",
      `Scope,All personalised courses`,
      `Generated,${TODAY.toDateString()}`,
      ...running.map((r) => `${r.name},${r.certified} of ${r.total} certified (${r.ready}%) · projected ${r.projected}%`),
      `Average screening score,${lf.before}`,
      `Average final score,${lf.after}`,
      `Lift (points),${lf.lift}`,
      `Reps improved,${lf.improved}%`,
      `Median days to certified,${timeToCertified(pps)}`,
      `Hours saved by personalisation,${saved}`,
      `Weakest domain,${weakest?.domain.name ?? "-"}`,
      "Note,Prototype with fictional data",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "academy-proof-pack.csv";
    a.click();
    showToast("Proof pack downloaded");
  }
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
