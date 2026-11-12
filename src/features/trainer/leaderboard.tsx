"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { DISTRICTS, DIVISIONS } from "@/data/org";
import type { PointKind } from "@/data/types";
import { POINTS, daysLeftInMonth, isRep, leaderboard, MONTH, monthName, topPct } from "@/lib/points";
import { Text } from "@/components/ui/text";
import { Card, Stat, Avatar } from "@/components/patterns/academy";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { PageHeading } from "@/components/patterns/page-heading";

const COLS: { kind: PointKind; label: string }[] = [
  { kind: "module", label: "Modules" }, { kind: "check", label: "Checks" }, { kind: "practice", label: "Practice" }, { kind: "streak", label: "Streak days" },
];

/** Every rep ranked on this month's points, by field team or company-wide. */
export function TrainerLeaderboard() {
  const users = useApp((s) => s.users);
  const points = useApp((s) => s.points);
  const teams = DIVISIONS.filter((d) => users.some((u) => isRep(u) && u.divisionId === d.id));
  const [team, setTeam] = useState<string>(teams[0]?.id ?? "all");
  const [q, setQ] = useState("");
  const rows = useMemo(() => leaderboard(users, points, team === "all" ? undefined : team), [users, points, team]);
  /* What each rep did this month, by kind: counts, not points. */
  const counts = useMemo(() => {
    const m = new Map<string, Record<PointKind, number>>();
    for (const e of points) {
      if (!e.at.startsWith(MONTH)) continue;
      const r = m.get(e.userId) ?? { module: 0, check: 0, practice: 0, assessment: 0, certified: 0, streak: 0 };
      r[e.kind]++;
      m.set(e.userId, r);
    }
    return m;
  }, [points]);
  const n = rows.length;
  const active = rows.filter((r) => r.points > 0).length;
  const median = n ? rows[Math.floor(n / 2)].points : 0;
  const top10 = n ? rows[Math.max(0, Math.ceil(n * 0.1) - 1)].points : 0;
  const shown = rows.filter((r) => !q || r.user.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Leaderboard" description={`Reps ranked on points earned in ${monthName()}: modules, quick checks, practice, assessments and certification. Resets on the 1st, so it rewards learning every week. ${daysLeftInMonth()} days left.`}
        actions={
          <Segmented aria-label="Team">
            {teams.map((d) => <SegmentedButton key={d.id} active={team === d.id} onClick={() => setTeam(d.id)}>{d.name}</SegmentedButton>)}
            <SegmentedButton active={team === "all"} onClick={() => setTeam("all")}>Company-wide</SegmentedButton>
          </Segmented>
        } />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card padded><Stat label="Learning this month" value={`${n ? Math.round((active / n) * 100) : 0}%`} sub={`${active} of ${n} reps have points`} tone="ok" /></Card>
        <Card padded><Stat label="Median" value={`${median} pts`} sub="Half the team is above this" /></Card>
        <Card padded><Stat label="Top 10% starts at" value={`${top10} pts`} sub={`About ${Math.max(1, Math.round(top10 / 35))} modules with their checks`} /></Card>
        <Card padded><Stat label="Not on the board yet" value={n - active} tone={n - active ? "warn" : "default"} sub="No learning or practice this month" /></Card>
      </div>

      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hair px-5 py-3.5">
          <Text as="h2" size="title" weight="bold">{team === "all" ? "All reps" : DIVISIONS.find((d) => d.id === team)?.name} · {n} reps</Text>
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 size-4 text-ink-4" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a rep" aria-label="Find a rep" className="h-10 w-56 rounded-control border border-hair-2 bg-card pl-9 pr-3 text-body outline-none focus:border-brand" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-hair text-caption font-semibold text-ink-3">
                <th className="w-16 px-5 py-2.5">Rank</th>
                <th className="px-3 py-2.5">Rep</th>
                <th className="px-3 py-2.5 text-right">Points</th>
                <th className="px-3 py-2.5">Standing</th>
                {COLS.map((c) => <th key={c.kind} className="px-3 py-2.5 text-right">{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.slice(0, 60).map((r) => {
                const k = counts.get(r.user.id);
                const t = topPct(r.rank, n);
                return (
                  <tr key={r.user.id} className="border-b border-hair last:border-0 hover:bg-subtle">
                    <td className="px-5 py-2.5">
                      <span className={cn("grid size-7 place-items-center rounded-full text-caption font-extrabold tabular-nums",
                        r.rank === 1 ? "bg-[#f5c542] text-ink" : r.rank === 2 ? "bg-[#d4d7dd] text-ink" : r.rank === 3 ? "bg-[#e0a46b] text-ink" : "text-ink-3")}>{r.rank}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/trainer/people/${r.user.id}`} className="flex items-center gap-2.5 hover:underline">
                        <Avatar initials={r.user.initials} size={30} src={r.user.photo} />
                        <span className="flex flex-col"><span className="text-body font-semibold text-ink">{r.user.name}</span><span className="text-micro text-ink-3">{DISTRICTS.find((d) => d.id === r.user.districtId)?.name}{team === "all" ? ` · ${DIVISIONS.find((d) => d.id === r.user.divisionId)?.name}` : ""}</span></span>
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right text-body font-bold tabular-nums">{r.points}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-brand" style={{ width: `${r.points ? 100 - t + 1 : 0}%` }} /></span>
                        <span className={cn("text-caption font-semibold tabular-nums", t <= 10 ? "text-ok" : r.points === 0 ? "text-warn" : "text-ink-3")}>{r.points ? `Top ${t}%` : "No points"}</span>
                      </div>
                    </td>
                    {COLS.map((c) => <td key={c.kind} className="px-3 py-2.5 text-right text-body tabular-nums text-ink-2">{k?.[c.kind] ?? 0}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {shown.length > 60 && <Text size="caption" tone="subtle" className="border-t border-hair px-5 py-3">Showing the top 60 of {shown.length}. Search to find anyone else.</Text>}
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="How points are earned">
          <ul className="flex flex-col gap-1.5">
            {(Object.keys(POINTS) as PointKind[]).map((k) => (
              <li key={k} className="flex items-center justify-between gap-3"><Text size="body">{POINTS[k].label}</Text><Text size="body" weight="bold" tabular>+{POINTS[k].points}</Text></li>
            ))}
          </ul>
        </Card>
        <Card title="What reps see">
          <Text size="body" tone="muted">Each rep sees their own rank and percentile within their field team, plus the top 10 by name. Everyone else stays anonymous to them.</Text>
          <Text size="caption" tone="subtle" className="flex items-start gap-1.5"><Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Practice calls count toward points, but their content and scores stay private to the rep.</Text>
        </Card>
      </div>
    </div>
  );
}
