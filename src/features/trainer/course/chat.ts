import type { Block, Course, Item, Module, Para } from "@/data/types";
import { competency } from "@/data/org";
import { LUMORA_ITEMS } from "@/data/courses/lumora-items";
import { FIXES, runChecks } from "./checks";

/* The scripted co-author behind "edit via chat" (PRD CC-4). Every change is a diff the
   trainer accepts or rejects; the AI only uses the course's own sources. */

export type Change =
  | { kind: "para"; moduleId: string; blockId: string; index: number; before?: Para; after?: Para }
  | { kind: "block"; moduleId: string; block: Block }
  | { kind: "items"; items: Item[] };

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
  "Shorten this module",
  "Add a quick check to this module",
  "Add 3 harder questions on dosing",
  "Which competencies have fewer than 6 questions?",
];

export function respond(prompt: string, course: Course, moduleId?: string): ChatTurn {
  const p = prompt.toLowerCase();
  const mod = course.modules.find((m) => m.id === moduleId) ?? course.modules[0];

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
      : { id: uid(), from: "ai", text: "No citation or wording issues left. Run the checks when you're ready." };
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

  return { id: uid(), from: "ai", text: "I can change this course using its sources: fix wording, shorten a module, add checks or questions, or answer questions about coverage. Try one of the suggestions below." };
}

export function applyChanges(course: Course, changes: Change[]): { modules: Module[]; items: Item[] } {
  let modules = course.modules;
  let items = course.items;
  /* Apply removals from the highest index down so earlier indexes stay valid. */
  const ordered = [...changes].sort((a, b) => (a.kind === "para" && b.kind === "para" ? b.index - a.index : 0));
  for (const ch of ordered) {
    if (ch.kind === "items") items = [...items, ...ch.items];
    if (ch.kind === "block") modules = modules.map((m) => (m.id === ch.moduleId ? { ...m, blocks: [...m.blocks, ch.block], minutes: m.minutes + ch.block.minutes } : m));
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
