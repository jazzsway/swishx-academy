"use client";

import { useApp, live, current } from "@/store/app-store";
import { useMe, daysFromToday, opensLater } from "@/store/selectors";
import type { Course, Module, Progress } from "@/data/types";
import { competency } from "@/data/org";
import { pathMinutes } from "@/lib/learning";
import { libraryCourses, unmetPrereqs } from "@/features/library/library-data";
import { product } from "@/data/org";
import { blockCards } from "@/lib/short-form";
import { allScenarios } from "@/data/scenarios";
import { screeningOf } from "@/lib/scenario-set";
import { callPlan } from "./situations";

/** Short form reads at about 20 seconds a card; long form uses each block's own minutes. */
const blockMinutes = (c: Course, b: Module["blocks"][number]) => (c.format === "short" ? blockCards(b).length / 3 : b.minutes);
export const moduleMinutes = (c: Course, m: Module) => Math.max(1, Math.round(m.blocks.reduce((a, b) => a + blockMinutes(c, b), 0)));

export const modulesOf = (c: Course) => (live(c) ?? current(c)).modules;

export function pathModules(p: Progress, c: Course): Module[] {
  /* Practice only: experienced reps skip the modules and go straight to the calls and the final test. */
  if (p.mode === "practice") return [];
  const mods = modulesOf(c);
  if (!p.path) return mods;
  return p.path.moduleIds.map((id) => mods.find((m) => m.id === id)).filter(Boolean) as Module[];
}

export function nextBlock(p: Progress, c: Course) {
  for (const m of pathModules(p, c)) {
    const b = m.blocks.find((x) => !p.completedBlocks.includes(x.id));
    if (b) return { module: m, block: b };
  }
  return null;
}

export function pathDone(p: Progress, c: Course) {
  return pathModules(p, c).every((m) => m.blocks.every((b) => p.completedBlocks.includes(b.id)));
}

export function pathProgress(p: Progress, c: Course) {
  const mods = pathModules(p, c);
  const total = mods.reduce((a, m) => a + m.blocks.length, 0);
  const done = mods.reduce((a, m) => a + m.blocks.filter((b) => p.completedBlocks.includes(b.id)).length, 0);
  const modulesDone = mods.filter((m) => m.blocks.every((b) => p.completedBlocks.includes(b.id))).length;
  const minutesLeft = Math.round(mods.reduce((a, m) => a + m.blocks.filter((b) => !p.completedBlocks.includes(b.id)).reduce((x, b) => x + blockMinutes(c, b), 0), 0));
  const fullMinutes = c.format === "short" ? modulesOf(c).reduce((a, m) => a + moduleMinutes(c, m), 0) : pathMinutes(modulesOf(c), modulesOf(c).map((m) => m.id));
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, modulesDone, modules: mods.length, minutesLeft, fullMinutes };
}

export interface NextStep {
  progress: Progress;
  course: Course;
  eyebrow: string;
  title: string;
  why: string;
  cta: string;
  href: string;
  minutes?: number;
  /** Set by useRep: an assigned course whose screening this one unlocks. */
  unlocks?: string;
}

/** Assigned by someone, as opposed to opted into from the library. */
export const isAssigned = (p: Progress) => p.assignType !== "self";
/** Under way: anything done on it, even a screening stopped partway. */
export const isStarted = (p: Progress) => p.state !== "not_started" || !!p.startedAt || p.completedBlocks.length > 0 || !!p.screeningPart?.length;

/**
 * What's next on a training built from the trainer's own material, in its order: the screening call
 * (or resuming it), the lessons screening left in, the objectives' situations one objective at a time,
 * retries, then signing. Null when there's nothing to do right now (certified, or waiting to retry).
 */
export function directNext(p: Progress, c: Course): NextStep | null {
  const base = `/rep/course/${c.id}`;
  if (p.state === "certified" || p.state === "awaiting_verify") return null;
  const step = (title: string, why: string, cta: string, href: string, minutes?: number): NextStep => ({ progress: p, course: c, eyebrow: c.title, title, why, cta, href, minutes });
  const screens = c.settings.screening && p.mode !== "practice";
  if (screens && !p.screening) {
    const all = screeningOf(c, allScenarios().filter((x) => c.scenarioIds.includes(x.id)));
    const done = p.screeningPart?.length ?? 0;
    if (all.length) return done
      ? step("Resume your screening", `${done} of ${all.length} done. What you've done is saved.`, `Resume screening · ${all.length - done} left`, `${base}/screening`, 3)
      : step("Start with a screening call", "About 3 minutes, not graded. It decides which lessons you can skip.", "Start with screening", `${base}/screening`, 3);
  }
  /* Optional material is there to look through, not a step: the calls come next. */
  const nb = p.mode === "optional" ? null : nextBlock(p, c);
  if (nb) {
    const pr = pathProgress(p, c);
    return step(nb.module.title, `Lesson ${pr.modulesDone + 1} of ${pr.modules}`, `${pr.modulesDone ? "Continue" : "Start"}: ${nb.module.title}`, `${base}/learn?module=${nb.module.id}`, pr.minutesLeft);
  }
  /* The calls: one per person, covering every objective drawn for them; retries ride along. */
  const plan = callPlan(c, p, useApp.getState().presenter);
  const call = plan.calls[0];
  if (call) {
    const host = call.items[0].sc.persona.name.replace(/,.*$/, "");
    const retry = call.items.every((x) => plan.objectives.find((o) => o.ob?.id === x.ob?.id)?.state === "retry");
    const n = call.items.length;
    return step(`Call with ${host}`, `${n} objective${n === 1 ? "" : "s"} · about ${call.minutes} min · scored`, `${retry ? "Retry" : "Start"} call ${plan.calls.length > 1 ? "1 " : ""}· ${host} · ${n} objective${n === 1 ? "" : "s"}`, `${base}/assessment?call=${call.key}`, call.minutes);
  }
  if (plan.allPassed) return step("Get your certificate", "Every objective passed. Your certificate is ready.", "Get your certificate", `${base}/attest`);
  return null;
}

/** The single "Up next" for the rep (PRD RH-1). */
export function nextStepFor(p: Progress, c: Course): NextStep | null {
  const base = `/rep/course/${c.id}`;
  if (p.state === "certified" || p.state === "awaiting_verify") return null;
  if (c.origin === "direct" && c.scenarioIds.length) return directNext(p, c);
  /* A training with the trainer's own material ends in the scenario call: every scenario, back to back. */
  const scenarioCall = c.origin === "direct" && c.scenarioIds.length > 0;
  if (scenarioCall && !p.attempts.at(-1)?.passed && (p.mode === "practice" || p.state === "assessment"))
    return { progress: p, course: c, eyebrow: p.mode === "practice" ? `${c.title} · scenarios only` : c.title, title: "Take the scenario call", why: `${c.scenarioIds.length} people, back to back in one call. Stop and continue any time.`, cta: p.state === "assessment" ? "Continue the call" : "Start the call", href: `${base}/assessment`, minutes: 15 };
  if (p.mode === "practice" && !p.attempts.at(-1)?.passed)
    return c.settings.completion.assessment
      ? { progress: p, course: c, eyebrow: `${c.title} · practice only`, title: "Take the final assessment", why: "You're assigned practice only. Rehearse the call first, as often as you like.", cta: "Start assessment", href: `${base}/assessment`, minutes: 10 }
      : { progress: p, course: c, eyebrow: `${c.title} · practice only`, title: "Practise the call", why: "You're assigned practice only. It's private and unlimited.", cta: "Practise", href: "/rep/practice", minutes: 5 };
  if (p.state === "not_started")
    return c.settings.screening
      ? (c.items.some((i) => i.pool === "screening")
        ? { progress: p, course: c, eyebrow: c.title, title: "Take your screening", why: "About 15 minutes. It skips what you already know.", cta: "Start screening", href: `${base}/screening`, minutes: 15 }
        : { progress: p, course: c, eyebrow: c.title, title: "Start with a screening call", why: "About 5 minutes. It skips the files you already know.", cta: "Start the call", href: `${base}/screening`, minutes: 5 })
      : { progress: p, course: c, eyebrow: c.title, title: "Start the training", why: c.format === "short" ? `${modulesOf(c).length} lessons of swipeable cards` : `${modulesOf(c).length} short lessons`, cta: "Start", href: `${base}/learn`, minutes: modulesOf(c).reduce((a, m) => a + moduleMinutes(c, m), 0) };
  if (p.state === "screening") return { progress: p, course: c, eyebrow: c.title, title: "Finish your screening", why: "Pick up where you left off.", cta: "Continue screening", href: `${base}/screening`, minutes: 10 };
  const nb = nextBlock(p, c);
  if (nb) {
    const score = p.screening?.scores[nb.module.competency];
    const reason = p.path?.reasons[nb.module.id];
    const pr = pathProgress(p, c);
    return {
      progress: p, course: c, eyebrow: `${c.title} · lesson ${pr.modulesDone + 1} of ${pr.modules}`, title: nb.module.title,
      why: p.state === "needs_coaching" ? "Your manager asked you to work on this." : p.state === "remediation" ? "Part of your retake path." : reason?.startsWith("Required") ? "Required for everyone." : score !== undefined ? `In your path because you scored ${score} on ${competency(nb.module.competency)?.name.toLowerCase()}.` : "Next in your training.",
      cta: "Continue", href: `${base}/learn?module=${nb.module.id}`, minutes: pr.minutesLeft,
    };
  }
  const last = p.attempts.at(-1);
  if (p.state === "assessment" && last?.passed) return { progress: p, course: c, eyebrow: c.title, title: "Get your certificate", why: "You passed. Your certificate is ready.", cta: "Get your certificate", href: `${base}/attest` };
  if (!c.settings.completion.assessment) return { progress: p, course: c, eyebrow: c.title, title: "Get your certificate", why: "You've finished every lesson.", cta: "Get your certificate", href: `${base}/attest` };
  if (scenarioCall) return { progress: p, course: c, eyebrow: c.title, title: "Take the scenario call", why: `Your lessons are done. ${c.scenarioIds.length} people, back to back in one call.`, cta: "Start the call", href: `${base}/assessment`, minutes: 15 };
  return { progress: p, course: c, eyebrow: c.title, title: p.state === "needs_coaching" ? "Resubmit your roleplay" : "Take the final assessment", why: c.items.some((i) => i.pool === "assessment") ? "Your path is done. Quiz plus a short call." : "Your path is done. One scored call.", cta: "Start assessment", href: `${base}/assessment`, minutes: 15 };
}

export function useRep() {
  const me = useMe();
  const s = useApp();
  const mine = s.progress.filter((p) => p.userId === me.id);
  const courseOf = (p: Progress) => s.courses.find((c) => c.id === p.courseId)!;
  /* Up next, in order: assigned and under way, assigned, opted into and under way, opted into. Then the library. */
  const tier = (p: Progress) => (isAssigned(p) ? 0 : 2) + (isStarted(p) ? 0 : 1);
  const urgency = (p: Progress) => (p.state === "needs_coaching" || p.state === "remediation" ? 0 : p.assignType === "required" ? 1 : 2);
  /* A course whose screening is locked can't start; what unlocks it takes its place in the order. */
  const isLocked = (p: Progress) => p.state === "not_started" && courseOf(p).settings.screening && unmetPrereqs(s, me.id, courseOf(p)).length > 0;
  const lift = new Map<string, { tier: number; title: string }>();
  for (const p of mine) if (p.state !== "certified" && isLocked(p)) for (const pre of unmetPrereqs(s, me.id, courseOf(p))) {
    const had = lift.get(pre.id);
    if (!had || tier(p) < had.tier) lift.set(pre.id, { tier: tier(p), title: courseOf(p).title });
  }
  const rank = (p: Progress) => Math.min(tier(p), lift.get(p.courseId)?.tier ?? 9);
  const active = mine
    .filter((p) => p.state !== "certified")
    .sort((a, b) => rank(a) - rank(b) || urgency(a) - urgency(b) || (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9"));
  const next = active.map((p) => {
    if (isLocked(p) || opensLater(p)) return null;
    const st = nextStepFor(p, courseOf(p));
    if (st && lift.has(p.courseId)) st.unlocks = lift.get(p.courseId)!.title;
    return st;
  }).find(Boolean) ?? null;
  /* Nothing to do on anything of theirs: the best course in the library they haven't started.
     Their own division's first, then the one most of their colleagues have taken. */
  const taken = (c: Course) => s.progress.filter((p) => p.courseId === c.id).length;
  const suggested = next ? null : libraryCourses(s, me)
    .filter((c) => !mine.some((p) => p.courseId === c.id) && !unmetPrereqs(s, me.id, c).length)
    .sort((a, b) => Number(product(b.productId)?.divisionId === me.divisionId) - Number(product(a.productId)?.divisionId === me.divisionId) || taken(b) - taken(a))[0] ?? null;
  const dueSoon = active.filter((p) => p.dueAt && daysFromToday(p.dueAt) <= 21 && !opensLater(p));
  return { me, s, mine, active, next, suggested, dueSoon, courseOf };
}
