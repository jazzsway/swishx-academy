import type { Module } from "../types";

/* Lumora launch readiness: 14 modules, 118 minutes. All product facts are fictional
   and come from the fictional sources in org.ts, cited by page. */

const PI = "src-lum-pi";
const VA = "src-lum-va";
const P3 = "src-lum-p3";
const OBJ = "src-lum-obj";
const PAY = "src-lum-payer";
const AD = "src-ad-guide";
const CODE = "src-code";
const c = (sourceId: string, page: number) => ({ sourceId, page });

export const LUMORA_LAUNCH_MODULES: Module[] = [
  {
    id: "lm1", title: "Atopic dermatitis today", competency: "c-disease", tier: "core", minutes: 8,
    summary: "Who the moderate-to-severe patient is, and what uncontrolled disease costs them.",
    blocks: [
      { id: "lm1-b1", type: "lesson", title: "The moderate-to-severe patient", minutes: 4, competencies: ["c-disease"], paragraphs: [
        { text: "Atopic dermatitis is a chronic, relapsing inflammatory skin disease driven by type 2 inflammation and a disrupted skin barrier.", cite: c(AD, 2) },
        { text: "Around 1 in 4 adults with atopic dermatitis has moderate-to-severe disease, defined by extent, intensity and impact on daily life.", cite: c(AD, 3) },
        { text: "Itch is the symptom patients rate as most burdensome. It disrupts sleep, work and mood.", cite: c(AD, 4) },
      ] },
      { id: "lm1-b2", type: "keypoints", title: "Remember", minutes: 2, competencies: ["c-disease"], points: [
        { text: "Chronic and relapsing: flares come back even after clearing.", cite: c(AD, 2) },
        { text: "Itch is the patient's number one complaint.", cite: c(AD, 4) },
        { text: "Moderate-to-severe disease affects sleep, work and mental health.", cite: c(AD, 5) },
      ] },
      { id: "lm1-b3", type: "check", title: "Quick check", minutes: 2, competencies: ["c-disease"], check: {
        question: "Which symptom do adults with atopic dermatitis rate as most burdensome?",
        options: ["Dry skin", "Itch", "Redness", "Scaling"], answer: 1,
        rationale: "Itch is consistently rated the most burdensome symptom.", cite: c(AD, 4) } },
    ],
  },
  {
    id: "lm2", title: "The patient journey & unmet need", competency: "c-disease", tier: "core", minutes: 7,
    summary: "Why many patients stay on topicals that aren't working.",
    blocks: [
      { id: "lm2-b1", type: "lesson", title: "Stuck on topicals", minutes: 4, competencies: ["c-disease"], paragraphs: [
        { text: "Most adults start on topical corticosteroids. Many cycle through several topicals before a systemic therapy is considered.", cite: c(AD, 7) },
        { text: "Patients often under-report their symptoms at visits because flares have settled by the time they are seen.", cite: c(AD, 8) },
        { text: "Asking about sleep, itch and missed work in the last month surfaces disease that a single visit can miss.", cite: c(VA, 2) },
      ] },
      { id: "lm2-b2", type: "flashcards", title: "Patient signals", minutes: 3, competencies: ["c-disease", "c-opening"], cards: [
        { front: "\"It's fine right now, but it keeps coming back.\"", back: "Recurrent flares despite topicals. Ask how many flares in the last 3 months.", cite: c(VA, 2) },
        { front: "\"I can't sleep through the night.\"", back: "Itch-driven sleep loss, a marker of uncontrolled disease.", cite: c(AD, 4) },
        { front: "\"I've tried every cream.\"", back: "Inadequate response to topical prescription therapy.", cite: c(AD, 7) },
      ] },
    ],
  },
  {
    id: "lm3", title: "How Lumora works", competency: "c-moa", tier: "core", minutes: 8,
    summary: "Relvokimab and the IL-13 pathway, in plain language.",
    blocks: [
      { id: "lm3-b1", type: "lesson", title: "Mechanism of action", minutes: 5, competencies: ["c-moa"], paragraphs: [
        { text: "Lumora (relvokimab) is a human monoclonal antibody that binds interleukin-13 (IL-13).", cite: c(PI, 9) },
        { text: "IL-13 is a key driver of type 2 inflammation in the skin, contributing to barrier dysfunction, itch and inflammation.", cite: c(PI, 9) },
        { text: "By binding IL-13, relvokimab prevents it from signalling through its receptor complex.", cite: c(PI, 9) },
      ] },
      { id: "lm3-b2", type: "video", title: "Mechanism animation", minutes: 3, competencies: ["c-moa"], video: {
        duration: "2:40", transcript: "IL-13 is released in the skin during type 2 inflammation. Relvokimab binds IL-13 and blocks it from signalling, which reduces the inflammatory cascade." } },
    ],
  },
  {
    id: "lm4", title: "Efficacy: LUMEN-1 and LUMEN-2", competency: "c-efficacy", tier: "core", minutes: 12,
    summary: "The pivotal trials and the numbers you are approved to use.",
    blocks: [
      { id: "lm4-b1", type: "lesson", title: "Trial design", minutes: 4, competencies: ["c-efficacy"], paragraphs: [
        { text: "LUMEN-1 and LUMEN-2 were 16-week, randomized, double-blind, placebo-controlled Phase 3 trials in 1,540 adults with moderate-to-severe atopic dermatitis.", cite: c(P3, 2) },
        { text: "Co-primary endpoints at week 16 were EASI-75 and IGA 0/1 (clear or almost clear skin).", cite: c(P3, 2) },
      ] },
      { id: "lm4-b2", type: "keypoints", title: "Week-16 results (pooled)", minutes: 5, competencies: ["c-efficacy"], points: [
        { text: "EASI-75: 51% with Lumora vs 17% with placebo.", cite: c(PI, 11) },
        { text: "IGA 0/1: 36% with Lumora vs 10% with placebo.", cite: c(PI, 11) },
        { text: "In LUMEN-EXT, 78% of week-16 EASI-75 responders maintained EASI-75 at week 52 on every-4-week dosing.", cite: c(PI, 13) },
      ] },
      { id: "lm4-b3", type: "check", title: "Quick check", minutes: 3, competencies: ["c-efficacy"], check: {
        question: "What proportion of Lumora patients reached EASI-75 at week 16 (pooled)?",
        options: ["36%", "44%", "51%", "78%"], answer: 2,
        rationale: "51% vs 17% placebo. 36% is IGA 0/1; 78% is maintenance in LUMEN-EXT.", cite: c(PI, 11) } },
    ],
  },
  {
    id: "lm5", title: "Itch and patient-reported outcomes", competency: "c-efficacy", tier: "reinforcement", minutes: 7,
    summary: "What patients feel, and how early.",
    blocks: [
      { id: "lm5-b1", type: "lesson", title: "Itch response", minutes: 4, competencies: ["c-efficacy"], paragraphs: [
        { text: "44% of Lumora patients achieved a ≥4-point improvement in peak itch NRS at week 16, vs 13% with placebo.", cite: c(PI, 12) },
        { text: "Separation from placebo on itch was observed as early as week 2.", cite: c(PI, 12) },
      ] },
      { id: "lm5-b2", type: "flashcards", title: "Numbers to know", minutes: 3, competencies: ["c-efficacy"], cards: [
        { front: "Itch ≥4-point NRS improvement, week 16", back: "44% vs 13% placebo", cite: c(PI, 12) },
        { front: "Earliest itch separation from placebo", back: "Week 2", cite: c(PI, 12) },
        { front: "EASI-75 at week 16", back: "51% vs 17% placebo", cite: c(PI, 11) },
      ] },
    ],
  },
  {
    id: "lm6", title: "Dosing & administration", competency: "c-dosing", tier: "core", minutes: 9,
    summary: "Loading dose, maintenance, missed doses and special populations.",
    blocks: [
      { id: "lm6-b1", type: "lesson", title: "The dosing schedule", minutes: 4, competencies: ["c-dosing"], paragraphs: [
        { text: "Lumora is given by subcutaneous injection: a 500 mg loading dose (two 250 mg injections) at week 0, then 250 mg every 2 weeks through week 16.", cite: c(PI, 2) },
        { text: "After week 16, patients who achieve clear or almost clear skin may move to 250 mg every 4 weeks.", cite: c(PI, 2) },
        { text: "No dose adjustment is needed for renal or hepatic impairment.", cite: c(PI, 3) },
      ] },
      { id: "lm6-b2", type: "keypoints", title: "Missed doses & storage", minutes: 3, competencies: ["c-dosing"], points: [
        { text: "Missed dose: give within 7 days, then resume the original schedule. After 7 days, skip it and wait for the next scheduled dose.", cite: c(PI, 3) },
        { text: "Store pens refrigerated. Let a pen reach room temperature for 30 minutes before injecting.", cite: c(PI, 16) },
      ] },
      { id: "lm6-b3", type: "check", title: "Quick check", minutes: 2, competencies: ["c-dosing"], check: {
        question: "A patient missed a dose 4 days ago. What does the PI say?",
        options: ["Skip it and wait for the next dose", "Give it now, then resume the original schedule", "Give a double dose next time", "Restart the loading dose"], answer: 1,
        rationale: "Within 7 days: give the missed dose, then resume the original schedule.", cite: c(PI, 3) } },
    ],
  },
  {
    id: "lm7", title: "Injection training & starting patients", competency: "c-dosing", tier: "reinforcement", minutes: 6,
    summary: "Walking an office through the first injection.",
    blocks: [
      { id: "lm7-b1", type: "lesson", title: "First injection", minutes: 3, competencies: ["c-dosing"], paragraphs: [
        { text: "The first loading dose is two injections at different sites, given in the office or after patient training.", cite: c(PI, 2) },
        { text: "Injection sites: thigh or abdomen (except 2 inches around the navel); upper arm only if a caregiver injects.", cite: c(PI, 16) },
      ] },
      { id: "lm7-b2", type: "flashcards", title: "Office questions", minutes: 3, competencies: ["c-dosing"], cards: [
        { front: "\"How many injections on day one?\"", back: "Two 250 mg injections (500 mg loading dose), at different sites.", cite: c(PI, 2) },
        { front: "\"Can patients self-inject?\"", back: "Yes, after proper training. A caregiver may use the upper arm.", cite: c(PI, 16) },
      ] },
    ],
  },
  {
    id: "lm8", title: "Important safety information", competency: "c-safety", tier: "core", required: true, minutes: 8,
    summary: "Contraindication, warnings and precautions, adverse reactions. Required for everyone.",
    blocks: [
      { id: "lm8-b1", type: "lesson", title: "Contraindication and warnings", minutes: 4, competencies: ["c-safety"], paragraphs: [
        { text: "Lumora is contraindicated in patients with known hypersensitivity to relvokimab or any of its excipients.", cite: c(PI, 3) },
        { text: "Hypersensitivity reactions, including rare anaphylaxis, have been reported. If one occurs, discontinue Lumora and start appropriate treatment.", cite: c(PI, 4) },
        { text: "Conjunctivitis and keratitis occurred more often with Lumora. Advise patients to report new or worsening eye symptoms.", cite: c(PI, 4) },
        { text: "Treat pre-existing helminth infections before starting Lumora. Avoid live vaccines during treatment.", cite: c(PI, 5) },
      ] },
      { id: "lm8-b2", type: "keypoints", title: "Most common adverse reactions (≥1%)", minutes: 2, competencies: ["c-safety"], points: [
        { text: "Conjunctivitis: 9% with Lumora vs 3% with placebo.", cite: c(PI, 6) },
        { text: "Injection-site reactions: 6% vs 2%.", cite: c(PI, 6) },
        { text: "Also: upper respiratory tract infection and eosinophilia.", cite: c(PI, 6) },
      ] },
      { id: "lm8-b3", type: "check", title: "Quick check", minutes: 2, competencies: ["c-safety"], check: {
        question: "Which is the contraindication for Lumora?",
        options: ["Active conjunctivitis", "Known hypersensitivity to relvokimab or excipients", "Asthma", "Age over 65"], answer: 1,
        rationale: "The only contraindication is known hypersensitivity to relvokimab or its excipients.", cite: c(PI, 3) } },
    ],
  },
  {
    id: "lm9", title: "Fair balance in conversation", competency: "c-safety", tier: "core", required: true, minutes: 6,
    summary: "How to deliver safety information as part of every efficacy discussion. Required for everyone.",
    blocks: [
      { id: "lm9-b1", type: "lesson", title: "Balance is not optional", minutes: 3, competencies: ["c-safety", "c-compliance"], paragraphs: [
        { text: "Whenever you discuss efficacy, present the important safety information with comparable prominence.", cite: c(CODE, 4) },
        { text: "Never minimise risk. Avoid absolute terms such as \"safest\", \"no side effects\" or \"guaranteed\".", cite: c(CODE, 5) },
        { text: "If an HCP asks about a use outside the approved indication, do not discuss it. Offer a medical information request.", cite: c(CODE, 6) },
      ] },
      { id: "lm9-b2", type: "flashcards", title: "Say this, not that", minutes: 3, competencies: ["c-safety", "c-compliance"], cards: [
        { front: "\"It's the safest biologic.\"", back: "Unapproved superlative. Say: \"Let me walk you through the safety profile from the label.\"", cite: c(CODE, 5) },
        { front: "\"Sure, it works in teenagers too.\"", back: "Off-label. Say: \"Lumora is approved for adults. I can submit a medical information request for you.\"", cite: c(CODE, 6) },
        { front: "A patient had an eye reaction", back: "That's an adverse event. Report it to Pharmacovigilance within 24 hours.", cite: c(CODE, 8) },
      ] },
    ],
  },
  {
    id: "lm10", title: "Competitive landscape", competency: "c-competitive", tier: "core", minutes: 9,
    summary: "Where Lumora fits, without comparative claims.",
    blocks: [
      { id: "lm10-b1", type: "lesson", title: "The treatment landscape", minutes: 5, competencies: ["c-competitive"], paragraphs: [
        { text: "Systemic options for moderate-to-severe atopic dermatitis include other biologics and oral JAK inhibitors.", cite: c(AD, 11) },
        { text: "Lumora has not been studied head-to-head against any other systemic therapy. Do not make comparative efficacy or safety claims.", cite: c(OBJ, 6) },
        { text: "When an HCP compares, redirect to Lumora's own data and its approved safety profile.", cite: c(OBJ, 6) },
      ] },
      { id: "lm10-b2", type: "check", title: "Quick check", minutes: 4, competencies: ["c-competitive", "c-compliance"], check: {
        question: "An HCP asks if Lumora works better than another biologic. Best response?",
        options: ["\"Yes, our numbers are higher.\"", "\"There are no head-to-head studies. Here's what Lumora showed in LUMEN-1 and LUMEN-2.\"", "\"They're all the same.\"", "\"I'll send you our internal comparison.\""], answer: 1,
        rationale: "No head-to-head data exists, so redirect to Lumora's own approved results.", cite: c(OBJ, 6) } },
    ],
  },
  {
    id: "lm11", title: "Access, coverage & prior authorization", competency: "c-access", tier: "core", minutes: 9,
    summary: "What payers ask for, and how to help an office through it.",
    blocks: [
      { id: "lm11-b1", type: "lesson", title: "Prior authorization basics", minutes: 5, competencies: ["c-access"], paragraphs: [
        { text: "Most commercial plans require prior authorization documenting an inadequate response to at least one topical prescription therapy.", cite: c(PAY, 2) },
        { text: "The Corvana Access Hub runs benefits verification and prepares PA support for the office.", cite: c(PAY, 3) },
        { text: "Eligible commercially insured patients may pay as little as $0 per fill through the copay program. Government-insured patients are not eligible.", cite: c(PAY, 4) },
      ] },
      { id: "lm11-b2", type: "keypoints", title: "What the office needs to document", minutes: 4, competencies: ["c-access"], points: [
        { text: "Diagnosis of moderate-to-severe atopic dermatitis.", cite: c(PAY, 2) },
        { text: "Topical prescription therapies tried, with dates and outcome.", cite: c(PAY, 2) },
        { text: "Body surface area or severity score at the visit.", cite: c(PAY, 2) },
      ] },
    ],
  },
  {
    id: "lm12", title: "Using the Corvana Access Hub", competency: "c-access", tier: "reinforcement", minutes: 6,
    summary: "Enrolment, bridge supply and what to promise (and not).",
    blocks: [
      { id: "lm12-b1", type: "lesson", title: "Hub services", minutes: 3, competencies: ["c-access"], paragraphs: [
        { text: "Offices enrol patients with one form. The Hub confirms benefits within 2 business days.", cite: c(PAY, 3) },
        { text: "Eligible commercially insured patients facing a PA delay may receive a bridge supply.", cite: c(PAY, 5) },
        { text: "Never promise coverage. Describe the Hub's services and let the Hub confirm eligibility.", cite: c(PAY, 6) },
      ] },
      { id: "lm12-b2", type: "check", title: "Quick check", minutes: 3, competencies: ["c-access", "c-compliance"], check: {
        question: "A Medicare patient asks about the $0 copay program. What's correct?",
        options: ["They qualify automatically", "Government-insured patients are not eligible for the copay program", "They qualify after PA", "Only with a bridge supply"], answer: 1,
        rationale: "The copay program is for eligible commercially insured patients only.", cite: c(PAY, 4) } },
    ],
  },
  {
    id: "lm13", title: "Opening a Lumora conversation", competency: "c-opening", tier: "core", minutes: 8,
    summary: "Lead with the patient, not the product.",
    blocks: [
      { id: "lm13-b1", type: "lesson", title: "Open on the patient type", minutes: 4, competencies: ["c-opening"], paragraphs: [
        { text: "Open with the patient the HCP already sees: an adult with moderate-to-severe disease still flaring on topicals.", cite: c(VA, 1) },
        { text: "Ask before you tell: how many of those patients did you see this month, and what are you doing for them today?", cite: c(VA, 2) },
      ] },
      { id: "lm13-b2", type: "flashcards", title: "Good openers", minutes: 4, competencies: ["c-opening"], cards: [
        { front: "Patient-type opener", back: "\"Think of your adult patients still flaring despite topicals. How many did you see this month?\"", cite: c(VA, 1) },
        { front: "Needs question", back: "\"What makes you decide a patient needs more than topicals?\"", cite: c(VA, 2) },
      ] },
    ],
  },
  {
    id: "lm14", title: "Handling the top objections", competency: "c-objections", tier: "core", minutes: 15,
    summary: "Cost and access, speed of response, eye safety, \"my patients are fine on topicals\".",
    blocks: [
      { id: "lm14-b1", type: "lesson", title: "The approved responses", minutes: 6, competencies: ["c-objections", "c-access"], paragraphs: [
        { text: "\"Coverage is a nightmare.\" Acknowledge it, then describe the Access Hub: benefits verification, PA support and the copay program for eligible commercially insured patients.", cite: c(OBJ, 2) },
        { text: "\"How fast does it work?\" Share the approved data: itch separation from placebo as early as week 2, and EASI-75 of 51% vs 17% at week 16.", cite: c(OBJ, 3) },
        { text: "\"What about the eyes?\" Conjunctivitis occurred in 9% vs 3% with placebo. Advise patients to report new eye symptoms.", cite: c(OBJ, 4) },
        { text: "\"My patients are fine on topicals.\" Ask about flares, sleep and missed work in the last month to uncover uncontrolled disease.", cite: c(OBJ, 5) },
      ] },
      { id: "lm14-b2", type: "check", title: "Quick check", minutes: 3, competencies: ["c-objections", "c-access"], check: {
        question: "An HCP says: \"The prior auth paperwork kills me.\" Best first response?",
        options: ["\"Our drug is worth the paperwork.\"", "\"I understand. The Corvana Access Hub handles benefits verification and prepares PA support for your office.\"", "\"Most plans cover it anyway.\"", "\"Just prescribe it and see.\""], answer: 1,
        rationale: "Acknowledge, then describe the Hub's services. Never promise coverage.", cite: c(OBJ, 2) } },
      { id: "lm14-b3", type: "scenario", title: "Practise it: Dr. Marcus Kim", minutes: 6, competencies: ["c-objections"], scenarioId: "sc-kim" },
    ],
  },
];
