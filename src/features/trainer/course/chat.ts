import type { Block, Course, Item, Module, Para } from "@/data/types";
import { competency } from "@/data/org";
import { DOC_PAGES, VA_PAGES } from "@/data/media";
import { LUMORA_ITEMS } from "@/data/courses/lumora-items";
import { LUMORA_LAUNCH_MODULES } from "@/data/courses/lumora-launch";
import { FIXES, runChecks } from "./checks";
import { audioBlock, clipsFrom, documentBlock, videoFromModule, visualAidBlock } from "./media-builders";

/* The scripted co-author behind "edit via chat" (PRD CC-4). Every change is a diff the
   trainer accepts or rejects; the AI only uses the course's own sources. */

export type Change =
  | { kind: "para"; moduleId: string; blockId: string; index: number; before?: Para; after?: Para }
  | { kind: "block"; moduleId: string; block: Block }
  | { kind: "items"; items: Item[] }
  /* Everything the editor used to do with its own buttons now comes through here. */
  | { kind: "insert"; moduleId: string; afterBlockId: string; blocks: Block[]; label: string }
  | { kind: "removeBlock"; moduleId: string; blockId: string; label: string }
  | { kind: "module"; moduleId: string; patch: Partial<Pick<Module, "title" | "required">>; label: string }
  | { kind: "addModule"; module: Module }
  | { kind: "move"; moduleId: string; to: number; label: string }
  | { kind: "removeModule"; moduleId: string; label: string }
  | { kind: "retire"; itemIds: string[]; label: string }
  | { kind: "pool"; itemIds: string[]; pool: Item["pool"]; label: string }
  /* The trainer's word on what a right written answer must (or must not) do. */
  | { kind: "guide"; itemId: string; note: string; point?: { text: string; keywords: string[] }; label: string };

export interface ChatTurn {
  id: string;
  from: "you" | "ai";
  text: string;
  changes?: Change[];
  status?: "pending" | "accepted" | "rejected";
}

const PI = "src-lum-pi";

const HARDER_DOSING: Omit<Item, "id">[] = [
  { competency: "c-dosing", pool: "assessment", difficulty: 3, question: "A dose was missed 6 days ago. What does the PI say?", options: ["Skip it", "Give it now, then resume the original schedule", "Restart the loading dose", "Give two doses next time"], answer: 1, rationale: "Within 7 days: give it, then resume the original schedule.", cite: { sourceId: PI, page: 3 } },
  { competency: "c-dosing", pool: "assessment", difficulty: 3, question: "Where may a caregiver give the injection that a patient should not self-inject?", options: ["Abdomen", "Thigh", "Upper arm", "Calf"], answer: 2, rationale: "The upper arm is for caregiver injection only.", cite: { sourceId: PI, page: 16 } },
  { competency: "c-dosing", pool: "screening", difficulty: 3, question: "How is the 500 mg loading dose given?", options: ["One injection", "Two 250 mg injections at different sites", "Two injections a week apart", "Intravenously"], answer: 1, rationale: "Two 250 mg injections at different sites.", cite: { sourceId: PI, page: 2 } },
];

const uid = () => Math.random().toString(36).slice(2, 8);

export const SUGGESTIONS = [
  "Fix all citation and wording issues",
  "Add a short video to this module",
  "Add an audio version",
  "Add PDF pages for reps to read",
  "Add a module on dosing",
  "Shorten this module",
];

/** Prompts for the Assessment tab, where the chat edits the question bank. */
export const QUESTION_SUGGESTIONS = [
  "Add an open question for this module",
  "Add a quick check to this module",
  "Which competencies have fewer than 6 questions?",
  "Add 3 harder questions on dosing",
  "Retire the questions nobody gets wrong",
];

const quoted = (p: string) => p.match(/["“']([^"”']{3,})["”']/)?.[1];
const BLOCK_WORDS: [RegExp, Block["type"][]][] = [
  [/video|clip|recording/, ["video"]], [/audio|listen/, ["audio"]], [/pdf|reading|pages/, ["document"]],
  [/visual aid|walkthrough/, ["visualaid"]], [/check|quiz/, ["check"]], [/key ?points/, ["keypoints"]], [/lesson|text/, ["lesson"]],
];
const MODULE_TOPICS: [RegExp, string][] = [
  [/dos(e|ing)|inject|administ/, "c-dosing"], [/safety|isi|fair balance/, "c-safety"], [/efficacy|trial|lumen|results/, "c-efficacy"],
  [/access|coverage|payer|prior auth|hub/, "c-access"], [/objection/, "c-objections"], [/open|first call/, "c-opening"],
  [/disease|patient/, "c-disease"], [/mechanism|moa|how .* works/, "c-moa"], [/compet|landscape/, "c-competitive"],
];

/** The editing actions that used to be buttons in the course editor. Returns null when the prompt isn't one of them. */
function editAction(p: string, raw: string, course: Course, mod: Module): ChatTurn | null {
  const pi = course.sourceIds.find((id) => DOC_PAGES[id]);
  const va = course.sourceIds.find((id) => VA_PAGES[id]);
  const add = /(add|make|generate|create|insert|include)/.test(p);
  const remove = /(remove|delete|drop|take out|get rid)/.test(p);
  const say = (text: string, changes?: Change[]): ChatTurn => ({ id: uid(), from: "ai", text, changes, status: changes ? "pending" : undefined });
  const block = (b: Block, text: string) => say(text, [{ kind: "block", moduleId: mod.id, block: b }]);

  /* Change "old sentence" to "new sentence": keeps the old citation. */
  const swap = raw.match(/change\s+["“](.+?)["”]\s+to\s+["“](.+?)["”]/i);
  if (swap) {
    for (const m of course.modules) for (const b of m.blocks) {
      const index = b.paragraphs?.findIndex((x) => x.text.toLowerCase().includes(swap[1].toLowerCase())) ?? -1;
      if (index >= 0) return say(`Here's the edit in ${m.title}. It keeps the original citation; checks will flag it if the source doesn't support the new wording.`,
        [{ kind: "para", moduleId: m.id, blockId: b.id, index, before: b.paragraphs![index], after: { ...b.paragraphs![index], text: swap[2] } }]);
    }
    return say("I couldn't find that sentence in this course. Copy a few words of it exactly, in quotes.");
  }

  if (add && /module/.test(p) && !/this module|to (the )?module/.test(p)) {
    const comp = MODULE_TOPICS.find(([re]) => re.test(p))?.[1];
    const pick = LUMORA_LAUNCH_MODULES.find((m) => m.competency === comp && !course.modules.some((x) => x.title === m.title));
    if (!course.productId || course.productId !== "p-lumora" || !pick) return say(comp ? `Your sources don't have enough on ${competency(comp).name.toLowerCase()} for a new module. Add a document that covers it under Materials first.` : "Tell me what the module should cover, for example “Add a module on dosing”.");
    const id = `${course.id.slice(-4)}m${uid()}`;
    const module: Module = { ...pick, id, blocks: pick.blocks.map((b, i) => ({ ...b, id: `${id}-b${i + 1}` })) };
    return say(`A ${module.minutes}-minute module, “${module.title}”, written from your sources and cited by page. It goes at the end; ask me to move it if you want it earlier.`, [{ kind: "addModule", module }]);
  }

  if (remove && /module/.test(p) && /this module|the module/.test(p)) {
    if (mod.required) return say(`${mod.title} is required for everyone, so I can't remove it. Safety and fair balance always stay in.`);
    return say(`I'll remove “${mod.title}” (${mod.minutes} min). Reps who already finished it keep their progress.`, [{ kind: "removeModule", moduleId: mod.id, label: mod.title }]);
  }

  const rename = raw.match(/(?:rename|call)\s+(?:this|the)?\s*module\s+(?:to\s+)?["“]?(.+?)["”]?$/i) ?? (/(rename|title)/.test(p) ? [null, quoted(raw)] : null);
  if (rename?.[1]) return say(`Renaming the module to “${rename[1]}”.`, [{ kind: "module", moduleId: mod.id, patch: { title: rename[1] }, label: `Title → ${rename[1]}` }]);

  if (/(personalis|optional|not required|skip if they know)/.test(p)) {
    if (mod.competency === "c-safety") return say("Safety modules stay required for everyone. Reps can't screen out of safety content.");
    return say(`Reps who already know ${competency(mod.competency).name.toLowerCase()} will skip “${mod.title}” after screening.`, [{ kind: "module", moduleId: mod.id, patch: { required: false }, label: "Personalisable: reps can test out" }]);
  }
  if (/required|everyone (takes|must)|mandatory/.test(p) && !add) {
    return say(`Every rep will take “${mod.title}”, whatever their screening score.`, [{ kind: "module", moduleId: mod.id, patch: { required: true }, label: "Required for everyone" }]);
  }

  if (/(split|cut|chop).*(clip|chapter|video)|clips/.test(p)) {
    const v = mod.blocks.find((b) => b.type === "video" && b.video && b.video.origin !== "clip" && b.video.chapters.length >= 3);
    if (!v) return say(`There's no long video in ${mod.title} to split. Clips come from recordings with at least 3 chapters.`);
    const clips = clipsFrom(v);
    return say(`I'll cut “${v.title}” into ${clips.length} clips, one per chapter. The full recording stays.`, [{ kind: "insert", moduleId: mod.id, afterBlockId: v.id, blocks: clips, label: `${clips.length} clips from ${v.title}` }]);
  }

  if (remove) {
    const type = BLOCK_WORDS.find(([re]) => re.test(p))?.[1];
    const b = (type && mod.blocks.find((x) => type.includes(x.type))) || mod.blocks.find((x) => quoted(raw) && x.title.toLowerCase().includes(quoted(raw)!.toLowerCase()));
    if (!b) return null;
    if (mod.required && (b.type === "lesson" || b.type === "keypoints")) return say(`${mod.title} is required for everyone, so its teaching stays. I can remove media or checks from it.`);
    if (mod.blocks.length <= 1) return say(`That's the only piece in ${mod.title}. Remove the module instead?`);
    return say(`I'll remove “${b.title}” from ${mod.title}.`, [{ kind: "removeBlock", moduleId: mod.id, blockId: b.id, label: b.title }]);
  }

  if (add && /audio|listen|podcast/.test(p)) {
    const a = audioBlock(mod);
    return a ? block(a, `An audio version of ${mod.title}. It reads the module's cited text aloud, so there's nothing new to check.`) : say(`${mod.title} has no lesson text to read aloud yet.`);
  }
  if (add && /visual aid|walkthrough|detailer/.test(p)) {
    if (!va) return say("This course has no visual aid in its materials. Add one under Materials and I'll build a walkthrough.");
    return block(visualAidBlock(mod, va, Object.keys(VA_PAGES[va]).map(Number).slice(0, 3)), "A walkthrough of the first three visual-aid pages, with what to say on each. Check the talking points before you publish.");
  }
  if (add && /pdf|pages|reading|read the/.test(p)) {
    if (!pi) return say("None of this course's documents can be shown page by page yet.");
    return block(documentBlock(mod, pi, Object.keys(DOC_PAGES[pi]).map(Number).slice(0, 2), ""), "Two pages for reps to read in the app, view-only. They count toward completion once every page is opened.");
  }
  if (add && /video/.test(p)) {
    return block(videoFromModule(mod, "ai"), `A short explainer video for ${mod.title}, scripted only from the module's cited sentences. Watch it once before you publish.`);
  }
  return null;
}

const STOP = new Set(["should", "answer", "mention", "must", "always", "never", "their", "there", "about", "which", "would", "the", "that", "this", "with", "good", "right"]);
/** The words in a sentence worth marking an answer on. */
const keywordsOf = (t: string) => [...new Set(t.toLowerCase().match(/[a-z0-9-]{4,}/g) ?? [])].filter((w) => !STOP.has(w)).slice(0, 4);

/** A written-answer question for a module, drafted from its cited sentences. */
function openQuestionFor(course: Course, mod: Module): Item {
  const lines = mod.blocks.flatMap((b) => [...(b.paragraphs ?? []), ...(b.points ?? [])]).filter((x) => x.cite).slice(0, 3);
  return {
    id: `${course.id}-w${uid()}`, competency: mod.competency, moduleId: mod.id, pool: "assessment", difficulty: 2, format: "open",
    question: `In your own words, explain “${mod.title}” as you would to an HCP.`, options: [], answer: -1,
    rationale: lines.map((l) => l.text).join(" "), cite: lines[0]?.cite,
    guide: { suggested: lines.map((l) => l.text).join(" "), mustCover: lines.map((l) => ({ text: l.text.split(/[,.:;]/)[0], keywords: keywordsOf(l.text).slice(0, 2) })) },
  };
}

/** Question-bank edits for the Questions tab. */
function questionAction(p: string, raw: string, course: Course, mod?: Module): ChatTurn | null {
  if (mod && /(open|written|subjective|own words)/.test(p) && /question/.test(p) && /(add|write|draft|create|new)/.test(p)) {
    const it = openQuestionFor(course, mod);
    return { id: uid(), from: "ai", text: `A written-answer question for ${mod.title}. I drafted a suggested answer and ${it.guide!.mustCover.length} points a good answer must cover, all from the module's cited sentences. Tell me what a right answer must say, and I'll mark against that too.`, changes: [{ kind: "items", items: [it] }], status: "pending" };
  }
  const guide = raw.match(/^for\s+["“']([^"”']{3,})["”'][^,]*,\s*(.+)$/i);
  if (guide) {
    const hit = course.items.find((i) => i.format === "open" && i.question.toLowerCase().includes(guide[1].replace(/…$/, "").toLowerCase()));
    if (!hit) return { id: uid(), from: "ai", text: "I couldn't find that written-answer question. Quote a few words of it exactly." };
    const note = guide[2].trim().replace(/^./, (c) => c.toUpperCase());
    const phrase = note.match(/["“']([^"”']+)["”']/)?.[1];
    const what = note.replace(/^(a )?(good|right) answers? (must|should) (also )?(mention|say|include|cover)?\s*/i, "").replace(/^./, (c) => c.toUpperCase());
    const point = phrase ? { text: `Mentions “${phrase}”`, keywords: [phrase.toLowerCase()] } : { text: what, keywords: keywordsOf(what) };
    const must = !/(not|never|don't|shouldn't|fail|lose)/i.test(note) && point.keywords.length > 0;
    return { id: uid(), from: "ai", text: must ? `Got it. I'll keep your guidance with the question and add a point a good answer must cover: ${point.text}.` : "Got it. I'll keep your guidance with the question and flag answers that do this.",
      changes: [{ kind: "guide", itemId: hit.id, note, point: must ? point : undefined, label: `Guidance → ${hit.question}` }], status: "pending" };
  }
  const move = p.match(/move .*to (?:the )?(screening|assessment|practice)/);
  if (move) {
    const q = quoted(raw);
    const hits = q ? course.items.filter((i) => i.question.toLowerCase().includes(q.toLowerCase())) : [];
    if (!hits.length) return { id: uid(), from: "ai", text: `Which question? Quote a few words of it, for example: Move “How is the loading dose given?” to ${move[1]}.` };
    return { id: uid(), from: "ai", text: `Moving ${hits.length === 1 ? "it" : `${hits.length} questions`} to the ${move[1]} pool.`, changes: [{ kind: "pool", itemIds: hits.map((i) => i.id), pool: move[1] as Item["pool"], label: `${hits.map((i) => i.question).join(" · ")} → ${move[1]}` }], status: "pending" };
  }
  if (!/(retire|remove|delete|drop)/.test(p) || !/question/.test(p)) return null;
  const q = quoted(raw);
  const hits = q ? course.items.filter((i) => i.question.toLowerCase().includes(q.toLowerCase()))
    : /(nobody gets wrong|too easy|everyone gets right)/.test(p) ? course.items.filter((i) => i.difficulty === 1).slice(0, 3) : [];
  if (!hits.length) return { id: uid(), from: "ai", text: q ? "I couldn't find that question. Quote a few words of it exactly." : "Which one? Quote a few words of it, for example: Retire the question “How is the loading dose given?”" };
  return { id: uid(), from: "ai", text: `I'll retire ${hits.length === 1 ? "this question" : `these ${hits.length} questions`}. Reps who already answered keep their scores.`, changes: [{ kind: "retire", itemIds: hits.map((i) => i.id), label: hits.map((i) => i.question).join(" · ") }], status: "pending" };
}

export function respond(prompt: string, course: Course, moduleId?: string): ChatTurn {
  const p = prompt.toLowerCase();
  const mod = course.modules.find((m) => m.id === moduleId) ?? course.modules[0];

  const q = questionAction(p, prompt, course, mod);
  if (q) return q;
  if (mod) {
    const e = editAction(p, prompt, course, mod);
    if (e) return e;
  }

  if (/(teen|adolescent|pediatric|children|price|cost per|wac|competitor's data|head-to-head)/.test(p) && !/(fix|remove)/.test(p)) {
    return { id: uid(), from: "ai", text: "That isn't in your sources, so I can't write it. Add an approved source that covers it (for example a Medical Information response), and I'll use it with citations." };
  }

  if (/(which|how many|fewer|coverage|count)/.test(p) && /question/.test(p)) {
    const low = course.competencyIds.map((c) => ({ c, n: course.items.filter((i) => i.competency === c).length })).filter((x) => x.n < 6);
    return {
      id: uid(), from: "ai",
      text: low.length
        ? `${low.map((x) => `${competency(x.c).name} (${x.n})`).join(", ")} ${low.length === 1 ? "has" : "have"} fewer than 6 questions. Want me to draft more from your sources?`
        : `Every competency has at least 6 questions. ${course.items.length} in total.`,
    };
  }

  if (/(fix|cite|citation|wording|issue|orange|superlative)/.test(p)) {
    const changes: Change[] = [];
    for (const f of runChecks(course)) {
      if (!f.fixable || !f.moduleId || !f.blockId || f.paraIndex === undefined || f.paraIndex >= 100) continue;
      const m = course.modules.find((x) => x.id === f.moduleId)!;
      const b = m.blocks.find((x) => x.id === f.blockId)!;
      const before = b.paragraphs![f.paraIndex];
      if (changes.some((c) => c.kind === "para" && c.blockId === b.id && c.index === f.paraIndex)) continue;
      const fix = FIXES[before.text];
      changes.push({ kind: "para", moduleId: m.id, blockId: b.id, index: f.paraIndex, before, after: fix === null ? undefined : fix ? { text: fix.text, cite: fix.cite } : undefined });
    }
    return changes.length
      ? { id: uid(), from: "ai", text: `I found ${changes.length} sentence${changes.length > 1 ? "s" : ""} to fix. Each rewrite is cited to your sources; anything I can't support, I remove.`, changes, status: "pending" }
      : { id: uid(), from: "ai", text: "No citation or wording issues left. Any other findings, like thin question coverage, are listed under Review & versions." };
  }

  if (/(short|concise|trim|cut|tighten)/.test(p)) {
    for (const b of mod.blocks) {
      if (b.paragraphs && b.paragraphs.length >= 2) {
        const index = b.paragraphs.length - 1;
        return { id: uid(), from: "ai", text: `I'd cut the last sentence of "${b.title}" in ${mod.title}. It repeats a point made elsewhere in the module. That saves about 1 minute.`, changes: [{ kind: "para", moduleId: mod.id, blockId: b.id, index, before: b.paragraphs[index] }], status: "pending" };
      }
    }
    return { id: uid(), from: "ai", text: `${mod.title} is already as short as it can be without losing a cited point.` };
  }

  if (/(check|knowledge)/.test(p)) {
    const it = [...course.items, ...LUMORA_ITEMS].find((i) => i.competency === mod.competency && i.pool === "practice") ?? LUMORA_ITEMS[0];
    const block: Block = { id: `${mod.id}-b${uid()}`, type: "check", title: "Quick check", minutes: 2, competencies: [mod.competency],
      check: { question: it.question, options: it.options, answer: it.answer, rationale: it.rationale, cite: it.cite } };
    return { id: uid(), from: "ai", text: `Here's a quick check for ${mod.title}, drawn from your sources. It's ungraded and counts toward completion only.`, changes: [{ kind: "block", moduleId: mod.id, block }], status: "pending" };
  }

  if (/(question|harder|item)/.test(p)) {
    const items = HARDER_DOSING.map((i) => ({ ...i, id: `${course.id}-x${uid()}` }));
    return { id: uid(), from: "ai", text: "Three harder dosing questions, each with an answer key, rationale and PI page. Two go to the assessment pool, one to screening.", changes: [{ kind: "items", items }], status: "pending" };
  }

  return { id: uid(), from: "ai", text: "I make every change to this course. For example: add a video, audio or PDF pages, split a recording into clips, add or remove a module, rename it, make it required, change a sentence (Change “…” to “…”), add checks or questions, or retire a question. Every change waits for your OK." };
}

export function applyChanges(course: Course, changes: Change[]): { modules: Module[]; items: Item[] } {
  let modules = course.modules;
  let items = course.items;
  /* Apply removals from the highest index down so earlier indexes stay valid. */
  const ordered = [...changes].sort((a, b) => (a.kind === "para" && b.kind === "para" ? b.index - a.index : 0));
  for (const ch of ordered) {
    if (ch.kind === "items") items = [...items, ...ch.items];
    if (ch.kind === "block") modules = modules.map((m) => (m.id === ch.moduleId ? { ...m, blocks: [...m.blocks, ch.block], minutes: m.minutes + ch.block.minutes } : m));
    if (ch.kind === "insert") modules = modules.map((m) => {
      if (m.id !== ch.moduleId) return m;
      const i = m.blocks.findIndex((b) => b.id === ch.afterBlockId);
      return { ...m, blocks: [...m.blocks.slice(0, i + 1), ...ch.blocks, ...m.blocks.slice(i + 1)], minutes: m.minutes + ch.blocks.reduce((a, b) => a + b.minutes, 0) };
    });
    if (ch.kind === "removeBlock") modules = modules.map((m) => {
      const b = m.blocks.find((x) => x.id === ch.blockId);
      return m.id !== ch.moduleId || !b ? m : { ...m, blocks: m.blocks.filter((x) => x.id !== ch.blockId), minutes: m.minutes - b.minutes };
    });
    if (ch.kind === "module") modules = modules.map((m) => (m.id === ch.moduleId ? { ...m, ...ch.patch } : m));
    if (ch.kind === "addModule") modules = [...modules, ch.module];
    if (ch.kind === "move") {
      const from = modules.findIndex((m) => m.id === ch.moduleId);
      if (from >= 0) { const next = [...modules]; const [m] = next.splice(from, 1); next.splice(Math.max(0, Math.min(next.length, ch.to)), 0, m); modules = next; }
    }
    if (ch.kind === "removeModule") modules = modules.filter((m) => m.id !== ch.moduleId);
    if (ch.kind === "retire") items = items.filter((i) => !ch.itemIds.includes(i.id));
    if (ch.kind === "pool") items = items.map((i) => (ch.itemIds.includes(i.id) ? { ...i, pool: ch.pool } : i));
    if (ch.kind === "guide") items = items.map((i) => (i.id === ch.itemId && i.guide
      ? { ...i, guide: { ...i.guide, trainerNote: ch.note, mustCover: ch.point ? [...i.guide.mustCover, ch.point] : i.guide.mustCover } } : i));
    if (ch.kind === "para")
      modules = modules.map((m) => m.id !== ch.moduleId ? m : {
        ...m,
        blocks: m.blocks.map((b) => {
          if (b.id !== ch.blockId || !b.paragraphs) return b;
          const paras = [...b.paragraphs];
          if (ch.after) paras[ch.index] = ch.after;
          else paras.splice(ch.index, 1);
          return { ...b, paragraphs: paras };
        }),
      });
  }
  return { modules, items };
}

/** Prompts for a direct course: the agent arranges the trainer's files, it doesn't write. */
export const DIRECT_SUGGESTIONS = [
  "Move this module to the start",
  "Rename this module",
  "Remove this module",
  "What will reps see in this module?",
];

/**
 * The chat on a direct course. It can reorder, rename and remove modules, and add files as new
 * modules (through the paperclip). It never writes content or adds questions: that's the promise.
 */
export function directRespond(prompt: string, course: Course, moduleId?: string): ChatTurn {
  const p = prompt.toLowerCase();
  const id = `a${Date.now()}`;
  const mods = course.modules;
  const n = Number(p.match(/module\s*(\d+)/)?.[1]);
  const mod = (n && mods[n - 1]) || mods.find((m) => m.id === moduleId) || mods[0];
  const pos = mods.findIndex((m) => m.id === mod?.id);
  if (!mod) return { id, from: "ai", text: "There are no modules yet. Attach a file with the paperclip and I'll add it as module 1." };
  const to = /\b(start|first|top|beginning)\b/.test(p) ? 0 : /\b(end|last|bottom)\b/.test(p) ? mods.length - 1
    : /\bup\b|earlier|before/.test(p) ? pos - 1 : /\bdown\b|later|after/.test(p) ? pos + 1 : Number(p.match(/(?:to|position)\s*(\d+)/)?.[1]) - 1;
  if (/move|reorder|put|first|last|start|earlier|later/.test(p) && Number.isFinite(to) && to >= 0) {
    if (to === pos) return { id, from: "ai", text: `${mod.title} is already module ${pos + 1}.` };
    return { id, from: "ai", text: `I'll move "${mod.title}" from module ${pos + 1} to module ${to + 1}. Everything else keeps its order.`, changes: [{ kind: "move", moduleId: mod.id, to, label: `Move "${mod.title}" to module ${to + 1}` }], status: "pending" };
  }
  const name = prompt.match(/(?:rename|call)[^"“]*["“]([^"”]+)["”]/i)?.[1] ?? prompt.match(/rename .*? to (.+)$/i)?.[1];
  if (/rename|call it|title/.test(p)) {
    if (!name) return { id, from: "ai", text: `What should "${mod.title}" be called? Say it in quotes, like: rename this module to "Dosing at a glance".` };
    return { id, from: "ai", text: `Renaming module ${pos + 1}. The file inside stays exactly as it is.`, changes: [{ kind: "module", moduleId: mod.id, patch: { title: name.trim().replace(/[.]$/, "") }, label: `"${mod.title}" → "${name.trim().replace(/[.]$/, "")}"` }], status: "pending" };
  }
  if (/remove|delete|drop/.test(p)) {
    if (mods.length === 1) return { id, from: "ai", text: "This is the only module. Add another file first, then remove this one." };
    return { id, from: "ai", text: `I'll take "${mod.title}" out of the course. The file stays in your uploads if you want it back.`, changes: [{ kind: "removeModule", moduleId: mod.id, label: mod.title }], status: "pending" };
  }
  if (/what will|what do reps|see in/.test(p)) {
    const b = mod.blocks[0];
    return { id, from: "ai", text: `Module ${pos + 1} shows reps "${b?.title ?? mod.title}" exactly as uploaded. It counts as done once they've ${b?.type === "file" && (b.file?.format === "video" || b.file?.format === "audio") ? "played 90% of it" : "seen every page"}. There's no quiz in it.` };
  }
  if (/add|upload|attach|file/.test(p)) return { id, from: "ai", text: "Attach the file with the paperclip below. I'll add it as a new module at the end, exactly as it is, and you can move it from there." };
  if (/roleplay|doctor|call|objection/.test(p)) return { id, from: "ai", text: "The roleplay has its own place: pick it under AI roleplay on the left and I'll edit the call there." };
  if (/write|summar|question|quiz|check|lesson|generate|explain/.test(p))
    return { id, from: "ai", text: "This is a direct course, so I don't write content or add questions to your material. I can reorder, rename or remove modules, add your files, and shape the roleplay." };
  return { id, from: "ai", text: `I can move, rename or remove modules, and add your files as new modules. Try "move this module to the start" or rename this module to "Dosing at a glance".` };
}
