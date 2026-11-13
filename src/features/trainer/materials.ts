import type { Block, Module, Source } from "@/data/types";
import { DOC_PAGES, VA_PAGES } from "@/data/media";
import { audioBlock, documentBlock, videoFromModule, visualAidBlock } from "./course/media-builders";

/**
 * Where a piece the trainer brings goes. "course": reps watch, read or listen to it, and SwishX
 * analyses it for questions. "background": source material SwishX builds new content from; reps
 * never see it. "both": reps see it, and SwishX also builds new content from it.
 */
export type Place = "course" | "background" | "both";

export const PLACE_OPTIONS: { id: Place; label: string; hint: string }[] = [
  { id: "course", label: "In the course", hint: "Reps see it as it is" },
  { id: "background", label: "Source material only", hint: "SwishX builds from it; reps don't see it" },
  { id: "both", label: "Both", hint: "Reps see it, and SwishX builds from it too" },
];

/** Your own uploads go in the course; product-library documents start as background, except the visual aid. */
export function defaultPlace(s: Source): Place {
  if (s.uploaded) return s.uploaded.format === "data" || s.uploaded.format === "other" ? "background" : "course";
  return s.type === "Visual aid" ? "course" : "background";
}

/** How a rep gets this piece once it's in the course, in plain words. */
export function howRepsGetIt(s: Source): string {
  const f = s.uploaded?.format;
  if (f === "video") return "Video · plays inside the module it fits";
  if (f === "audio") return "Audio · a listen block reps can play on the road";
  if (f === "image") return "Image · shown full screen, reps can zoom";
  if (f === "slides" || s.type === "Visual aid") return `Slides · reps walk through ${s.pages ? `the first ${Math.min(4, s.pages)} pages` : "the pages"}`;
  if (f === "pdf" || !s.uploaded) return `PDF · reps read ${s.pages ? `pages 1–${Math.min(3, s.pages)}` : "it page by page"}`;
  return "Document · reps read it in the app";
}

/* Where a piece belongs, from its title. */
const PLACE: [RegExp, string][] = [
  [/objection/i, "c-objections"], [/payer|access|hub|cost|coverage|copay/i, "c-access"], [/safety|\bisi\b|risk|warning/i, "c-safety"],
  [/dos(e|ing)|inject|administ/i, "c-dosing"], [/efficacy|trial|clinical|lumen|study|easi|results/i, "c-efficacy"], [/disease|patient/i, "c-disease"],
  [/visual aid|detailer|deck/i, "c-opening"],
];

export function blockFor(s: Source, m: Module): Block {
  const fmt = s.uploaded?.format;
  if (fmt === "video") return videoFromModule(m, "upload", s.uploaded!.fileName);
  if (fmt === "audio") {
    const a = audioBlock(m);
    if (a) return { ...a, title: `Listen: ${s.title}` };
  }
  if (fmt === "slides" || s.type === "Visual aid") return { ...visualAidBlock(m, s.id, Array.from({ length: Math.min(4, s.pages || 4) }, (_, i) => i + 1)), title: s.title };
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

/** What a direct-course file is, in a few words. */
export function directKind(s: Source): string {
  const f = s.uploaded?.format;
  if (f) return { video: "Video", audio: "Audio", image: "Image", slides: "Slides", pdf: "PDF", doc: "Document", data: "Data", other: "File" }[f];
  return s.type === "Visual aid" ? "Slides" : "PDF";
}

/** Rough minutes a rep spends on a file, for the course length. */
function directMinutes(s: Source): number {
  const f = s.uploaded?.format;
  if (f === "video") return 6;
  if (f === "audio") return 5;
  if (f === "image") return 1;
  return Math.max(2, Math.min(12, Math.round((s.pages || 4) * 0.8)));
}

/**
 * Direct course: one module per file, in the trainer's order, each holding the file exactly as it is.
 * Uploads play as uploaded; library documents open on their own pages. Nothing is written, no questions added.
 */
export function directModules(items: Source[], prefix: string): Module[] {
  return items.map((s, i) => {
    const id = `${prefix}-m${i + 1}`;
    const competency = PLACE.find(([re]) => re.test(`${s.title} ${s.uploaded?.fileName ?? ""} ${s.type}`))?.[1] ?? "c-opening";
    const minutes = directMinutes(s);
    const base = { id: `${id}-b1`, title: s.title, minutes, competencies: [competency] };
    let block: Block;
    if (s.uploaded) block = { ...base, type: "file", file: { sourceId: s.id, format: s.uploaded.format, fileName: s.uploaded.fileName, pages: s.pages || undefined } };
    else if (s.type === "Visual aid") {
      const pages = Object.keys(VA_PAGES[s.id] ?? {}).map(Number);
      block = { ...base, type: "visualaid", visualaid: { sourceId: s.id, pages: (pages.length ? pages : [1, 2, 3, 4]).map((page) => ({ page, say: "" })) } };
    } else {
      const pages = Object.keys(DOC_PAGES[s.id] ?? {}).map(Number);
      block = { ...base, type: "document", document: { sourceId: s.id, pages: pages.length ? pages : [1, 2, 3], callouts: [] } };
    }
    return { id, title: s.title, summary: `${directKind(s)} · shown to reps as it is`, competency, tier: "core" as const, required: false, minutes, blocks: [block] };
  });
}
