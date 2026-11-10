"use client";

import type { Course, Progress, User } from "@/data/types";
import { COMPETENCIES, DOMAINS, REGIONS, TODAY } from "@/data/org";
import { average, courseMinutes, pathMinutes } from "@/lib/learning";
import { current, live, useApp, type AppState } from "./app-store";

export function useMe(): User {
  return useApp((s) => s.users.find((u) => u.id === s.viewAsId) ?? s.users[0]);
}

export const liveModules = (c: Course) => (live(c) ?? current(c)).modules;

export const isOverdue = (p: Progress) => p.state !== "certified" && !!p.dueAt && new Date(p.dueAt) < TODAY;

export type Bucket = "certified" | "in_progress" | "not_started" | "overdue";
export const bucketOf = (p: Progress): Bucket =>
  p.state === "certified" ? "certified" : isOverdue(p) ? "overdue" : p.state === "not_started" ? "not_started" : "in_progress";

export interface Scope { divisionId?: string; regionId?: string; districtId?: string; courseId?: string }

export function scopedProgress(s: AppState, scope: Scope, courseId?: string) {
  const byUser = new Map(s.users.map((u) => [u.id, u]));
  return s.progress.filter((p) => {
    const u = byUser.get(p.userId);
    if (!u || !u.active || !u.roles.includes("rep")) return false;
    if (courseId && p.courseId !== courseId) return false;
    if (scope.divisionId && u.divisionId !== scope.divisionId) return false;
    if (scope.regionId && u.regionId !== scope.regionId) return false;
    if (scope.districtId && u.districtId !== scope.districtId) return false;
    return true;
  });
}

export function counts(ps: Progress[]) {
  const c = { certified: 0, in_progress: 0, not_started: 0, overdue: 0, total: ps.length };
  for (const p of ps) c[bucketOf(p)]++;
  return c;
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Certifications per day over the last 14 days, projected to the due date (TH-2 AC3). */
export function projected(ps: Progress[], dueAt: string) {
  const c = counts(ps);
  const since = new Date(TODAY);
  since.setDate(since.getDate() - 14);
  const recent = ps.filter((p) => p.certifiedAt && new Date(p.certifiedAt) >= since).length;
  const daysLeft = Math.max(0, (new Date(dueAt).getTime() - TODAY.getTime()) / 86400000);
  return Math.min(100, pct(c.certified + (recent / 14) * daysLeft, c.total));
}

/** Weekly certified % for the trend line, ending today. */
export function trend(ps: Progress[], weeks = 8) {
  const out: number[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(TODAY);
    d.setDate(d.getDate() - i * 7);
    out.push(pct(ps.filter((p) => p.certifiedAt && new Date(p.certifiedAt) <= d).length, ps.length));
  }
  return out;
}

export function lift(ps: Progress[]) {
  const both = ps.filter((p) => p.screening && p.attempts.some((a) => a.passed));
  const before = average(both.map((p) => p.screening!.overall));
  const after = average(both.map((p) => p.attempts.filter((a) => a.passed).at(-1)!.overall));
  const improved = pct(both.filter((p) => p.attempts.filter((a) => a.passed).at(-1)!.overall > p.screening!.overall).length, both.length);
  return { before, after, lift: after - before, improved, n: both.length };
}

export function timeToCertified(ps: Progress[]) {
  const days = ps.filter((p) => p.certifiedAt).map((p) => (new Date(p.certifiedAt!).getTime() - new Date(p.assignedAt).getTime()) / 86400000).sort((a, b) => a - b);
  return days.length ? Math.round(days[Math.floor(days.length / 2)]) : 0;
}

export function firstTry(ps: Progress[]) {
  const tried = ps.filter((p) => p.attempts.length);
  return pct(tried.filter((p) => p.attempts[0].passed).length, tried.length);
}

export function minutesSaved(ps: Progress[], course: Course) {
  const full = courseMinutes(course);
  return ps.filter((p) => p.path?.kind === "screening").reduce((a, p) => a + (full - pathMinutes(course.modules, p.path!.moduleIds)), 0);
}

/** Region × domain mean of latest scores (assessment by default, else screening). */
export function heatmap(s: AppState, ps: Progress[], source: "assessment" | "screening", groupBy: "region" | "district" = "region") {
  const byUser = new Map(s.users.map((u) => [u.id, u]));
  const groups = groupBy === "region"
    ? REGIONS.filter((r) => ps.some((p) => byUser.get(p.userId)?.regionId === r.id)).map((r) => ({ id: r.id, name: r.name }))
    : s.districts.filter((d) => ps.some((p) => byUser.get(p.userId)?.districtId === d.id)).map((d) => ({ id: d.id, name: d.name }));
  const rows = groups.map((g) => {
    const members = ps.filter((p) => (groupBy === "region" ? byUser.get(p.userId)?.regionId : byUser.get(p.userId)?.districtId) === g.id);
    const cells = DOMAINS.filter((d) => d.id !== "compliance").map((d) => {
      const comps = COMPETENCIES.filter((c) => c.domain === d.id).map((c) => c.id);
      const vals: number[] = [];
      for (const p of members) {
        const scores = source === "assessment" ? p.attempts.at(-1)?.competencyScores : p.screening?.scores;
        if (!scores) continue;
        for (const c of comps) if (scores[c] !== undefined) vals.push(scores[c]);
      }
      return { domain: d.id, value: vals.length ? average(vals) : null, n: vals.length };
    });
    return { ...g, cells };
  });
  return rows;
}

export function weakestDomains(rows: ReturnType<typeof heatmap>) {
  return DOMAINS.filter((d) => d.id !== "compliance")
    .map((d) => ({ domain: d, value: average(rows.flatMap((r) => r.cells.filter((c) => c.domain === d.id && c.value !== null).map((c) => c.value!))) }))
    .sort((a, b) => a.value - b.value);
}

/* ── Gamification (derived, PRD E11) ── */
export const LEVELS = [
  { name: "Associate", min: 0 },
  { name: "Specialist", min: 1000 },
  { name: "Expert", min: 1500 },
  { name: "Master", min: 2500 },
];

export function xpFor(s: AppState, userId: string) {
  let xp = s.xpBase[userId] ?? 0;
  const mine = s.progress.filter((p) => p.userId === userId);
  for (const p of mine) {
    if (p.attestName === "on file") continue;
    xp += p.completedBlocks.length * 5;
    if (p.screening) xp += 25;
    const passed = p.attempts.findIndex((a) => a.passed);
    if (passed >= 0) xp += 100 + (passed === 0 ? 50 : 0);
    if (p.state === "certified" && p.certifiedAt && p.certifiedAt >= "2026-11-01") xp += 150;
  }
  xp += (s.explored[userId]?.length ?? 0) * 5;
  const byDay = new Map<string, number>();
  for (const ps of s.practice.filter((x) => x.userId === userId)) byDay.set(ps.at.slice(0, 10), (byDay.get(ps.at.slice(0, 10)) ?? 0) + 1);
  for (const n of byDay.values()) xp += Math.min(5, n) * 10;
  xp += (s.streaks[userId]?.days ?? 0) * 5;
  const idx = LEVELS.findLastIndex((l) => xp >= l.min);
  const next = LEVELS[idx + 1];
  return { xp, level: idx + 1, levelName: LEVELS[idx].name, next, toNext: next ? next.min - xp : 0, pctToNext: next ? pct(xp - LEVELS[idx].min, next.min - LEVELS[idx].min) : 100 };
}

export interface Badge { id: string; name: string; description: string; earned: boolean; progress?: string }

export function badgesFor(s: AppState, userId: string): Badge[] {
  const mine = s.progress.filter((p) => p.userId === userId);
  const certs = mine.filter((p) => p.state === "certified");
  const roleplays = s.practice.filter((x) => x.userId === userId && x.kind === "roleplay").length;
  const streak = s.streaks[userId]?.days ?? 0;
  const lum = mine.find((p) => p.courseId === "c-lumora-launch");
  return [
    { id: "first-cert", name: "First certification", description: "Certified on any course.", earned: certs.length > 0 },
    { id: "launch-ready", name: "Launch ready", description: "Certified on Lumora before the campaign due date.", earned: lum?.state === "certified" },
    { id: "first-try", name: "First-try pass", description: "Passed an assessment on the first attempt.", earned: mine.some((p) => p.attempts[0]?.passed) },
    { id: "objections", name: "Objection handler", description: "10 practice roleplays.", earned: roleplays >= 10, progress: `${Math.min(roleplays, 10)}/10` },
    { id: "streak7", name: "7-day streak", description: "Learned 7 days in a row.", earned: streak >= 7, progress: `${Math.min(streak, 7)}/7` },
    { id: "streak30", name: "30-day streak", description: "Learned 30 days in a row.", earned: streak >= 30, progress: `${Math.min(streak, 30)}/30` },
    { id: "comeback", name: "Comeback", description: "Passed after a remediation path.", earned: mine.some((p) => p.attempts.some((a) => !a.passed) && p.attempts.some((a) => a.passed)) },
  ];
}

/** Why a course is on someone's list. */
export const ASSIGN_LABEL: Record<Progress["assignType"], string> = { required: "Required", default: "Onboarding", recommended: "Recommended", self: "Opted in" };
/** Tag tone and a one-line "where it came from" for each way a course lands on someone's list. */
export const ASSIGN_TAG: Record<Progress["assignType"], { tone: "brand" | "default" | "ok"; from: string }> = {
  required: { tone: "brand", from: "Assigned by the training team" },
  default: { tone: "default", from: "Every new rep gets it on day one" },
  recommended: { tone: "default", from: "Suggested, not required" },
  self: { tone: "ok", from: "Chose it from the Library" },
};

export const STATE_LABEL: Record<Progress["state"], string> = {
  not_started: "Not started",
  screening: "Screening",
  learning: "Learning",
  assessment: "Assessment",
  remediation: "Remediation",
  awaiting_verify: "Awaiting verify",
  needs_coaching: "Needs coaching",
  certified: "Certified",
};

export function fmtDate(iso?: string, withYear = false) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) });
}

export function daysBetween(a: string | Date, b: string | Date) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export const daysFromToday = (iso: string) => daysBetween(TODAY, iso);

/** Assigned with a start date that hasn't come yet: listed, but not startable. */
export const opensLater = (p: Progress) => !!p.startsAt && daysFromToday(p.startsAt) > 0;
