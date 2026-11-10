"use client";

import type { Progress } from "@/data/types";
import { DIVISIONS } from "@/data/org";
import { current, live, type AppState } from "@/store/app-store";
import { counts, daysFromToday, isOverdue, pct, projected } from "@/store/selectors";

/*
 * A rollout is anything the trainer is pushing to the field right now: an active
 * campaign, or a published course with required assignments outside any campaign.
 * The trainer home lists all of them, riskiest first, instead of filtering by division.
 */

export type RolloutStatus = "behind" | "at_risk" | "on_track" | "scheduled";

export interface Rollout {
  id: string;
  name: string;
  kind: string;
  href: string;
  ps: Progress[];
  audience: string;
  dueAt?: string;
  startAt?: string;
  target: number;
  certified: number;
  total: number;
  ready: number;
  projected: number;
  status: RolloutStatus;
  blocker: { text: string; tone: "danger" | "warn" | "faint" };
}

/** v1-hidden: approval expiry belongs to MLR, which v1 doesn't have. */
const APPROVAL_EXPIRY: boolean = false;

const ORDER: Record<RolloutStatus, number> = { behind: 0, at_risk: 1, on_track: 2, scheduled: 3 };

function audienceOf(s: AppState, ps: Progress[]) {
  const users = new Map(s.users.map((u) => [u.id, u]));
  const divs = [...new Set(ps.map((p) => users.get(p.userId)?.divisionId).filter(Boolean))];
  const names = divs.map((d) => DIVISIONS.find((x) => x.id === d)?.name).filter(Boolean);
  return `${ps.length} people · ${names.length > 2 ? "all field teams" : names.join(" + ") || "company-wide"}`;
}

function assess(s: AppState, ps: Progress[], courseIds: string[], dueAt: string | undefined, target: number) {
  const k = counts(ps);
  const ready = pct(k.certified, k.total);
  const proj = dueAt ? projected(ps, dueAt) : ready;
  const overdue = ps.filter(isOverdue);
  const notStarted = ps.filter((p) => p.state === "not_started").length;
  const waiting = ps.filter((p) => p.state === "awaiting_verify").length;

  let expiring: { days: number; fixes: boolean } | undefined;
  for (const id of courseIds) {
    const c = s.courses.find((x) => x.id === id);
    const lv = c && live(c);
    if (APPROVAL_EXPIRY && c && lv?.expiresAt && daysFromToday(lv.expiresAt) <= 30) expiring = { days: daysFromToday(lv.expiresAt), fixes: current(c).state === "changes" };
  }

  let status: RolloutStatus = proj >= target ? "on_track" : proj >= target - 10 ? "at_risk" : "behind";
  if (expiring && status === "on_track") status = "at_risk";

  const blocker: Rollout["blocker"] = expiring
    ? { tone: "danger", text: `Approval expires in ${expiring.days} days${expiring.fixes ? "; the new version still needs MLR fixes" : ""}` }
    : overdue.length
      ? { tone: "warn", text: `${overdue.length} overdue${notStarted ? ` · ${notStarted} haven't started` : ""}` }
      : notStarted > ps.length * 0.2
        ? { tone: "warn", text: `${notStarted} haven't started` }
        : waiting
          ? { tone: "faint", text: `${waiting} waiting for manager sign-off` }
          : { tone: "faint", text: "On pace" };

  return { certified: k.certified, total: k.total, ready, projected: proj, status, blocker };
}

const latestDue = (ps: Progress[]) => ps.map((p) => p.dueAt).filter(Boolean).sort().at(-1);

export function rollouts(s: AppState): Rollout[] {
  const out: Rollout[] = [];
  const inCampaign = new Set<string>();

  /* v1-hidden: campaigns aren't in v1, so every rollout is a required course. */
  for (const cmp of [] as AppState["campaigns"]) {
    if (cmp.status === "active") cmp.courseIds.forEach((id) => inCampaign.add(id));
    const ps = s.progress.filter((p) => p.campaignId === cmp.id);
    const base = { id: cmp.id, name: cmp.name, kind: `${cmp.type === "launch" ? "Launch" : cmp.type === "label_update" ? "Label update" : cmp.type === "onboarding" ? "Onboarding" : "Annual"} campaign`, href: `/trainer/campaigns/${cmp.id}`, dueAt: cmp.dueAt, startAt: cmp.startAt, target: cmp.target };
    if (cmp.status === "scheduled") {
      out.push({ ...base, ps, audience: "Not assigned yet", certified: 0, total: 0, ready: 0, projected: 0, status: "scheduled", blocker: { tone: "faint", text: `Starts ${new Date(cmp.startAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` } });
    } else if (cmp.status === "active") {
      out.push({ ...base, ps, audience: audienceOf(s, ps), ...assess(s, ps, cmp.courseIds, cmp.dueAt, cmp.target) });
    }
  }

  for (const c of s.courses) {
    if (inCampaign.has(c.id) || !live(c)) continue;
    const ps = s.progress.filter((p) => p.courseId === c.id && (p.assignType === "required" || p.assignType === "default"));
    if (!ps.length) continue;
    const dueAt = latestDue(ps);
    /* A rollout that's over (everyone certified, due date passed) isn't rolling out any more. */
    if (ps.every((p) => p.state === "certified") && dueAt && daysFromToday(dueAt) < 0) continue;
    out.push({ id: c.id, name: c.title, kind: ps.some((p) => p.assignType === "required") ? "Required course" : "Onboarding course", href: `/trainer/courses/${c.id}`, ps, audience: audienceOf(s, ps), dueAt, target: 90, ...assess(s, ps, [c.id], dueAt, 90) });
  }

  return out.sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.ready - b.ready);
}

export const STATUS_LABEL: Record<RolloutStatus, string> = { behind: "Behind", at_risk: "At risk", on_track: "On track", scheduled: "Scheduled" };
