import type { Course, Item, Module, PathPlan } from "@/data/types";
import { competency } from "@/data/org";

/* Proficiency bands (PRD §3). Thresholds are org settings in production. */
export type Band = "not_yet" | "developing" | "proficient" | "expert";

export function bandOf(score: number): Band {
  if (score >= 95) return "expert";
  if (score >= 80) return "proficient";
  if (score >= 50) return "developing";
  return "not_yet";
}

export const BAND_LABEL: Record<Band, string> = {
  not_yet: "Not yet",
  developing: "Developing",
  proficient: "Proficient",
  expert: "Expert",
};

/**
 * PP-1: pick + order only. Never creates content; returns module ids from the
 * course's approved modules, each with the reason it is (or isn't) included.
 */
export function buildPath(
  modules: Module[],
  scores: Record<string, number>,
  kind: PathPlan["kind"],
  opts: { aiReorder?: boolean; focus?: string[] } = {},
): PathPlan {
  const moduleIds: string[] = [];
  const reasons: Record<string, string> = {};
  const testedOut: string[] = [];
  const focus = new Set(opts.focus ?? []);

  for (const m of modules) {
    const s = scores[m.competency];
    const name = competency(m.competency)?.name ?? m.competency;
    if (m.required) {
      moduleIds.push(m.id);
      reasons[m.id] = "Required for everyone";
      continue;
    }
    if (kind === "full") {
      moduleIds.push(m.id);
      reasons[m.id] = "Full course";
      continue;
    }
    if (focus.has(m.competency)) {
      moduleIds.push(m.id);
      reasons[m.id] = `Coaching focus: ${name}`;
      continue;
    }
    if (s === undefined) {
      moduleIds.push(m.id);
      reasons[m.id] = "Not measured yet";
      continue;
    }
    const band = bandOf(s);
    if (band === "proficient" || band === "expert") {
      testedOut.push(m.id);
      reasons[m.id] = `Tested out: ${name} ${s}`;
    } else if (m.tier === "core") {
      moduleIds.push(m.id);
      reasons[m.id] = `Gap: ${name} ${s}`;
    } else if (band === "not_yet") {
      moduleIds.push(m.id);
      reasons[m.id] = `Extra practice: ${name} ${s}`;
    } else {
      testedOut.push(m.id);
      reasons[m.id] = `Optional: ${name} ${s}`;
    }
  }

  if (opts.aiReorder) {
    const order = new Map(modules.map((m, i) => [m.id, i]));
    moduleIds.sort((a, b) => {
      const ma = modules.find((m) => m.id === a)!;
      const mb = modules.find((m) => m.id === b)!;
      if (ma.required !== mb.required) return ma.required ? 1 : -1;
      const sa = scores[ma.competency] ?? 100;
      const sb = scores[mb.competency] ?? 100;
      return sa - sb || order.get(a)! - order.get(b)!;
    });
  }

  return { kind, moduleIds, reasons, testedOut, builtAt: new Date().toISOString() };
}

export function pathMinutes(modules: Module[], ids: string[]) {
  return modules.filter((m) => ids.includes(m.id)).reduce((a, m) => a + m.minutes, 0);
}

export function courseMinutes(course: Pick<Course, "modules">) {
  return course.modules.reduce((a, m) => a + m.minutes, 0);
}

/** Score answered items into per-competency percentages, weighting harder items more. */
export function scoreItems(items: Item[], answers: Record<string, number | null>) {
  const byComp: Record<string, { got: number; max: number }> = {};
  let got = 0;
  let max = 0;
  for (const it of items) {
    if (!(it.id in answers)) continue;
    const w = it.difficulty;
    const ok = answers[it.id] === it.answer;
    byComp[it.competency] ??= { got: 0, max: 0 };
    byComp[it.competency].max += w;
    max += w;
    if (ok) {
      byComp[it.competency].got += w;
      got += w;
    }
  }
  const scores: Record<string, number> = {};
  for (const [k, v] of Object.entries(byComp)) scores[k] = Math.round((v.got / v.max) * 100);
  return { overall: max ? Math.round((got / max) * 100) : 0, scores };
}

/** Blend quiz competency scores with roleplay criterion scores (60/40 where both exist). */
export function blendScores(quiz: Record<string, number>, call?: Record<string, number>) {
  if (!call) return quiz;
  const out: Record<string, number> = { ...quiz };
  for (const [k, v] of Object.entries(call)) {
    out[k] = out[k] === undefined ? v : Math.round(out[k] * 0.6 + v * 0.4);
  }
  return out;
}

export function average(nums: number[]) {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}
