import type { Block, Module, Source } from "@/data/types";
import { documentBlock, videoFromModule, visualAidBlock } from "./course/media-builders";

/**
 * What the trainer brings to a course. "learn": SwishX writes from it and cites it.
 * "show": reps see it as it is, inside a module. "both": the two together.
 */
export type MaterialUse = "learn" | "show" | "both";

export const USE_LABEL: Record<MaterialUse, string> = { learn: "Learn from it", show: "Show to reps", both: "Both" };

/** A sensible starting role: recordings and images are for reps to see, the label is to learn from. */
export function defaultUse(s: Source): MaterialUse {
  if (s.uploaded) return s.uploaded.format === "video" || s.uploaded.format === "image" ? "show" : s.uploaded.format === "data" ? "learn" : "both";
  return s.type === "Visual aid" ? "both" : "learn";
}

/* Where a piece belongs, from its title. */
const PLACE: [RegExp, string][] = [
  [/objection/i, "c-objections"], [/payer|access|hub|cost|coverage|copay/i, "c-access"], [/safety|\bisi\b|risk|warning/i, "c-safety"],
  [/dos(e|ing)|inject|administ/i, "c-dosing"], [/efficacy|trial|clinical|lumen|study|data/i, "c-efficacy"], [/disease|patient/i, "c-disease"],
  [/visual aid|detailer|deck/i, "c-opening"],
];

function blockFor(s: Source, m: Module): Block {
  const fmt = s.uploaded?.format;
  if (fmt === "video") return videoFromModule(m, "upload", s.uploaded!.fileName);
  if (s.type === "Visual aid") return { ...visualAidBlock(m, s.id, Array.from({ length: Math.min(4, s.pages || 4) }, (_, i) => i + 1)), title: s.title };
  const pages = fmt === "image" ? [1] : Array.from({ length: Math.min(3, s.pages || 3) }, (_, i) => i + 1);
  return { ...documentBlock(m, s.id, pages, ""), title: `${fmt === "image" ? "View" : "Read"}: ${s.title}` };
}

/**
 * Puts the trainer's own pieces into the drafted outline, each at the start of the module it fits best.
 * Returns which titles landed in which module, so the outline can show "Yours" next to "SwishX writes".
 */
export function placeMaterials(mods: Module[], items: Source[]): { modules: Module[]; yours: Record<string, string[]> } {
  const out = mods.map((m) => ({ ...m, blocks: [...m.blocks] }));
  const yours: Record<string, string[]> = {};
  for (const s of items) {
    const comp = PLACE.find(([re]) => re.test(`${s.title} ${s.uploaded?.fileName ?? ""} ${s.type}`))?.[1];
    const m = out.find((x) => x.competency === comp) ?? out.find((x) => !x.required) ?? out[0];
    if (!m) continue;
    const b = blockFor(s, m);
    m.blocks.unshift(b);
    m.minutes += b.minutes;
    (yours[m.id] ??= []).push(s.title);
  }
  return { modules: out, yours };
}
