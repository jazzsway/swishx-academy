"use client";

import { useApp, live, current } from "@/store/app-store";
import { useMe, daysFromToday } from "@/store/selectors";
import type { Course, Module, Progress } from "@/data/types";
import { competency } from "@/data/org";
import { pathMinutes } from "@/lib/learning";

export const modulesOf = (c: Course) => (live(c) ?? current(c)).modules;

export function pathModules(p: Progress, c: Course): Module[] {
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
  const minutesLeft = mods.reduce((a, m) => a + m.blocks.filter((b) => !p.completedBlocks.includes(b.id)).reduce((x, b) => x + b.minutes, 0), 0);
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, modulesDone, modules: mods.length, minutesLeft, fullMinutes: pathMinutes(modulesOf(c), modulesOf(c).map((m) => m.id)) };
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
}

/** The single "Up next" for the rep (PRD RH-1). */
export function nextStepFor(p: Progress, c: Course): NextStep | null {
  const base = `/rep/course/${c.id}`;
  if (p.state === "certified" || p.state === "awaiting_verify") return null;
  if (p.state === "not_started")
    return c.settings.screening
      ? { progress: p, course: c, eyebrow: c.title, title: "Take your screening", why: "About 15 minutes. It skips what you already know.", cta: "Start screening", href: `${base}/screening`, minutes: 15 }
      : { progress: p, course: c, eyebrow: c.title, title: "Start the course", why: `${modulesOf(c).length} short modules`, cta: "Start", href: `${base}/learn`, minutes: modulesOf(c).reduce((a, m) => a + m.minutes, 0) };
  if (p.state === "screening") return { progress: p, course: c, eyebrow: c.title, title: "Finish your screening", why: "Pick up where you left off.", cta: "Continue screening", href: `${base}/screening`, minutes: 10 };
  const nb = nextBlock(p, c);
  if (nb) {
    const score = p.screening?.scores[nb.module.competency];
    const reason = p.path?.reasons[nb.module.id];
    const pr = pathProgress(p, c);
    return {
      progress: p, course: c, eyebrow: `${c.title} · module ${pr.modulesDone + 1} of ${pr.modules}`, title: nb.module.title,
      why: p.state === "needs_coaching" ? "Your manager asked you to work on this." : p.state === "remediation" ? "Part of your retake path." : reason?.startsWith("Required") ? "Required for everyone." : score !== undefined ? `In your path because you scored ${score} on ${competency(nb.module.competency)?.name.toLowerCase()}.` : "Next in your course.",
      cta: "Continue", href: `${base}/learn?module=${nb.module.id}`, minutes: pr.minutesLeft,
    };
  }
  const last = p.attempts.at(-1);
  if (p.state === "assessment" && last?.passed) return { progress: p, course: c, eyebrow: c.title, title: "Sign your attestation", why: "One last step before certification.", cta: "Sign", href: `${base}/attest` };
  if (!c.settings.completion.assessment) return { progress: p, course: c, eyebrow: c.title, title: "Sign your attestation", why: "You've finished every module.", cta: "Sign", href: `${base}/attest` };
  return { progress: p, course: c, eyebrow: c.title, title: p.state === "needs_coaching" ? "Resubmit your roleplay" : "Take the final assessment", why: "Your path is done. Quiz plus a short call.", cta: "Start assessment", href: `${base}/assessment`, minutes: 15 };
}

export function useRep() {
  const me = useMe();
  const s = useApp();
  const mine = s.progress.filter((p) => p.userId === me.id);
  const courseOf = (p: Progress) => s.courses.find((c) => c.id === p.courseId)!;
  const active = mine
    .filter((p) => p.state !== "certified")
    .sort((a, b) => {
      const rank = (p: Progress) => (p.state === "needs_coaching" || p.state === "remediation" ? 0 : p.assignType === "required" ? 1 : p.assignType === "default" ? 2 : 3);
      return rank(a) - rank(b) || (a.dueAt ?? "9").localeCompare(b.dueAt ?? "9");
    });
  const next = active.map((p) => nextStepFor(p, courseOf(p))).find(Boolean) ?? null;
  const dueSoon = active.filter((p) => p.dueAt && daysFromToday(p.dueAt) <= 21);
  return { me, s, mine, active, next, dueSoon, courseOf };
}
