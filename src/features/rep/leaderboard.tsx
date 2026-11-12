"use client";

import Link from "next/link";
import { Trophy, ChevronRight, BookOpenCheck, ListChecks, Mic, Award, Flame, GraduationCap, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { DISTRICTS, DIVISIONS } from "@/data/org";
import type { PointKind } from "@/data/types";
import { POINTS, daysLeftInMonth, monthEvents, monthName, standingOf } from "@/lib/points";
import { Text } from "@/components/ui/text";
import { Avatar, Ring, EmptyState } from "@/components/patterns/academy";

const KIND_ICON: Record<PointKind, typeof Trophy> = { module: BookOpenCheck, check: ListChecks, practice: Mic, assessment: GraduationCap, certified: Award, streak: Flame };

const teamOf = (divisionId?: string) => DIVISIONS.find((d) => d.id === divisionId)?.name ?? "your team";
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

/** Home: where the rep stands this month, one tap from the full board. */
export function RankCard() {
  const me = useMe();
  const users = useApp((s) => s.users);
  const points = useApp((s) => s.points);
  const st = standingOf(users, points, me.id);
  if (!st) return null;
  return (
    <Link href="/rep/leaderboard" className="squircle flex items-center gap-4 rounded-card border border-hair bg-card p-4 shadow-hair transition-colors hover:bg-subtle">
      <Ring value={st.pctile} size={64} stroke={6} label={`${st.pctile}th percentile`}>
        <span className="flex flex-col items-center leading-none"><span className="text-micro font-bold text-ink-3">Top</span><span className="text-body-lg font-extrabold tabular-nums">{st.top}%</span></span>
      </Ring>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{monthName()} · {teamOf(me.divisionId)}</Text>
        <Text size="body-lg" weight="bold">#{st.rank} of {st.n} · {st.points} points</Text>
        <Text size="caption" tone="subtle">{st.gap ? `${st.gap.points} more points to pass #${st.gap.rank}` : "You're top of your team"}</Text>
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-4" aria-hidden="true" />
    </Link>
  );
}

/** The rep's leaderboard: their percentile, the top 10 of their team, and how to climb. */
export function RepLeaderboard() {
  const me = useMe();
  const users = useApp((s) => s.users);
  const points = useApp((s) => s.points);
  const st = standingOf(users, points, me.id);
  if (!st) return <div className="p-4"><EmptyState title="No leaderboard yet" body="Leaderboards are for field reps." /></div>;
  const top = st.rows.slice(0, 10);
  const meInTop = top.some((r) => r.user.id === me.id);
  const mine = monthEvents(points, me.id);
  const team = teamOf(me.divisionId);

  const row = (r: (typeof st.rows)[number], you: boolean) => (
    <li key={r.user.id} className={cn("flex items-center gap-3 px-3.5 py-2.5", you && "bg-tint")}>
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-caption font-extrabold tabular-nums",
        r.rank === 1 ? "bg-[#f5c542] text-ink" : r.rank === 2 ? "bg-[#d4d7dd] text-ink" : r.rank === 3 ? "bg-[#e0a46b] text-ink" : "text-ink-3")}>{r.rank}</span>
      <Avatar initials={r.user.initials} size={32} src={r.user.photo} tone={you ? "ink" : "tint"} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-semibold text-ink">{you ? `${r.user.name} (you)` : r.user.name}</span>
        <span className="truncate text-micro text-ink-3">{DISTRICTS.find((d) => d.id === r.user.districtId)?.name ?? team}</span>
      </span>
      <span className="text-body font-bold tabular-nums text-ink">{r.points}</span>
    </li>
  );

  return (
    <div className="flex flex-col gap-5 px-4 pb-6 pt-4">
      <section className="squircle relative overflow-hidden rounded-card bg-ink p-5 text-white shadow-float">
        <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 90% 0%, var(--color-brand) 0, transparent 55%), radial-gradient(circle at 0% 100%, var(--color-brand-2) 0, transparent 45%)" }} />
        <div className="relative flex flex-col gap-4">
          <span className="flex items-center gap-1.5 text-caption font-bold text-white/75"><Trophy className="size-3.5" aria-hidden="true" />{monthName()} leaderboard · {team}</span>
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col">
              <Text size="hero-lg" weight="black" tone="inverse" tracking="tight" className="leading-none">Top {st.top}%</Text>
              <Text size="body-lg" tone="inverse" className="opacity-80">#{st.rank} of {st.n} reps · {st.pctile}th percentile</Text>
            </div>
            <div className="flex flex-col items-end">
              <Text size="display" weight="extrabold" tone="inverse" tabular className="leading-none">{st.points}</Text>
              <Text size="caption" tone="inverse" className="opacity-70">points</Text>
            </div>
          </div>
          {/* Where they sit in the team, bottom to top. */}
          <div className="flex flex-col gap-1.5">
            <div className="relative h-2 rounded-full bg-white/15">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand-2 to-brand" style={{ width: `${Math.max(4, st.pctile)}%` }} />
              <span className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-white" style={{ left: `${Math.max(4, st.pctile)}%` }} aria-hidden="true" />
            </div>
            <div className="flex justify-between text-micro font-semibold text-white/60"><span>Bottom</span><span>Middle</span><span>Top</span></div>
          </div>
          <Text size="body" tone="inverse" className="opacity-85">
            {st.gap ? `${st.gap.points} more points passes #${st.gap.rank}. Finishing one module with its quick check is worth 35.` : "You're top of your team. Keep the streak going."} {daysLeftInMonth()} days left in {monthName()}.
          </Text>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between"><Text as="h2" size="title" weight="bold">Top 10 in {team}</Text><Text size="caption" tone="subtle">Points this month</Text></div>
        <ol className="flex flex-col divide-y divide-hair overflow-hidden rounded-panel border border-hair bg-card">
          {top.map((r) => row(r, r.user.id === me.id))}
          {!meInTop && <li className="px-3.5 py-1 text-center text-caption font-bold text-ink-4" aria-hidden="true">···</li>}
          {!meInTop && row(st.rows.find((r) => r.user.id === me.id)!, true)}
        </ol>
        <Text size="caption" tone="subtle">Everyone outside the top 10 stays anonymous. Only you see your own rank.</Text>
      </section>

      <section className="squircle flex flex-col gap-2.5 rounded-card border border-hair bg-card p-4 shadow-hair">
        <Text as="h2" size="title" weight="bold">How to earn points</Text>
        <ul className="flex flex-col gap-2">
          {(Object.keys(POINTS) as PointKind[]).map((k) => {
            const I = KIND_ICON[k];
            return (
              <li key={k} className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><I className="size-4" aria-hidden="true" /></span>
                <Text size="body" className="flex-1">{POINTS[k].label}</Text>
                <Text size="body" weight="bold" tone="brand-deep" tabular>+{POINTS[k].points}</Text>
              </li>
            );
          })}
        </ul>
        <Text size="caption" tone="subtle" className="flex items-start gap-1.5 border-t border-hair pt-2.5"><Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Practice calls earn points, but what you said and how you scored stay private to you.</Text>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between"><Text as="h2" size="title" weight="bold">Your points in {monthName()}</Text><Text size="caption" tone="subtle">{mine.length} activities</Text></div>
        {mine.length ? (
          <ul className="flex flex-col divide-y divide-hair overflow-hidden rounded-panel border border-hair bg-card">
            {mine.slice(0, 10).map((e) => {
              const I = KIND_ICON[e.kind];
              return (
                <li key={e.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <I className="size-4 shrink-0 text-ink-3" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body text-ink">{e.label}</span><span className="text-micro text-ink-3">{fmtDay(e.at)}</span></span>
                  <span className="text-body font-bold tabular-nums text-ok">+{e.points}</span>
                </li>
              );
            })}
          </ul>
        ) : <EmptyState title="No points yet this month" body="Finish a module or a practice call to get on the board." />}
      </section>
    </div>
  );
}
