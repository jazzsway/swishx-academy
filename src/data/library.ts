import type { Material } from "./types";

/* Standalone Library items. Playlists only order approved blocks from published courses;
   graphics and readings are approved pieces with their own doc numbers. All fictional. */

export const SEED_MATERIALS: Material[] = [
  {
    id: "mt-launch-week", kind: "playlist", title: "Lumora launch week", productId: "p-lumora", visibility: "audience",
    description: "The five videos and walkthroughs to watch before your first Lumora call.",
    items: [
      { courseId: "c-lumora-launch", blockId: "lm3-b2" },
      { courseId: "c-lumora-launch", blockId: "lm4-v1" },
      { courseId: "c-lumora-launch", blockId: "lm7-v1" },
      { courseId: "c-lumora-launch", blockId: "lm13-va1" },
      { courseId: "c-lumora-launch", blockId: "lm14-v1" },
    ],
    createdAt: "2026-09-16", ownerId: "u-maya",
  },
  {
    id: "mt-objections", kind: "playlist", title: "Top objections in 10 minutes", productId: "p-lumora", visibility: "audience",
    description: "The model call, the approved responses and what payers ask for.",
    items: [
      { courseId: "c-lumora-launch", blockId: "lm14-v1" },
      { courseId: "c-lumora-launch", blockId: "lm14-b1" },
      { courseId: "c-lumora-launch", blockId: "lm11-d1" },
      { courseId: "c-lumora-launch", blockId: "lm11-a1" },
    ],
    createdAt: "2026-10-02", ownerId: "u-maya",
  },
  {
    id: "mt-glance", kind: "graphic", title: "Lumora at a glance", productId: "p-lumora", visibility: "audience", docNumber: "LUM-US-0242", expiresAt: "2027-09-08",
    description: "The approved numbers on one page.",
    block: {
      id: "mt-glance-b", type: "graphic", title: "Lumora at a glance", minutes: 1, competencies: ["c-efficacy", "c-safety", "c-dosing"],
      graphic: {
        headline: "Lumora (relvokimab) for adults with moderate-to-severe atopic dermatitis",
        stats: [{ value: "51% vs 17%", label: "EASI-75 at week 16" }, { value: "36% vs 10%", label: "Clear or almost clear (IGA 0/1)" }, { value: "44% vs 13%", label: "≥4-point itch improvement" }],
        points: ["500 mg loading dose, then 250 mg every 2 weeks; every 4 weeks after week 16 for clear or almost clear skin.", "Contraindicated with known hypersensitivity to relvokimab or excipients.", "Most common adverse reactions include conjunctivitis (9% vs 3%) and injection-site reactions (6% vs 2%)."],
        footnote: "Pooled LUMEN-1 and LUMEN-2, week 16. See the Prescribing Information. For internal training use only.",
        sourceId: "src-lum-pi",
      },
    },
    createdAt: "2026-09-15", ownerId: "u-maya",
  },
  {
    id: "mt-hub", kind: "graphic", title: "The Access Hub in 4 steps", productId: "p-lumora", visibility: "audience", docNumber: "LUM-US-0245", expiresAt: "2027-09-08",
    description: "What happens after an office enrols a patient.",
    block: {
      id: "mt-hub-b", type: "graphic", title: "The Access Hub in 4 steps", minutes: 1, competencies: ["c-access"],
      graphic: {
        headline: "From enrolment to first fill",
        stats: [{ value: "1 form", label: "To enrol" }, { value: "2 days", label: "Benefits confirmed (business days)" }, { value: "$0", label: "Copay for eligible commercially insured" }],
        points: ["The office enrols the patient with one form.", "The Hub runs benefits verification.", "The Hub prepares PA support for the office.", "Eligible commercially insured patients may use the copay program. Government-insured patients are not eligible."],
        footnote: "Never promise coverage. Let the Hub confirm eligibility.",
        sourceId: "src-lum-payer",
      },
    },
    createdAt: "2026-09-20", ownerId: "u-maya",
  },
  {
    id: "mt-ad-burden", kind: "graphic", title: "Atopic dermatitis: the burden", visibility: "audience", docNumber: "CORV-US-0120", expiresAt: "2027-03-02",
    description: "Disease-state facts for opening on the patient.",
    block: {
      id: "mt-ad-burden-b", type: "graphic", title: "Atopic dermatitis: the burden", minutes: 1, competencies: ["c-disease"],
      graphic: {
        headline: "Atopic dermatitis is chronic, relapsing and hard to control",
        stats: [{ value: "1 in 4", label: "Adults with AD have moderate-to-severe disease" }, { value: "#1", label: "Itch is the most burdensome symptom" }],
        points: ["Type 2 inflammation and a disrupted skin barrier drive the itch–scratch cycle.", "Flares often settle before a visit, so ask about the last month."],
        sourceId: "src-ad-guide",
      },
    },
    createdAt: "2026-03-04", ownerId: "u-maya",
  },
  {
    id: "mt-pi", kind: "reading", title: "Lumora Prescribing Information", productId: "p-lumora", visibility: "audience", docNumber: "LUM-US-0101",
    description: "Read the full label in-app: indication, dosing, warnings, adverse reactions, clinical studies.",
    block: { id: "mt-pi-b", type: "document", title: "Lumora Prescribing Information", minutes: 10, competencies: ["c-safety", "c-dosing", "c-efficacy"],
      document: { sourceId: "src-lum-pi", pages: [1, 2, 3, 4, 5, 6, 9, 11, 12, 13, 16], callouts: [{ page: 1, text: "The indication wording is exactly what you may say." }] } },
    createdAt: "2026-09-15", ownerId: "u-maya",
  },
  {
    id: "mt-payer", kind: "reading", title: "Corvana Access Hub payer guide", productId: "p-lumora", visibility: "audience", docNumber: "LUM-US-0211",
    description: "Coverage, prior authorization and the copay program.",
    block: { id: "mt-payer-b", type: "document", title: "Access Hub payer guide", minutes: 3, competencies: ["c-access"], document: { sourceId: "src-lum-payer", pages: [2, 3, 4], callouts: [] } },
    createdAt: "2026-09-15", ownerId: "u-maya",
  },
  {
    id: "mt-va", kind: "visualaid", title: "Lumora core visual aid: walkthrough", productId: "p-lumora", visibility: "audience", docNumber: "LUM-US-0188",
    description: "Page by page: what to say, what to avoid.",
    items: [{ courseId: "c-lumora-launch", blockId: "lm13-va1" }],
    createdAt: "2026-09-15", ownerId: "u-maya",
  },
  {
    id: "mt-cdx", kind: "graphic", title: "Cardexa: what changed in October 2026", productId: "p-cardexa", visibility: "audience", docNumber: "CDX-US-0433", expiresAt: "2027-11-06",
    description: "The label update on one page.",
    block: { id: "mt-cdx-b", type: "graphic", title: "Cardexa label update", minutes: 1, competencies: ["c-safety"],
      graphic: { headline: "October 2026 label update", stats: [{ value: "New", label: "Symptomatic hypotension warning" }, { value: "eGFR 20–30", label: "Start 2.5 mg, do not titrate" }], points: ["Correct volume status before starting Cardexa.", "Include the new warning whenever you present the safety information."], sourceId: "src-cdx-pi" } },
    createdAt: "2026-11-05", ownerId: "u-maya",
  },
];

/** Aggregate Library analytics (counts only). Real views in the demo are added on top. */
export const SEED_LIBRARY_VIEWS: Record<string, number> = {
  "mt-launch-week": 214, "mt-objections": 167, "mt-glance": 301, "mt-hub": 122, "mt-ad-burden": 58, "mt-pi": 96, "mt-payer": 71, "mt-va": 143,
  "c-lumora-launch": 188, "c-ad101": 64, "c-compliance": 40,
};

export const SEED_SEARCHES: { q: string; results: number; count: number }[] = [
  { q: "pediatric", results: 0, count: 14 },
  { q: "jak comparison", results: 0, count: 9 },
  { q: "price", results: 0, count: 6 },
  { q: "dosing", results: 7, count: 41 },
  { q: "conjunctivitis", results: 4, count: 23 },
];
