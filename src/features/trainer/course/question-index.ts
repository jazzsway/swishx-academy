import type { Citation, Course, Item, Module, Pool } from "@/data/types";

export type QuestionKind = "check" | Pool;

/** One question as the trainer sees it: a knowledge check inside a lesson, or a pool question. */
export interface Question {
  id: string;
  kind: QuestionKind;
  competency: string;
  difficulty?: Item["difficulty"];
  question: string;
  options: string[];
  answer: number;
  rationale: string;
  cite?: Citation;
  /** The block a knowledge check follows. */
  lesson?: string;
}

/** The module a pool question tests: its own, else the first that teaches its competency. */
function homeOf(i: Item, mods: Module[]) {
  return mods.find((m) => m.id === i.moduleId)
    ?? mods.find((m) => m.competency === i.competency)
    ?? mods.find((m) => m.blocks.some((b) => b.competencies.includes(i.competency)));
}

/** Every question in the course, filed under the module it belongs to, in outline order. */
export function questionsByModule(course: Course) {
  const byModule = new Map<string, Question[]>(course.modules.map((m) => [m.id, m.blocks.flatMap((b, i) =>
    b.check ? [{ id: b.id, kind: "check" as const, competency: b.competencies[0] ?? m.competency, lesson: m.blocks[i - 1]?.title, ...b.check }] : [])]));
  const loose: Question[] = [];
  for (const i of course.items) {
    const q: Question = { ...i, kind: i.pool };
    const home = homeOf(i, course.modules);
    (home ? byModule.get(home.id)! : loose).push(q);
  }
  return { byModule, loose };
}

export const questionCount = (course: Course) =>
  course.items.length + course.modules.reduce((a, m) => a + m.blocks.filter((b) => b.check).length, 0);
