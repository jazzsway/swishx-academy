import type { Division, Product, Source } from "./types";

/* Corvana's fictional portfolio. Every brand, molecule and indication here is invented
   for the prototype; wording is written in the style of a US label, not copied from one. */

export const DIVISIONS: Division[] = [
  { id: "div-imm", name: "Immunology", therapyArea: "Dermatology" },
  { id: "div-cm", name: "Cardiometabolic", therapyArea: "Cardiology" },
  { id: "div-onc", name: "Oncology", therapyArea: "Oncology" },
  { id: "div-neuro", name: "Neuroscience", therapyArea: "Neurology" },
  { id: "div-resp", name: "Respiratory", therapyArea: "Pulmonology" },
  { id: "div-rare", name: "Rare Disease", therapyArea: "Rare disease" },
  { id: "div-vac", name: "Vaccines", therapyArea: "Infectious disease" },
];

const g = (a: string, b: string) => `linear-gradient(150deg, ${a}, ${b})`;

type P = Omit<Product, "piSourceId" | "therapyAreas"> & { therapyAreas?: string[] };

const RAW: P[] = [
  /* ── Immunology ── */
  { id: "p-lumora", brand: "Lumora", generic: "relvokimab", divisionId: "div-imm", therapyArea: "Dermatology", form: "Subcutaneous injection", status: "Launch",
    variants: ["250 mg/2 mL pen", "250 mg/2 mL prefilled syringe"], gradient: g("#b82f0c", "#ff8a4c"),
    indications: [{ short: "Atopic dermatitis (adults)", therapyAreas: ["Dermatology"], full: "Treatment of adults with moderate-to-severe atopic dermatitis whose disease is not adequately controlled with topical prescription therapies or when those therapies are not advisable. Lumora can be used with or without topical corticosteroids." }] },
  { id: "p-psorivex", brand: "Psorivex", generic: "darlekumab", divisionId: "div-imm", therapyArea: "Dermatology", form: "Subcutaneous injection", status: "Marketed",
    variants: ["100 mg pen", "100 mg prefilled syringe"], gradient: g("#7a1f06", "#fd4816"),
    indications: [
      { short: "Plaque psoriasis", therapyAreas: ["Dermatology"], full: "Treatment of adults with moderate-to-severe plaque psoriasis who are candidates for systemic therapy or phototherapy." },
      { short: "Psoriatic arthritis", therapyAreas: ["Rheumatology"], full: "Treatment of adults with active psoriatic arthritis." },
    ] },
  { id: "p-arthelis", brand: "Arthelis", generic: "tofavinib", divisionId: "div-imm", therapyArea: "Rheumatology", form: "Oral tablet", status: "Marketed",
    variants: ["5 mg tablet", "11 mg extended-release tablet"], gradient: g("#5b21b6", "#a78bfa"),
    indications: [
      { short: "Rheumatoid arthritis", therapyAreas: ["Rheumatology"], full: "Treatment of adults with moderately to severely active rheumatoid arthritis who have had an inadequate response or intolerance to one or more TNF blockers." },
      { short: "Psoriatic arthritis", therapyAreas: ["Rheumatology"], full: "Treatment of adults with active psoriatic arthritis who have had an inadequate response or intolerance to one or more TNF blockers." },
      { short: "Ulcerative colitis", therapyAreas: ["Gastroenterology"], variants: ["11 mg extended-release tablet"], isNew: true, full: "Treatment of adults with moderately to severely active ulcerative colitis who have had an inadequate response or intolerance to one or more TNF blockers." },
    ] },
  { id: "p-colivant", brand: "Colivant", generic: "mirezumab", divisionId: "div-imm", therapyArea: "Gastroenterology", form: "IV infusion / subcutaneous", status: "Marketed",
    variants: ["300 mg IV vial", "200 mg SC pen"], gradient: g("#0f766e", "#5eead4"),
    indications: [
      { short: "Crohn's disease", therapyAreas: ["Gastroenterology"], full: "Treatment of adults with moderately to severely active Crohn's disease." },
      { short: "Ulcerative colitis", therapyAreas: ["Gastroenterology"], full: "Treatment of adults with moderately to severely active ulcerative colitis." },
    ] },
  /* ── Cardiometabolic ── */
  { id: "p-cardexa", brand: "Cardexa", generic: "feravistat", divisionId: "div-cm", therapyArea: "Cardiology", form: "Oral tablet", status: "Marketed",
    variants: ["2.5 mg tablet", "5 mg tablet"], gradient: g("#9f3a38", "#f97066"),
    indications: [{ short: "HFrEF (adults)", therapyAreas: ["Cardiology"], full: "To reduce the risk of cardiovascular death and hospitalization for heart failure in adults with chronic heart failure with reduced ejection fraction (NYHA class II–IV)." }] },
  { id: "p-glyvanta", brand: "Glyvanta", generic: "sotaglinide", divisionId: "div-cm", therapyArea: "Endocrinology", form: "Oral tablet", status: "Marketed",
    variants: ["10 mg tablet", "25 mg tablet"], gradient: g("#1d4ed8", "#60a5fa"),
    indications: [
      { short: "Type 2 diabetes (glycemic control)", therapyAreas: ["Endocrinology"], full: "As an adjunct to diet and exercise to improve glycemic control in adults with type 2 diabetes mellitus." },
      { short: "CKD in type 2 diabetes", therapyAreas: ["Nephrology"], isNew: true, full: "To reduce the risk of sustained eGFR decline and end-stage kidney disease in adults with chronic kidney disease associated with type 2 diabetes." },
    ] },
  { id: "p-lipora", brand: "Lipora", generic: "ezelimab", divisionId: "div-cm", therapyArea: "Cardiology", form: "Subcutaneous injection", status: "Marketed",
    variants: ["140 mg pen"], gradient: g("#b45309", "#fbbf24"),
    indications: [{ short: "Primary hyperlipidemia", therapyAreas: ["Cardiology"], full: "As an adjunct to diet, alone or in combination with other LDL-C-lowering therapies, to reduce LDL-C in adults with primary hyperlipidemia, including heterozygous familial hypercholesterolemia." }] },
  { id: "p-renalto", brand: "Renalto", generic: "verastiran", divisionId: "div-cm", therapyArea: "Nephrology", form: "Subcutaneous injection", status: "Launch",
    variants: ["284 mg prefilled syringe"], gradient: g("#155e75", "#22d3ee"),
    indications: [{ short: "IgA nephropathy", therapyAreas: ["Nephrology"], full: "To reduce proteinuria in adults with primary immunoglobulin A nephropathy at risk of rapid disease progression." }] },
  /* ── Oncology ── */
  { id: "p-onkavia", brand: "Onkavia", generic: "zelarotinib", divisionId: "div-onc", therapyArea: "Oncology", form: "Oral tablet", status: "Marketed",
    variants: ["40 mg tablet", "80 mg tablet"], gradient: g("#7c2d12", "#fb923c"),
    indications: [
      { short: "EGFR+ NSCLC, first line", therapyAreas: ["Oncology"], full: "First-line treatment of adults with metastatic non-small cell lung cancer whose tumors have EGFR exon 19 deletions or exon 21 L858R mutations, as detected by an FDA-approved test." },
      { short: "EGFR+ NSCLC, adjuvant", therapyAreas: ["Oncology"], isNew: true, full: "As adjuvant therapy after tumor resection in adults with non-small cell lung cancer whose tumors have EGFR exon 19 deletions or exon 21 L858R mutations." },
    ] },
  { id: "p-velmora", brand: "Velmora", generic: "daxotuzumab vedotin", divisionId: "div-onc", therapyArea: "Oncology", form: "IV infusion", status: "Marketed",
    variants: ["100 mg vial"], gradient: g("#831843", "#f472b6"),
    indications: [
      { short: "HER2-low breast cancer", therapyAreas: ["Oncology"], full: "Treatment of adults with unresectable or metastatic HER2-low breast cancer who have received a prior chemotherapy in the metastatic setting." },
      { short: "HER2+ gastric cancer", therapyAreas: ["Oncology"], full: "Treatment of adults with locally advanced or metastatic HER2-positive gastric or gastroesophageal junction adenocarcinoma who have received a prior trastuzumab-based regimen." },
    ] },
  { id: "p-hemavex", brand: "Hemavex", generic: "linvotamab", divisionId: "div-onc", therapyArea: "Hematology", form: "Subcutaneous injection", status: "Launch",
    variants: ["10 mg vial", "40 mg vial"], gradient: g("#4c1d95", "#c084fc"),
    indications: [{ short: "Relapsed multiple myeloma", therapyAreas: ["Hematology", "Oncology"], full: "Treatment of adults with relapsed or refractory multiple myeloma who have received at least four prior lines of therapy, including a proteasome inhibitor, an immunomodulatory agent and an anti-CD38 monoclonal antibody." }] },
  /* ── Neuroscience ── */
  { id: "p-nirvexa", brand: "Nirvexa", generic: "eptivazumab", divisionId: "div-neuro", therapyArea: "Neurology", form: "Subcutaneous injection", status: "Marketed",
    variants: ["120 mg pen", "120 mg prefilled syringe"], gradient: g("#312e81", "#818cf8"),
    indications: [{ short: "Migraine prevention", therapyAreas: ["Neurology"], full: "Preventive treatment of migraine in adults." }] },
  { id: "p-somnara", brand: "Somnara", generic: "darivorexant", divisionId: "div-neuro", therapyArea: "Sleep medicine", form: "Oral tablet", status: "Marketed",
    variants: ["25 mg tablet", "50 mg tablet"], gradient: g("#1e293b", "#64748b"),
    indications: [{ short: "Insomnia", therapyAreas: ["Sleep medicine", "Psychiatry"], full: "Treatment of adults with insomnia characterized by difficulties with sleep onset and/or sleep maintenance." }] },
  { id: "p-mentavo", brand: "Mentavo", generic: "brexaprazine", divisionId: "div-neuro", therapyArea: "Psychiatry", form: "Oral tablet", status: "Marketed",
    variants: ["1 mg tablet", "2 mg tablet", "4 mg tablet"], gradient: g("#065f46", "#34d399"),
    indications: [
      { short: "MDD (adjunctive)", therapyAreas: ["Psychiatry"], full: "Adjunctive treatment of major depressive disorder in adults." },
      { short: "Schizophrenia", therapyAreas: ["Psychiatry"], full: "Treatment of schizophrenia in adults." },
    ] },
  /* ── Respiratory ── */
  { id: "p-respiza", brand: "Respiza", generic: "tezakumab", divisionId: "div-resp", therapyArea: "Pulmonology", form: "Subcutaneous injection", status: "Marketed",
    variants: ["210 mg pen", "210 mg vial"], gradient: g("#0369a1", "#38bdf8"),
    indications: [
      { short: "Severe asthma", therapyAreas: ["Pulmonology", "Allergy"], full: "Add-on maintenance treatment of adult and pediatric patients aged 12 years and older with severe asthma." },
      { short: "Nasal polyps (CRSwNP)", therapyAreas: ["ENT"], isNew: true, variants: ["210 mg pen"], full: "Add-on maintenance treatment of adults with inadequately controlled chronic rhinosinusitis with nasal polyps." },
    ] },
  { id: "p-breathon", brand: "Breathon", generic: "glycopratium/formoterol", divisionId: "div-resp", therapyArea: "Pulmonology", form: "Inhaler", status: "Marketed",
    variants: ["9/4.8 mcg inhaler, 120 actuations"], gradient: g("#0e7490", "#67e8f9"),
    indications: [{ short: "COPD maintenance", therapyAreas: ["Pulmonology"], full: "Long-term maintenance treatment of airflow obstruction in patients with chronic obstructive pulmonary disease." }] },
  { id: "p-fibrova", brand: "Fibrova", generic: "nintafenib", divisionId: "div-resp", therapyArea: "Pulmonology", form: "Oral capsule", status: "Awaiting approval",
    variants: ["150 mg capsule"], gradient: g("#57534e", "#a8a29e"),
    indications: [] },
  /* ── Rare disease ── */
  { id: "p-pomvara", brand: "Pomvara", generic: "olvaglucosidase alfa", divisionId: "div-rare", therapyArea: "Rare disease", form: "IV infusion", status: "Marketed",
    variants: ["100 mg vial"], gradient: g("#9d174d", "#fb7185"),
    indications: [{ short: "Late-onset Pompe disease", therapyAreas: ["Rare disease", "Neurology"], full: "Treatment of patients 1 year of age and older with late-onset Pompe disease (lysosomal acid alpha-glucosidase deficiency)." }] },
  { id: "p-clotara", brand: "Clotara", generic: "marstuvimab", divisionId: "div-rare", therapyArea: "Hematology", form: "Subcutaneous injection", status: "Launch",
    variants: ["150 mg pen"], gradient: g("#7f1d1d", "#ef4444"),
    indications: [
      { short: "Hemophilia A", therapyAreas: ["Hematology"], full: "Routine prophylaxis to prevent or reduce the frequency of bleeding episodes in adults and adolescents 12 years and older with hemophilia A without inhibitors." },
      { short: "Hemophilia B", therapyAreas: ["Hematology"], full: "Routine prophylaxis to prevent or reduce the frequency of bleeding episodes in adults and adolescents 12 years and older with hemophilia B without inhibitors." },
    ] },
  /* ── Vaccines ── */
  { id: "p-vaxora", brand: "Vaxora", generic: "RSV prefusion F vaccine", divisionId: "div-vac", therapyArea: "Infectious disease", form: "Intramuscular injection", status: "Marketed",
    variants: ["Single-dose vial"], gradient: g("#14532d", "#4ade80"),
    indications: [{ short: "RSV prevention, 60+", therapyAreas: ["Infectious disease"], full: "Active immunization for the prevention of lower respiratory tract disease caused by respiratory syncytial virus in individuals 60 years of age and older." }] },
];

const PI_IDS: Record<string, string> = { "p-lumora": "src-lum-pi", "p-cardexa": "src-cdx-pi" };

export const PRODUCTS: Product[] = RAW.map((p) => ({
  ...p,
  therapyAreas: p.therapyAreas ?? [...new Set([p.therapyArea, ...p.indications.flatMap((i) => i.therapyAreas)])],
  piSourceId: PI_IDS[p.id] ?? `src-${p.id.slice(2)}-pi`,
}));

/** A Prescribing Information source for every product that doesn't have a hand-written one. */
export const PRODUCT_PI_SOURCES: Source[] = PRODUCTS.filter((p) => !PI_IDS[p.id] && p.status !== "Awaiting approval").map((p, i) => ({
  id: p.piSourceId, title: `${p.brand} Prescribing Information`, type: "Prescribing Information" as const, pages: 14 + (i % 9),
  docNumber: `${p.brand.slice(0, 3).toUpperCase()}-US-${String(100 + i * 7).padStart(4, "0")}`, productId: p.id,
}));

/** Every therapy area across the portfolio, for "teach a therapy area" courses. */
export const ALL_THERAPY_AREAS = [...new Set(PRODUCTS.flatMap((p) => p.therapyAreas))].sort();

/** Indications offered for the picked variants: an indication carried by none of them drops out. */
export function indicationsFor(p: Product, variants: string[]) {
  if (!variants.length) return p.indications;
  return p.indications.filter((i) => !i.variants?.length || i.variants.some((v) => variants.includes(v)));
}

/** Therapy areas offered: the union of the picked indications' areas (all indications when none picked). */
export function therapyAreasFor(p: Product, indications: string[], variants: string[]) {
  const offered = indicationsFor(p, variants);
  const inPlay = indications.length ? offered.filter((i) => indications.includes(i.short)) : offered;
  const areas = [...new Set(inPlay.flatMap((i) => i.therapyAreas))];
  return areas.length ? areas : p.therapyAreas;
}
