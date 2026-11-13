import type { Citation, Objection, ProhibitedRule, RubricCriterion, Scenario, Source } from "@/data/types";
import { product } from "@/data/org";

/*
 * The roleplay a course starts with. SwishX reads the trainer's roleplay documents and lays out a
 * first call: who the doctor is, how they open, what they push back on, how the call is scored and
 * what must never be said. Deterministic, so the demo drafts the same call every time.
 */

const SPECIALIST: Record<string, string> = {
  Dermatology: "Dermatologist", Cardiology: "Cardiologist", Endocrinology: "Endocrinologist", Gastroenterology: "Gastroenterologist",
  Hematology: "Hematologist", "Infectious disease": "Infectious disease specialist", Nephrology: "Nephrologist", Neurology: "Neurologist",
  Oncology: "Oncologist", Psychiatry: "Psychiatrist", Pulmonology: "Pulmonologist", "Rare disease": "Rare disease specialist",
  Rheumatology: "Rheumatologist", "Sleep medicine": "Sleep medicine physician",
};
const DOCTORS = ["Dr. Lena Kim", "Dr. Marcus Hale", "Dr. Priya Raman", "Dr. Owen Brooks", "Dr. Sofia Alvarez", "Dr. Daniel Cho"];

const hash = (t: string) => [...t].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const rid = () => Math.random().toString(36).slice(2, 7);

export const STAGE_RUBRIC = (sellingModel: boolean, brand: string): Omit<RubricCriterion, "id">[] => sellingModel
  ? [
    { label: "Open on a patient type", competency: "c-opening", weight: 15, keywords: ["patient", "patients", "think of", "adults", "who"], good: "\"Think of the patients you see who still aren't where you'd like them...\"" },
    { label: "Probe for needs", competency: "c-opening", weight: 25, keywords: ["how many", "what makes", "tell me", "how do you", "?"], good: "\"What makes you decide a patient needs more than what they're on?\"" },
    { label: "Handle the objection", competency: "c-objections", weight: 35, keywords: ["understand", "hear you", "support", "data", "week", "program", "fair"], good: "\"I hear you. Here's what the support program takes off your staff...\"" },
    { label: "Close with a next step", competency: "c-objections", weight: 25, keywords: ["would you", "could you", "consider", "next patient", "try", "can i"], good: `"Would you consider ${brand} for the next patient who fits?"` },
  ]
  : [
    { label: "Opens with a relevant patient type", competency: "c-opening", weight: 20, keywords: ["patient", "patients", "think of", "adults"], good: "\"Think of your patients still struggling on current treatment...\"" },
    { label: "Asks a needs-discovery question", competency: "c-opening", weight: 15, keywords: ["how many", "what makes", "tell me", "?"], good: "\"How many of those patients did you see this month?\"" },
    { label: "Handles each objection", competency: "c-objections", weight: 30, keywords: ["understand", "hear you", "support", "data", "program", "fair"], good: "\"That's fair. Here's what the data shows...\"" },
    { label: "Keeps fair balance", competency: "c-safety", weight: 20, keywords: ["safety", "side effect", "risk", "warning", "report"], good: "\"The most common side effects include...\"" },
    { label: "Asks for a next step", competency: "c-objections", weight: 15, keywords: ["would you", "consider", "next patient", "try"], good: `"Would you consider ${brand} for the next patient who fits?"` },
  ];

function objections(brand: string, prefix: string): Objection[] {
  return [
    {
      id: `${prefix}-ob1`, label: "No time today", competency: "c-opening",
      line: "Honestly, I don't have time for this today. Can you make it quick?",
      pushback: "You still haven't told me why this is worth my two minutes.",
      handled: "Okay, that patient I do see. Go on, briefly.",
      keywords: ["one patient", "60 seconds", "minute", "which patients", "quick", "patient who"],
      answer: "Of course, one minute. Which of your patients still aren't where you'd like them on what they're taking now? That's who I'd like to talk about.",
    },
    {
      id: `${prefix}-ob2`, label: "Happy with current treatment", competency: "c-objections",
      line: "Most of my patients are doing fine on what I prescribe now. Why would I change?",
      pushback: "That doesn't tell me which patient I'd actually switch.",
      handled: "Fair. I do have a few who aren't at goal.",
      keywords: ["not controlled", "still", "uncontrolled", "which patients", "struggle", "not at goal", "how many", "flare"],
      answer: `That's fair, and many patients do well. Which ones still aren't at goal? Those are the patients ${brand} is for.`,
    },
    {
      id: `${prefix}-ob3`, label: "Cost and coverage", competency: "c-access",
      line: "My patients' plans fight every new prescription. The prior auth alone kills my staff.",
      pushback: "That doesn't tell me how you'd help my office with the paperwork.",
      handled: "If the support program really takes the paperwork off my staff, that helps.",
      keywords: ["support", "hub", "prior auth", "benefits", "copay", "coverage", "paperwork"],
      answer: "I hear you, the paperwork is real. Our support program runs the benefits check and prepares the prior auth for your office. I can't promise coverage, but it takes that work off your staff.",
    },
  ];
}

function rules(brand: string, prefix: string): ProhibitedRule[] {
  return [
    { id: `${prefix}-pr1`, label: "Outcome guarantee", critical: true, keywords: ["cure", "cures", "guarantee", "guaranteed", "will definitely"], explanation: `${brand} can't be promised to cure or to work for every patient.` },
    { id: `${prefix}-pr2`, label: "Minimising risk", critical: true, keywords: ["no side effects", "completely safe", "zero risk", "totally safe", "risk-free"], explanation: "Never minimise risk. Labelled side effects must be stated in balance." },
    { id: `${prefix}-pr3`, label: "Unapproved comparison", critical: false, keywords: ["better than", "the best", "safest", "superior", "most effective"], explanation: "No head-to-head data, so comparative and superlative claims aren't approved." },
  ];
}

/** The doctor's opening line and closing, in the product's words. */
const opener = (brand: string) => `I've got about five minutes between patients. What's new with ${brand}?`;
const closer = (brand: string) => `Alright. Leave me the information, and I'll think about ${brand} for the next patient who fits.`;

/**
 * Drafts a course's first roleplay from its roleplay documents. The scenario document sets the doctor,
 * objections and never-say list; a selling model, when there is one, sets the rubric.
 */
export function draftScenario(o: { courseId: string; productId?: string; sources: Source[]; sellingModelId?: string; id?: string; name?: string; createdAt?: string }): Scenario {
  const p = product(o.productId);
  const brand = p?.brand ?? "our product";
  const prefix = o.id ?? `sc-${rid()}`;
  const name = o.name ?? DOCTORS[hash(o.courseId) % DOCTORS.length];
  const scenarioDoc = o.sources.find((s) => s.id !== o.sellingModelId) ?? o.sources[0];
  const at = (page: number, id = scenarioDoc?.id): Citation | undefined => (id ? { sourceId: id, page } : undefined);
  const selling = !!o.sellingModelId;
  const obs = objections(brand, prefix);
  const prs = rules(brand, prefix);
  return {
    id: prefix, courseId: o.courseId, title: `${name} · first call`,
    persona: {
      name, specialty: (p && SPECIALIST[p.therapyArea]) ?? "Physician", setting: "Busy community practice",
      traits: ["Time-pressed", "Sceptical", "Happy with current treatment"],
      opening: opener(brand), closing: closer(brand),
    },
    context: "First call",
    objective: `Get ${name} to consider ${brand} for one patient who fits, handling each objection and staying on-label.`,
    durationMin: 5,
    objectionIds: obs.map((x) => x.id),
    rubric: STAGE_RUBRIC(selling, brand).map((r, i) => ({ ...r, id: `${prefix}-r${i + 1}` })),
    prohibitedIds: prs.map((x) => x.id),
    behaviourNote: "The AI doctor stays in persona, gives no medical advice, and raises objections only from this call's list. It never states product facts beyond the course's own material.",
    use: ["practice", "assessment"],
    custom: {
      objections: obs, prohibited: prs, sourceIds: o.sources.map((s) => s.id), sellingModelId: o.sellingModelId,
      cites: { persona: at(1), opening: at(2), objections: at(3), prohibited: at(4), rubric: selling ? at(2, o.sellingModelId) : at(5) },
      createdAt: o.createdAt ?? new Date().toISOString(),
    },
  };
}

/** Rebuilds the id lists after the custom objections or rules change. */
export function withLists(sc: Scenario): Scenario {
  if (!sc.custom) return sc;
  return { ...sc, objectionIds: sc.custom.objections.map((o) => o.id), prohibitedIds: sc.custom.prohibited.map((r) => r.id) };
}

const words = (t: string) => t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3);
const quoted = (t: string) => t.match(/["“']([^"”']{3,})["”']/)?.[1];
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** What the trainer can point the chat at: a step in the call tree. */
export type CallFocus = { kind: "persona" } | { kind: "opening" } | { kind: "objection"; id: string } | { kind: "close" } | { kind: "rule"; id: string } | { kind: "rubric" };

export interface CallEdit { next?: Scenario; reply: string; changed: string[] }

/**
 * The roleplay part of the course chat. Understands the edits trainers ask for most: tougher or
 * easier, add or drop an objection, rename the doctor, rewrite a line, call length, never-say rules.
 * Anything it can't map to an edit gets an answer with examples, never a silent change.
 */
export function editCall(sc: Scenario, prompt: string, focus?: CallFocus): CallEdit {
  const t = prompt.trim();
  const l = t.toLowerCase();
  const c = sc.custom;
  if (!c) return { reply: "This doctor ships with the product's approved package, so it can't be edited here. Ask me to add a new roleplay instead.", changed: [] };
  const obs = c.objections;
  const focusOb = focus?.kind === "objection" ? obs.find((o) => o.id === focus.id) : undefined;
  const q = quoted(t);
  const set = (next: Scenario, reply: string, changed: string[]): CallEdit => ({ next: withLists(next), reply, changed });
  const withCustom = (patch: Partial<NonNullable<Scenario["custom"]>>, extra: Partial<Scenario> = {}) => ({ ...sc, ...extra, custom: { ...c, ...patch } });

  /* Rewrite a line: the focused step, with the new words in quotes. */
  if (q && focus) {
    if (focus.kind === "opening") return set({ ...sc, persona: { ...sc.persona, opening: q } }, "Updated how the doctor opens the call.", ["opening"]);
    if (focus.kind === "close") return set({ ...sc, persona: { ...sc.persona, closing: q } }, "Updated how the doctor closes when the call goes well.", ["close"]);
    if (focusOb && /pushback|push back|miss/.test(l)) return set(withCustom({ objections: obs.map((o) => (o.id === focusOb.id ? { ...o, pushback: q } : o)) }), `Updated the pushback on "${focusOb.label}".`, [`objection:${focusOb.id}`]);
    if (focusOb && /good answer|answer|should say/.test(l)) return set(withCustom({ objections: obs.map((o) => (o.id === focusOb.id ? { ...o, answer: q } : o)) }), `Updated what a good answer to "${focusOb.label}" sounds like.`, [`objection:${focusOb.id}`]);
    if (focusOb) return set(withCustom({ objections: obs.map((o) => (o.id === focusOb.id ? { ...o, line: q } : o)) }), `The doctor now raises "${focusOb.label}" in those words.`, [`objection:${focusOb.id}`]);
  }
  if (/\b(remove|drop|delete)\b/.test(l)) {
    const n = Number(l.match(/objection\s*(\d)/)?.[1] ?? l.match(/(\d)(st|nd|rd|th)? objection/)?.[1]);
    const target = focusOb ?? (n ? obs[n - 1] : obs.find((o) => words(o.label).some((w) => l.includes(w))));
    if (target && obs.length > 1) return set(withCustom({ objections: obs.filter((o) => o.id !== target.id) }), `Removed "${target.label}". The call now has ${obs.length - 1} objections.`, []);
    if (target) return { reply: "A call needs at least one objection. Add another first, then remove this one.", changed: [] };
  }
  if (/(add|include|raise|another).*(objection|push ?back|concern)|objection (about|on)/.test(l)) {
    const topic = (l.match(/\b(?:about|on|that|re)\b:?\s+(.+)$/)?.[1] ?? q ?? "the evidence").replace(/[.?!]$/, "");
    const label = cap(topic.length > 40 ? `${topic.slice(0, 38)}…` : topic);
    const id = `${sc.id}-ob${rid()}`;
    const ob: Objection = {
      id, label, competency: "c-objections",
      line: q ?? `Before you go on: ${topic}. That's what I keep coming back to.`,
      pushback: "That doesn't really answer it. What would you tell my patients?",
      handled: "Okay, that's a fair answer.",
      keywords: [...new Set([...words(topic), "understand", "fair", "data"])].slice(0, 8),
      answer: `That's a fair concern. Here's what the course material says about ${topic}, and what I'd suggest for your next patient.`,
    };
    return set(withCustom({ objections: [...obs, ob] }), `Added "${label}" as objection ${obs.length + 1}. Tap it in the tree to rewrite the line or the good answer.`, [`objection:${id}`]);
  }
  if (/tough|harder|difficult|sceptic|skeptic|push harder/.test(l)) {
    const traits = [...new Set([...sc.persona.traits, "Sceptical", "Interrupts"])];
    const sharpen = (o: Objection) => ({ ...o, pushback: o.pushback.startsWith("No.") ? o.pushback : `No. ${o.pushback} Give me something specific.` });
    return set(withCustom({ objections: obs.map((o) => (!focusOb || o.id === focusOb.id ? sharpen(o) : o)) }, { persona: { ...sc.persona, traits } }),
      focusOb ? `"${focusOb.label}" now pushes back harder when the rep misses it.` : "The doctor is tougher now: more sceptical, interrupts, and pushes back harder on every miss.",
      focusOb ? [`objection:${focusOb.id}`] : ["persona", ...obs.map((o) => `objection:${o.id}`)]);
  }
  if (/easier|friendl|warmer|softer|gentle/.test(l)) {
    const traits = sc.persona.traits.filter((x) => !["Sceptical", "Interrupts", "Time-pressed"].includes(x)).concat("Open to new options");
    return set(withCustom({ objections: obs.map((o) => ({ ...o, pushback: o.pushback.replace(/^No\. /, "").replace(/ Give me something specific\.$/, "") })) }, { persona: { ...sc.persona, traits: [...new Set(traits)] } }),
      "The doctor is easier now: open to new options and gentler on a miss. Good for new hires.", ["persona"]);
  }
  const mins = l.match(/(\d+)\s*(min|minute)/)?.[1];
  if (mins || /shorter|longer/.test(l)) {
    const d = mins ? Math.max(2, Math.min(15, Number(mins))) : /shorter/.test(l) ? Math.max(2, sc.durationMin - 2) : Math.min(15, sc.durationMin + 2);
    return set({ ...sc, durationMin: d }, `The call now runs about ${d} minutes.`, ["persona"]);
  }
  const rename = t.match(/(?:call (?:her|him|them|the doctor)|rename (?:the doctor |her |him )?(?:to)?|name (?:her|him|the doctor))\s+(Dr\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i)?.[1];
  if (rename) {
    const name = rename.replace(/^Dr\.?\s*/i, "Dr. ");
    return set({ ...sc, title: `${name} · ${sc.context.toLowerCase()}`, persona: { ...sc.persona, name }, objective: sc.objective.replace(sc.persona.name, name) }, `The doctor is ${name} now.`, ["persona"]);
  }
  if (/never say|don.?t (let them )?say|must not say|ban|flag/.test(l) && (q || l.match(/say\s+(.+)$/))) {
    const phrase = (q ?? l.match(/say\s+(.+)$/)![1]).replace(/[.?!]$/, "");
    const id = `${sc.id}-pr${rid()}`;
    const rule: ProhibitedRule = { id, label: `Says "${phrase}"`, critical: /off.?label|guarantee|cure|safe/.test(phrase), keywords: [phrase.toLowerCase()], explanation: "Your team marked this as something reps must never say on a call." };
    return set(withCustom({ prohibited: [...c.prohibited, rule] }), `Added "${phrase}" to never-say. A rep who says it gets flagged${rule.critical ? " and fails the call" : ""}.`, [`rule:${id}`]);
  }
  if (/open with|opening/.test(l) && q) return set({ ...sc, persona: { ...sc.persona, opening: q } }, "Updated how the doctor opens the call.", ["opening"]);
  if (/specialt|nurse|cardiolog|dermatolog|oncolog|primary care|gp\b/.test(l)) {
    const sp = l.includes("nurse") ? "Nurse practitioner" : l.includes("primary care") || /\bgp\b/.test(l) ? "Primary care physician" : cap(l.match(/(cardiolog|dermatolog|oncolog)\w*/)?.[0] ?? sc.persona.specialty);
    return set({ ...sc, persona: { ...sc.persona, specialty: sp.replace(/y$/, "ist").replace(/ists?t$/, "ist") } }, `The doctor is a ${sp.toLowerCase()} now.`, ["persona"]);
  }
  return {
    reply: `I can change ${sc.persona.name}'s call for you. Try: "make her tougher", "add an objection about dosing", "remove objection 2", "call her Dr. Ana Ruiz", "make it 4 minutes", or "never say 'works for everyone'". Select a step in the tree first to rewrite just that line.`,
    changed: [],
  };
}

/* What a rep's situation is about, and how the doctor says it. */
const THEMES: { re: RegExp; line: string; keywords: string[]; label: string }[] = [
  { re: /time|minute|door|busy|rush|quick/, line: "I've only got a minute.", keywords: ["one patient", "minute", "quick", "which patients"], label: "No time" },
  { re: /happy|current|prescrib|already use|loyal|switch/, line: "Honestly, I'm happy with what I prescribe now.", keywords: ["still", "not controlled", "which patients", "struggle", "not at goal"], label: "Happy with current treatment" },
  { re: /cost|price|insur|cover|payer|prior auth|afford/, line: "And my patients can't get these things covered.", keywords: ["support", "hub", "prior auth", "benefits", "copay", "coverage"], label: "Cost and coverage" },
  { re: /data|evidence|study|trial|proof|convinc/, line: "I haven't seen data that convinces me.", keywords: ["trial", "study", "week", "%", "data", "results"], label: "Not convinced by the data" },
  { re: /side effect|safety|risk|worr/, line: "And I worry about side effects.", keywords: ["side effect", "safety", "report", "risk", "most common"], label: "Safety worries" },
  { re: /rep|sales|another|competitor|seen .* already/, line: "I've already heard from three reps this week.", keywords: ["one thing", "different", "patient", "quick"], label: "Rep fatigue" },
];

/**
 * A rep's own situation ("she only gives me two minutes and is happy with what she uses") as an
 * objection the AI doctor raises first, in the doctor's voice. Lives for this one call only.
 */
export function situationObjection(text: string): Objection {
  const t = text.toLowerCase();
  const hits = THEMES.filter((x) => x.re.test(t));
  const use = hits.length ? hits : [{ line: "", keywords: ["understand", "patient", "?"], label: "Your situation", re: /./ }];
  return {
    id: "ob-own", label: hits.length ? hits.map((h) => h.label).slice(0, 2).join(" + ") : "Your situation", competency: "c-objections",
    line: hits.length ? use.map((h) => h.line).join(" ") : `Before you start: ${text.trim().replace(/[.]$/, "")}. So?`,
    pushback: "That's not what I asked. Try again, briefly.",
    handled: "Okay. That's fair, I'll give you that.",
    keywords: [...new Set(use.flatMap((h) => h.keywords))],
    answer: "I hear you, and I'll be quick. Which of your patients still aren't where you'd like them? That's the one patient I'd like to talk about.",
  };
}
