"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, FileDown, Lock, SearchX } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live } from "@/store/app-store";
import { counts, daysFromToday, firstTry, fmtDate, heatmap, isOverdue, lift, minutesSaved, opensLater, pct, timeToCertified } from "@/store/selectors";
import { COMPETENCIES, DIVISIONS, DOMAINS, REGIONS, TODAY, competency } from "@/data/org";
import { PRACTICE_AGGREGATE } from "@/data/seed";
import type { Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { PageHeading } from "@/components/patterns/page-heading";
import { Avatar, Card, Dot, Meter, Stat, bandCellClass } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { COMPARATIVE_HINTS, OFF_LABEL_HINTS } from "@/features/library/library-data";
import { LeaderboardSection } from "./leaderboard";

const finalScore = (p: Progress) => p.attempts.filter((a) => a.passed).at(-1)?.overall ?? p.attempts.at(-1)?.overall;
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const WEEKS = 12;

/**
 * Analytics, in the order a trainer asks: is training working, are people getting through,
 * which skills are still weak, which courses need attention, who needs me, and what to fix in
 * the content. Filter by course and region; a named person opens in Teams.
 */
export function TrainerAnalytics() {
  const s = useApp();
  const { message, open, showToast } = useToast();
  const [scope, setScope] = useState("all");
  const [region, setRegion] = useState("all");
  const [hmSource, setHmSource] = useState<"assessment" | "screening">("assessment");

  const users = useMemo(() => new Map(s.users.map((u) => [u.id, u])), [s.users]);
  const published = s.courses.filter((c) => live(c));
  const inScope = scope === "all" ? published : published.filter((c) => c.id === scope);
  const ps = s.progress.filter((p) => inScope.some((c) => c.id === p.courseId) && (region === "all" || users.get(p.userId)?.regionId === region));
  const courseOf = (p: Progress) => s.courses.find((c) => c.id === p.courseId)!;
  const scopeName = `${scope === "all" ? "All courses" : inScope[0]?.title}${region === "all" ? "" : ` · ${REGIONS.find((r) => r.id === region)?.name}`}`;

  /* 1 · Is it working: only people with a screening and a final count towards gain. */
  const measured = ps.filter((p) => p.screening && p.attempts.length);
  const lf = lift(ps);
  const saved = Math.round(inScope.reduce((a, c) => a + minutesSaved(ps.filter((p) => p.courseId === c.id), c), 0) / 60);

  /* 2 · Are people getting through. */
  const k = counts(ps);
  const scheduled = ps.filter((p) => p.state !== "certified" && opensLater(p)).length;
  const funnel = [
    { label: "Assigned", n: ps.length },
    { label: "Started", n: ps.filter((p) => p.state !== "not_started").length },
    { label: "Took a final assessment or signed off", n: ps.filter((p) => p.attempts.length || p.attestedAt || p.state === "certified").length },
    { label: "Certified", n: k.certified },
  ];
  const weeks = useMemo(() => Array.from({ length: WEEKS }, (_, i) => {
    const end = new Date(TODAY.getTime() - (WEEKS - 1 - i) * 7 * 86400000);
    const start = new Date(end.getTime() - 7 * 86400000);
    return { end, n: ps.filter((p) => p.certifiedAt && new Date(p.certifiedAt) > start && new Date(p.certifiedAt) <= end).length };
  }), [ps]);
  const maxWeek = Math.max(1, ...weeks.map((w) => w.n));

  /* 3 · Skills: the average screening score against the average latest score, per competency. */
  const skills = COMPETENCIES.map((c) => {
    const pairs = measured.filter((p) => p.screening!.scores[c.id] !== undefined && p.attempts.at(-1)!.competencyScores[c.id] !== undefined);
    return pairs.length ? { id: c.id, n: pairs.length, before: avg(pairs.map((p) => p.screening!.scores[c.id])), now: avg(pairs.map((p) => p.attempts.at(-1)!.competencyScores[c.id])) } : null;
  }).filter(Boolean).sort((a, b) => a!.now - b!.now) as { id: string; n: number; before: number; now: number }[];
  const rows = heatmap(s, ps.filter((p) => p.screening), hmSource);

  /* 4 · Courses, weakest certification first. */
  const courseRows = inScope.map((c) => {
    const cps = ps.filter((p) => p.courseId === c.id);
    const kc = counts(cps);
    const m = cps.filter((p) => p.screening && p.attempts.length);
    return { c, k: kc, started: cps.filter((p) => p.state !== "not_started").length, overdue: cps.filter(isOverdue).length,
      gain: m.length ? avg(m.map((p) => finalScore(p)! - p.screening!.overall)) : undefined, first: cps.some((p) => p.attempts.length) ? firstTry(cps) : undefined };
  }).filter((r) => r.k.total).sort((a, b) => pct(a.k.certified, a.k.total) - pct(b.k.certified, b.k.total));

  /* 5 · People who need the trainer, and the ones to celebrate. */
  const person = (p: Progress) => ({ p, u: users.get(p.userId)!, c: courseOf(p) });
  const needsHelp = ps.filter((p) => p.state !== "certified" && p.attempts.length > 0 && !p.attempts.at(-1)!.passed)
    .sort((a, b) => (courseOf(a).settings.attempts - a.attempts.length) - (courseOf(b).settings.attempts - b.attempts.length)).slice(0, 5).map(person);
  const notStarted = ps.filter((p) => p.state === "not_started" && !opensLater(p) && -daysFromToday(p.assignedAt) >= 7)
    .sort((a, b) => (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9")).slice(0, 5).map(person);
  const improved = measured.map((p) => ({ ...person(p), gain: finalScore(p)! - p.screening!.overall })).sort((a, b) => b.gain - a.gain).slice(0, 5);

  /* 3b · Baseline to final, by field team: where each team started and where it is now. */
  const teams = DIVISIONS.map((d) => {
    const m = measured.filter((p) => users.get(p.userId)?.divisionId === d.id);
    return m.length ? { id: d.id, name: d.name, n: m.length, before: avg(m.map((p) => p.screening!.overall)), now: avg(m.map((p) => finalScore(p)!)) } : null;
  }).filter(Boolean) as { id: string; name: string; n: number; before: number; now: number }[];
  const practiceOnly = ps.filter((p) => p.mode === "practice").length;

  /* 6 · Content. */
  const gaps = s.searches.filter((x) => x.results === 0).sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Analytics" description="Is training working, who's getting through, who's learning most this month, and where to act. Filter by course or region; open a person in Teams."
        actions={<>
          <select aria-label="Course" value={scope} onChange={(e) => setScope(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
            <option value="all">All courses</option>
            {published.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
            <option value="all">All regions</option>
            {REGIONS.filter((r) => s.users.some((u) => u.regionId === r.id)).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <Button variant="secondary" onClick={exportProof}><FileDown className="size-4" aria-hidden="true" />Export proof pack</Button>
        </>} />

      {/* 1 · Is it working */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Card padded><Stat label="Certified" value={`${pct(k.certified, k.total)}%`} sub={`${k.certified} of ${k.total} assignments`} tone="ok" /></Card>
        <Card padded><Stat label="Knowledge gain" value={lf.n ? `+${lf.lift} pts` : "—"} sub={lf.n ? `${lf.before} → ${lf.after} · ${lf.n} reps screened and assessed` : "Needs a screening and a final"} tone={lf.n ? "ok" : "default"} /></Card>
        <Card padded><Stat label="Pass first time" value={measured.length ? `${firstTry(ps)}%` : "—"} sub={`${lf.improved}% of assessed reps improved`} /></Card>
        <Card padded><Stat label="Days to certified" value={k.certified ? timeToCertified(ps) : "—"} sub={saved ? `Median · ${saved} h saved by screening` : "Median, from assignment"} /></Card>
        <Card padded><Stat label="Overdue" value={k.overdue} tone={k.overdue ? "danger" : "default"} sub={`${k.not_started} not started${scheduled ? ` · ${scheduled} scheduled` : ""}`} /></Card>
      </div>

      {/* 2 · Are people getting through */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="From assigned to certified" eyebrow={scopeName}>
          <div className="flex flex-col gap-3">
            {funnel.map((f) => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3 text-body"><span>{f.label}</span><span className="tabular-nums"><strong>{f.n}</strong> <span className="text-ink-3">· {pct(f.n, ps.length)}%</span></span></div>
                <Meter value={pct(f.n, ps.length)} tone={f.label === "Certified" ? "ok" : "brand"} label={`${f.label} ${pct(f.n, ps.length)}%`} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Certifications per week" eyebrow={`Last ${WEEKS} weeks · ${weeks.reduce((a, w) => a + w.n, 0)} in total`}>
          <div className="flex h-40 items-end gap-1.5" role="img" aria-label={`Certifications per week, latest ${weeks.at(-1)!.n}`}>
            {weeks.map((w, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1" title={`Week to ${fmtDate(w.end.toISOString())}: ${w.n}`}>
                {w.n > 0 && <span className="text-micro font-semibold tabular-nums text-ink-3">{w.n}</span>}
                <span className={cn("w-full rounded-t-[6px]", i === weeks.length - 1 ? "bg-brand" : "bg-brand-2/70")} style={{ height: `${Math.max(w.n ? 6 : 2, (w.n / maxWeek) * 120)}px` }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-caption text-ink-3"><span>{fmtDate(weeks[0].end.toISOString())}</span><span>This week</span></div>
        </Card>
      </div>

      {/* 3 · Skills */}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Skills, at screening and now" eyebrow={skills.length ? `${skills.filter((x) => x.now > x.before).length} of ${skills.length} competencies improved · weakest first` : "Needs screened and assessed reps"}>
          {skills.length === 0 ? <Text tone="subtle">No one in this view has a screening and a final assessment yet.</Text> : (
            <div className="flex flex-col gap-3">
              {skills.map((x) => (
                <div key={x.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[190px_minmax(0,1fr)_auto]">
                  <Text size="body" weight="semibold" truncate>{competency(x.id)?.name}</Text>
                  <span className="relative col-span-2 block h-2.5 rounded-full bg-black/[0.06] sm:col-span-1">
                    <span className="absolute inset-y-0 left-0 rounded-full bg-black/15" style={{ width: `${x.before}%` }} />
                    <span className={`absolute inset-y-0 left-0 rounded-full ${x.now >= 80 ? "bg-ok" : x.now >= 60 ? "bg-brand-2" : "bg-danger"}`} style={{ width: `${x.now}%`, opacity: 0.85 }} />
                  </span>
                  <span className="row-start-1 flex items-center gap-2 justify-self-end sm:row-start-auto">
                    <Text size="caption" tone="subtle" tabular>{x.before} →</Text>
                    <Text size="body" weight="semibold" tabular>{x.now}</Text>
                    <Chip size="xs" tone={x.now > x.before ? "ok" : "danger"}>{x.now >= x.before ? "+" : ""}{x.now - x.before}</Chip>
                  </span>
                </div>
              ))}
              <Text size="caption" tone="subtle">Grey: average at screening. Colour: average at the latest assessment. {skills[0] && `${competency(skills[0].id)?.name} is weakest now; a short booster on it reaches the most reps.`}</Text>
            </div>
          )}
        </Card>
        <Card title="By region" eyebrow="Average score per area" actions={
          <span className="flex rounded-control border border-hair-2 bg-subtle p-0.5 text-caption font-semibold">
            {(["assessment", "screening"] as const).map((src) => (
              <button key={src} type="button" onClick={() => setHmSource(src)} className={cn("rounded-[8px] px-2.5 py-1", hmSource === src ? "bg-card text-brand-deep shadow-hair" : "text-ink-3")}>{src === "assessment" ? "Latest" : "Screening"}</button>
            ))}
          </span>}>
          {rows.length === 0 ? <Text tone="subtle">No screened reps in this view.</Text> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] border-separate border-spacing-1 text-body">
                <thead><tr className="text-left text-caption text-ink-3"><th scope="col" />{DOMAINS.filter((d) => d.id !== "compliance").map((d) => <th key={d.id} scope="col" className="px-1 font-semibold">{d.short}</th>)}</tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.id}><th scope="row" className="px-1 text-left font-semibold">{r.name}</th>
                    {r.cells.map((cell) => <td key={cell.domain} className={`rounded-chip px-1.5 py-2 text-center font-bold tabular-nums ${bandCellClass(cell.value)}`}>{cell.value ?? "–"}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {teams.length > 0 && (
        <Card title="Baseline to final, by team" eyebrow={`Screening score against the latest final score · ${measured.length} reps with both`}>
          <div className="grid gap-x-8 gap-y-4 md:grid-cols-2">
            {teams.map((t) => (
              <div key={t.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <Text size="body-lg" weight="semibold" truncate>{t.name}</Text>
                  <span className="flex items-center gap-2">
                    <Text size="caption" tone="subtle" tabular>{t.before} →</Text>
                    <Text size="body-lg" weight="bold" tabular>{t.now}</Text>
                    <Chip size="xs" tone={t.now >= t.before ? "ok" : "danger"}>{t.now >= t.before ? "+" : ""}{t.now - t.before}</Chip>
                  </span>
                </div>
                <span className="relative block h-3 rounded-full bg-black/[0.06]">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-2 to-brand" style={{ width: `${t.now}%` }} />
                  <span className="absolute -top-1 h-5 w-0.5 rounded-full bg-ink" style={{ left: `${t.before}%` }} title={`Baseline ${t.before}`} />
                </span>
                <Text size="caption" tone="subtle">{t.n} rep{t.n === 1 ? "" : "s"} · the dark mark is the baseline</Text>
              </div>
            ))}
          </div>
          {practiceOnly > 0 && <Text size="caption" tone="subtle">{practiceOnly} assignment{practiceOnly === 1 ? " is" : "s are"} practice only: those reps skip the modules, so their gain comes from practice calls alone.</Text>}
        </Card>
      )}

      {/* 4 · Courses */}
      <Card title="Courses" eyebrow="Lowest certification first">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-body">
            <thead>
              <tr className="border-b border-hair text-left text-caption text-ink-3">
                <th scope="col" className="py-2 pr-3 font-semibold">Course</th>
                <th scope="col" className="px-3 py-2 font-semibold">Assigned</th>
                <th scope="col" className="px-3 py-2 font-semibold">Started</th>
                <th scope="col" className="w-[24%] px-3 py-2 font-semibold">Certified</th>
                <th scope="col" className="px-3 py-2 font-semibold">Knowledge gain</th>
                <th scope="col" className="px-3 py-2 font-semibold">Pass first time</th>
                <th scope="col" className="px-3 py-2 font-semibold">Overdue</th>
                <th scope="col" className="w-6" />
              </tr>
            </thead>
            <tbody>
              {courseRows.map(({ c, k: kc, started, overdue, gain, first }) => {
                const done = pct(kc.certified, kc.total);
                return (
                  <tr key={c.id} className="group border-b border-hair last:border-0">
                    <th scope="row" className="py-3 pr-3 text-left font-semibold"><Link href={`/trainer/courses/${c.id}/people`} className="hover:underline">{c.title}</Link></th>
                    <td className="px-3 tabular-nums">{kc.total}</td>
                    <td className="px-3 tabular-nums">{pct(started, kc.total)}%</td>
                    <td className="px-3"><span className="flex items-center gap-2.5"><Meter value={done} tone={done >= 80 ? "ok" : done >= 50 ? "brand" : "warn"} label={`${c.title} ${done}% certified`} /><span className="w-10 shrink-0 text-right font-bold tabular-nums">{done}%</span></span></td>
                    <td className="px-3 tabular-nums">{gain !== undefined ? <span className="font-semibold text-ok">+{gain} pts</span> : <span className="text-ink-4">No screening</span>}</td>
                    <td className="px-3 tabular-nums">{first !== undefined ? `${first}%` : "–"}</td>
                    <td className={cn("px-3 tabular-nums", overdue && "font-semibold text-danger")}>{overdue || "–"}</td>
                    <td><Link href={`/trainer/courses/${c.id}/people`} aria-label={`Open ${c.title}`}><ChevronRight className="size-4 text-ink-4 group-hover:text-ink" aria-hidden="true" /></Link></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 5 · People */}
      <div className="grid gap-5 lg:grid-cols-3">
        <PeopleList title="Needs help" eyebrow="Didn't pass their last attempt" empty="Nobody is stuck after a failed attempt."
          rows={needsHelp.map(({ p, u, c }) => ({ id: p.id, href: `/trainer/people/${u.id}?course=${c.id}`, initials: u.initials, name: u.name, sub: `${c.title} · ${finalScore(p)}% · ${Math.max(0, c.settings.attempts - p.attempts.length)} attempt${c.settings.attempts - p.attempts.length === 1 ? "" : "s"} left`, tone: "danger" as const }))} />
        <PeopleList title="Haven't started" eyebrow="Assigned a week or more ago" empty="Everyone assigned has started."
          rows={notStarted.map(({ p, u, c }) => ({ id: p.id, href: `/trainer/people/${u.id}?course=${c.id}`, initials: u.initials, name: u.name, sub: `${c.title} · ${p.dueAt ? `${isOverdue(p) ? "was due" : "due"} ${fmtDate(p.dueAt)}` : "no due date"}`, tone: isOverdue(p) ? "danger" as const : "warn" as const }))} />
        <PeopleList title="Most improved" eyebrow="Screening to final" empty="No one has a before and after yet."
          rows={improved.map(({ p, u, c, gain }) => ({ id: p.id, href: `/trainer/people/${u.id}?course=${c.id}`, initials: u.initials, name: u.name, sub: `${c.title} · ${p.screening!.overall} → ${finalScore(p)}`, badge: `+${gain}`, tone: "ok" as const }))} />
      </div>

      {/* 6 · Leaderboard */}
      <LeaderboardSection region={region} />

      {/* 7 · Content */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Content signals" eyebrow="Worth a look this week">
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
        <Card title="Practice" eyebrow="Private calls, as a group" actions={<span className="flex items-center gap-1 text-caption text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Groups of 5+</span>}>
          <div className="flex flex-wrap gap-6"><Stat label="Sessions this week" value={PRACTICE_AGGREGATE.sessionsThisWeek} /><Stat label="Reps practising" value={PRACTICE_AGGREGATE.practisingReps} /><Stat label="Assisted" value={`${PRACTICE_AGGREGATE.assistedShare}%`} sub="of calls used prompts" /></div>
          <div className="flex flex-col gap-2.5">
            <Text size="caption" weight="semibold" tone="subtle">Most missed on practice calls</Text>
            {PRACTICE_AGGREGATE.missed.slice(0, 3).map((m) => (
              <div key={m.criterion} className="flex flex-col gap-1">
                <div className="flex justify-between gap-3 text-body"><span className="truncate">{m.criterion}</span><strong className="tabular-nums">{m.hit}%</strong></div>
                <Meter value={m.hit} tone={m.hit < 50 ? "danger" : m.hit < 70 ? "warn" : "ok"} label={`${m.criterion} ${m.hit}% hit`} />
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
                  <li key={x.q} className="flex items-start gap-2.5 border-b border-hair py-2.5 last:border-0">
                    <SearchX className={cn("mt-0.5 size-4 shrink-0", off || cmp ? "text-danger" : "text-warn")} aria-hidden="true" />
                    <span className="flex min-w-0 flex-col"><Text size="body" weight="semibold">“{x.q}” <span className="font-normal text-ink-3">· {x.count}×</span></Text>
                      <Text size="caption" tone="subtle">{off ? "Off-label interest. Remind reps about Medical Information requests." : cmp ? "Comparison interest. No head-to-head data; remind reps not to compare." : "Nothing covers this yet. A candidate for your next course."}</Text></span>
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
      `Certified,${k.certified} of ${k.total} (${pct(k.certified, k.total)}%)`,
      `Average screening score,${lf.before}`,
      `Average final score,${lf.after}`,
      `Knowledge gain (points),${lf.lift}`,
      `Reps improved,${lf.improved}%`,
      `Pass first time,${firstTry(ps)}%`,
      `Median days to certified,${timeToCertified(ps)}`,
      `Hours saved by screening,${saved}`,
      ...courseRows.map(({ c, k: kc, gain }) => `${c.title},${kc.certified} of ${kc.total} certified${gain !== undefined ? ` · +${gain} pts` : ""}`),
      ...skills.map((x) => `${competency(x.id)?.name},${x.before} → ${x.now}`),
      "Note,Prototype with fictional data",
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "academy-proof-pack.csv";
    a.click();
    showToast("Proof pack downloaded");
  }
}

function PeopleList({ title, eyebrow, empty, rows }: {
  title: string; eyebrow: string; empty: string;
  rows: { id: string; href: string; initials: string; name: string; sub: string; badge?: string; tone: "danger" | "warn" | "ok" }[];
}) {
  return (
    <Card title={title} eyebrow={eyebrow}>
      {rows.length === 0 ? <Text tone="subtle">{empty}</Text> : (
        <ul className="-mx-2 flex flex-col">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={r.href} className="group flex items-center gap-3 rounded-panel px-2 py-2 hover:bg-subtle">
                <Avatar initials={r.initials} size={32} />
                <span className="flex min-w-0 flex-1 flex-col"><Text size="body" weight="semibold" truncate>{r.name}</Text><Text size="caption" tone={r.tone === "danger" ? "danger" : "subtle"} truncate>{r.sub}</Text></span>
                {r.badge && <Chip size="sm" tone="ok">{r.badge}</Chip>}
                <ArrowRight className="size-4 shrink-0 text-ink-4 group-hover:text-ink" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
