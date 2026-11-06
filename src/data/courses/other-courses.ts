import type { Item, Module, Product } from "../types";
import { VIDEO_WEBINAR } from "../media";

const CODE = "src-code", AD = "src-ad-guide", PI = "src-lum-pi", OBJ = "src-lum-obj", PAY = "src-lum-payer";
const CPI = "src-cdx-pi", CVA = "src-cdx-va";
const c = (sourceId: string, page: number) => ({ sourceId, page });

export const COMPLIANCE_MODULES: Module[] = [
  { id: "ce1", title: "On-label promotion", competency: "c-compliance", tier: "core", minutes: 6, summary: "What you can and can't say.", blocks: [
    { id: "ce1-b1", type: "lesson", title: "Stay on label", minutes: 3, competencies: ["c-compliance"], paragraphs: [
      { text: "Promote only for the approved indication, using approved materials and approved claims.", cite: c(CODE, 2) },
      { text: "Never minimise risk or use unapproved superlatives such as \"safest\" or \"best\".", cite: c(CODE, 5) },
    ] },
    { id: "ce1-b2", type: "check", title: "Quick check", minutes: 3, competencies: ["c-compliance"], check: {
      question: "Which materials may you use with HCPs?", options: ["Anything accurate", "Only approved materials", "Journal articles you find", "Your own slides"], answer: 1,
      rationale: "Only approved materials, for the approved indication.", cite: c(CODE, 2) } },
  ] },
  { id: "ce2", title: "Medical information requests", competency: "c-compliance", tier: "core", minutes: 5, summary: "Handling off-label questions.", blocks: [
    { id: "ce2-b1", type: "lesson", title: "When an HCP asks off-label", minutes: 3, competencies: ["c-compliance"], paragraphs: [
      { text: "Do not answer unsolicited off-label questions. Offer to submit a medical information request on the HCP's behalf.", cite: c(CODE, 6) },
    ] },
    { id: "ce2-b2", type: "check", title: "Quick check", minutes: 2, competencies: ["c-compliance"], check: {
      question: "An HCP asks about an unapproved use. You:", options: ["Answer briefly", "Offer a medical information request", "Ask your manager to answer", "Share a study"], answer: 1,
      rationale: "Offer an MI request.", cite: c(CODE, 6) } },
  ] },
  { id: "ce3", title: "Adverse event reporting", competency: "c-compliance", tier: "core", minutes: 5, summary: "24 hours, every time.", blocks: [
    { id: "ce3-b1", type: "lesson", title: "Report within 24 hours", minutes: 3, competencies: ["c-compliance"], paragraphs: [
      { text: "Any adverse event you hear about, from any source, must be reported to Pharmacovigilance within 24 hours.", cite: c(CODE, 8) },
    ] },
    { id: "ce3-b2", type: "check", title: "Quick check", minutes: 2, competencies: ["c-compliance"], check: {
      question: "You hear about a side effect at lunch with an office manager. You:", options: ["Ignore it, it's informal", "Report it within 24 hours", "Report it at month end", "Tell the HCP to report it"], answer: 1,
      rationale: "Any source, within 24 hours.", cite: c(CODE, 8) } },
  ] },
];

export const AD101_MODULES: Module[] = [
  { id: "ad1", title: "Skin barrier and inflammation", competency: "c-disease", tier: "core", minutes: 7, summary: "Why AD itches and flares.", blocks: [
    { id: "ad1-b1", type: "lesson", title: "The barrier", minutes: 4, competencies: ["c-disease"], paragraphs: [
      { text: "In atopic dermatitis, a disrupted skin barrier lets irritants in and water out, fuelling inflammation.", cite: c(AD, 2) },
      { text: "Type 2 inflammation drives itch, which drives scratching, which further damages the barrier.", cite: c(AD, 3) },
    ] },
    { id: "ad1-b2", type: "check", title: "Quick check", minutes: 3, competencies: ["c-disease"], check: {
      question: "The itch–scratch cycle:", options: ["Repairs the barrier", "Further damages the barrier", "Only affects children", "Is unrelated to inflammation"], answer: 1,
      rationale: "Scratching damages the barrier further.", cite: c(AD, 3) } },
  ] },
  { id: "ad2", title: "Measuring severity", competency: "c-disease", tier: "core", minutes: 6, summary: "EASI, IGA and itch NRS.", blocks: [
    { id: "ad2-b1", type: "keypoints", title: "The scores", minutes: 3, competencies: ["c-disease", "c-efficacy"], points: [
      { text: "EASI scores extent and intensity; EASI-75 means a 75% improvement.", cite: c(AD, 9) },
      { text: "IGA 0/1 means clear or almost clear skin.", cite: c(AD, 9) },
      { text: "Peak itch NRS is a 0–10 patient-reported scale.", cite: c(AD, 10) },
    ] },
    { id: "ad2-b2", type: "check", title: "Quick check", minutes: 3, competencies: ["c-disease"], check: {
      question: "IGA 0/1 means:", options: ["Severe disease", "Clear or almost clear skin", "No itch", "75% improvement"], answer: 1,
      rationale: "IGA 0/1 = clear or almost clear.", cite: c(AD, 9) } },
  ] },
  { id: "ad3", title: "Today's treatment options", competency: "c-competitive", tier: "core", minutes: 6, summary: "From topicals to systemics.", blocks: [
    { id: "ad3-b1", type: "lesson", title: "Step-up care", minutes: 6, competencies: ["c-competitive"], paragraphs: [
      { text: "Care usually steps up from emollients and topical corticosteroids to topical calcineurin inhibitors, then to systemic therapy.", cite: c(AD, 11) },
    ] },
  ] },
];

/* Seeded "In MLR review" course. */
export const NP_MODULES: Module[] = [
  { id: "np1", title: "Working with nurse practitioners", competency: "c-opening", tier: "core", minutes: 5, summary: "Who NPs see and what they need.", blocks: [
    { id: "np1-b1", type: "lesson", title: "NP-led dermatology", minutes: 5, competencies: ["c-opening"], paragraphs: [
      { text: "Many dermatology practices route follow-up AD visits through nurse practitioners.", cite: c(AD, 12) },
      { text: "Open on the follow-up patient who is still flaring despite topicals.", cite: c("src-lum-va", 1) },
    ] },
  ] },
  { id: "np2", title: "Supporting the first injection", competency: "c-dosing", tier: "core", minutes: 6, summary: "Loading dose and training.", blocks: [
    { id: "np2-b1", type: "lesson", title: "Loading dose", minutes: 6, competencies: ["c-dosing"], paragraphs: [
      { text: "The 500 mg loading dose is given as two 250 mg injections at different sites.", cite: c(PI, 2) },
    ] },
  ] },
];

/* Cardexa label update. v1 is live and expiring; v2 is back from MLR with comments. */
export const CARDEXA_V1_MODULES: Module[] = [
  { id: "cx1", title: "Cardexa label essentials", competency: "c-safety", tier: "core", required: true, minutes: 10, summary: "Indication, dosing and safety.", blocks: [
    { id: "cx1-b1", type: "lesson", title: "Indication and dosing", minutes: 5, competencies: ["c-dosing"], paragraphs: [
      { text: "Cardexa reduces the risk of cardiovascular death and hospitalization for heart failure in adults with HFrEF.", cite: c(CPI, 1) },
      { text: "Start at 2.5 mg once daily; titrate to 5 mg after 2 weeks if tolerated.", cite: c(CPI, 2) },
    ] },
    { id: "cx1-b2", type: "keypoints", title: "Safety", minutes: 5, competencies: ["c-safety"], points: [
      { text: "Monitor potassium and renal function at baseline and after titration.", cite: c(CPI, 5) },
      { text: "Most common adverse reactions: dizziness and hyperkalaemia.", cite: c(CPI, 7) },
    ] },
  ] },
];

export const CARDEXA_V2_MODULES: Module[] = [
  { id: "cx2-1", title: "What changed in the October 2026 label", competency: "c-safety", tier: "core", required: true, minutes: 6, summary: "The label update in one page.", blocks: [
    { id: "cx2-1-b1", type: "lesson", title: "Summary of changes", minutes: 6, competencies: ["c-safety"], paragraphs: [
      { text: "A new warning for symptomatic hypotension was added to section 5.", cite: c(CPI, 5) },
      { text: "Renal dosing was updated: in eGFR 20–30, start at 2.5 mg and do not titrate.", cite: c(CPI, 3) },
      { text: "Cardexa is now the preferred option for all heart failure patients.", missing: true },
    ] },
  ] },
  { id: "cx2-2", title: "Updated renal dosing", competency: "c-dosing", tier: "core", minutes: 5, summary: "eGFR thresholds.", blocks: [
    { id: "cx2-2-b1", type: "keypoints", title: "Renal dosing", minutes: 5, competencies: ["c-dosing"], points: [
      { text: "eGFR ≥30: standard titration.", cite: c(CPI, 3) },
      { text: "eGFR 20–30: start at 2.5 mg, do not titrate.", cite: c(CPI, 3) },
      { text: "eGFR <20: not recommended.", cite: c(CPI, 3) },
    ] },
  ] },
  { id: "cx2-3", title: "New warning: symptomatic hypotension", competency: "c-safety", tier: "core", required: true, minutes: 5, summary: "What to say and when.", blocks: [
    { id: "cx2-3-b1", type: "lesson", title: "Hypotension", minutes: 5, competencies: ["c-safety"], paragraphs: [
      { text: "Symptomatic hypotension may occur, especially in patients who are volume-depleted or on high-dose diuretics.", cite: c(CPI, 5) },
      { text: "Correct volume status before starting Cardexa.", cite: c(CPI, 5) },
    ] },
  ] },
  { id: "cx2-4", title: "Fair balance after the update", competency: "c-safety", tier: "core", minutes: 4, summary: "Updated ISI delivery.", blocks: [
    { id: "cx2-4-b1", type: "lesson", title: "Updated ISI", minutes: 4, competencies: ["c-safety", "c-compliance"], paragraphs: [
      { text: "Include the new hypotension warning whenever you present the updated important safety information.", cite: c(CVA, 9) },
    ] },
  ] },
];

export const CARDEXA_ITEMS: Item[] = [
  { id: "cx-i1", competency: "c-safety", pool: "assessment", difficulty: 2, question: "Which warning was added in the October 2026 label?", options: ["Hepatotoxicity", "Symptomatic hypotension", "QT prolongation", "Angioedema"], answer: 1, rationale: "Symptomatic hypotension was added to section 5.", cite: c(CPI, 5) },
  { id: "cx-i2", competency: "c-dosing", pool: "assessment", difficulty: 2, question: "For eGFR 20–30, the updated label says:", options: ["Standard titration", "Start at 2.5 mg, do not titrate", "Not recommended", "Double the dose"], answer: 1, rationale: "Start at 2.5 mg and do not titrate.", cite: c(CPI, 3) },
];

/* Template the AI "generates" in the new-course wizard. It deliberately ships with
   one uncited sentence and one superlative so the pre-review checks have work to do. */
export function generatedAccessModules(prefix: string): Module[] {
  return [
    { id: `${prefix}-m1`, title: "Why access objections come up", competency: "c-access", tier: "core", minutes: 17, summary: "What offices are really worried about.", blocks: [
      { id: `${prefix}-m1-v0`, type: "video", title: "Access webinar (recorded, 12 min)", minutes: 12, competencies: ["c-access"], video: VIDEO_WEBINAR },
      { id: `${prefix}-m1-b1`, type: "lesson", title: "The office's view", minutes: 3, competencies: ["c-access"], paragraphs: [
        { text: "Most commercial plans require prior authorization documenting an inadequate response to at least one topical prescription therapy.", cite: c(PAY, 2) },
        { text: "For many offices, the burden is staff time spent on paperwork, not the decision to prescribe.", cite: c(OBJ, 2) },
        { text: "Patients usually get approved within a few days once the Hub is involved.", missing: true },
      ] },
      { id: `${prefix}-m1-b2`, type: "check", title: "Quick check", minutes: 2, competencies: ["c-access"], check: {
        question: "What do most commercial plans require for Lumora?", options: ["Nothing", "PA documenting inadequate response to a topical prescription therapy", "A biopsy", "Two years on a JAK"], answer: 1,
        rationale: "PA documenting an inadequate topical response.", cite: c(PAY, 2) } },
    ] },
    { id: `${prefix}-m2`, title: "Responding with the Access Hub", competency: "c-objections", tier: "core", minutes: 6, summary: "Acknowledge, describe the Hub, never promise coverage.", blocks: [
      { id: `${prefix}-m2-b1`, type: "lesson", title: "The approved response", minutes: 4, competencies: ["c-objections", "c-access"], paragraphs: [
        { text: "Acknowledge the burden first. Then describe the Corvana Access Hub: benefits verification and PA support for the office.", cite: c(OBJ, 2) },
        { text: "The Hub is the best support program in dermatology.", cite: c(PAY, 3) },
        { text: "Eligible commercially insured patients may pay as little as $0 per fill. Government-insured patients are not eligible.", cite: c(PAY, 4) },
      ] },
      { id: `${prefix}-m2-b2`, type: "flashcards", title: "Say this", minutes: 2, competencies: ["c-objections"], cards: [
        { front: "\"The PA paperwork kills my staff.\"", back: "\"I hear you. The Access Hub runs benefits verification and prepares PA support for your office.\"", cite: c(OBJ, 2) },
        { front: "\"Will it be covered?\"", back: "\"I can't promise coverage, but the Hub will confirm eligibility within 2 business days.\"", cite: c(PAY, 6) },
      ] },
    ] },
    { id: `${prefix}-m3`, title: "Keeping it balanced", competency: "c-safety", tier: "core", required: true, minutes: 4, summary: "Safety belongs in every access conversation too.", blocks: [
      { id: `${prefix}-m3-b1`, type: "lesson", title: "Fair balance", minutes: 4, competencies: ["c-safety"], paragraphs: [
        { text: "Whenever you discuss efficacy, present the important safety information with comparable prominence.", cite: c("src-code", 4) },
        { text: "Most common adverse reactions include conjunctivitis (9% vs 3%) and injection-site reactions (6% vs 2%).", cite: c(PI, 6) },
      ] },
    ] },
    { id: `${prefix}-m4`, title: "Practise: Dr. Marcus Kim", competency: "c-objections", tier: "core", minutes: 6, summary: "A cost-focused follow-up call.", blocks: [
      { id: `${prefix}-m4-b1`, type: "scenario", title: "Dr. Marcus Kim · follow-up call", minutes: 6, competencies: ["c-objections", "c-access"], scenarioId: "sc-kim" },
    ] },
  ];
}

/* Generic first draft for any product without a hand-written template: the approved indication,
   the presentations, and safety in balance. Every sentence cites the product's PI. */
export function genericProductModules(prefix: string, p: Product, indications: string[], variants: string[] = []): Module[] {
  const PI = p.piSourceId;
  const offered = variants.length ? p.indications.filter((i) => !i.variants?.length || i.variants.some((v) => variants.includes(v))) : p.indications;
  const inPlay = indications.length ? offered.filter((i) => indications.includes(i.short)) : offered;
  const shownVariants = variants.length ? variants : p.variants;
  return [
    { id: `${prefix}-m1`, title: `What ${p.brand} is approved for`, competency: "c-efficacy", tier: "core", minutes: 5, summary: "The indication, word for word.", blocks: [
      { id: `${prefix}-m1-b1`, type: "lesson", title: "The approved indication", minutes: 3, competencies: ["c-efficacy", "c-compliance"], paragraphs: [
        ...inPlay.map((i) => ({ text: `${p.brand} (${p.generic}) is indicated for: ${i.full}`, cite: c(PI, 1) })),
        { text: "Promote only within this wording. Questions about any other use go to Medical Information.", cite: c(CODE, 6) },
      ] },
      { id: `${prefix}-m1-b2`, type: "check", title: "Quick check", minutes: 2, competencies: ["c-compliance"], check: {
        question: `An HCP asks about using ${p.brand} outside its approved indication. You:`, options: ["Share what other reps have heard", "Offer a medical information request", "Say it's probably fine", "Change the subject"], answer: 1,
        rationale: "Off-label questions go to Medical Information.", cite: c(CODE, 6) } },
    ] },
    { id: `${prefix}-m2`, title: "Presentations and dosing basics", competency: "c-dosing", tier: "core", minutes: 4, summary: "What's available and where the dosing lives.", blocks: [
      { id: `${prefix}-m2-b1`, type: "keypoints", title: "Presentations", minutes: 4, competencies: ["c-dosing"], points: [
        { text: `${p.brand} is available as: ${shownVariants.join("; ")}.`, cite: c(PI, 2) },
        { text: `${p.form}. Dosing for each presentation is in section 2 of the Prescribing Information.`, cite: c(PI, 2) },
      ] },
    ] },
    { id: `${prefix}-m3`, title: "Safety in balance", competency: "c-safety", tier: "core", required: true, minutes: 4, summary: "Required for everyone.", blocks: [
      { id: `${prefix}-m3-b1`, type: "lesson", title: "Fair balance", minutes: 4, competencies: ["c-safety"], paragraphs: [
        { text: "Whenever you discuss efficacy, present the important safety information with comparable prominence.", cite: c(CODE, 4) },
        { text: `Know section 5 (Warnings and precautions) and section 6 (Adverse reactions) of the ${p.brand} PI before every call.`, cite: c(PI, 4) },
      ] },
    ] },
  ];
}

export function genericProductItems(prefix: string, p: Product): Item[] {
  const PI = p.piSourceId;
  const first = p.indications[0];
  const wrong = ["Any adult patient who asks for it", "Pediatric patients of any age", "Prevention in healthy adults"];
  return [
    { id: `${prefix}-i1`, competency: "c-efficacy", pool: "screening", difficulty: 2, question: `${p.brand} is indicated for:`, options: [first.short, ...wrong], answer: 0, rationale: first.full, cite: c(PI, 1) },
    { id: `${prefix}-i2`, competency: "c-dosing", pool: "screening", difficulty: 1, question: `Where is ${p.brand}'s dosing for each presentation?`, options: ["The visual aid", "Section 2 of the PI", "The payer guide", "Your manager"], answer: 1, rationale: "Dosing is in section 2 of the Prescribing Information.", cite: c(PI, 2) },
    { id: `${prefix}-i3`, competency: "c-safety", pool: "assessment", difficulty: 2, question: "When you discuss efficacy, safety information should be:", options: ["Mentioned if asked", "Presented with comparable prominence", "Left to the PI", "Summarised as 'well tolerated'"], answer: 1, rationale: "Fair balance requires comparable prominence.", cite: c(CODE, 4) },
    { id: `${prefix}-i4`, competency: "c-compliance", pool: "assessment", difficulty: 1, question: "Off-label questions from HCPs go to:", options: ["Your manager", "Medical Information", "Marketing", "The Access Hub"], answer: 1, rationale: "Medical Information handles unsolicited off-label questions.", cite: c(CODE, 6) },
  ];
}

/** Extra depth for long courses, from the same approved sources. Lumora reuses its launch course; other products go deeper into their PI. */
export function depthModules(prefix: string, p: Product | undefined, launch: Module[] = []): Module[] {
  const reId = (m: Module, i: number): Module => ({ ...m, id: `${prefix}-d${i + 1}`, blocks: m.blocks.map((b, j) => ({ ...b, id: `${prefix}-d${i + 1}-b${j + 1}` })) });
  if (!p || p.id === "p-lumora") return launch.map(reId);
  const PI = p.piSourceId;
  const first = p.indications[0];
  return [
    { id: "", title: `The patient ${p.brand} is for`, competency: "c-disease", tier: "core", minutes: 5, summary: "Who the label describes, and who it doesn't.", blocks: [
      { id: "", type: "lesson", title: "The patient in the label", minutes: 5, competencies: ["c-disease", "c-efficacy"], paragraphs: [
        { text: `Section 1 of the ${p.brand} PI defines the patient: ${first?.full ?? "see the approved indication"}`, cite: c(PI, 1) },
        { text: "Open every call on that patient type. Patients outside it are an off-label conversation.", cite: c(CODE, 3) },
      ] },
    ] },
    { id: "", title: "Dosing in detail", competency: "c-dosing", tier: "reinforcement", minutes: 6, summary: "Every presentation, and where special populations live.", blocks: [
      { id: "", type: "keypoints", title: "Dosing, section by section", minutes: 4, competencies: ["c-dosing"], points: [
        { text: `Section 2 gives the dose for each presentation: ${p.variants.join(", ") || "see the PI"}.`, cite: c(PI, 2) },
        { text: "Section 8 covers use in specific populations. Questions about them go to Medical Information.", cite: c(PI, 8) },
      ] },
      { id: "", type: "check", title: "Quick check", minutes: 2, competencies: ["c-dosing"], check: {
        question: `An HCP asks about ${p.brand} in a population section 8 says hasn't been studied. You:`, options: ["Give your best estimate", "Offer a Medical Information request", "Say it's probably fine", "Change the subject"], answer: 1,
        rationale: "Anything beyond the label goes to Medical Information.", cite: c(CODE, 6) } },
    ] },
    { id: "", title: "Warnings and adverse reactions", competency: "c-safety", tier: "core", required: true, minutes: 6, summary: "Sections 5 and 6, stated as written.", blocks: [
      { id: "", type: "lesson", title: "Safety, word for word", minutes: 6, competencies: ["c-safety"], paragraphs: [
        { text: `Section 5 of the ${p.brand} PI lists the warnings and precautions. State them as written, without softening.`, cite: c(PI, 5) },
        { text: "Section 6 lists adverse reactions. Quote frequencies exactly as they appear in the label.", cite: c(PI, 6) },
      ] },
    ] },
    { id: "", title: "The first questions HCPs ask", competency: "c-objections", tier: "reinforcement", minutes: 5, summary: "Acknowledge, answer from the label, offer Medical Information.", blocks: [
      { id: "", type: "keypoints", title: "A safe pattern", minutes: 5, competencies: ["c-objections", "c-compliance"], points: [
        { text: "Acknowledge the question before you answer it.", cite: c(CODE, 3) },
        { text: "Answer only from the approved label and materials. For anything else, offer a Medical Information request.", cite: c(CODE, 6) },
      ] },
    ] },
  ].map((m, i) => reId(m as Module, i));
}
