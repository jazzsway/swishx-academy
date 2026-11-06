/** Phrases in a course's title and objective that point at each competency. */
const CUES: Record<string, string[]> = {
  "c-disease": ["disease", "unmet need", "burden", "patient type", "flare", "severity", "pathophysiology", "condition"],
  "c-moa": ["mechanism", "how it works", "moa", "pathway", "binds"],
  "c-efficacy": ["efficacy", "trial", "results", "clinical data", "study", "endpoint", "response rate", "approved for", "indication"],
  "c-dosing": ["dosing", "dose", "administration", "inject", "presentation", "titrat", "storage", "missed dose"],
  "c-safety": ["safety", "fair balance", "adverse", "warning", "side effect", "risk"],
  "c-competitive": ["competit", "landscape", "versus", "position", "alternative"],
  "c-access": ["access", "cost", "coverage", "prior-auth", "prior auth", "payer", "copay", "co-pay", "reimburs", "hub"],
  "c-opening": ["opening", "open the call", "open on", "first call", "needs discovery", "discovery", "call planning", "introduc"],
  "c-objections": ["objection", "pushback", "push back", "concern", "handle", "handling"],
  "c-compliance": ["compliance", "on-label", "off-label", "medical information", "promotional"],
};

export interface Suggestion { id: string; why: string }

/**
 * Competencies a course builds, read from its title and objective.
 * Product courses always include safety and compliance; that's a rule, not a guess.
 */
export function suggestCompetencies(title: string, objective: string, isProduct: boolean): Suggestion[] {
  const text = `${title} ${objective}`.toLowerCase();
  const out: Suggestion[] = [];
  for (const [id, cues] of Object.entries(CUES)) {
    const hit = cues.find((c) => text.includes(c));
    if (hit) out.push({ id, why: `“${hit}” in your ${objective.toLowerCase().includes(hit) ? "objective" : "title"}` });
  }
  const has = (id: string) => out.some((x) => x.id === id);
  if (isProduct && !has("c-safety")) out.push({ id: "c-safety", why: "Always included for a product course: fair balance" });
  if (!has("c-compliance")) out.push({ id: "c-compliance", why: "Always included: on-label promotion" });
  /* Nothing specific in the words: the essentials of a product course. */
  if (isProduct && out.length <= 2) {
    out.unshift({ id: "c-efficacy", why: "Core for a product course" }, { id: "c-dosing", why: "Core for a product course" });
  }
  return out;
}
