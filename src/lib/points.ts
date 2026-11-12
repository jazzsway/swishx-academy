import type { PointEvent, PointKind, User } from "@/data/types";
import { TODAY_ISO } from "@/data/org";

/** What each kind of learning earns. Shown to reps as is, so keep it simple. */
export const POINTS: Record<PointKind, { points: number; label: string }> = {
  module: { points: 20, label: "Finish a module" },
  check: { points: 10, label: "Pass a quick check (+5 on the first try)" },
  practice: { points: 15, label: "Finish a practice call (quizzes 10, flashcards 5)" },
  assessment: { points: 50, label: "Pass a final assessment" },
  certified: { points: 100, label: "Get certified" },
  streak: { points: 5, label: "Learn on another day in a row" },
};
export const FIRST_TRY_BONUS = 5;

/** The leaderboard is monthly so continuous learning wins, not one big week. */
export const MONTH = TODAY_ISO.slice(0, 7);
export const monthName = (m = MONTH) => new Date(`${m}-01T12:00:00`).toLocaleString("en-US", { month: "long" });
export const daysLeftInMonth = () => {
  const d = new Date(TODAY_ISO);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate();
};

export const isRep = (u: User) => u.active && u.roles.includes("rep");

export interface BoardRow { user: User; points: number; rank: number }

/** Reps ranked on this month's points. Ties share a rank. `divisionId` undefined means company-wide. */
export function leaderboard(users: User[], events: PointEvent[], divisionId?: string, month = MONTH): BoardRow[] {
  const totals = new Map<string, number>();
  for (const e of events) if (e.at.startsWith(month)) totals.set(e.userId, (totals.get(e.userId) ?? 0) + e.points);
  const rows = users.filter((u) => isRep(u) && (!divisionId || u.divisionId === divisionId))
    .map((user) => ({ user, points: totals.get(user.id) ?? 0, rank: 0 }))
    .sort((a, b) => b.points - a.points || a.user.name.localeCompare(b.user.name));
  rows.forEach((r, i) => { r.rank = i > 0 && rows[i - 1].points === r.points ? rows[i - 1].rank : i + 1; });
  return rows;
}

/** "Top 18%": the smallest share of the team you're inside. */
export const topPct = (rank: number, n: number) => Math.max(1, Math.ceil((rank / Math.max(1, n)) * 100));
/** Share of the team with fewer points. */
export const percentile = (rank: number, n: number) => Math.round(((n - rank) / Math.max(1, n)) * 100);

export interface Standing { rank: number; n: number; points: number; top: number; pctile: number; gap?: { rank: number; points: number }; rows: BoardRow[] }

/** Where one rep stands in their field team this month. */
export function standingOf(users: User[], events: PointEvent[], userId: string): Standing | null {
  const me = users.find((u) => u.id === userId);
  if (!me) return null;
  const rows = leaderboard(users, events, me.divisionId);
  const mine = rows.find((r) => r.user.id === userId);
  if (!mine) return null;
  const ahead = [...rows].reverse().find((r) => r.points > mine.points);
  return {
    rank: mine.rank, n: rows.length, points: mine.points, top: topPct(mine.rank, rows.length), pctile: percentile(mine.rank, rows.length),
    gap: ahead ? { rank: ahead.rank, points: ahead.points - mine.points + 1 } : undefined, rows,
  };
}

export const monthEvents = (events: PointEvent[], userId: string, month = MONTH) =>
  events.filter((e) => e.userId === userId && e.at.startsWith(month)).sort((a, b) => b.at.localeCompare(a.at));

/* ── Seed: a month of learning for every rep, so the board looks lived in ── */

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const PRIYA: Omit<PointEvent, "id" | "userId">[] = [
  { at: "2026-11-01T08:12:00", kind: "streak", points: 5, label: "Day 2 of your streak" },
  { at: "2026-11-01T08:30:00", kind: "module", points: 20, label: "Finished Compliance essentials · Off-label requests" },
  { at: "2026-11-01T08:31:00", kind: "check", points: 15, label: "Passed the quick check, first try" },
  { at: "2026-11-02T18:12:00", kind: "streak", points: 5, label: "Day 3 of your streak" },
  { at: "2026-11-02T18:40:00", kind: "practice", points: 10, label: "Practice quiz · Lumora" },
  { at: "2026-11-03T07:50:00", kind: "streak", points: 5, label: "Day 4 of your streak" },
  { at: "2026-11-03T08:05:00", kind: "practice", points: 15, label: "Practice call · Dr. Ruiz" },
  { at: "2026-11-03T08:20:00", kind: "module", points: 20, label: "Finished AD 101 · Measuring severity" },
  { at: "2026-11-03T08:21:00", kind: "check", points: 10, label: "Passed the quick check" },
  { at: "2026-11-04T12:30:00", kind: "streak", points: 5, label: "Day 5 of your streak" },
  { at: "2026-11-04T12:44:00", kind: "practice", points: 15, label: "Practice call · Dr. Kim" },
  { at: "2026-11-05T19:02:00", kind: "streak", points: 5, label: "Day 6 of your streak" },
  { at: "2026-11-05T19:20:00", kind: "module", points: 20, label: "Finished AD 101 · Today's care pathway" },
  { at: "2026-11-05T19:21:00", kind: "check", points: 15, label: "Passed the quick check, first try" },
];

const SEED_DAYS = 5; // November 1st to 5th; today (the 6th) is still open.

/** A plausible spread: a few reps learn every day, most a couple of times a week, some not at all. */
export function seedPoints(users: User[]): PointEvent[] {
  const out: PointEvent[] = [];
  for (const u of users.filter(isRep)) {
    if (u.id === "u-priya") {
      PRIYA.forEach((e, i) => out.push({ ...e, id: `pt-priya-${i}`, userId: u.id }));
      continue;
    }
    const r = rng(u.id);
    const drive = r() ** 1.6; // most reps are moderately active, a few are keen
    if (drive < 0.06) continue;
    let k = 0;
    const push = (day: number, kind: PointKind, points: number, label: string) =>
      out.push({ id: `pt-${u.id}-${k++}`, userId: u.id, at: `2026-11-0${day}T${String(8 + Math.floor(r() * 11)).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}:00`, kind, points, label });
    let streak = 0;
    for (let day = 1; day <= SEED_DAYS; day++) {
      if (r() > drive * 1.25) { streak = 0; continue; }
      streak++;
      if (streak > 1) push(day, "streak", 5, `Day ${streak} of the streak`);
      const modules = Math.floor(r() * (1 + drive * 3));
      for (let m = 0; m < modules; m++) {
        push(day, "module", 20, "Finished a module");
        if (r() < 0.7) push(day, "check", r() < 0.6 ? 15 : 10, "Passed a quick check");
      }
      if (r() < drive * 0.8) push(day, "practice", 15, "Practice call");
      if (r() < drive * 0.5) push(day, "practice", 10, "Practice quiz");
    }
    if (r() < drive * 0.35) push(1 + Math.floor(r() * SEED_DAYS), "assessment", 50, "Passed a final assessment");
    if (r() < drive * 0.2) push(1 + Math.floor(r() * SEED_DAYS), "certified", 100, "Certified");
  }
  return out;
}
