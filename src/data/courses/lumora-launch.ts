import type { Module } from "../types";
import {
  CLIP_OBJ_EYES, CLIP_OBJ_TOPICALS, CLIP_OPEN_BRIDGE, CLIP_OPEN_NEEDS, CLIP_OPEN_PATIENT,
  VIDEO_FAIR_BALANCE, VIDEO_HUB_ENROL, VIDEO_INJECTION, VIDEO_LUMEN, VIDEO_MOA, VIDEO_MODEL_CALL, VIDEO_PATIENT_MONTH,
} from "../media";

/* Lumora launch readiness: 14 modules, each with a lesson, at least one piece of media
   (video, PDF pages, infographic, deck walkthrough or audio) and a check. All product facts are
   fictional and come from the fictional sources in org.ts, cited by page. */

const PI = "src-lum-pi";
const VA = "src-lum-va";
const P3 = "src-lum-p3";
const OBJ = "src-lum-obj";
const PAY = "src-lum-payer";
const AD = "src-ad-guide";
const CODE = "src-code";
const c = (sourceId: string, page: number) => ({ sourceId, page });

const RAW: Module[] = [
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
      { id: "lm1-g1", type: "graphic", title: "Atopic dermatitis by the numbers", minutes: 1, competencies: ["c-disease"], graphic: { sourceId: AD,
        headline: "A chronic disease that keeps coming back", stats: [{ value: "1 in 4", label: "adults with AD have moderate-to-severe disease" }, { value: "#1", label: "most burdensome symptom: itch" }, { value: "Type 2", label: "inflammation drives it" }],
        points: ["Chronic and relapsing: flares return even after the skin clears.", "Itch disrupts sleep, work and mood."], footnote: "Atopic dermatitis disease-state guide, pp. 2–4" } },
      { id: "lm1-d1", type: "document", title: "Read it in the disease-state guide", minutes: 2, competencies: ["c-disease"], document: { sourceId: AD, pages: [2, 3, 4],
        callouts: [{ page: 3, text: "“1 in 4” is the only prevalence figure to quote." }] } },
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
      { id: "lm2-v1", type: "video", title: "A month on topicals", minutes: 2, competencies: ["c-disease"], video: VIDEO_PATIENT_MONTH },
      { id: "lm2-d1", type: "document", title: "Read it in the disease-state guide", minutes: 2, competencies: ["c-disease"], document: { sourceId: AD, pages: [7, 8],
        callouts: [{ page: 8, text: "This is why you ask about the last month, not today." }] } },
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
      { id: "lm3-b2", type: "video", title: "Mechanism in 3 minutes", minutes: 3, competencies: ["c-moa"], video: VIDEO_MOA },
      { id: "lm3-g1", type: "graphic", title: "IL-13 in three steps", minutes: 1, competencies: ["c-moa"], graphic: { sourceId: PI,
        headline: "How relvokimab works", stats: [{ value: "IL-13", label: "the cytokine it binds" }, { value: "mAb", label: "human monoclonal antibody" }],
        points: ["IL-13 drives type 2 inflammation in the skin.", "It contributes to barrier dysfunction, itch and inflammation.", "Relvokimab binds IL-13 so it can't signal through its receptor complex."], footnote: "Lumora Prescribing Information, section 12.1" } },
    ],
  },
  {
    id: "lm4", title: "Efficacy: LUMEN-1 and LUMEN-2", competency: "c-efficacy", tier: "core", minutes: 12,
    summary: "The pivotal trials and the numbers you are approved to use.",
    blocks: [
      { id: "lm4-v1", type: "video", title: "LUMEN results in 3 minutes", minutes: 3, competencies: ["c-efficacy", "c-safety"], video: VIDEO_LUMEN },
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
      { id: "lm4-d1", type: "document", title: "Read it in the PI: section 14", minutes: 3, competencies: ["c-efficacy"], document: { sourceId: PI, pages: [11, 12, 13],
        callouts: [{ page: 11, text: "These are the only efficacy numbers you may quote." }, { page: 12, text: "“As early as week 2” refers to itch, not skin clearance." }] } },
      { id: "lm4-g1", type: "graphic", title: "Week-16 results at a glance", minutes: 1, competencies: ["c-efficacy"], graphic: { sourceId: PI,
        headline: "LUMEN-1 and LUMEN-2, pooled", stats: [{ value: "51%", label: "EASI-75 vs 17% placebo" }, { value: "36%", label: "IGA 0/1 vs 10% placebo" }, { value: "78%", label: "kept EASI-75 at week 52" }],
        points: ["1,540 adults with moderate-to-severe atopic dermatitis.", "Always quote the placebo number alongside."], footnote: "Lumora Prescribing Information, section 14. Present with the important safety information." } },
      { id: "lm4-va1", type: "visualaid", title: "Walk the data pages of the visual aid", minutes: 2, competencies: ["c-efficacy", "c-safety"], visualaid: { sourceId: VA, pages: [
        { page: 3, say: "“At week 16, 51% reached EASI-75 versus 17% with placebo.” Point to the placebo bar.", avoid: "No comparisons with other biologics." },
        { page: 4, say: "Turn straight to safety. Read the contraindication and the most common adverse reactions.", avoid: "Never show page 3 without page 4." },
      ] } },
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
      { id: "lm5-g1", type: "graphic", title: "Itch relief at a glance", minutes: 1, competencies: ["c-efficacy"], graphic: { sourceId: PI,
        headline: "What patients feel first", stats: [{ value: "44%", label: "≥4-point itch improvement vs 13% placebo" }, { value: "Week 2", label: "earliest separation from placebo" }],
        points: ["“As early as week 2” is about itch, not skin clearance."], footnote: "Lumora Prescribing Information, p. 12" } },
      { id: "lm5-a1", type: "audio", title: "Listen: itch numbers in 1 minute", minutes: 1, competencies: ["c-efficacy"], audio: { fromBlockIds: ["lm5-b1"], durationSec: 55 } },
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
      { id: "lm6-d1", type: "document", title: "Read it in the PI: section 2", minutes: 2, competencies: ["c-dosing"], document: { sourceId: PI, pages: [2, 3],
        callouts: [{ page: 3, text: "The 7-day rule is the most-missed question in screening." }] } },
      { id: "lm6-g1", type: "graphic", title: "Dosing at a glance", minutes: 1, competencies: ["c-dosing"], graphic: { sourceId: PI,
        headline: "From loading dose to maintenance", stats: [{ value: "500 mg", label: "week 0 (two 250 mg injections)" }, { value: "250 mg", label: "every 2 weeks to week 16" }, { value: "Q4W", label: "option after week 16 if IGA 0/1" }],
        points: ["Missed dose: within 7 days give it; after 7 days skip it.", "No adjustment for renal or hepatic impairment."], footnote: "Lumora Prescribing Information, section 2" } },
      { id: "lm6-va1", type: "visualaid", title: "Walk the dosing page of the visual aid", minutes: 1, competencies: ["c-dosing"], visualaid: { sourceId: VA, pages: [
        { page: 5, say: "“One loading dose of 500 mg, then 250 mg every 2 weeks through week 16.”", avoid: "Don't suggest every-4-week dosing from the start." },
      ] } },
    ],
  },
  {
    id: "lm7", title: "Injection training & starting patients", competency: "c-dosing", tier: "reinforcement", minutes: 6,
    summary: "Walking an office through the first injection.",
    blocks: [
      { id: "lm7-v1", type: "video", title: "The first injection, step by step", minutes: 2, competencies: ["c-dosing"], video: VIDEO_INJECTION },
      { id: "lm7-b1", type: "lesson", title: "First injection", minutes: 3, competencies: ["c-dosing"], paragraphs: [
        { text: "The first loading dose is two injections at different sites, given in the office or after patient training.", cite: c(PI, 2) },
        { text: "Injection sites: thigh or abdomen (except 2 inches around the navel); upper arm only if a caregiver injects.", cite: c(PI, 16) },
      ] },
      { id: "lm7-b2", type: "flashcards", title: "Office questions", minutes: 3, competencies: ["c-dosing"], cards: [
        { front: "\"How many injections on day one?\"", back: "Two 250 mg injections (500 mg loading dose), at different sites.", cite: c(PI, 2) },
        { front: "\"Can patients self-inject?\"", back: "Yes, after proper training. A caregiver may use the upper arm.", cite: c(PI, 16) },
      ] },
      { id: "lm7-d1", type: "document", title: "Read it in the PI: sections 16–17", minutes: 1, competencies: ["c-dosing"], document: { sourceId: PI, pages: [16],
        callouts: [{ page: 16, text: "The 30-minute room-temperature rule is the office's most common question." }] } },
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
      { id: "lm8-d1", type: "document", title: "Read it in the PI: sections 4–6", minutes: 3, competencies: ["c-safety"], document: { sourceId: PI, pages: [3, 4, 5, 6],
        callouts: [{ page: 4, text: "Know 5.2 word for word: it's the safety question HCPs ask most." }, { page: 6, text: "Quote rates with placebo, every time." }] } },
      { id: "lm8-a1", type: "audio", title: "Listen: safety information in 2 minutes", minutes: 2, competencies: ["c-safety"], audio: { fromBlockIds: ["lm8-b1", "lm8-b2"], durationSec: 110 } },
      { id: "lm8-g1", type: "graphic", title: "Safety at a glance", minutes: 1, competencies: ["c-safety"], graphic: { sourceId: PI,
        headline: "Important safety information", stats: [{ value: "9%", label: "conjunctivitis vs 3% placebo" }, { value: "6%", label: "injection-site reactions vs 2%" }],
        points: ["Contraindicated with known hypersensitivity to relvokimab or excipients.", "Treat helminth infections first; avoid live vaccines."], footnote: "Lumora Prescribing Information, sections 4–6" } },
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
      { id: "lm9-v1", type: "video", title: "Fair balance in 80 seconds", minutes: 2, competencies: ["c-safety", "c-compliance"], video: VIDEO_FAIR_BALANCE },
      { id: "lm9-d1", type: "document", title: "Read it in the compliance policy", minutes: 2, competencies: ["c-compliance"], document: { sourceId: CODE, pages: [4, 5, 6, 8],
        callouts: [{ page: 8, text: "24 hours, whatever the source. Even if the doctor mentions it in passing." }] } },
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
      { id: "lm10-g1", type: "graphic", title: "Where Lumora fits", minutes: 1, competencies: ["c-competitive"], graphic: { sourceId: AD,
        headline: "Talk about Lumora, not the others", stats: [{ value: "0", label: "head-to-head studies" }],
        points: ["Systemic options include other biologics and oral JAK inhibitors.", "Redirect any comparison to LUMEN-1 and LUMEN-2.", "No comparative efficacy or safety claims."], footnote: "Disease-state guide p. 11 · Objection handler p. 6" } },
      { id: "lm10-d1", type: "document", title: "Read it in the objection handler", minutes: 1, competencies: ["c-competitive"], document: { sourceId: OBJ, pages: [6], callouts: [] } },
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
      { id: "lm11-d1", type: "document", title: "Read it in the payer guide", minutes: 2, competencies: ["c-access"], document: { sourceId: PAY, pages: [2, 3, 4],
        callouts: [{ page: 4, text: "Government-insured patients are not eligible. Never imply otherwise." }] } },
      { id: "lm11-a1", type: "audio", title: "Listen on the road: access basics", minutes: 2, competencies: ["c-access"], audio: { fromBlockIds: ["lm11-b1", "lm11-b2"], durationSec: 95 } },
      { id: "lm11-g1", type: "graphic", title: "The PA checklist", minutes: 1, competencies: ["c-access"], graphic: { sourceId: PAY,
        headline: "What the office sends with a PA", stats: [{ value: "3", label: "things to document" }, { value: "$0", label: "copay for eligible commercial patients" }],
        points: ["Diagnosis of moderate-to-severe AD.", "Topical prescription therapies tried, with dates and outcome.", "Body surface area or severity score."], footnote: "Corvana Access Hub payer guide, p. 2" } },
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
      { id: "lm12-v1", type: "video", title: "Enrolling a patient in the Hub", minutes: 2, competencies: ["c-access"], video: VIDEO_HUB_ENROL },
      { id: "lm12-va1", type: "visualaid", title: "Walk the access page of the visual aid", minutes: 1, competencies: ["c-access"], visualaid: { sourceId: VA, pages: [
        { page: 6, say: "Describe the three services: benefits verification, PA support, the copay program for eligible commercial patients.", avoid: "Never promise coverage or a copay amount." },
      ] } },
      { id: "lm12-d1", type: "document", title: "Read it in the payer guide", minutes: 1, competencies: ["c-access"], document: { sourceId: PAY, pages: [3, 5, 6], callouts: [{ page: 6, text: "The one line to remember: never promise coverage." }] } },
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
      { id: "lm13-v1", type: "video", title: "Short clip 1: open on the patient", minutes: 1, competencies: ["c-opening"], video: CLIP_OPEN_PATIENT },
      { id: "lm13-v2", type: "video", title: "Short clip 2: the needs question", minutes: 1, competencies: ["c-opening"], video: CLIP_OPEN_NEEDS },
      { id: "lm13-v3", type: "video", title: "Short clip 3: bridge to the data", minutes: 1, competencies: ["c-opening", "c-safety"], video: CLIP_OPEN_BRIDGE },
      { id: "lm13-va1", type: "visualaid", title: "Walk the visual aid", minutes: 4, competencies: ["c-opening", "c-safety"], visualaid: { sourceId: VA, pages: [
        { page: 1, say: "Open here. “Think of your adult patients still flaring despite topicals.” Then ask how many they saw this month.", avoid: "Don't open on the product name or price." },
        { page: 2, say: "Ask about the last month: flares, sleep, missed work. Let them describe their patient.", avoid: "Don't diagnose for them." },
        { page: 3, say: "Share the week-16 data exactly: 51% vs 17% EASI-75. Point to the placebo bar.", avoid: "No comparisons with other biologics." },
        { page: 4, say: "Always present this page when you show page 3. Read the contraindication and the most common adverse reactions.", avoid: "Never skip or rush the safety page." },
      ] } },
    ],
  },
  {
    id: "lm14", title: "Handling the top objections", competency: "c-objections", tier: "core", minutes: 15,
    summary: "Cost and access, speed of response, eye safety, \"my patients are fine on topicals\".",
    blocks: [
      { id: "lm14-v1", type: "video", title: "Model call: the cost objection", minutes: 3, competencies: ["c-objections", "c-access"], video: VIDEO_MODEL_CALL },
      { id: "lm14-v2", type: "video", title: "Short clip: “What about the eyes?”", minutes: 1, competencies: ["c-objections", "c-safety"], video: CLIP_OBJ_EYES },
      { id: "lm14-v3", type: "video", title: "Short clip: “They're fine on topicals”", minutes: 1, competencies: ["c-objections", "c-disease"], video: CLIP_OBJ_TOPICALS },
      { id: "lm14-d1", type: "document", title: "Read it in the objection handler", minutes: 2, competencies: ["c-objections"], document: { sourceId: OBJ, pages: [2, 3, 4, 5], callouts: [{ page: 2, text: "Acknowledge first, every time." }] } },
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

/* Module time is the sum of its blocks, so adding media keeps estimates honest.
   The knowledge check and the roleplay close each module, after its material. */
const LAST = ["check", "scenario"];
export const LUMORA_LAUNCH_MODULES: Module[] = RAW.map((m) => ({
  ...m,
  minutes: m.blocks.reduce((a, b) => a + b.minutes, 0),
  blocks: [...m.blocks].sort((a, b) => +LAST.includes(a.type) - +LAST.includes(b.type)),
}));
