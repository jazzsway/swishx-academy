import type { Competency, Division, Domain, District, Product, Region, Source } from "./types";

/* Corvana Therapeutics is fictional. So are Lumora, Cardexa, every person and every number. */

export const ORG = {
  name: "Corvana Therapeutics",
  short: "Corvana",
  fictional: true,
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

export const COMPETENCIES: Competency[] = [
  { id: "c-disease", name: "Atopic dermatitis & unmet need", domain: "disease", description: "Pathophysiology, burden and why moderate-to-severe patients stay uncontrolled." },
  { id: "c-moa", name: "Mechanism of action", domain: "clinical", description: "How relvokimab works, in plain HCP language." },
  { id: "c-efficacy", name: "Efficacy data", domain: "clinical", description: "LUMEN-1/2 and LUMEN-EXT results, stated exactly as approved." },
  { id: "c-dosing", name: "Dosing & administration", domain: "safety", description: "Loading dose, maintenance, missed doses, storage, special populations." },
  { id: "c-safety", name: "Safety & fair balance", domain: "safety", description: "Contraindication, warnings, adverse reactions, and delivering them in balance." },
  { id: "c-competitive", name: "Competitive landscape", domain: "competitive", description: "Where Lumora fits without making unapproved comparative claims." },
  { id: "c-access", name: "Access & prior authorization", domain: "access", description: "Coverage, PA criteria, and the Corvana Access Hub." },
  { id: "c-opening", name: "Opening & needs discovery", domain: "conversation", description: "Opening on the right patient type and asking good questions." },
  { id: "c-objections", name: "Objection handling", domain: "conversation", description: "Handling the top HCP objections with approved responses." },
  { id: "c-compliance", name: "Promotional compliance", domain: "compliance", description: "On-label only, medical information requests, adverse event reporting." },
];

export const competency = (id: string) => COMPETENCIES.find((c) => c.id === id)!;
export const domainOf = (competencyId: string) => DOMAINS.find((d) => d.id === competency(competencyId)?.domain)!;

export const DIVISIONS: Division[] = [
  { id: "div-imm", name: "Immunology", therapyArea: "Dermatology" },
  { id: "div-cm", name: "Cardiometabolic", therapyArea: "Cardiology" },
];

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

export const PRODUCTS: Product[] = [
  {
    id: "p-lumora",
    brand: "Lumora",
    generic: "relvokimab",
    divisionId: "div-imm",
    therapyArea: "Dermatology",
    piSourceId: "src-lum-pi",
    indications: [
      {
        short: "Atopic dermatitis (adults)",
        full: "Treatment of adults with moderate-to-severe atopic dermatitis whose disease is not adequately controlled with topical prescription therapies or when those therapies are not advisable. Lumora can be used with or without topical corticosteroids.",
      },
    ],
  },
  {
    id: "p-cardexa",
    brand: "Cardexa",
    generic: "feravistat",
    divisionId: "div-cm",
    therapyArea: "Cardiology",
    piSourceId: "src-cdx-pi",
    indications: [
      {
        short: "HFrEF (adults)",
        full: "To reduce the risk of cardiovascular death and hospitalization for heart failure in adults with chronic heart failure with reduced ejection fraction (NYHA class II–IV).",
      },
    ],
  },
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
];

export const source = (id: string) => SOURCES.find((s) => s.id === id);
