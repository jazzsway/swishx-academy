"use client";

import { ArrowRight, Compass } from "lucide-react";
import type { AppState } from "@/store/app-store";
import { fmtDate, isOverdue, minutesSaved } from "@/store/selectors";
import { COMPETENCIES, competency } from "@/data/org";
import type { Course, Progress, User } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Card, Stat, BandChip } from "@/components/patterns/academy";

/*
 * The person overview answers one question for a trainer: is training working for this rep?
 * Headline numbers, then before → after per course, skills then and now, the score trend,
 * and what to focus on next. Everything comes from screenings and final assessments.
 */

interface Measured { p: Progress; c: Course; before: number; after?: number }

const finalScore = (p: Progress) => p.attempts.filter((a) => a.passed).at(-1)?.overall ?? p.attempts.at(-1)?.overall;
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const hours = (min: number) => (min < 60 ? `${min} min` : `${+(min / 60).toFixed(1)} h`);

export function useOverview(s: AppState, mine: Progress[]) {
  const courseOf = (p: Progress) => s.courses.find((c) => c.id === p.courseId)!;
  const measured: Measured[] = mine.filter((p) => p.screening).map((p) => ({ p, c: courseOf(p), before: p.screening!.overall, after: finalScore(p) }));
  const gained = measured.filter((m) => m.after !== undefined) as Required<Measured>[];

  /* Every score this person has, oldest first: screenings set the baseline, finals show where they got to. */
  const sets = mine.flatMap((p) => [
    ...(p.screening ? [{ at: p.screening.at, overall: p.screening.overall, scores: p.screening.scores, label: `${courseOf(p).title} · screening` }] : []),
    ...p.attempts.map((a, i) => ({ at: a.at, overall: a.overall, scores: a.competencyScores, label: `${courseOf(p).title} · final${p.attempts.length > 1 ? ` (try ${i + 1})` : ""}` })),
  ]).sort((a, b) => a.at.localeCompare(b.at));
  const skills = COMPETENCIES.map((c) => {
    const hits = sets.filter((x) => x.scores[c.id] !== undefined);
    return hits.length ? { id: c.id, first: hits[0].scores[c.id], now: hits.at(-1)!.scores[c.id], points: hits.length } : null;
  }).filter(Boolean) as { id: string; first: number; now: number; points: number }[];

  return { courseOf, measured, gained, sets, skills };
}

export function PersonKpis({ s, mine }: { s: AppState; mine: Progress[] }) {
  const { courseOf, gained } = useOverview(s, mine);
  const certified = mine.filter((p) => p.state === "certified");
  const onTime = certified.filter((p) => !p.dueAt || !p.certifiedAt || p.certifiedAt <= p.dueAt).length;
  const minutes = mine.reduce((a, p) => a + p.minutesSpent, 0);
  const saved = mine.reduce((a, p) => a + minutesSaved([p], courseOf(p)), 0);
  const overdue = mine.filter(isOverdue).length;
  const active = mine.filter((p) => p.state !== "certified").length;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card padded><Stat label="Certified" value={`${certified.length} of ${mine.length}`} sub={certified.length ? `${onTime} on time` : "None yet"} tone={certified.length ? "ok" : "default"} /></Card>
      <Card padded><Stat label="Knowledge gain" value={gained.length ? `+${avg(gained.map((m) => m.after - m.before))} pts` : "—"}
        sub={gained.length ? `${avg(gained.map((m) => m.before))} → ${avg(gained.map((m) => m.after))} across ${gained.length} course${gained.length === 1 ? "" : "s"}` : "Shows after a screening and a final"} tone={gained.length ? "ok" : "default"} /></Card>
      <Card padded><Stat label="Time in training" value={hours(minutes)} sub={saved ? `${hours(saved)} skipped: screening showed they knew it` : "Across every course"} /></Card>
      <Card padded><Stat label="Right now" value={overdue ? `${overdue} overdue` : active ? `${active} in progress` : "All done"} tone={overdue ? "danger" : "default"}
        sub={overdue ? "Past the due date" : active ? "Nothing overdue" : "Nothing left to do"} /></Card>
    </div>
  );
}

/** Screening (before) against the final assessment (after), per course, on one 0–100 scale. */
export function BeforeAfter({ s, mine, first, onOpen }: { s: AppState; mine: Progress[]; first: string; onOpen: (courseId: string) => void }) {
  const { measured, courseOf } = useOverview(s, mine);
  /* Same-for-everyone courses never have a screening; personalised ones just haven't been screened yet. */
  const unmeasured = mine.filter((p) => courseOf(p).type !== "personalised").length;
  const waiting = mine.filter((p) => courseOf(p).type === "personalised" && !p.screening).length;
  return (
    <Card title="Before and after, by course" eyebrow="Screening score, then the final assessment">
      {measured.length === 0 ? (
        <Text tone="subtle">No screening yet. When {first} takes one, it sets their starting point, and the final assessment shows how far they got.</Text>
      ) : (
        <ul className="flex flex-col gap-4">
          {measured.map(({ p, c, before, after }) => (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(c.id)} className="flex w-full flex-col gap-2 rounded-panel text-left">
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <Text size="body-lg" weight="semibold">{c.title}</Text>
                  <span className="flex items-center gap-2">
                    <Text size="body" tone="subtle" tabular>{before}</Text>
                    <ArrowRight className="size-3.5 text-ink-4" aria-hidden="true" />
                    <Text size="body-lg" weight="bold" tabular>{after ?? "…"}</Text>
                    {after !== undefined ? <Chip size="xs" tone={after >= before ? "ok" : "danger"}>{after >= before ? "+" : ""}{after - before} pts</Chip> : <Chip size="xs">In progress</Chip>}
                  </span>
                </span>
                {/* The grey bar is where they started; the colour shows where they are now. */}
                <span className="relative block h-2.5 rounded-full bg-black/[0.06]">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-black/15" style={{ width: `${before}%` }} />
                  {after !== undefined && <span className={`absolute inset-y-0 left-0 rounded-full ${after >= 80 ? "bg-ok" : "bg-brand"}`} style={{ width: `${after}%`, opacity: 0.9 }} />}
                  <span className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-ink/50" style={{ left: `${c.settings.passOverall}%` }} title={`Pass mark ${c.settings.passOverall}%`} />
                </span>
                <Text size="caption" tone="subtle">
                  Screening {fmtDate(p.screening!.at)}{after !== undefined ? ` · final ${fmtDate((p.attempts.filter((a) => a.passed).at(-1) ?? p.attempts.at(-1))!.at)}` : ""} · pass mark {c.settings.passOverall}%{p.path?.kind === "screening" && c.modules.length > p.path.moduleIds.length ? ` · tested out of ${Math.max(0, c.modules.length - p.path.moduleIds.length)} module${c.modules.length - p.path.moduleIds.length === 1 ? "" : "s"}` : ""}
                </Text>
              </button>
            </li>
          ))}
        </ul>
      )}
      {measured.length > 0 && waiting > 0 && <Text size="caption" tone="subtle">{waiting} more personalised course{waiting === 1 ? " starts" : "s start"} with a screening that hasn&apos;t been taken yet.</Text>}
      {unmeasured > 0 && <Text size="caption" tone="subtle">{unmeasured} course{unmeasured === 1 ? " is" : "s are"} the same for everyone, with no screening, so there&apos;s no before score.</Text>}
    </Card>
  );
}

/** Each competency: the first score on record against the latest one. */
export function SkillsThenNow({ s, mine }: { s: AppState; mine: Progress[] }) {
  const { skills } = useOverview(s, mine);
  if (!skills.length) return <Card title="Skills, then and now"><Text tone="subtle">No scores yet. The first screening sets the baseline for each skill.</Text></Card>;
  const moved = skills.filter((k) => k.points > 1);
  const best = [...moved].sort((a, b) => (b.now - b.first) - (a.now - a.first))[0];
  const weakest = [...skills].sort((a, b) => a.now - b.now)[0];
  const rows = [...skills].sort((a, b) => (b.now - b.first) - (a.now - a.first) || a.now - b.now);
  const improved = moved.filter((k) => k.now > k.first).length;
  const gain = moved.length ? avg(moved.map((k) => k.now - k.first)) : 0;
  return (
    <Card title="Skills, then and now" eyebrow={moved.length ? `Improved in ${improved} of ${moved.length} skills · average ${gain >= 0 ? "+" : ""}${gain} pts` : "First score on record, and the latest"}
      actions={<span className="flex flex-wrap gap-1.5">
        {best && best.now > best.first && <Chip size="sm" tone="ok">Biggest gain: {competency(best.id)?.name} +{best.now - best.first}</Chip>}
        <Chip size="sm" tone={weakest.now < 70 ? "danger" : "default"}>Lowest: {competency(weakest.id)?.name} {weakest.now}</Chip>
      </span>}>
      <div className="flex flex-col gap-3">
        {rows.map((k) => {
          const delta = k.now - k.first;
          return (
            <div key={k.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
              <Text size="body" weight="semibold" truncate>{competency(k.id)?.name}</Text>
              <span className="relative col-span-2 block h-2 rounded-full bg-black/[0.06] sm:col-span-1">
                <span className="absolute inset-y-0 left-0 rounded-full bg-black/15" style={{ width: `${k.first}%` }} />
                <span className={`absolute inset-y-0 left-0 rounded-full ${k.now >= 80 ? "bg-ok" : k.now >= 50 ? "bg-brand-2" : "bg-danger"}`} style={{ width: `${k.now}%`, opacity: 0.85 }} />
              </span>
              <span className="row-start-1 flex items-center gap-2 justify-self-end sm:row-start-auto">
                {k.points > 1 && <Text size="caption" tone="subtle" tabular>{k.first} →</Text>}
                <Text size="body" weight="semibold" tabular>{k.now}</Text>
                {k.points > 1 ? <Chip size="xs" tone={delta > 0 ? "ok" : delta < 0 ? "danger" : "default"}>{delta > 0 ? "+" : ""}{delta}</Chip> : <BandChip score={k.now} size="xs" />}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** Every screening and final, in order, on one line. */
export function ScoreTrend({ s, mine }: { s: AppState; mine: Progress[] }) {
  const { sets } = useOverview(s, mine);
  if (sets.length < 2) return null;
  const W = 300, H = 110, pad = 14;
  const x = (i: number) => pad + (i * (W - pad * 2)) / (sets.length - 1);
  const y = (v: number) => H - pad - (v / 100) * (H - pad * 2);
  return (
    <Card title="Score over time" eyebrow={`${sets.length} scored moments`} padded>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Scores from ${sets[0].overall} to ${sets.at(-1)!.overall}`}>
        <line x1={pad} x2={W - pad} y1={y(80)} y2={y(80)} stroke="currentColor" className="text-ok/40" strokeDasharray="3 3" />
        <polyline fill="none" stroke="currentColor" className="text-brand" strokeWidth="2.5" strokeLinejoin="round" points={sets.map((p, i) => `${x(i)},${y(p.overall)}`).join(" ")} />
        {sets.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.overall)} r="4" className="fill-card stroke-brand" strokeWidth="2"><title>{`${p.label} · ${fmtDate(p.at)} · ${p.overall}%`}</title></circle>
            <text x={x(i)} y={y(p.overall) - 8} textAnchor="middle" className="fill-ink-2 text-[10px] font-semibold">{p.overall}</text>
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-caption text-ink-3"><span>{fmtDate(sets[0].at)}</span><span>Dashed line: 80</span><span>{fmtDate(sets.at(-1)!.at)}</span></div>
    </Card>
  );
}

/** The one thing worth doing next for this person, from their weakest skill and what's already on their list. */
export function FocusNext({ s, mine, user }: { s: AppState; mine: Progress[]; user: User }) {
  const { skills, courseOf } = useOverview(s, mine);
  const weak = [...skills].sort((a, b) => a.now - b.now)[0];
  const open = mine.filter((p) => p.state !== "certified");
  const covering = weak && open.find((p) => courseOf(p).competencyIds.includes(weak.id));
  const nextDue = [...open].filter((p) => p.dueAt).sort((a, b) => a.dueAt!.localeCompare(b.dueAt!))[0];
  const text = !skills.length
    ? `${user.first} hasn't been screened yet.${nextDue ? ` ${courseOf(nextDue).title} is due ${fmtDate(nextDue.dueAt)}.` : ""}`
    : weak.now >= 80
      ? `${user.first} is proficient across every skill on record.${open.length ? ` ${open.length} course${open.length === 1 ? "" : "s"} still open.` : ""}`
      : `${competency(weak.id)?.name} is ${user.first}'s lowest skill at ${weak.now}.${covering ? ` ${courseOf(covering).title} covers it and is already on their list.` : " Nothing on their list covers it yet; consider assigning a course that does."}`;
  return (
    <Card tone="ink" padded>
      <div className="flex items-start gap-2.5">
        <Compass className="mt-0.5 size-4.5 shrink-0 text-brand-light" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <Text size="caption" tone="inverse" weight="bold" uppercase tracking="wider" className="opacity-70">Focus next</Text>
          <Text size="body-lg" tone="inverse" className="leading-relaxed">{text}</Text>
        </div>
      </div>
    </Card>
  );
}

/**
 * One course, competency by competency: screening against the latest assessment, which ones
 * improved, which must-pass topics cleared the bar, and what's still below it.
 */
export function CourseCompetencies({ p, course }: { p: Progress; course: Course }) {
  if (!p.screening) return null;
  const latest = p.attempts.at(-1)?.competencyScores;
  const critical = new Set(course.settings.criticalCompetencies);
  const rows = COMPETENCIES.filter((c) => p.screening!.scores[c.id] !== undefined).map((c) => ({
    id: c.id, before: p.screening!.scores[c.id], after: latest?.[c.id], critical: critical.has(c.id),
  })).sort((a, b) => ((b.after ?? b.before) - b.before) - ((a.after ?? a.before) - a.before));
  const scored = rows.filter((r) => r.after !== undefined) as (typeof rows[number] & { after: number })[];
  const improved = scored.filter((r) => r.after > r.before).length;
  const gain = scored.length ? avg(scored.map((r) => r.after - r.before)) : 0;
  const below = scored.filter((r) => r.critical && r.after < course.settings.passCritical);
  const final = finalScore(p);
  return (
    <Card title="Competencies, before and after" eyebrow={scored.length ? "Screening, then the latest assessment" : "Screening baseline"}>
      {scored.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="squircle flex flex-col rounded-panel bg-ok-bg px-4 py-3"><Text size="caption" tone="subtle">Improved</Text><Text size="title" weight="extrabold" tone="ok" tabular>{improved} of {scored.length}</Text></div>
          <div className="squircle flex flex-col rounded-panel bg-subtle px-4 py-3"><Text size="caption" tone="subtle">Average gain</Text><Text size="title" weight="extrabold" tabular>{gain >= 0 ? "+" : ""}{gain} pts</Text></div>
          <div className="squircle flex flex-col rounded-panel bg-subtle px-4 py-3"><Text size="caption" tone="subtle">Overall</Text><Text size="title" weight="extrabold" tabular>{p.screening.overall} → {final}</Text></div>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const now = r.after ?? r.before;
          const delta = r.after !== undefined ? r.after - r.before : undefined;
          return (
            <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[230px_minmax(0,1fr)_auto]">
              <span className="flex min-w-0 items-center gap-1.5">
                <Text size="body" weight="semibold" truncate>{competency(r.id)?.name}</Text>
                {r.critical && <Chip size="xs" tone="warn">Must pass</Chip>}
              </span>
              <span className="relative col-span-2 block h-2.5 rounded-full bg-black/[0.06] sm:col-span-1">
                <span className="absolute inset-y-0 left-0 rounded-full bg-black/15" style={{ width: `${r.before}%` }} />
                {r.after !== undefined && <span className={`absolute inset-y-0 left-0 rounded-full ${now >= 80 ? "bg-ok" : now >= 50 ? "bg-brand-2" : "bg-danger"}`} style={{ width: `${now}%`, opacity: 0.85 }} />}
                {r.critical && <span className="absolute -top-1 h-4.5 w-0.5 rounded-full bg-ink/50" style={{ left: `${course.settings.passCritical}%` }} title={`Must-pass bar ${course.settings.passCritical}`} />}
              </span>
              <span className="row-start-1 flex items-center gap-2 justify-self-end sm:row-start-auto">
                <Text size="caption" tone="subtle" tabular>{r.before}{r.after !== undefined ? " →" : ""}</Text>
                {r.after !== undefined && <Text size="body" weight="semibold" tabular>{r.after}</Text>}
                {delta !== undefined ? <Chip size="xs" tone={delta > 0 ? "ok" : delta < 0 ? "danger" : "default"}>{delta > 0 ? "+" : ""}{delta}</Chip> : <BandChip score={r.before} size="xs" />}
              </span>
            </div>
          );
        })}
      </div>
      <Text size="caption" tone="subtle">
        Grey: screening. Colour: {scored.length ? "latest assessment" : "not assessed yet"}.{critical.size ? ` The tick on must-pass topics is the ${course.settings.passCritical} bar.` : ""}
        {below.length ? ` Still below it: ${below.map((r) => competency(r.id)?.name).join(", ")}.` : ""}
      </Text>
    </Card>
  );
}
