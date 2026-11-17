import type { Character, Course, Objective, Scenario, Source } from "@/data/types";
import { product } from "@/data/org";
import { CHARACTERS, CRITERIA, build, evenTo100, proposeWeights, withWeights } from "./scenario-set";

/*
 * A training's objectives: what reps should be able to do, drawn from the trainer's brief and material.
 * Each can involve several kinds of people and is scored on its own criteria. Under each, a couple of
 * example situations (one person each) show the trainer how the objective gets tested on a call; the
 * trainer adds more from the chat. Deterministic, so the demo drafts the same objectives every time.
 */

type Kind = "opening" | "claims" | "safety" | "access" | "offlabel";
interface Template {
  title: string;
  description: (brand: string) => string;
  people: Character[];
  weights: { competency: string; pct: number }[];
  quote: string;
  match: RegExp;
  lookFors: string[];
  situations: { c: Character; title: string; description: string }[];
}

const TEMPLATES: Record<Kind, Template> = {
  opening: {
    title: "Open on the right patient",
    description: (b) => `Reps open with the patients ${b} is approved for, and ask about the ones who still aren't at goal on what they take now.`,
    people: ["doctor", "nurse"], weights: [{ competency: "c-opening", pct: 40 }, { competency: "c-disease", pct: 30 }, { competency: "c-objections", pct: 30 }],
    lookFors: ["Names the patient type the label supports in the first minute", "Asks which of their patients still aren't at goal", "Keeps it short when time is tight, and asks for a next step"], quote: "adults with moderate-to-severe disease not adequately controlled with topical therapies", match: /open|first call|patient type|needs|discovery|specialist/,
    situations: [
      { c: "doctor", title: "A busy doctor gives the rep one minute", description: "The doctor is happy with what she prescribes. The rep has a minute to name the patient type and ask the right question." },
      { c: "nurse", title: "The nurse asks which patients it's for", description: "The nurse wants to know which patients in the clinic would qualify, in plain words." },
    ],
  },
  claims: {
    title: "State the approved claims exactly",
    description: () => "Reps quote the trial results as approved: the endpoint, the timepoint and the population, with no rounding or comparisons.",
    people: ["doctor", "pharmacist"], weights: [{ competency: "c-efficacy", pct: 50 }, { competency: "c-compliance", pct: 25 }, { competency: "c-safety", pct: 25 }],
    lookFors: ["Quotes the endpoint, timepoint and population exactly as approved", "Doesn't round the numbers or compare with other treatments", "Offers the study reference when asked for more"], quote: "at week 16, the primary endpoint was met versus placebo", match: /claim|data|trial|study|efficacy|result|clinical/,
    situations: [
      { c: "doctor", title: "A doctor asks how it compares with her usual choice", description: "A comparison question the approved claims don't cover. The rep sticks to what was studied." },
      { c: "pharmacist", title: "A pharmacist asks for the study results", description: "The pharmacist wants the numbers. The rep gives the approved endpoint exactly as labelled." },
    ],
  },
  safety: {
    title: "Keep fair balance and report adverse events",
    description: () => "Every benefit comes with the safety information, and any side effect someone mentions is reported within 24 hours.",
    people: ["doctor", "nurse", "patient"], weights: [{ competency: "c-safety", pct: 50 }, { competency: "c-compliance", pct: 50 }],
    lookFors: ["Gives the most common side effects alongside any benefit", "Reports any adverse event mentioned, within 24 hours", "Points patients to their doctor for medical advice"], quote: "the most common adverse reactions were injection site reactions", match: /safety|side effect|adverse|fair balance|report/,
    situations: [
      { c: "patient", title: "A patient asks if it's safe long term", description: "The patient wants an honest answer about side effects. The rep stays balanced and points to the doctor." },
      { c: "nurse", title: "The nurse mentions a patient's reaction", description: "Mid-conversation, the nurse mentions a rash after a dose. The rep has to report it." },
    ],
  },
  access: {
    title: "Explain the support program without promising coverage",
    description: () => "Reps explain what the support program does for the office and the patient, and never promise that a plan will cover it.",
    people: ["manager", "patient"], weights: [{ competency: "c-access", pct: 60 }, { competency: "c-objections", pct: 40 }],
    lookFors: ["Explains what the support program does for the office and the patient", "Never promises coverage or a copay amount", "Gives the next step: a benefits check and prior auth support"], quote: "the program provides benefits verification and prior authorization support", match: /access|support program|coverage|cost|copay|prior auth|insurance|practice manager/,
    situations: [
      { c: "manager", title: "The practice manager worries about prior auths", description: "Staff are drowning in paperwork. The rep shows what the support program takes off their hands." },
      { c: "patient", title: "A patient asks what it will cost", description: "The rep explains the copay program without promising what the patient's plan will pay." },
    ],
  },
  offlabel: {
    title: "Refer off-label questions to Medical Information",
    description: (b) => `Reps recognise questions outside the ${b} label, like younger patients, and refer them to Medical Information instead of answering.`,
    people: ["doctor", "pharmacist"], weights: [{ competency: "c-compliance", pct: 70 }, { competency: "c-safety", pct: 30 }],
    lookFors: ["Recognises a question outside the label", "Says what the label covers, without speculating", "Offers a Medical Information request instead of answering"], quote: "indicated for the treatment of adults", match: /off.?label|age|adult|teen|child|pregnan|label/,
    situations: [
      { c: "doctor", title: "A doctor asks about a 15-year-old", description: "The doctor has teenage patients in mind. The rep says it's for adults and offers a Medical Information request." },
      { c: "pharmacist", title: "A pharmacist asks about use in pregnancy", description: "Outside what the label covers. The rep refers it rather than guessing." },
    ],
  },
};
const DEFAULT: Kind[] = ["opening", "claims", "safety", "access"];
const rid = () => Math.random().toString(36).slice(2, 7);

/** Where an objective comes from in the material: a page or two of the attached files. */
function citesFor(i: number, materials: Source[], quote: string): Objective["cites"] {
  if (!materials.length) return [];
  const first = materials[i % materials.length];
  const out = [{ sourceId: first.id, page: 2 + ((i * 3) % 9), quote }];
  if (materials.length > 1) out.push({ sourceId: materials[(i + 1) % materials.length].id, page: 1 + ((i * 5) % 7), quote });
  return out;
}

/** The first objectives of a training: the ones the brief talks about first, topped up to four. */
export function draftObjectives(o: { brief: string; productId?: string; materials: Source[] }): Objective[] {
  const brand = product(o.productId)?.brand ?? "the product";
  const l = o.brief.toLowerCase();
  const hit = (Object.keys(TEMPLATES) as Kind[]).filter((k) => TEMPLATES[k].match.test(l));
  const kinds = [...new Set([...hit, ...DEFAULT])].slice(0, 4);
  return kinds.map((k, i) => {
    const t = TEMPLATES[k];
    return { id: `ob-${rid()}`, title: t.title, description: t.description(brand), people: t.people, weights: t.weights, cites: citesFor(i, o.materials, t.quote), lookFors: t.lookFors };
  });
}

const peopleIn = (l: string): Character[] => {
  const out: Character[] = [];
  if (/doctor|physician|dermatolog|specialist|hcp/.test(l)) out.push("doctor");
  if (/nurse|\bnp\b/.test(l)) out.push("nurse");
  if (/manager|front desk|office|admin|billing/.test(l)) out.push("manager");
  if (/pharmac/.test(l)) out.push("pharmacist");
  if (/patient|caregiver|parent/.test(l)) out.push("patient");
  return out.length ? out : ["doctor"];
};

/** An objective the trainer described in the chat: its people and criteria come from what they wrote. */
export function objectiveFromPrompt(text: string, materials: Source[], index: number): Objective {
  const t = text.trim().replace(/^(add|new|create)\s+(an?\s+)?objective\s*(:|-|that|where)?\s*/i, "");
  const l = t.toLowerCase();
  const template = (Object.keys(TEMPLATES) as Kind[]).find((k) => TEMPLATES[k].match.test(l));
  const first = t.split(/[.!?\n]/)[0].replace(/^reps?\s+(should|can|must|will)\s+/i, "").trim();
  const title = first.split(/\s+/).slice(0, 10).join(" ");
  const people = peopleIn(l);
  const ob: Objective = {
    id: `ob-${rid()}`, title: title ? title.charAt(0).toUpperCase() + title.slice(1) : "New objective",
    description: "", people,
    weights: proposeWeights(l, people[0]), cites: citesFor(index, materials, template ? TEMPLATES[template].quote : first.toLowerCase()),
    lookFors: template ? TEMPLATES[template].lookFors : undefined,
  };
  return { ...ob, description: describe(ob), lookFors: lookForsOf(ob) };
}

/** A couple of example situations for an objective, one person each, scored on the objective's criteria. */
export function exampleSituations(course: Course, ob: Objective, used: string[]): Scenario[] {
  const brand = product(course.productId)?.brand ?? "the product";
  const t = Object.values(TEMPLATES).find((x) => x.title === ob.title);
  const people = ob.people.length ? ob.people : ["doctor" as Character];
  const plan = t?.situations ?? [
    { c: people[0], title: `${CHARACTERS[people[0]].label} brings it up mid-call`, description: `${ob.title}: it comes up partway through, and the rep has to handle it there and then.` },
    { c: people[1] ?? people[0], title: `${CHARACTERS[people[1] ?? people[0]].label} pushes back on it`, description: `${ob.title}: the rep meets doubt or a hard question and still gets it right.` },
  ];
  return plan.map((p) => {
    const name = CHARACTERS[p.c].names.find((n) => !used.includes(n)) ?? CHARACTERS[p.c].names[0];
    used.push(name);
    const sc = build({ course, character: p.c, name, title: p.title, description: p.description, weights: ob.weights, objective: `${ob.title}. With ${name.replace(/,.*$/, "")}, stay on-label with ${brand}.` });
    return { ...withWeights(sc, ob.weights), objectiveId: ob.id };
  });
}

/** An objective with new weights, and its situations scored on them too. */
export function reweigh(ob: Objective, weights: Objective["weights"]): Objective {
  return { ...ob, weights: evenTo100(weights) };
}

const who = (people: Character[]) => {
  const names = people.map((p) => `a ${CHARACTERS[p].label.toLowerCase()}`);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : names[0] ?? "someone on the call";
};

/** An objective's description: its own, or (when it only repeats the title) one written from who it involves and how it's scored. */
export function describe(ob: Objective): string {
  const plain = (x: string) => x.toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (ob.description && plain(ob.description) !== plain(ob.title) && !plain(ob.description).startsWith(plain(ob.title))) return ob.description;
  const doing = ob.title.replace(/^reps?\s+(should|can|must|will)?\s*/i, "");
  const what = ob.weights.slice(0, 2).map((w) => (CRITERIA[w.competency]?.label ?? "").toLowerCase()).filter(Boolean).join(" and ");
  return `When ${who(ob.people)} brings it up, the rep should ${doing.charAt(0).toLowerCase() + doing.slice(1)}: clearly, on-label, and in a way that moves the conversation on. It's judged mostly on ${what || "how well the rep handles it"}.`;
}

/** What good looks like: the objective's own list, or one line per criterion it's scored on. */
export function lookForsOf(ob: Objective): string[] {
  if (ob.lookFors?.length) return ob.lookFors;
  const t = Object.values(TEMPLATES).find((x) => x.title === ob.title);
  if (t) return t.lookFors;
  return ob.weights.map((w) => CRITERIA[w.competency]?.label).filter((x): x is string => !!x);
}
