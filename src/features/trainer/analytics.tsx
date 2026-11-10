"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, FileDown, Lock, SearchX } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live } from "@/store/app-store";
import { counts, heatmap, lift, minutesSaved, timeToCertified, firstTry, weakestDomains, pct, isOverdue } from "@/store/selectors";
import { DOMAINS, TODAY } from "@/data/org";
import { PRACTICE_AGGREGATE } from "@/data/seed";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { PageHeading } from "@/components/patterns/page-heading";
import { Card, Dot, Meter, Stat, bandCellClass } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { COMPARATIVE_HINTS, OFF_LABEL_HINTS } from "@/features/library/library-data";

/**
 * Every number the trainer looks at, in one place: does training work, where are the gaps,
 * how each course is landing, and what reps practise and look for. Aggregates only;
 * a named person lives in Teams.
 */
export function TrainerAnalytics() {
  const s = useApp();
  const { message, open, showToast } = useToast();
  const personalised = s.courses.filter((c) => c.type === "personalised" && live(c));
  const [scope, setScope] = useState<string>("all");
  const [hmSource, setHmSource] = useState<"assessment" | "screening">("assessment");

  const inScope = scope === "all" ? personalised : personalised.filter((c) => c.id === scope);
  const pps = s.progress.filter((p) => inScope.some((c) => c.id === p.courseId));
  const lf = lift(pps);
  const saved = Math.round(inScope.reduce((a, c) => a + minutesSaved(pps.filter((p) => p.courseId === c.id), c), 0) / 60);
  const rows = heatmap(s, pps, hmSource);
  const weakest = weakestDomains(rows)[0];
  const scopeName = scope === "all" ? "All personalised courses" : inScope[0]?.title ?? "";

  const courseRows = useMemo(() => s.courses.filter((c) => live(c)).map((c) => {
    const ps = s.progress.filter((p) => p.courseId === c.id);
    const k = counts(ps);
    const scores = ps.map((p) => p.attempts.filter((a) => a.passed).at(-1)?.overall).filter((x): x is number => x !== undefined);
    return { c, k, started: k.total - k.not_started, overdue: ps.filter(isOverdue).length, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined };
  }).filter((r) => r.k.total).sort((a, b) => pct(a.k.certified, a.k.total) - pct(b.k.certified, b.k.total)), [s.courses, s.progress]);

  /* What reps went looking for and found nothing approved. */
  const gaps = s.searches.filter((x) => x.results === 0).sort((a, b) => b.count - a.count);
  const viewed = useMemo(() => s.courses.filter((c) => live(c)).map((c) => ({ id: c.id, title: c.title, views: s.libraryViews[c.id] ?? 0 }))
    .sort((a, b) => b.views - a.views).slice(0, 5), [s.courses, s.libraryViews]);
  const maxViews = Math.max(1, ...viewed.map((r) => r.views));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Analytics" description="How training is working across your courses. Everything here is aggregated; open Teams to see a person."
        actions={
          <select aria-label="Course" value={scope} onChange={(e) => setScope(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
            <option value="all">All personalised courses</option>
            {personalised.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        } />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card tone="ink" eyebrow="Proof of progress" title="Screening to final assessment">
          <Text size="caption" tone="inverse" className="-mt-3 opacity-60">{scopeName} · {lf.n} reps with both scores</Text>
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
          {weakest ? <Text as="p" size="body-lg" tone="muted">{weakest.domain.name} is the weakest area at {weakest.value}. A short booster on it would reach the most reps.</Text>
            : <Text tone="subtle">No scores yet for this course.</Text>}
        </Card>
      </div>

      <Card title="Courses" eyebrow="How each published course is landing, lowest certified first">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-body">
            <thead>
              <tr className="border-b border-hair text-left text-caption text-ink-3">
                <th scope="col" className="py-2 pr-3 font-semibold">Course</th>
                <th scope="col" className="px-3 py-2 font-semibold">Assigned</th>
                <th scope="col" className="px-3 py-2 font-semibold">Started</th>
                <th scope="col" className="w-[28%] px-3 py-2 font-semibold">Certified</th>
                <th scope="col" className="px-3 py-2 font-semibold">Overdue</th>
                <th scope="col" className="px-3 py-2 font-semibold">Avg final score</th>
                <th scope="col" className="w-6" />
              </tr>
            </thead>
            <tbody>
              {courseRows.map(({ c, k, started, overdue, avg }) => {
                const done = pct(k.certified, k.total);
                return (
                  <tr key={c.id} className="group border-b border-hair last:border-0">
                    <th scope="row" className="py-3 pr-3 text-left font-semibold"><Link href={`/trainer/courses/${c.id}`} className="hover:underline">{c.title}</Link></th>
                    <td className="px-3 tabular-nums">{k.total}</td>
                    <td className="px-3 tabular-nums">{pct(started, k.total)}%</td>
                    <td className="px-3">
                      <span className="flex items-center gap-2.5"><Meter value={done} tone={done >= 80 ? "ok" : done >= 50 ? "brand" : "warn"} label={`${c.title} ${done}% certified`} /><span className="w-10 shrink-0 text-right font-bold tabular-nums">{done}%</span></span>
                    </td>
                    <td className={cn("px-3 tabular-nums", overdue && "font-semibold text-danger")}>{overdue || "–"}</td>
                    <td className="px-3 tabular-nums">{avg ?? "–"}</td>
                    <td><Link href={`/trainer/courses/${c.id}`} aria-label={`Open ${c.title}`}><ChevronRight className="size-4 text-ink-4 group-hover:text-ink" aria-hidden="true" /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
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
        </Card>

        <Card className="lg:col-span-2" title="Practice" eyebrow="Private practice calls, as a group"
          actions={<span className="flex items-center gap-1 text-caption text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Anonymous, groups of 5+</span>}>
          <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div className="flex flex-col gap-4">
              <Stat label="Sessions this week" value={PRACTICE_AGGREGATE.sessionsThisWeek} />
              <Stat label="Reps practising" value={PRACTICE_AGGREGATE.practisingReps} />
            </div>
            <div className="flex flex-col gap-3">
              <Text size="caption" weight="semibold" tone="subtle">Most missed on practice calls</Text>
              {PRACTICE_AGGREGATE.missed.map((m) => (
                <div key={m.criterion} className="flex flex-col gap-1.5">
                  <div className="flex justify-between gap-3 text-body"><span className="truncate">{m.criterion}</span><strong className="tabular-nums">{m.hit}%</strong></div>
                  <Meter value={m.hit} tone={m.hit < 50 ? "danger" : m.hit < 70 ? "warn" : "ok"} label={`${m.criterion} ${m.hit}% hit`} />
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Most opened courses" eyebrow="Last 30 days" actions={<span className="flex items-center gap-1 text-caption text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Counts only, never per rep</span>}>
          <div className="flex flex-col gap-3">
            {viewed.map((r) => (
              <div key={r.id} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3 text-body"><span className="truncate">{r.title}</span><strong className="tabular-nums">{r.views}</strong></div>
                <Meter value={(r.views / maxViews) * 100} tone="brand-2" label={`${r.title} ${r.views} views`} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Questions with no approved answer" eyebrow="Content gaps">
          {gaps.length === 0 ? <Text tone="subtle">Every question found approved content.</Text> : (
            <ul className="flex flex-col">
              {gaps.map((x) => {
                const off = OFF_LABEL_HINTS.some((h) => x.q.includes(h));
                const cmp = !off && COMPARATIVE_HINTS.some((h) => ` ${x.q}`.includes(h));
                return (
                  <li key={x.q} className="flex items-start gap-3 border-b border-hair py-3 last:border-0">
                    <SearchX className={cn("mt-0.5 size-4.5 shrink-0", off || cmp ? "text-danger" : "text-warn")} aria-hidden="true" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Text size="body-lg" weight="semibold">“{x.q}” <span className="font-normal text-ink-3">· asked {x.count} times</span></Text>
                      <Text size="caption" tone="subtle">{off ? "Looks like interest in an unapproved use. Remind reps how to submit a Medical Information request; don't create content." : cmp ? "Looks like interest in comparisons. There are no head-to-head data, so remind reps not to compare; don't create content." : "No approved content covers this. A candidate for your next course."}</Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Toast message={message} open={open} />
    </div>
  );

  function exportProof() {
    const csv = [
      "Metric,Value",
      `Scope,${scopeName}`,
      `Generated,${TODAY.toDateString()}`,
      ...courseRows.map(({ c, k }) => `${c.title},${k.certified} of ${k.total} certified (${pct(k.certified, k.total)}%)`),
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
