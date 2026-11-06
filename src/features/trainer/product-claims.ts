import type { Course, Source } from "@/data/types";
import { DOC_PAGES } from "@/data/media";
import { current, live } from "@/store/app-store";

/*
 * A product's claims, from the training team's side: every approved statement
 * in the product's own MLR-approved documents, and whether the Academy teaches
 * and tests it. A page with stored text yields one claim per section; any other
 * cited page yields the course sentences that cite it.
 */

export type ClaimCategory = "Indication" | "Efficacy" | "Safety" | "Dosing" | "Mechanism" | "Access" | "Disease" | "Conversation" | "Other";

export interface Claim {
  key: string;
  text: string;
  heading?: string;
  sourceId: string;
  page: number;
  category: ClaimCategory;
  taughtIn: string[];
  tested: number;
}

const BY_COMPETENCY: Record<string, ClaimCategory> = {
  "c-efficacy": "Efficacy", "c-safety": "Safety", "c-dosing": "Dosing", "c-moa": "Mechanism", "c-access": "Access",
  "c-disease": "Disease", "c-objections": "Conversation", "c-opening": "Conversation", "c-competitive": "Other", "c-compliance": "Other",
};

/** The section heading decides; the sentence itself only when the heading says nothing. */
function categoryOf(words: string): ClaimCategory {
  const w = words.toLowerCase();
  if (/indicat/.test(w)) return "Indication";
  if (/dosage|dosing|missed|storage|supplied|administ/.test(w)) return "Dosing";
  if (/warning|adverse|contraindicat|safety|hypersens|infection|conjunctiv/.test(w)) return "Safety";
  if (/mechanism|pharmacology/.test(w)) return "Mechanism";
  if (/clinical stud|lumen|itch|easi|efficacy/.test(w)) return "Efficacy";
  if (/coverage|access|hub|copay|prior auth/.test(w)) return "Access";
  return "Other";
}

export function productClaims(courses: Course[], sources: Source[]): Claim[] {
  const own = new Set(sources.map((s) => s.id));
  const taught = new Map<string, Set<string>>(); // "source:page" → "Course · Module"
  const tested = new Map<string, number>();
  const sentences: Claim[] = [];
  const seen = new Set<string>();

  for (const c of courses) {
    for (const m of (live(c) ?? current(c)).modules) {
      for (const b of m.blocks) {
        for (const para of [...(b.paragraphs ?? []), ...(b.points ?? [])]) {
          if (!para.cite || para.missing || !own.has(para.cite.sourceId)) continue;
          const at = `${para.cite.sourceId}:${para.cite.page}`;
          taught.set(at, new Set([...(taught.get(at) ?? []), `${c.title} · ${m.title}`]));
          if (seen.has(para.text)) continue;
          seen.add(para.text);
          sentences.push({ key: para.text, text: para.text, sourceId: para.cite.sourceId, page: para.cite.page, category: BY_COMPETENCY[m.competency] ?? "Other", taughtIn: [], tested: 0 });
        }
      }
    }
    for (const it of c.items) if (it.cite && own.has(it.cite.sourceId)) { const at = `${it.cite.sourceId}:${it.cite.page}`; tested.set(at, (tested.get(at) ?? 0) + 1); }
  }

  const out: Claim[] = [];
  for (const sid of own) {
    for (const [page, doc] of Object.entries(DOC_PAGES[sid] ?? {})) {
      doc.sections.forEach((sec, i) => out.push({ key: `${sid}:${page}:${i}`, text: sec.p, heading: sec.h ?? doc.title, sourceId: sid, page: Number(page), category: categoryOf(`${sec.h ?? ""} ${doc.title}`) !== "Other" ? categoryOf(`${sec.h ?? ""} ${doc.title}`) : categoryOf(sec.p), taughtIn: [], tested: 0 }));
    }
  }
  /* Pages without stored text: the course sentences that cite them are the claims. */
  const withText = new Set(out.map((c) => `${c.sourceId}:${c.page}`));
  out.push(...sentences.filter((s) => !withText.has(`${s.sourceId}:${s.page}`)));

  return out.map((c) => {
    const at = `${c.sourceId}:${c.page}`;
    return { ...c, taughtIn: [...(taught.get(at) ?? [])], tested: tested.get(at) ?? 0 };
  });
}
