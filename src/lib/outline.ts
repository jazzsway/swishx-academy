import type { Module } from "@/data/types";

/** The two duration bands a trainer picks from when creating a course. */
export const DURATION = { short: { min: 5, max: 25 }, long: { min: 30, max: 120 } } as const;
/** Long courses aim for this much, then stop adding depth. */
const LONG_TARGET = 45;
/** A recording this long is a Library item, not part of a short course. */
const LONG_RECORDING = 10;

const total = (mods: Module[]) => mods.reduce((a, m) => a + m.minutes, 0);
const withMinutes = (m: Module): Module => ({ ...m, minutes: m.blocks.reduce((a, b) => a + b.minutes, 0) });
/** "Title (12 min)", unless the title already says how long it is. */
const named = (x: { title: string; minutes: number }) => (/\bmin\b/.test(x.title) ? x.title : `${x.title} (${x.minutes} min)`);

export interface ShapedOutline { modules: Module[]; left: string[]; added: string[] }

/**
 * Fits a drafted outline to the duration the trainer picked.
 * Short: drop long recordings, then reinforcement modules, then optional modules from the end. Required modules always stay.
 * Long: add deeper modules from the same sources until the course reaches its target.
 */
export function shapeOutline(mods: Module[], format: "short" | "long", depth: Module[]): ShapedOutline {
  const left: string[] = [];
  const added: string[] = [];

  if (format === "short") {
    let out = mods.map((m) => {
      const keep = m.blocks.filter((b) => !(b.type === "video" && b.minutes >= LONG_RECORDING));
      m.blocks.filter((b) => !keep.includes(b)).forEach((b) => left.push(named(b)));
      return withMinutes({ ...m, blocks: keep });
    }).filter((m) => m.blocks.length);
    for (const m of out.filter((x) => x.tier === "reinforcement" && !x.required)) left.push(named(m));
    out = out.filter((m) => m.tier !== "reinforcement" || m.required);
    while (total(out) > DURATION.short.max) {
      const drop = [...out].reverse().find((m) => !m.required);
      if (!drop) break;
      left.push(named(drop));
      out = out.filter((m) => m !== drop);
    }
    return { modules: out, left, added };
  }

  const out = [...mods];
  for (const d of depth) {
    if (total(out) >= LONG_TARGET) break;
    if (out.some((m) => m.title === d.title) || total(out) + d.minutes > DURATION.long.max) continue;
    out.push(d);
    added.push(named(d));
  }
  return { modules: out, left, added };
}
