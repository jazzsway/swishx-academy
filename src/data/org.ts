import type { Competency, Domain, District, Region, Source } from "./types";
import { DIVISIONS, PRODUCTS, PRODUCT_PI_SOURCES } from "./products";

export { DIVISIONS, PRODUCTS };

/* Corvana Therapeutics is fictional. So are Lumora, Cardexa, every person and every number. */

export const ORG = {
  name: "Corvana Therapeutics",
  short: "Corvana",
  fictional: true,
  /** When the SwishX team last loaded the field structure from the client's org chart. */
  structureUpdatedAt: "2026-10-02",
};

/** The prototype runs on a fixed "today" so the demo story (due dates, expiry, overdue) never drifts. */
export const TODAY = new Date("2026-11-06T09:00:00");
export const TODAY_ISO = TODAY.toISOString();

export const DOMAINS: Domain[] = [
  { id: "disease", name: "Disease state", short: "Disease" },
  { id: "clinical", name: "Product & clinical", short: "Clinical" },
  { id: "safety", name: "Label & safety", short: "Safety" },
  { id: "competitive", name: "Competitive landscape", short: "Competitive" },
  { id: "access", name: "Access & reimbursement", short: "Access" },
  { id: "conversation", name: "HCP conversation", short: "Conversation" },
  { id: "compliance", name: "Compliance", short: "Compliance" },
];

/* Skills, not products: the same framework measures every course. Product specifics live in the courses. */
export const COMPETENCIES: Competency[] = [
  { id: "c-disease", name: "Disease state & unmet need", domain: "disease", description: "The condition, its burden, and why patients stay uncontrolled on current treatment." },
  { id: "c-moa", name: "Mechanism of action", domain: "clinical", description: "How the product works, in plain HCP language." },
  { id: "c-efficacy", name: "Clinical data", domain: "clinical", description: "Trial design and results, stated exactly as approved." },
  { id: "c-dosing", name: "Dosing & administration", domain: "safety", description: "Starting and maintenance dosing, missed doses, storage and special populations." },
  { id: "c-safety", name: "Safety & fair balance", domain: "safety", description: "Contraindications, warnings, adverse reactions, and delivering them in balance." },
  { id: "c-competitive", name: "Competitive landscape", domain: "competitive", description: "Where the product fits without making unapproved comparative claims." },
  { id: "c-access", name: "Access & prior authorization", domain: "access", description: "Coverage, prior authorization criteria and patient support programs." },
  { id: "c-opening", name: "Opening & needs discovery", domain: "conversation", description: "Opening on the right patient type and asking good questions." },
  { id: "c-objections", name: "Objection handling", domain: "conversation", description: "Handling the top HCP objections with approved responses." },
  { id: "c-compliance", name: "Promotional compliance", domain: "compliance", description: "On-label only, medical information requests, adverse event reporting." },
];

export const competency = (id: string) => COMPETENCIES.find((c) => c.id === id)!;
export const domainOf = (competencyId: string) => DOMAINS.find((d) => d.id === competency(competencyId)?.domain)!;



export const REGIONS: Region[] = [
  { id: "reg-east", name: "East", divisionId: "div-imm" },
  { id: "reg-central", name: "Central", divisionId: "div-imm" },
  { id: "reg-south", name: "South", divisionId: "div-imm" },
  { id: "reg-west", name: "West", divisionId: "div-imm" },
  { id: "reg-atl", name: "Atlantic", divisionId: "div-cm" },
  { id: "reg-pac", name: "Pacific", divisionId: "div-cm" },
];

/* managerId is filled in by the user generator. */
export const DISTRICTS: Omit<District, "managerId">[] = [
  { id: "d-northeast", name: "Northeast", regionId: "reg-east" },
  { id: "d-midatlantic", name: "Mid-Atlantic", regionId: "reg-east" },
  { id: "d-newengland", name: "New England", regionId: "reg-east" },
  { id: "d-greatlakes", name: "Great Lakes", regionId: "reg-central" },
  { id: "d-plains", name: "Plains", regionId: "reg-central" },
  { id: "d-ohiovalley", name: "Ohio Valley", regionId: "reg-central" },
  { id: "d-gulf", name: "Gulf Coast", regionId: "reg-south" },
  { id: "d-southeast", name: "Southeast", regionId: "reg-south" },
  { id: "d-texas", name: "Texas", regionId: "reg-south" },
  { id: "d-pacificnw", name: "Pacific NW", regionId: "reg-west" },
  { id: "d-socal", name: "SoCal", regionId: "reg-west" },
  { id: "d-mountain", name: "Mountain", regionId: "reg-west" },
  { id: "d-carolinas", name: "Carolinas", regionId: "reg-atl" },
  { id: "d-chesapeake", name: "Chesapeake", regionId: "reg-atl" },
  { id: "d-bay", name: "Bay Area", regionId: "reg-pac" },
  { id: "d-desert", name: "Desert", regionId: "reg-pac" },
];


export const product = (id?: string) => PRODUCTS.find((p) => p.id === id);

export const SOURCES: Source[] = [
  { id: "src-lum-pi", title: "Lumora Prescribing Information", type: "Prescribing Information", pages: 18, docNumber: "LUM-US-0101", productId: "p-lumora" },
  { id: "src-lum-va", title: "Lumora core visual aid", type: "Visual aid", pages: 12, docNumber: "LUM-US-0188", productId: "p-lumora" },
  { id: "src-lum-p3", title: "LUMEN-1 & LUMEN-2 clinical summary", type: "Clinical summary", pages: 9, docNumber: "LUM-US-0172", productId: "p-lumora" },
  { id: "src-lum-obj", title: "Lumora objection handler", type: "Objection handler", pages: 8, docNumber: "LUM-US-0204", productId: "p-lumora" },
  { id: "src-lum-payer", title: "Corvana Access Hub payer guide", type: "Payer guide", pages: 6, docNumber: "LUM-US-0211", productId: "p-lumora" },
  { id: "src-ad-guide", title: "Atopic dermatitis disease-state guide", type: "Clinical summary", pages: 14, docNumber: "CORV-US-0090" },
  { id: "src-code", title: "Corvana promotional compliance policy", type: "Policy", pages: 10, docNumber: "CORV-US-0010" },
  { id: "src-cdx-pi", title: "Cardexa Prescribing Information (rev. 10/2026)", type: "Prescribing Information", pages: 22, docNumber: "CDX-US-0398", productId: "p-cardexa" },
  { id: "src-cdx-va", title: "Cardexa visual aid", type: "Visual aid", pages: 10, docNumber: "CDX-US-0405", productId: "p-cardexa" },
  ...PRODUCT_PI_SOURCES,
];

/* Trainer uploads live in the app store; it registers them here so every lookup finds them. */
const UPLOADS: Source[] = [];
export function registerUploads(list: Source[]) {
  UPLOADS.splice(0, UPLOADS.length, ...list);
}

export const source = (id: string) => SOURCES.find((s) => s.id === id) ?? UPLOADS.find((s) => s.id === id);

/** Approved means it carries an MLR document number. Uploads don't, until MLR approves them. */
export const isApproved = (s?: Source) => !!s?.docNumber && !s.uploaded;
