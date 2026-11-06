import type { Block, Module, VideoSpec } from "@/data/types";
import { VA_PAGES } from "@/data/media";

const uid = () => Math.random().toString(36).slice(2, 7);

function moduleLines(m: Module) {
  return m.blocks.flatMap((b) => [...(b.paragraphs ?? []), ...(b.points ?? [])]).filter((p) => p.cite && !p.missing).map((p) => p.text);
}

/** A video built from the module's approved, cited sentences: the script is the approved words. */
export function videoFromModule(m: Module, origin: "upload" | "ai", fileName?: string): Block {
  const lines = moduleLines(m).slice(0, 6);
  const step = 26;
  const captions = lines.map((text, i) => ({ at: i * step, text }));
  const chapterEvery = Math.max(1, Math.ceil(lines.length / 3));
  const short = (t: string) => { const w = t.split(/[.,:;]/)[0].split(" "); return w.slice(0, 5).join(" ") + (w.length > 5 ? "…" : ""); };
  const chapters = lines.filter((_, i) => i % chapterEvery === 0).map((text, k) => ({ at: k * chapterEvery * step, title: short(text) }));
  const scenes = chapters.map((c) => {
    const text = lines[Math.round(c.at / step)];
    const stat = text.match(/\d+%\s*(vs|versus)\s*\d+%|\d+%/)?.[0];
    return { at: c.at, headline: c.title, stat, sub: stat ? undefined : m.title };
  });
  const spec: VideoSpec = { durationSec: Math.max(60, lines.length * step), origin, chapters, captions, scenes, fileName };
  return {
    id: `${m.id}-v${uid()}`, type: "video", minutes: Math.ceil(spec.durationSec / 60), competencies: [m.competency], video: spec,
    title: origin === "ai" ? `${m.title} in ${Math.ceil(spec.durationSec / 60)} minute${Math.ceil(spec.durationSec / 60) === 1 ? "" : "s"}` : (fileName ?? "Uploaded video").replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
  };
}

/** One clip per chapter of an approved video. Clips are new pieces and go into the MLR package with timestamps. */
export function clipsFrom(b: Block): Block[] {
  const v = b.video!;
  return v.chapters.map((ch, i) => {
    const to = v.chapters[i + 1]?.at ?? v.durationSec;
    const inRange = <T extends { at: number }>(xs: T[]) => xs.filter((x) => x.at >= ch.at && x.at < to).map((x) => ({ ...x, at: x.at - ch.at }));
    const scenes = inRange(v.scenes);
    return {
      id: `${b.id}-c${i + 1}`, type: "video" as const, title: ch.title, minutes: Math.max(1, Math.round((to - ch.at) / 60)), competencies: b.competencies,
      video: {
        durationSec: to - ch.at, origin: "clip" as const, chapters: [{ at: 0, title: ch.title }],
        captions: inRange(v.captions), scenes: scenes.length ? scenes : [{ at: 0, headline: ch.title }],
        clipOf: { blockId: b.id, from: ch.at, to, title: b.title },
      },
    };
  });
}

export function documentBlock(m: Module, sourceId: string, pages: number[], callout: string): Block {
  return {
    id: `${m.id}-d${uid()}`, type: "document", title: "Read it in the source", minutes: Math.max(1, pages.length), competencies: [m.competency],
    document: { sourceId, pages, callouts: callout.trim() ? [{ page: pages[0], text: callout.trim() }] : [] },
  };
}

export function visualAidBlock(m: Module, sourceId: string, pages: number[]): Block {
  return {
    id: `${m.id}-va${uid()}`, type: "visualaid", title: "Walk the visual aid", minutes: pages.length, competencies: [m.competency],
    visualaid: { sourceId, pages: pages.map((page) => ({ page, say: `Lead with “${VA_PAGES[sourceId]?.[page]?.headline ?? `page ${page}`}”. Use only the words on the page.`, avoid: page === 3 ? "No comparisons with other products." : undefined })) },
  };
}

export function audioBlock(m: Module): Block | null {
  const from = m.blocks.filter((b) => (b.type === "lesson" || b.type === "keypoints")).map((b) => b.id);
  if (!from.length) return null;
  const words = moduleLines(m).join(" ").split(" ").length;
  return { id: `${m.id}-a${uid()}`, type: "audio", title: `Listen: ${m.title}`, minutes: Math.max(1, Math.round(words / 150)), competencies: [m.competency], audio: { fromBlockIds: from, durationSec: Math.max(45, Math.round((words / 150) * 60)) } };
}
