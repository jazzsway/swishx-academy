import type { Objection, ProhibitedRule, RubricCriterion, Scenario } from "./types";

/* Roleplay content. Objection lines are HCP speech (persona), not company claims.
   Rubrics and prohibited lists are part of the approved MLR package (PRD AS-3). */

export const OBJECTIONS: Objection[] = [
  {
    id: "ob-cost", label: "Cost & prior authorization", competency: "c-access",
    line: "Honestly, my patients' plans fight every biologic. The prior auth paperwork alone kills my staff.",
    pushback: "That doesn't really tell me how you'd help my office with the paperwork.",
    handled: "Okay, if the Hub really takes the PA work off my staff, that helps.",
    keywords: ["access hub", "hub", "prior auth", "prior authorization", "benefits", "copay", "co-pay", "paperwork for you", "pa support", "bridge"],
  },
  {
    id: "ob-speed", label: "How fast it works", competency: "c-efficacy",
    line: "My patients want to feel better fast. How quickly will they actually notice anything?",
    pushback: "I need something concrete. What did the trials actually show?",
    handled: "Itch moving by week 2 would matter to them. Noted.",
    keywords: ["week 2", "two weeks", "itch", "week 16", "51", "easi"],
  },
  {
    id: "ob-eyes", label: "Eye safety", competency: "c-safety",
    line: "I've seen eye problems with other biologics in this space. What about Lumora?",
    pushback: "You're dodging. What's the actual eye data?",
    handled: "Nine percent, and tell them to report eye symptoms. Fair enough.",
    keywords: ["conjunctivitis", "9%", "nine percent", "9 percent", "eye symptoms", "report"],
  },
  {
    id: "ob-topicals", label: "\"They're fine on topicals\"", competency: "c-objections",
    line: "Most of my patients are doing okay on topicals. Why would I switch anyone?",
    pushback: "You still haven't told me which patient you'd actually want me to think about.",
    handled: "Fair. I do have a few who keep flaring and can't sleep.",
    keywords: ["flare", "flaring", "sleep", "not controlled", "uncontrolled", "inadequate", "despite topical", "missed work", "how many"],
  },
  {
    id: "ob-teen", label: "Use in teenagers (off-label trap)", competency: "c-compliance",
    line: "I have a few 15-year-olds with terrible eczema. Can I use Lumora for them?",
    pushback: "So is that a yes or a no for my teenagers?",
    handled: "Adults only, and you'll send a medical information request. Okay.",
    keywords: ["medical information", "only approved for adults", "approved for adults", "not approved", "adults only", "mi request"],
  },
];

/* Scenarios trainers build live in the store; the store registers them here so lookups find them. */
let CUSTOM: Scenario[] = [];
/* One-off objections for a single practice call (a rep's own situation), never saved. */
let EXTRA: Objection[] = [];
export function registerExtraObjections(list: Objection[]) { EXTRA = list; }
export function registerScenarios(list: Scenario[]) { CUSTOM = list; }
/** Every scenario: the approved ones we ship, then the ones trainers built. */
export const allScenarios = (): Scenario[] => [...SCENARIOS, ...CUSTOM];

export const objection = (id: string) => OBJECTIONS.find((o) => o.id === id) ?? EXTRA.find((o) => o.id === id) ?? CUSTOM.flatMap((s) => s.custom?.objections ?? []).find((o) => o.id === id)!;

export const PROHIBITED: ProhibitedRule[] = [
  {
    id: "pr-adolescent", label: "Unapproved population (adolescents)", critical: true,
    keywords: ["teen", "teenager", "teenagers", "adolescent", "adolescents", "kids", "children", "pediatric", "paediatric", "15-year", "16-year", "under 18"],
    negations: ["not approved", "only approved", "approved for adults", "adults only", "can't", "cannot", "medical information", "not indicated", "isn't approved", "is not approved", "off-label", "off label"],
    explanation: "Lumora is approved for adults only. Describing or endorsing use in adolescents is off-label promotion.",
    approvedRef: { moduleId: "lm9", label: "Fair balance in conversation" },
  },
  {
    id: "pr-nose", label: "Minimising risk", critical: true,
    keywords: ["no side effects", "completely safe", "zero risk", "totally safe", "no risk", "risk-free", "risk free"],
    explanation: "Never minimise risk. Conjunctivitis, injection-site reactions and hypersensitivity are labelled risks.",
    approvedRef: { moduleId: "lm8", label: "Important safety information" },
  },
  {
    id: "pr-cure", label: "Outcome guarantee", critical: true,
    keywords: ["cure", "cures", "guarantee", "guaranteed", "will definitely clear"],
    explanation: "Lumora treats moderate-to-severe AD; it is not a cure and outcomes cannot be guaranteed.",
    approvedRef: { moduleId: "lm4", label: "Efficacy: LUMEN-1 and LUMEN-2" },
  },
  {
    id: "pr-superlative", label: "Unapproved superlative", critical: false,
    keywords: ["safest", "the best", "best biologic", "most effective", "better than", "superior"],
    explanation: "Superlatives and comparative claims are not approved. There are no head-to-head studies.",
    approvedRef: { moduleId: "lm10", label: "Competitive landscape" },
  },
];

export const prohibited = (id: string) => PROHIBITED.find((p) => p.id === id) ?? CUSTOM.flatMap((s) => s.custom?.prohibited ?? []).find((p) => p.id === id)!;

const LUMORA_RUBRIC: RubricCriterion[] = [
  { id: "r-open", label: "Opens with a relevant patient type", competency: "c-opening", weight: 15,
    keywords: ["patient", "patients", "adults", "flaring", "moderate", "severe", "topicals", "topical"],
    good: "\"Think of your adult patients still flaring despite topicals...\"" },
  { id: "r-discover", label: "Asks a needs-discovery question", competency: "c-opening", weight: 10,
    keywords: ["how many", "what makes you", "what do you", "how are you", "tell me about", "?"],
    good: "\"What makes you decide a patient needs more than topicals?\"" },
  { id: "r-efficacy", label: "Shares efficacy data accurately", competency: "c-efficacy", weight: 20,
    keywords: ["51", "easi", "week 16", "week 2", "itch", "lumen", "clear or almost clear", "36"],
    good: "\"In LUMEN-1 and LUMEN-2, 51% reached EASI-75 at week 16 vs 17% with placebo.\"" },
  { id: "r-access", label: "Handles the cost & access objection", competency: "c-access", weight: 20,
    keywords: ["access hub", "hub", "prior auth", "benefits", "copay", "co-pay", "bridge", "pa support"],
    good: "\"The Corvana Access Hub runs benefits verification and prepares PA support for your office.\"" },
  { id: "r-safety", label: "Delivers key safety information", competency: "c-safety", weight: 25,
    keywords: ["conjunctivitis", "eye", "injection site", "injection-site", "hypersensitivity", "safety", "side effect", "live vaccine", "report"],
    good: "\"The most common side effects include conjunctivitis and injection-site reactions...\"" },
  { id: "r-close", label: "Asks for a next step", competency: "c-objections", weight: 10,
    keywords: ["would you", "could you", "consider", "next patient", "try", "start", "can i", "shall i", "would it help"],
    good: "\"Would you consider Lumora for the next adult patient who's still flaring?\"" },
];

const BEHAVIOUR = "The AI HCP stays in persona as a fictional US dermatologist. It does not give medical advice, does not state product facts as true beyond the approved material, and raises objections or misconceptions only from this scenario's objection pool and persona traits. It ends the call politely after the objections are handled or the time limit is reached.";

export const SCENARIOS: Scenario[] = [
  {
    id: "sc-ruiz", courseId: "c-lumora-launch", title: "Dr. Elena Ruiz · first call",
    persona: {
      name: "Dr. Elena Ruiz", specialty: "Dermatologist", setting: "Busy community practice, 30+ AD patients a month",
      traits: ["Time-pressed", "Sceptical of new biologics", "Loyal to topicals"],
      opening: "Hi, I've got about two minutes between patients. What's this about?",
      closing: "Alright, leave me the information. I'll think about it for the next adult who keeps flaring.",
    },
    context: "First call after launch", objective: "Get Dr. Ruiz to consider Lumora for one adult patient still flaring on topicals.",
    durationMin: 5, objectionIds: ["ob-topicals", "ob-speed"], rubric: LUMORA_RUBRIC,
    prohibitedIds: ["pr-adolescent", "pr-nose", "pr-cure", "pr-superlative"], behaviourNote: BEHAVIOUR, use: ["screening"],
  },
  {
    id: "sc-kim", courseId: "c-lumora-launch", title: "Dr. Marcus Kim · follow-up call",
    persona: {
      name: "Dr. Marcus Kim", specialty: "Dermatologist", setting: "Academic medical center, sees complex referrals",
      traits: ["Data-driven", "Cost-focused", "Sceptical"],
      opening: "Good to see you again. I read the Lumora material. Convince me it's worth the fight with payers.",
      closing: "Okay. Send the Hub enrolment form to my nurse and I'll try it for the next adult who qualifies.",
    },
    context: "Follow-up after launch", objective: "Handle cost, safety and an off-label question, then ask for a next step.",
    durationMin: 6, objectionIds: ["ob-cost", "ob-eyes", "ob-teen"], rubric: LUMORA_RUBRIC,
    prohibitedIds: ["pr-adolescent", "pr-nose", "pr-cure", "pr-superlative"], behaviourNote: BEHAVIOUR, use: ["assessment", "practice"],
  },
];

export const scenario = (id: string) => allScenarios().find((s) => s.id === id)!;

/** Building blocks for Practice → "Prep for a meeting" (PRD PR-2). */
export const PREP_SPECIALTIES = ["Dermatologist", "Allergist", "Nurse practitioner (derm)", "Primary care physician"];
export const PREP_TRAITS = ["Sceptical", "Time-pressed", "Loyal to a competitor", "Cost-focused", "Data-driven", "New to biologics"];
export const PREP_CALL_TYPES = ["First call", "Follow-up", "Post-launch check-in"];

export { LUMORA_RUBRIC, BEHAVIOUR };
