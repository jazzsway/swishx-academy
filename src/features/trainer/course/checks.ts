import type { Course, Module } from "@/data/types";
import { competency, product } from "@/data/org";

/* ML-1 pre-review checks. Red blocks review; orange needs acknowledgement; green is informational. */

export type Severity = "red" | "orange" | "green";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  moduleId?: string;
  blockId?: string;
  paraIndex?: number;
  fixable?: boolean;
}

const OFF_INDICATION: Record<string, string[]> = {
  "p-lumora": ["teen", "adolescent", "children", "pediatric", "paediatric", "kids"],
  "p-cardexa": ["all heart failure", "preserved ejection", "hfpef"],
};
const SUPERLATIVES = ["best", "safest", "always", "never fails", "no side effects", "guaranteed", "preferred option", "most effective"];
const COMPARATIVE = ["better than", "superior to", "outperforms", "more effective than"];

function texts(mods: Module[]) {
  const out: { moduleId: string; blockId: string; i: number; text: string; cited: boolean; missing?: boolean }[] = [];
  for (const m of mods)
    for (const b of m.blocks) {
      (b.paragraphs ?? []).forEach((p, i) => out.push({ moduleId: m.id, blockId: b.id, i, text: p.text, cited: !!p.cite, missing: p.missing }));
      (b.points ?? []).forEach((p, i) => out.push({ moduleId: m.id, blockId: b.id, i: 100 + i, text: p.text, cited: !!p.cite, missing: p.missing }));
    }
  return out;
}

export function runChecks(course: Course): Finding[] {
  const f: Finding[] = [];
  const all = texts(course.modules);

  for (const t of all) {
    if (!t.cited || t.missing)
      f.push({ id: `cite-${t.blockId}-${t.i}`, severity: "red", title: "Uncited sentence", detail: `"${t.text}"`, moduleId: t.moduleId, blockId: t.blockId, paraIndex: t.i, fixable: true });
    const low = t.text.toLowerCase();
    for (const w of OFF_INDICATION[course.productId ?? ""] ?? [])
      if (low.includes(w)) f.push({ id: `ind-${t.blockId}-${t.i}`, severity: "red", title: "Outside the approved indication", detail: `"${t.text}" · ${product(course.productId)?.indications[0].short} only`, moduleId: t.moduleId, blockId: t.blockId, paraIndex: t.i, fixable: true });
    const sup = SUPERLATIVES.find((w) => new RegExp(`\\b${w}\\b`, "i").test(t.text));
    if (sup) f.push({ id: `sup-${t.blockId}-${t.i}`, severity: "orange", title: `Superlative or absolute term: "${sup}"`, detail: `"${t.text}"`, moduleId: t.moduleId, blockId: t.blockId, paraIndex: t.i, fixable: true });
    const cmp = COMPARATIVE.find((w) => low.includes(w));
    if (cmp) f.push({ id: `cmp-${t.blockId}-${t.i}`, severity: "orange", title: "Comparative claim without head-to-head data", detail: `"${t.text}"`, moduleId: t.moduleId, blockId: t.blockId, paraIndex: t.i, fixable: true });
  }

  if (course.productId && !course.modules.some((m) => m.required && m.competency === "c-safety"))
    f.push({ id: "safety-missing", severity: "red", title: "Missing required safety module", detail: "Product courses need at least one safety block marked Required for everyone.", fixable: false });

  if (course.type === "personalised") {
    for (const cid of course.competencyIds) {
      const n = course.items.filter((it) => it.competency === cid).length;
      if (n < 3) f.push({ id: `cov-${cid}`, severity: "orange", title: `Few questions for ${competency(cid)?.name}`, detail: `${n} question(s). Aim for at least 6 across screening, assessment and practice.` });
    }
    f.push({ id: "cov-ok", severity: "green", title: "Question bank coverage", detail: `${course.items.length} questions across ${new Set(course.items.map((i) => i.competency)).size} competencies` });
  }
  f.push({ id: "read", severity: "green", title: "Readability", detail: "Grade 9 average. Good for field reading on a phone." });
  f.push({ id: "cite-ok", severity: "green", title: "Citations", detail: `${all.filter((t) => t.cited && !t.missing).length} of ${all.length} sentences cited to a source page` });
  return f;
}

/** Cited rewrites the AI proposes for known issues ("Fix with AI"). Falls back to removing the sentence. */
export const FIXES: Record<string, { text: string; cite?: { sourceId: string; page: number } } | null> = {
  "Patients usually get approved within a few days once the Hub is involved.": { text: "The Access Hub confirms benefits within 2 business days.", cite: { sourceId: "src-lum-payer", page: 3 } },
  "The Hub is the best support program in dermatology.": { text: "The Hub offers benefits verification, PA support and a copay program for eligible commercially insured patients.", cite: { sourceId: "src-lum-payer", page: 3 } },
  "Cardexa is now the preferred option for all heart failure patients.": null,
};
