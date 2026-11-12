"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { DISTRICTS, DIVISIONS, REGIONS } from "@/data/org";
import type { PointKind } from "@/data/types";
import { POINTS, daysLeftInMonth, isRep, leaderboard, MONTH, monthName, topPct } from "@/lib/points";
import { Text } from "@/components/ui/text";
import { Card, Stat, Avatar } from "@/components/patterns/academy";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";

const COLS: { kind: PointKind; label: string }[] = [
  { kind: "module", label: "Modules" }, { kind: "check", label: "Checks" }, { kind: "practice", label: "Practice" }, { kind: "streak", label: "Streak days" },
];
const TOP = 10;

/**
 * Analytics: reps ranked on this month's points, by field team or company-wide. Ranks are always
 * within the team; the page's region filter only narrows who's listed.
 */
export function LeaderboardSection({ region }: { region: string }) {
  const users = useApp((s) => s.users);
  const points = useApp((s) => s.points);
  const teams = DIVISIONS.filter((d) => users.some((u) => isRep(u) && u.divisionId === d.id));
  const [team, setTeam] = useState<string>(teams[0]?.id ?? "all");
  const [q, setQ] = useState("");
  const [all, setAll] = useState(false);
  const ranked = useMemo(() => leaderboard(users, points, team === "all" ? undefined : team), [users, points, team]);
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
  const n = ranked.length;
  const rows = ranked.filter((r) => region === "all" || r.user.regionId === region);
  const active = rows.filter((r) => r.points > 0).length;
  const median = rows.length ? rows[Math.floor(rows.length / 2)].points : 0;
  const top10 = n ? ranked[Math.max(0, Math.ceil(n * 0.1) - 1)].points : 0;
  const found = rows.filter((r) => !q || r.user.name.toLowerCase().includes(q.toLowerCase()));
  const shown = all || q ? found : found.slice(0, TOP);
  const where = `${team === "all" ? "All reps" : DIVISIONS.find((d) => d.id === team)?.name}${region === "all" ? "" : ` · ${REGIONS.find((r) => r.id === region)?.name}`}`;

  return (
    <Card id="leaderboard" padded={false} className="gap-0 scroll-mt-24">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pb-4 pt-5">
        <div className="flex min-w-0 flex-col gap-1">
          <Text size="caption" weight="semibold" tone="brand-deep">Points earned in {monthName()} · resets on the 1st · {daysLeftInMonth()} days left</Text>
          <Text as="h2" size="title" weight="bold">Leaderboard</Text>
        </div>
        <Segmented aria-label="Team">
          {teams.map((d) => <SegmentedButton key={d.id} active={team === d.id} onClick={() => setTeam(d.id)}>{d.name}</SegmentedButton>)}
          <SegmentedButton active={team === "all"} onClick={() => setTeam("all")}>Company-wide</SegmentedButton>
        </Segmented>
      </div>
      <div className="grid gap-x-6 gap-y-3 border-b border-hair px-5 pb-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Learning this month" value={`${rows.length ? Math.round((active / rows.length) * 100) : 0}%`} sub={`${active} of ${rows.length} reps have points`} tone="ok" />
        <Stat label="Median" value={`${median} pts`} sub="Half are above this" />
        <Stat label="Top 10% starts at" value={`${top10} pts`} sub={`About ${Math.max(1, Math.round(top10 / 35))} modules with their checks`} />
        <Stat label="Not on the board yet" value={rows.length - active} tone={rows.length - active ? "warn" : "default"} sub="No learning or practice this month" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <Text size="body-lg" weight="bold">{where} · {rows.length} reps</Text>
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
            {shown.map((r) => {
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
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hair px-5 py-3">
        {!q && found.length > TOP
          ? <button type="button" onClick={() => setAll(!all)} className="text-body font-semibold text-brand-deep hover:underline">{all ? `Show the top ${TOP}` : `Show all ${found.length}`}</button>
          : <span />}
        <details className="text-caption text-ink-3">
          <summary className="cursor-pointer font-semibold hover:text-ink">How points work</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {(Object.keys(POINTS) as PointKind[]).map((k) => <li key={k} className="flex justify-between gap-6"><span>{POINTS[k].label}</span><strong className="tabular-nums text-ink-2">+{POINTS[k].points}</strong></li>)}
          </ul>
          <p className="mt-2">Reps see their own rank and percentile in their team, plus the top 10 by name. Everyone else stays anonymous to them.</p>
          <p className="mt-1 flex items-start gap-1.5"><Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Practice calls earn points; their content and scores stay private.</p>
        </details>
      </div>
    </Card>
  );
}
