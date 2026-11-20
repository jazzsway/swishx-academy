import type { Character, Course, Objection, RubricCriterion, Scenario, Source } from "@/data/types";
import { product, source } from "@/data/org";
import { SPECIALIST, draftConfig, moments, objections, rules } from "./roleplay-draft";

/*
 * A training's scenarios: the simulations reps take, back to back, in one call. Each scenario has one
 * character (a doctor, a nurse, a practice manager or a pharmacist), a short description, and the
 * competencies it measures with how much each counts. SwishX drafts the first few from the trainer's
 * brief and demo-call documents; the trainer adds more by describing them in the chat.
 * Deterministic, so the demo drafts the same scenarios every time.
 */

export const CHARACTERS: Record<Character, { label: string; names: string[]; setting: string; callType: string; place: string; minutes: number }> = {
  doctor: { label: "Doctor", names: ["Dr. Lena Kim", "Dr. Marcus Hale", "Dr. Priya Raman", "Dr. Owen Brooks", "Dr. Sofia Alvarez", "Dr. Daniel Cho"], setting: "Busy community practice", callType: "Follow-up visit", place: "In the office", minutes: 5 },
  nurse: { label: "Nurse", names: ["Nurse Ana Ruiz", "Nurse Grace Obi", "Nurse Tom Becker"], setting: "Specialty clinic", callType: "Clinic visit", place: "At the nurses' station", minutes: 4 },
  manager: { label: "Practice manager", names: ["Dana Whitfield", "Luis Romero", "Karen Holt"], setting: "Multi-physician practice", callType: "Office meeting", place: "In the back office", minutes: 4 },
  pharmacist: { label: "Pharmacist", names: ["Mei Lin, PharmD", "Sam Patel, PharmD", "Jon Reyes, PharmD"], setting: "Hospital outpatient pharmacy", callType: "Pharmacy visit", place: "At the pharmacy counter", minutes: 4 },
  patient: { label: "Patient", names: ["Rosa Delgado", "Mark Ellison", "Priya Shah"], setting: "Patient support event", callType: "Patient conversation", place: "At a support event", minutes: 4 },
};

const FEMALE = /Lena|Priya|Sofia|Ana\b|Grace|Dana|Karen|Mei|Rosa/;
const rid = () => Math.random().toString(36).slice(2, 7);

export const characterOf = (sc: Scenario): Character => sc.character ?? "doctor";

/** What each competency looks like on a call: the rubric line it becomes, and what the scorer listens for. */
export const CRITERIA: Record<string, { label: string; keywords: string[]; good: string }> = {
  "c-disease": { label: "Explains the unmet need", keywords: ["uncontrolled", "burden", "still", "flare", "itch", "unmet"], good: "\"Many of your patients are still flaring on what they take now...\"" },
  "c-moa": { label: "Explains how it works, simply", keywords: ["works", "blocks", "pathway", "target", "mechanism"], good: "\"It works by blocking one of the signals that drives the inflammation...\"" },
  "c-efficacy": { label: "Uses the approved data, exactly", keywords: ["study", "trial", "data", "weeks", "results", "label"], good: "\"In the pivotal study, at week 16...\"" },
  "c-dosing": { label: "Gets dosing and handling right", keywords: ["dose", "every", "weeks", "inject", "storage", "missed", "fridge"], good: "\"One injection every two weeks after the starting dose...\"" },
  "c-safety": { label: "Keeps fair balance", keywords: ["safety", "side effect", "risk", "warning", "report"], good: "\"The most common side effects are...\"" },
  "c-competitive": { label: "Positions it without comparisons", keywords: ["option", "fits", "patients who", "different"], good: "\"For patients who still aren't at goal, it's an option to consider...\"" },
  "c-access": { label: "Explains access and support", keywords: ["support", "prior auth", "coverage", "copay", "hub", "program"], good: "\"The support program runs the benefits check and prepares the prior auth...\"" },
  "c-opening": { label: "Opens on a patient and asks about needs", keywords: ["patient", "patients", "how many", "what makes", "?"], good: "\"Which of your patients still aren't where you'd like them?\"" },
  "c-objections": { label: "Handles the pushback and asks for a next step", keywords: ["understand", "hear you", "fair", "would you", "consider", "next"], good: "\"That's fair. Would you consider it for the next patient who fits?\"" },
  "c-compliance": { label: "Stays on-label and reports what must be reported", keywords: ["report", "24 hours", "medical information", "approved", "on-label"], good: "\"I need to report that within 24 hours.\"" },
};

/** The weights a scenario scores on: its own, or (for older doctors) the rubric's, grouped by competency. */
export function weightsOf(sc: Scenario): { competency: string; pct: number }[] {
  if (sc.weights?.length) return sc.weights;
  const by: Record<string, number> = {};
  for (const r of sc.rubric) by[r.competency] = (by[r.competency] ?? 0) + r.weight;
  const total = Object.values(by).reduce((a, b) => a + b, 0) || 1;
  return evenTo100(Object.entries(by).map(([competency, w]) => ({ competency, pct: (w / total) * 100 })));
}

/** Rounds to whole percents that add up to exactly 100. */
export function evenTo100(ws: { competency: string; pct: number }[]): { competency: string; pct: number }[] {
  if (!ws.length) return ws;
  const total = ws.reduce((a, w) => a + w.pct, 0) || 1;
  const out = ws.map((w) => ({ ...w, pct: Math.max(1, Math.round((w.pct / total) * 100)) }));
  out[0].pct += 100 - out.reduce((a, w) => a + w.pct, 0);
  return out;
}

/** A scenario's rubric, one line per competency it measures, weighted the same. */
export function rubricFor(weights: { competency: string; pct: number }[], prefix: string): RubricCriterion[] {
  return weights.map((w, i) => ({ id: `${prefix}-r${i + 1}`, competency: w.competency, weight: w.pct, ...(CRITERIA[w.competency] ?? CRITERIA["c-objections"]) }));
}

/** The same scenario with new weights: the rubric follows them. */
export function withWeights(sc: Scenario, weights: { competency: string; pct: number }[]): Scenario {
  return { ...sc, weights, rubric: rubricFor(weights, sc.id) };
}

/** How a rep did on one scenario: its competency scores, weighted the way the scenario counts them. */
export function scenarioScore(sc: Scenario, r: { score: number; competencyScores: Record<string, number> }): number {
  const ws = weightsOf(sc);
  if (!ws.length) return r.score;
  return Math.round(ws.reduce((a, w) => a + (r.competencyScores[w.competency] ?? r.score) * w.pct, 0) / 100);
}

function lines(c: Character, brand: string, prefix: string): { opening: string; closing: string; traits: string[]; obs: Objection[] } {
  if (c === "nurse")
    return {
      opening: `Hi, the doctor's running late, so you've got me. A few patients have asked about ${brand}. What should I be telling them?`,
      closing: "Okay. Send me the patient leaflet and the support number, and I'll walk the next one through it.",
      traits: ["Practical", "Protective of patients", "Short on time"],
      obs: [
        { id: `${prefix}-ob1`, label: "Who teaches the injections", competency: "c-dosing", line: "Who's going to teach patients to inject this? We don't have time for that.", pushback: "That still doesn't tell me who does the teaching.", handled: "If the support program covers the first injection training, that helps.", keywords: ["nurse educator", "training", "support program", "injection", "teach", "first dose"], answer: "The support program offers injection training with a nurse educator, at home or in the clinic, so your team doesn't have to cover it." },
        { id: `${prefix}-ob2`, label: "Side effects to warn about", competency: "c-safety", line: "Honestly, what side effects should I warn patients about?", pushback: "That's vague. What do I actually tell them?", handled: "Good, that's what I'd want them to hear.", keywords: ["side effect", "injection site", "reaction", "common", "report", "prescribing information"], answer: "The most common ones are listed in the prescribing information, and I'll walk you through them. Anything a patient reports, we report within 24 hours." },
        { id: `${prefix}-ob3`, label: "Missed doses", competency: "c-dosing", line: "If a patient misses a dose, what do I tell them?", pushback: "I need something I can actually say to a patient.", handled: "Okay, that's clear enough to pass on.", keywords: ["missed", "dose", "next scheduled", "prescribing information", "label"], answer: "The prescribing information covers it: I'll show you the missed-dose section so you can tell patients exactly what it says.", finalOnly: true },
        moments(brand, prefix, c)[0],
      ],
    };
  if (c === "manager")
    return {
      opening: `I've got ten minutes before the phones start. If the doctors start prescribing ${brand}, what does that mean for my front desk?`,
      closing: "Fine. Leave me the hub's number and the forms, and I'll brief the team.",
      traits: ["Busy", "Thinks in staff hours", "Wary of paperwork"],
      obs: [
        { id: `${prefix}-ob1`, label: "Prior auth burden", competency: "c-access", line: "Every new drug means another prior auth fight. My staff are already drowning.", pushback: "That doesn't tell me how you'd take any of that work off us.", handled: "If the hub really prepares the paperwork, that changes things.", keywords: ["support", "hub", "prior auth", "benefits", "paperwork", "we handle"], answer: "I hear you. The support program runs the benefits check and prepares the prior auth for your office. I can't promise coverage, but it takes that work off your staff." },
        { id: `${prefix}-ob2`, label: "Staff time", competency: "c-objections", line: "My team is stretched. Every new product means more calls and more forms.", pushback: "So who picks up the phone when a patient calls confused?", handled: "Alright, if there's one number for patients to call, that's fair.", keywords: ["case manager", "one number", "support", "takes off", "fair", "understand"], answer: "That's fair. Patients get one number and a case manager, so the calls go to the program instead of your front desk." },
        { id: `${prefix}-ob3`, label: "Copay worries", competency: "c-access", line: "Patients drop off when they see the copay. Is there anything for that?", pushback: "Is that a yes or a no?", handled: "Good. I'll tell the team to mention it up front.", keywords: ["copay", "savings", "card", "program", "eligible", "assistance"], answer: "Eligible commercially insured patients may pay less with the copay program. The hub checks eligibility for each patient.", finalOnly: true },
      ],
    };
  if (c === "patient")
    return {
      opening: `My doctor brought up ${brand} at my last visit. I've tried so many things already. What would actually be different this time?`,
      closing: "Okay. I'll talk to my doctor about it at my next visit.",
      traits: ["Worried", "Tired of trying things", "Asks plain questions"],
      obs: [
        { id: `${prefix}-ob1`, label: "Is it safe", competency: "c-safety", line: "Is it safe to take for years? What are the side effects?", pushback: "That sounds like you're avoiding the question.", handled: "Okay, that's honest. I'll ask my doctor about those.", keywords: ["side effect", "doctor", "prescribing information", "common", "report", "talk to"], answer: "Every medicine has side effects, and the common ones are in the patient leaflet. Your doctor is the right person to weigh them up with you." },
        { id: `${prefix}-ob2`, label: "Needles", competency: "c-dosing", line: "It's an injection? I really don't like needles.", pushback: "So I'd have to do it myself?", handled: "If someone shows me how, I could try.", keywords: ["training", "nurse", "support", "show you", "pen", "injection"], answer: "Many people feel that way. The support program can arrange for a nurse to show you how, step by step." },
        { id: `${prefix}-ob3`, label: "Medical advice", competency: "c-compliance", line: "Should I stop my current cream and switch to this?", pushback: "But what would you do?", handled: "Right, I'll ask my doctor.", keywords: ["your doctor", "can't advise", "talk to", "medical information", "healthcare provider"], answer: "I can't give medical advice. That's a decision to make with your doctor; I can share the patient information to take with you." },
        moments(brand, prefix, c)[0],
      ],
    };
  if (c === "pharmacist")
    return {
      opening: `We've had a few scripts for ${brand} come through. Before we stock it, I've got some questions.`,
      closing: "Okay. Send me the storage sheet and I'll raise it at the next formulary meeting.",
      traits: ["Precise", "Safety-first", "Asks for the label"],
      obs: [
        { id: `${prefix}-ob1`, label: "Storage and handling", competency: "c-dosing", line: "How does this need to be stored, and what if it's left out of the fridge?", pushback: "I need the actual answer, not 'check the label'.", handled: "Okay, that matches what I'd expect.", keywords: ["refrigerat", "fridge", "room temperature", "days", "storage", "label"], answer: "It's stored in the fridge. The prescribing information says how long it can stay at room temperature; I'll show you that section." },
        { id: `${prefix}-ob2`, label: "Interactions", competency: "c-safety", line: "Any interactions I should flag when I check a patient's other medicines?", pushback: "So is there anything or not?", handled: "Fine, I'll add that to our checks.", keywords: ["interaction", "live vaccine", "prescribing information", "label", "check"], answer: "The prescribing information lists what to watch for, including live vaccines. I'll leave you that section." },
        { id: `${prefix}-ob3`, label: "Formulary", competency: "c-access", line: "It isn't on our formulary yet. Why should the committee add it?", pushback: "The committee will want more than that.", handled: "Okay, send me the dossier and I'll take it to them.", keywords: ["formulary", "committee", "data", "patients", "criteria", "dossier"], answer: "For patients who aren't controlled on current options, the approved data supports it. I can send the formulary dossier for the committee." },
        moments(brand, prefix, c)[0],
      ],
    };
  const regular = objections(brand, prefix);
  return {
    opening: `I've got about five minutes before my next patient. Go on, tell me about ${brand}.`,
    closing: `Alright. Leave me the information, and I'll think about ${brand} for the next patient who fits.`,
    traits: ["Time-pressed", "Sceptical", "Happy with current treatment"],
    obs: [regular[0], ...moments(brand, prefix), ...regular.slice(1)],
  };
}

const KEYWORDS: [RegExp, string][] = [
  [/dos(e|ing)|inject|storage|fridge|missed/, "c-dosing"],
  [/side effect|safety|risk|adverse|interaction/, "c-safety"],
  [/coverage|insurance|prior auth|cost|copay|formulary|access|paperwork/, "c-access"],
  [/data|trial|study|efficacy|evidence|results/, "c-efficacy"],
  [/objection|pushback|sceptic|skeptic|resist|happy with|push back/, "c-objections"],
  [/off.?label|complian|adverse event|report/, "c-compliance"],
  [/competitor|switch|compare|versus|vs\b/, "c-competitive"],
  [/open|discovery|needs|first call|introduc/, "c-opening"],
  [/mechanism|how it works|moa/, "c-moa"],
  [/disease|burden|unmet|patients struggle/, "c-disease"],
];
const DEFAULT_WEIGHTS: Record<Character, string[]> = {
  doctor: ["c-opening", "c-objections", "c-efficacy"],
  nurse: ["c-dosing", "c-safety", "c-compliance"],
  manager: ["c-access", "c-objections", "c-opening"],
  pharmacist: ["c-dosing", "c-safety", "c-access"],
  patient: ["c-safety", "c-compliance", "c-dosing"],
};

/** The competencies a description is about, most mentioned first, topped up from the character's usual ones. */
export function proposeWeights(text: string, c: Character): { competency: string; pct: number }[] {
  const l = text.toLowerCase();
  const hits = KEYWORDS.filter(([re]) => re.test(l)).map(([, id]) => id);
  const ids = [...new Set([...hits, ...DEFAULT_WEIGHTS[c]])].slice(0, 3);
  return evenTo100(ids.map((competency, i) => ({ competency, pct: [45, 30, 25][i] })));
}

const characterIn = (l: string): Character =>
  /pharmac/.test(l) ? "pharmacist" : /patient|caregiver|parent/.test(l) ? "patient" : /manager|front desk|office|admin|billing/.test(l) ? "manager" : /nurse|\bnp\b|\bpa\b/.test(l) ? "nurse" : "doctor";

/** The product as the person on the call says it: its name, or (with no product picked) plainly "this new treatment". */
export const spoken = (brand?: string) => brand ?? "this new treatment";

/**
 * How someone opens a situation SwishX writes: in their own words, about the thing the situation is about.
 * Keyed by the situation's title; anything else opens the way that kind of person usually does.
 */
const OPENINGS: Record<string, (it: string) => string> = {
  "A busy doctor gives the rep one minute": (it) => `I've got a minute before my next patient, and honestly, what I prescribe now works fine. So why ${it}?`,
  "The nurse asks which patients it's for": (it) => `The doctor asked me to find out about ${it}. Which of our patients would it actually be for?`,
  "A doctor asks how it compares with her usual choice": (it) => `I keep hearing about ${it}. How does it stack up against what I already use?`,
  "A pharmacist asks for the study results": (it) => `Before we stock ${it}, I want the numbers. What did the trial actually show?`,
  "A patient asks if it's safe long term": (it) => `My doctor brought up ${it}. I'd be on it for years, so before anything else: is it safe long term?`,
  "The nurse mentions a patient's reaction": (it) => `Good timing. I wanted to ask you about ${it}; a couple of things have come up with our patients.`,
  "The practice manager worries about prior auths": (it) => `I've got ten minutes before the phones start. Every new drug means another prior auth fight. What does ${it} do about that?`,
  "A patient asks what it will cost": (it) => `My doctor wants me to try ${it}, but my last treatment cost a fortune. What am I going to end up paying?`,
  "A doctor asks about a 15-year-old": (it) => `Quick one before you start. I see a lot of teenagers in my clinic. Could I use ${it} for them?`,
  "A pharmacist asks about use in pregnancy": (it) => `One of our customers is pregnant, and her doctor mentioned ${it}. Is it okay for her to take?`,
};

/** The opening line for a situation: written for it when SwishX knows it, otherwise the person's usual one. */
export function openingFor(c: Character, title: string, brand?: string): string {
  const it = spoken(brand);
  return OPENINGS[title]?.(it) ?? lines(c, it, "x").opening;
}

export function build(o: { course: Course; character: Character; title: string; description: string; objective: string; weights: { competency: string; pct: number }[]; name: string; specialty?: string; traits?: string[]; difficulty?: "easy" | "standard" | "hard" }): Scenario {
  const p = product(o.course.productId);
  const brand = p?.brand ?? "our product";
  const prefix = `sc-${rid()}`;
  const ch = CHARACTERS[o.character];
  /* Spoken by the person on the call, in their words. */
  const l = lines(o.character, spoken(p?.brand), prefix);
  const docs = (o.course.roleplaySourceIds?.length ? o.course.roleplaySourceIds : o.course.sourceIds).map((x) => source(x)).filter((x): x is Source => !!x);
  const cfg = draftConfig({ productId: o.course.productId, sources: docs, name: o.name, regular: l.obs.filter((x) => !x.moment).length });
  const prs = rules(brand, prefix);
  const doc = docs[0]?.id;
  const specialty = o.specialty ?? (o.character === "doctor" ? (p && SPECIALIST[p.therapyArea]) ?? "Physician" : ch.label);
  return {
    id: prefix, courseId: o.course.id, title: o.title, description: o.description, character: o.character, weights: o.weights,
    persona: { name: o.name, specialty, setting: ch.setting, traits: o.traits ?? l.traits, opening: openingFor(o.character, o.title, p?.brand), closing: l.closing },
    context: ch.callType, objective: o.objective, durationMin: ch.minutes,
    objectionIds: l.obs.map((x) => x.id), rubric: rubricFor(o.weights, prefix), prohibitedIds: prs.map((x) => x.id),
    behaviourNote: `The AI ${ch.label.toLowerCase()} stays in character, gives no medical advice, and raises only this scenario's objections. It never states product facts beyond the training's own material.`,
    use: ["practice", "assessment"],
    config: { ...cfg, callType: ch.callType, place: ch.place, difficulty: o.difficulty ?? cfg.difficulty, voice: { ...cfg.voice, gender: FEMALE.test(o.name) ? "female" : "male" } },
    custom: {
      objections: l.obs, prohibited: prs, sourceIds: docs.map((d) => d.id),
      cites: doc ? { persona: { sourceId: doc, page: 1 }, opening: { sourceId: doc, page: 2 }, objections: { sourceId: doc, page: 3 }, prohibited: { sourceId: doc, page: 4 } } : {},
      createdAt: new Date().toISOString(),
    },
  };
}

/** A scenario the trainer described in the chat: the character, title and weights come from what they wrote. */
export function draftFromPrompt(course: Course, prompt: string, usedNames: string[]): Scenario {
  const l = prompt.toLowerCase();
  const character = characterIn(l);
  const ch = CHARACTERS[character];
  const name = ch.names.find((n) => !usedNames.includes(n)) ?? ch.names[0];
  const text = prompt.trim().replace(/^(add|create|make|new)\s+(a\s+)?(new\s+)?scenario\s*(where|in which|about|:|-)?\s*/i, "").replace(/\s+/g, " ");
  const first = text.split(/[.!?\n]/)[0].trim();
  const title = first.length > 64 ? `${first.slice(0, 61).replace(/\s+\S*$/, "")}…` : first;
  const brand = product(course.productId)?.brand ?? "the product";
  return build({
    course, character, name, weights: proposeWeights(l, character),
    title: title ? title.charAt(0).toUpperCase() + title.slice(1) : `${ch.label} call`,
    description: text.charAt(0).toUpperCase() + text.slice(1).replace(/([^.!?])$/, "$1."),
    objective: `Handle ${name.replace(/,.*$/, "")}'s questions about ${brand}, stay on-label, and agree a next step.`,
    difficulty: /tough|hard|difficult|aggressive|hostile/.test(l) ? "hard" : /easy|friendly|warm/.test(l) ? "easy" : undefined,
  });
}

/** The scenarios a training's screening call is built from: the trainer's pick, or the first two. */
export function screeningOf(course: Course, scs: Scenario[]): Scenario[] {
  const ids = course.settings.screeningIds;
  const picked = ids?.length ? scs.filter((x) => ids.includes(x.id)) : [];
  return picked.length ? picked : scs.slice(0, 2);
}
