import type { AnswerGuide, Citation, Course, Item, Module, Pool } from "@/data/types";

export type QuestionKind = "check" | "chapter" | Pool;

/** One question as the trainer sees it: a knowledge check inside a lesson, or a pool question. */
export interface Question {
  id: string;
  kind: QuestionKind;
  competency: string;
  difficulty?: Item["difficulty"];
  format?: Item["format"];
  guide?: AnswerGuide;
  question: string;
  options: string[];
  answer: number;
  rationale: string;
  cite?: Citation;
  /** Where the rep meets it: the video chapter, or the module's material for a module check. */
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
  const byModule = new Map<string, Question[]>(course.modules.map((m) => [m.id, m.blocks.flatMap((b): Question[] => {
    if (b.check) return [{ id: b.id, kind: "check", competency: b.competencies[0] ?? m.competency, lesson: "the module's material", ...b.check }];
    /* Questions that pop up inside a video, at the end of their chapter. */
    return (b.video?.chapters ?? []).flatMap((ch, k) => (ch.check ? [{ id: `${b.id}-ch${k}`, kind: "chapter" as const, competency: b.competencies[0] ?? m.competency, lesson: `${b.title} · chapter ${k + 1}: ${ch.title}`, ...ch.check }] : []));
  })]));
  const loose: Question[] = [];
  for (const i of course.items) {
    const q: Question = { ...i, kind: i.pool };
    const home = homeOf(i, course.modules);
    (home ? byModule.get(home.id)! : loose).push(q);
  }
  return { byModule, loose };
}

export const questionCount = (course: Course) => {
  const { byModule, loose } = questionsByModule(course);
  return [...byModule.values()].reduce((a, q) => a + q.length, loose.length);
};
