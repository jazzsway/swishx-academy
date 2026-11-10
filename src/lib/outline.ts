import type { Module } from "@/data/types";

/** The range a trainer can pick for a course, in minutes. */
export const DURATION = { min: 5, max: 120, step: 5 } as const;
/** At or under this, a course is "short": one sitting, essentials only. */
export const SHORT_MAX = 25;
/** An outline within this share of the target counts as fitting it. */
const SLACK = 0.2;
/** A recording this long is too much for a short course. */
const LONG_RECORDING = 10;

const total = (mods: Module[]) => mods.reduce((a, m) => a + m.minutes, 0);
const withMinutes = (m: Module): Module => ({ ...m, minutes: m.blocks.reduce((a, b) => a + b.minutes, 0) });
/** "Title (12 min)", unless the title already says how long it is. */
const named = (x: { title: string; minutes: number }) => (/\bmin\b/.test(x.title) ? x.title : `${x.title} (${x.minutes} min)`);

export const lengthOf = (minutes: number): "short" | "long" => (minutes <= SHORT_MAX ? "short" : "long");
export const fitsTarget = (minutes: number, target: number) => minutes >= Math.floor(target * (1 - SLACK)) && minutes <= Math.ceil(target * (1 + SLACK));
export const fmtMinutes = (m: number) => (m < 60 ? `${m} min` : `${+(m / 60).toFixed(1)} h`);

export interface ShapedOutline { modules: Module[]; left: string[]; added: string[] }

/**
 * Fits a drafted outline to the minutes the trainer picked.
 * Short courses drop long recordings and reinforcement first. Anything too long then loses
 * optional modules from the end; required modules always stay. Anything too short gets
 * deeper modules from the same sources until it reaches the target.
 */
export function shapeOutline(mods: Module[], target: number, depth: Module[]): ShapedOutline {
  const left: string[] = [];
  const added: string[] = [];
  const ceiling = Math.ceil(target * (1 + SLACK));
  let out = [...mods];

  if (target <= SHORT_MAX) {
    out = out.map((m) => {
      const keep = m.blocks.filter((b) => !(b.type === "video" && b.minutes >= LONG_RECORDING));
      m.blocks.filter((b) => !keep.includes(b)).forEach((b) => left.push(named(b)));
      return withMinutes({ ...m, blocks: keep });
    }).filter((m) => m.blocks.length);
    for (const m of out.filter((x) => x.tier === "reinforcement" && !x.required)) left.push(named(m));
    out = out.filter((m) => m.tier !== "reinforcement" || m.required);
  }

  while (total(out) > ceiling) {
    const drop = [...out].reverse().find((m) => !m.required);
    if (!drop) break;
    left.push(named(drop));
    out = out.filter((m) => m !== drop);
  }

  for (const d of depth) {
    if (total(out) >= target * (1 - SLACK)) break;
    if (out.some((m) => m.title === d.title) || total(out) + d.minutes > ceiling) continue;
    out.push(d);
    added.push(named(d));
  }
  return { modules: out, left, added };
}
