import type { Character, Course, Objective, Scenario, Source } from "../types";
import { registerSeedFiles } from "../org";
import { build } from "@/lib/scenario-set";

/*
 * A training built from the trainer's own material with nothing for reps to see: every file (the team's
 * video, deck, patient profiles, the PI, the selling model and the compliance policy) is context only and
 * builds the calls. Reps take a screening call (one of the situations), then one assessment per objective, then certify.
 * Six objectives, each with three or four situations to draw from. Leads the Trainings list.
 */

export const SWITCH_ID = "c-switch";
const PRODUCT = "p-psorivex";

const up = (id: string, title: string, fileName: string, format: "video" | "slides" | "pdf", pages: number): Source => ({
  id, title, type: "Uploaded file", pages, productId: PRODUCT, uploaded: { fileName, format, at: "2026-11-03T09:00:00" },
});
/** The team's own files, uploaded as context only. There's nothing behind them in the demo. */
const UPLOADED: Source[] = [
  up("up-sw-video", "Why patients stall on their first biologic", "Why patients stall on their first biologic.mp4", "video", 0),
  up("up-sw-deck", "Psorivex switch playbook", "Psorivex switch playbook.pptx", "slides", 14),
  up("up-sw-profiles", "Plaque psoriasis patient profiles", "Plaque psoriasis patient profiles.pdf", "pdf", 6),
];
registerSeedFiles(UPLOADED);
const CONTEXT = [...UPLOADED.map((s) => s.id), "src-psorivex-pi", "src-selling", "src-code"];

type W = { competency: string; pct: number }[];
const ob = (id: string, title: string, people: Character[], description: string, weights: W, lookFors: string[], cite: [string, number, string]): Objective =>
  ({ id, title, people, description, weights, lookFors, cites: [{ sourceId: cite[0], page: cite[1], quote: cite[2] }] });

export const SWITCH_OBJECTIVES: Objective[] = [
  ob("ob-sw-goal", "Find the patient who isn't at goal", ["doctor"],
    "With a dermatologist who thinks her patients are doing fine, reps ask about the ones still not clear at their last visit, and bring up Psorivex only for them.",
    [{ competency: "c-opening", pct: 45 }, { competency: "c-disease", pct: 30 }, { competency: "c-safety", pct: 25 }],
    ["Asks about patients not at goal before naming the product", "Names the patient type the label supports", "Gives the safety information alongside any benefit"],
    ["up-sw-profiles", 2, "still not clear or almost clear after 16 weeks"]),
  ob("ob-sw-push", "Keep the call going when a doctor is happy with current treatment", ["doctor"],
    "Reps acknowledge the pushback, answer it with the label's data and without comparing to the doctor's current choice, and ask for one patient to try.",
    [{ competency: "c-objections", pct: 50 }, { competency: "c-competitive", pct: 30 }, { competency: "c-safety", pct: 20 }],
    ["Acknowledges the pushback before answering", "Makes no head-to-head claims", "Asks for one patient who fits"],
    ["up-sw-deck", 7, "acknowledge, ask, answer with the label"]),
  ob("ob-sw-data", "Share the approved data, exactly", ["doctor"],
    "Reps quote the clinical results the way the PI states them: the endpoint, the week, the population. No rounding up, no extrapolating.",
    [{ competency: "c-efficacy", pct: 60 }, { competency: "c-compliance", pct: 20 }, { competency: "c-safety", pct: 20 }],
    ["States the endpoint and the week", "Keeps to the studied population", "Doesn't extrapolate beyond the label"],
    ["src-psorivex-pi", 9, "at week 16, the proportion of patients achieving PASI 90"]),
  ob("ob-sw-dose", "Walk the nurse through dosing and the first injection", ["nurse"],
    "Reps explain the starting doses, the schedule after that, and what to do about a missed dose, straight from the PI.",
    [{ competency: "c-dosing", pct: 60 }, { competency: "c-safety", pct: 40 }],
    ["States the starting doses and the schedule exactly", "Explains what to do about a missed dose", "Mentions the injection site reactions"],
    ["src-psorivex-pi", 3, "starting doses at week 0 and week 4, then every 12 weeks"]),
  ob("ob-sw-access", "Explain access without promising coverage", ["manager", "pharmacist"],
    "Reps explain what the support program does for the office and the pharmacy, and never promise what a plan will pay.",
    [{ competency: "c-access", pct: 60 }, { competency: "c-compliance", pct: 25 }, { competency: "c-objections", pct: 15 }],
    ["Explains what the support program takes off the office", "Never promises coverage or a copay amount", "Agrees a next step: a benefits check"],
    ["up-sw-deck", 11, "benefits verification and prior authorization support"]),
  ob("ob-sw-ae", "Keep fair balance and report adverse events", ["doctor", "patient"],
    "Every benefit comes with the safety information, and any side effect someone mentions is reported within 24 hours, without guessing at the cause.",
    [{ competency: "c-safety", pct: 50 }, { competency: "c-compliance", pct: 50 }],
    ["Gives the most common side effects alongside any benefit", "Says the event will be reported within 24 hours", "Doesn't speculate on the cause"],
    ["src-psorivex-pi", 6, "the most common adverse reactions were upper respiratory infections"]),
];

/* Each objective's situations: who the rep meets, and what happens. Three or four per objective. */
type Sit = [obId: string, character: Character, name: string, title: string, description: string];
const SITUATIONS: Sit[] = [
  ["ob-sw-goal", "doctor", "Dr. Sofia Alvarez", "A dermatologist who says her patients are doing fine", "Dr. Alvarez has a full clinic and sees no reason to change anything. Find out who isn't at goal, and keep fair balance when she asks about infections."],
  ["ob-sw-goal", "doctor", "Dr. Owen Brooks", "The patient still flaring after a year", "Dr. Brooks mentions a patient still at 8% body surface area on his first biologic. Ask the right questions before you bring up Psorivex."],
  ["ob-sw-goal", "doctor", "Dr. Marcus Hale", "Two minutes in the corridor", "Dr. Hale is between rooms and gives you two minutes. Ask one good question about his patients who aren't clear, and earn a proper visit."],
  ["ob-sw-goal", "doctor", "Dr. Lena Kim", "A new dermatologist building her practice", "Dr. Kim joined the practice last month and hasn't settled on a routine for moderate-to-severe patients. Find out which patients she's unsure about."],
  ["ob-sw-push", "doctor", "Dr. Priya Raman", "“Why would I switch a patient who's mostly fine?”", "Dr. Raman pushes back hard and asks how Psorivex compares to what she uses. Acknowledge it, don't compare, and ask for one patient to try."],
  ["ob-sw-push", "doctor", "Dr. Daniel Cho", "Loyal to the first biologic he learned", "Dr. Cho has used the same biologic for ten years and says it works. Respect that, and find the patients it isn't working for."],
  ["ob-sw-push", "doctor", "Dr. Sofia Alvarez", "“I've heard it's no better than the rest”", "Dr. Alvarez repeats something a colleague said. Correct it with the label's own data, without naming or criticising any other product."],
  ["ob-sw-data", "doctor", "Dr. Owen Brooks", "“What were the week 16 results, exactly?”", "Dr. Brooks wants the numbers. Give the endpoint, the week and the population the way the PI states them, and nothing beyond."],
  ["ob-sw-data", "doctor", "Dr. Marcus Hale", "Asked about a population that wasn't studied", "Dr. Hale asks whether it works in teenagers. It wasn't studied there: say so, and offer to route the question to medical information."],
  ["ob-sw-data", "doctor", "Dr. Lena Kim", "A long-term result from a congress poster", "Dr. Kim saw a poster with long-term data and asks you about it. It isn't in the label: don't discuss it, and offer a medical information request."],
  ["ob-sw-dose", "nurse", "Nurse Grace Obi", "The nurse who does the first injection", "Nurse Obi asks about the starting doses, the schedule after that, and what to tell a patient who missed one. Answer from the PI, nothing more."],
  ["ob-sw-dose", "nurse", "Nurse Ana Ruiz", "A patient missed the week 4 dose", "Nurse Ruiz has a patient who missed the second starting dose by a week. Explain what the PI says to do, and nothing it doesn't."],
  ["ob-sw-dose", "nurse", "Nurse Tom Becker", "Storage and handling questions", "Nurse Becker asks how to store the pens and how long one can sit out before use. Stick to the PI's handling section."],
  ["ob-sw-access", "manager", "Dana Whitfield", "The practice manager worries about prior auths", "Staff are drowning in paperwork. Show what the support program takes off their hands, and don't promise what any plan will cover."],
  ["ob-sw-access", "manager", "Luis Romero", "“Will it be covered for my patients?”", "Luis wants a yes or no on coverage. You can't promise one: explain the benefits check, and agree to start one for the next patient."],
  ["ob-sw-access", "pharmacist", "Mei Lin, PharmD", "The specialty pharmacist and the first fill", "Mei Lin asks how the first fill works with the support program. Explain the steps, and don't quote prices or copays."],
  ["ob-sw-access", "manager", "Karen Holt", "A denied claim on the desk", "Karen has a denial in hand and is frustrated. Explain how the program helps with appeals, without promising the outcome."],
  ["ob-sw-ae", "doctor", "Dr. Marcus Lee", "A doctor mentions a patient's infection", "Mid-call, Dr. Lee mentions a patient who got a chest infection after starting. Keep fair balance, and say you'll report it within 24 hours."],
  ["ob-sw-ae", "patient", "Rosa Delgado", "A patient at a support event mentions a reaction", "Rosa tells you her arm swelled after her last injection. Don't give medical advice: point her to her doctor, and report it within 24 hours."],
  ["ob-sw-ae", "doctor", "Dr. Daniel Cho", "Asked to call it “very safe”", "Dr. Cho wants a one-line safety summary for his patients and suggests “very safe”. Don't minimise the risks: give the safety information as the PI does."],
];

const shell = { id: SWITCH_ID, productId: PRODUCT, roleplaySourceIds: CONTEXT, sourceIds: CONTEXT } as Course;
/** A situation, built the way the trainer's own are, with fixed ids so the demo is the same on every load. */
function situation([obId, character, name, title, description]: Sit, id: string): Scenario {
  const o = SWITCH_OBJECTIVES.find((x) => x.id === obId)!;
  const sc = build({ course: shell, character, name, title, description, weights: o.weights, objective: `${o.title}, with ${name.replace(/,.*$/, "")}.` });
  const fixed = JSON.parse(JSON.stringify(sc).split(sc.id).join(id)) as Scenario;
  return { ...fixed, objectiveId: obId, custom: fixed.custom && { ...fixed.custom, createdAt: "2026-11-04T10:00:00" } };
}

export const SWITCH_SCENARIOS: Scenario[] = SITUATIONS.map((x, i) => situation(x, `sc-sw-${i + 1}`));
/** The screening call is one of the situations above, as the trainer picks them: short, and scored only as a baseline. */
const SCREEN = "sc-sw-1";

export function switchCourse(settings: Course["settings"]): Course {
  const at = "2026-11-05";
  return {
    id: SWITCH_ID, title: "Psorivex switch conversations", productId: PRODUCT, format: "long", type: "personalised", origin: "direct",
    objective: "Reps find the psoriasis patients who aren't at goal, handle the pushback without comparisons, get the data and dosing exactly right, explain access, and report adverse events.",
    audience: "Field reps · Immunology", writtenFor: "reps", teams: ["div-imm"], divisionId: "div-imm",
    sourceIds: CONTEXT, roleplaySourceIds: CONTEXT,
    competencyIds: [...new Set(SWITCH_OBJECTIVES.flatMap((o) => o.weights.map((w) => w.competency)))],
    modules: [], items: [], scenarioIds: SWITCH_SCENARIOS.map((x) => x.id), objectives: SWITCH_OBJECTIVES,
    brief: "Reps find the psoriasis patients who still aren't at goal, handle “my patients are fine” without comparisons, quote the data and dosing exactly, explain access without promising coverage, and report adverse events.",
    settings: { ...settings, screeningIds: [SCREEN], screeningScenarioId: SCREEN, assessmentScenarioId: "sc-sw-2" },
    versions: [{
      version: 1, versionId: "SWITCH-v1-sw01", state: "published", publishedAt: at, comments: [], acknowledged: [], modules: [],
      history: [{ at: "2026-11-03", by: "Maya Chen", action: "Created from your materials · no material for reps" }, { at: "2026-11-04", by: "Maya Chen", action: "Added six objectives and their situations" }, { at, by: "Maya Chen", action: "Published" }],
    }],
    ownerId: "u-maya", updatedAt: at, visibility: "audience", prerequisites: [], allowExplore: true,
  };
}
