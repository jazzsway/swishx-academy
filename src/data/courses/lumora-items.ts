import type { Item, Pool } from "../types";

const PI = "src-lum-pi", P3 = "src-lum-p3", OBJ = "src-lum-obj", PAY = "src-lum-payer", AD = "src-ad-guide", CODE = "src-code", VA = "src-lum-va";

function q(
  id: string, competency: string, pool: Pool, difficulty: 1 | 2 | 3,
  question: string, options: string[], answer: number, rationale: string, sourceId: string, page: number,
): Item {
  return { id, competency, pool, difficulty, question, options, answer, rationale, cite: { sourceId, page } };
}

export const LUMORA_ITEMS: Item[] = [
  /* ── Disease state ── */
  q("li-d1", "c-disease", "screening", 1, "Atopic dermatitis is best described as:", ["An acute infection of the skin", "A chronic, relapsing inflammatory skin disease", "An allergic reaction that resolves in weeks", "A fungal condition"], 1, "AD is chronic and relapsing, driven by type 2 inflammation and barrier disruption.", AD, 2),
  q("li-d2", "c-disease", "screening", 2, "Why might an HCP under-estimate a patient's disease at a visit?", ["Patients exaggerate symptoms", "Flares may have settled by the time the patient is seen", "Severity scores are not used in AD", "Itch is easy to see"], 1, "Patients are often seen between flares, so asking about the last month matters.", AD, 8),
  q("li-d3", "c-disease", "assessment", 2, "Roughly what share of adults with atopic dermatitis have moderate-to-severe disease?", ["1 in 10", "1 in 4", "1 in 2", "3 in 4"], 1, "Around 1 in 4 adults with AD has moderate-to-severe disease.", AD, 3),
  q("li-d4", "c-disease", "assessment", 1, "Which question best surfaces uncontrolled disease?", ["\"Is your skin okay today?\"", "\"How many nights in the last month did itch wake you?\"", "\"Do you like your cream?\"", "\"When is your next visit?\""], 1, "Asking about the last month (sleep, flares, work) surfaces disease a single visit can miss.", VA, 2),
  q("li-d5", "c-disease", "practice", 1, "What do patients rate as their most burdensome AD symptom?", ["Itch", "Scaling", "Redness", "Dryness"], 0, "Itch disrupts sleep, work and mood.", AD, 4),

  /* ── Mechanism ── */
  q("li-m1", "c-moa", "screening", 1, "Relvokimab binds which cytokine?", ["IL-4", "IL-13", "IL-17A", "TNF-α"], 1, "Relvokimab is a human monoclonal antibody that binds IL-13.", PI, 9),
  q("li-m2", "c-moa", "screening", 2, "What does binding IL-13 do?", ["Stimulates the skin barrier directly", "Prevents IL-13 signalling through its receptor complex", "Kills skin bacteria", "Suppresses all immune cells"], 1, "It blocks IL-13 from signalling, reducing type 2 inflammation.", PI, 9),
  q("li-m3", "c-moa", "assessment", 1, "Lumora is a:", ["Topical steroid", "Oral JAK inhibitor", "Human monoclonal antibody", "Calcineurin inhibitor"], 2, "Relvokimab is a human monoclonal antibody.", PI, 9),
  q("li-m4", "c-moa", "assessment", 2, "IL-13 contributes to which of the following in AD?", ["Barrier dysfunction, itch and inflammation", "Bone loss", "Hair growth", "Blood clotting"], 0, "IL-13 drives barrier dysfunction, itch and inflammation.", PI, 9),
  q("li-m5", "c-moa", "practice", 1, "Lumora's mechanism targets which type of inflammation?", ["Type 1", "Type 2", "Type 3", "Non-inflammatory"], 1, "IL-13 is a key type 2 cytokine.", PI, 9),

  /* ── Efficacy ── */
  q("li-e1", "c-efficacy", "screening", 2, "Pooled week-16 EASI-75 with Lumora vs placebo was:", ["36% vs 10%", "51% vs 17%", "44% vs 13%", "78% vs 20%"], 1, "EASI-75: 51% vs 17%. 36/10 is IGA 0/1; 44/13 is itch.", PI, 11),
  q("li-e2", "c-efficacy", "screening", 3, "In LUMEN-EXT, what share of week-16 EASI-75 responders maintained EASI-75 at week 52 on every-4-week dosing?", ["51%", "64%", "78%", "92%"], 2, "78% maintained response at week 52.", PI, 13),
  q("li-e3", "c-efficacy", "assessment", 2, "IGA 0/1 at week 16 (pooled) with Lumora was:", ["17%", "36%", "51%", "44%"], 1, "36% vs 10% placebo reached clear or almost clear skin.", PI, 11),
  q("li-e4", "c-efficacy", "assessment", 3, "How early did itch separate from placebo?", ["Day 1", "Week 2", "Week 8", "Week 16"], 1, "Separation on itch was seen as early as week 2.", PI, 12),
  q("li-e5", "c-efficacy", "assessment", 1, "How many adults were in LUMEN-1 and LUMEN-2 combined?", ["540", "1,040", "1,540", "2,400"], 2, "1,540 adults with moderate-to-severe AD.", P3, 2),
  q("li-e6", "c-efficacy", "practice", 2, "Share of patients with a ≥4-point itch NRS improvement at week 16:", ["13%", "36%", "44%", "51%"], 2, "44% vs 13% placebo.", PI, 12),

  /* ── Dosing ── */
  q("li-g1", "c-dosing", "screening", 2, "What is the Lumora loading dose?", ["250 mg once", "500 mg (two 250 mg injections) at week 0", "500 mg every 2 weeks", "No loading dose"], 1, "500 mg loading dose as two 250 mg injections.", PI, 2),
  q("li-g2", "c-dosing", "screening", 3, "Is a dose adjustment needed for hepatic impairment?", ["Yes, halve the dose", "Yes, dose every 4 weeks", "No dose adjustment is needed", "Lumora is contraindicated"], 2, "No adjustment for renal or hepatic impairment.", PI, 3),
  q("li-g3", "c-dosing", "assessment", 2, "After the loading dose, the dose through week 16 is:", ["250 mg every week", "250 mg every 2 weeks", "500 mg every 4 weeks", "250 mg every 4 weeks"], 1, "250 mg every 2 weeks through week 16.", PI, 2),
  q("li-g4", "c-dosing", "assessment", 3, "A dose was missed 10 days ago. What does the PI say?", ["Give it now", "Skip it and resume at the next scheduled dose", "Restart the loading dose", "Give two doses"], 1, "After 7 days, skip and wait for the next scheduled dose.", PI, 3),
  q("li-g5", "c-dosing", "assessment", 2, "Who may move to every-4-week dosing after week 16?", ["Everyone", "Patients with clear or almost clear skin", "Patients with conjunctivitis", "Patients over 65 only"], 1, "Patients achieving clear or almost clear skin may move to q4w.", PI, 2),
  q("li-g6", "c-dosing", "practice", 1, "How long should a pen sit at room temperature before injecting?", ["5 minutes", "30 minutes", "2 hours", "It must stay cold"], 1, "30 minutes at room temperature.", PI, 16),

  /* ── Safety ── */
  q("li-s1", "c-safety", "screening", 1, "Lumora's contraindication is:", ["Asthma", "Known hypersensitivity to relvokimab or excipients", "Prior topical steroid use", "Age over 65"], 1, "The only contraindication is hypersensitivity to relvokimab or excipients.", PI, 3),
  q("li-s2", "c-safety", "screening", 2, "Conjunctivitis rate with Lumora vs placebo:", ["2% vs 1%", "6% vs 2%", "9% vs 3%", "15% vs 4%"], 2, "9% vs 3%. 6% vs 2% is injection-site reactions.", PI, 6),
  q("li-s3", "c-safety", "assessment", 2, "What should happen before starting Lumora in a patient with a helminth infection?", ["Nothing", "Treat the infection first", "Halve the dose", "Use only every 4 weeks"], 1, "Treat pre-existing helminth infections before starting.", PI, 5),
  q("li-s4", "c-safety", "assessment", 2, "Which vaccines should be avoided during Lumora treatment?", ["All vaccines", "Live vaccines", "Flu vaccines", "None"], 1, "Avoid live vaccines during treatment.", PI, 5),
  q("li-s5", "c-safety", "assessment", 1, "When discussing efficacy with an HCP, safety information should be:", ["Mentioned only if asked", "Presented with comparable prominence", "Left to the PI", "Shortened to save time"], 1, "Fair balance requires comparable prominence.", CODE, 4),
  q("li-s6", "c-safety", "practice", 2, "Injection-site reactions occurred in:", ["6% vs 2% placebo", "9% vs 3% placebo", "1% vs 1% placebo", "12% vs 4% placebo"], 0, "6% vs 2%.", PI, 6),

  /* ── Competitive ── */
  q("li-c1", "c-competitive", "screening", 1, "Has Lumora been studied head-to-head against another systemic therapy?", ["Yes, against all biologics", "Yes, against JAK inhibitors", "No", "Only in LUMEN-EXT"], 2, "No head-to-head studies exist.", OBJ, 6),
  q("li-c2", "c-competitive", "screening", 2, "An HCP says another biologic \"works better\". Best response?", ["Agree", "Claim Lumora is better", "Note there's no head-to-head data and share Lumora's own results", "Change the subject"], 2, "Redirect to Lumora's approved data, no comparative claims.", OBJ, 6),
  q("li-c3", "c-competitive", "assessment", 2, "Systemic options for moderate-to-severe AD include:", ["Only topical steroids", "Other biologics and oral JAK inhibitors", "Antibiotics", "Antihistamines only"], 1, "Other biologics and oral JAK inhibitors.", AD, 11),
  q("li-c4", "c-competitive", "assessment", 3, "Which statement is compliant?", ["\"Lumora clears skin faster than anything else.\"", "\"Lumora is the best-tolerated biologic.\"", "\"In LUMEN-1 and LUMEN-2, 51% reached EASI-75 at week 16 vs 17% with placebo.\"", "\"Lumora has fewer side effects than JAKs.\""], 2, "Only Lumora's own approved data, stated exactly.", OBJ, 6),
  q("li-c5", "c-competitive", "practice", 1, "Comparative safety claims about Lumora are:", ["Allowed if verbal", "Not allowed without head-to-head approved data", "Allowed with nurses", "Allowed after launch"], 1, "No comparative claims without approved head-to-head data.", OBJ, 6),

  /* ── Access ── */
  q("li-a1", "c-access", "screening", 1, "Most commercial plans require PA documenting:", ["Failure of a JAK inhibitor", "Inadequate response to at least one topical prescription therapy", "Two years of disease", "A biopsy"], 1, "Inadequate response to at least one topical prescription therapy.", PAY, 2),
  q("li-a2", "c-access", "screening", 2, "Who is NOT eligible for the copay program?", ["Commercially insured patients", "Government-insured patients (e.g. Medicare, Medicaid)", "Patients with a PA approved", "New patients"], 1, "Government-insured patients are not eligible.", PAY, 4),
  q("li-a3", "c-access", "assessment", 2, "How quickly does the Access Hub confirm benefits?", ["Same day", "Within 2 business days", "Within 2 weeks", "After the first fill"], 1, "Within 2 business days.", PAY, 3),
  q("li-a4", "c-access", "assessment", 3, "An office asks if Lumora \"will be covered\". You should:", ["Promise coverage", "Describe the Hub's services and let the Hub confirm eligibility", "Say most plans cover it", "Quote the price"], 1, "Never promise coverage.", PAY, 6),
  q("li-a5", "c-access", "practice", 2, "A bridge supply may be available for:", ["Any patient", "Eligible commercially insured patients facing a PA delay", "Medicare patients", "HCP samples"], 1, "Eligible commercially insured patients with a PA delay.", PAY, 5),

  /* ── Opening ── */
  q("li-o1", "c-opening", "screening", 1, "The best way to open a Lumora call is with:", ["The product name and price", "The patient type the HCP already sees", "A competitor's weakness", "The trial design"], 1, "Open on the patient: adults still flaring despite topicals.", VA, 1),
  q("li-o2", "c-opening", "screening", 2, "Which is a needs-discovery question?", ["\"Did you see our ad?\"", "\"What makes you decide a patient needs more than topicals?\"", "\"Can I leave samples?\"", "\"Do you know our MoA?\""], 1, "Ask before you tell.", VA, 2),
  q("li-o3", "c-opening", "assessment", 2, "Why ask \"how many of these patients did you see this month?\"", ["To fill time", "To anchor the conversation on the HCP's own patients", "To check their schedule", "It's required by law"], 1, "Anchors the call in the HCP's real patients.", VA, 2),
  q("li-o4", "c-opening", "practice", 1, "A good opener leads with:", ["Product", "Patient", "Price", "Competitor"], 1, "Lead with the patient.", VA, 1),

  /* ── Objections ── */
  q("li-x1", "c-objections", "screening", 2, "\"Coverage is a nightmare.\" Best first move?", ["Disagree", "Acknowledge, then describe the Access Hub", "Promise coverage", "Move on"], 1, "Acknowledge, then the Hub.", OBJ, 2),
  q("li-x2", "c-objections", "screening", 3, "\"How fast will patients notice anything?\" The approved answer includes:", ["\"Within days, guaranteed.\"", "Itch separation from placebo as early as week 2", "\"Faster than any competitor.\"", "\"After a year.\""], 1, "Itch separation as early as week 2.", OBJ, 3),
  q("li-x3", "c-objections", "assessment", 2, "\"I'm worried about eye problems.\" Approved response?", ["\"There are none.\"", "Conjunctivitis occurred in 9% vs 3% with placebo; advise patients to report eye symptoms", "\"Only with competitors.\"", "\"Rarely, so don't worry.\""], 1, "State the data and the advice.", OBJ, 4),
  q("li-x4", "c-objections", "assessment", 2, "\"My patients are fine on topicals.\" Best approach?", ["Agree and leave", "Ask about flares, sleep and missed work in the last month", "Say topicals don't work", "Offer samples"], 1, "Uncover uncontrolled disease with questions.", OBJ, 5),
  q("li-x5", "c-objections", "practice", 2, "After acknowledging an objection, you should:", ["Argue", "Respond with approved information", "Change topic", "End the call"], 1, "Acknowledge, respond with approved info, check.", OBJ, 1),

  /* ── Compliance ── */
  q("li-p1", "c-compliance", "screening", 1, "An HCP asks about using Lumora in a 15-year-old. You should:", ["Share what you know", "Say it's approved for adults and offer a medical information request", "Say \"probably fine\"", "Ignore the question"], 1, "Off-label question: offer an MI request.", CODE, 6),
  q("li-p2", "c-compliance", "screening", 2, "A patient reported an eye reaction to the office. Within how long must you report it?", ["24 hours", "7 days", "30 days", "Only if serious"], 0, "Adverse events go to Pharmacovigilance within 24 hours.", CODE, 8),
  q("li-p3", "c-compliance", "assessment", 1, "Which phrase is NOT allowed?", ["\"In LUMEN-1...\"", "\"No side effects\"", "\"Advise patients to report eye symptoms\"", "\"Approved for adults\""], 1, "Never minimise risk.", CODE, 5),
  q("li-p4", "c-compliance", "assessment", 2, "Off-label questions from HCPs go to:", ["Your manager", "Medical Information", "Marketing", "The Access Hub"], 1, "Medical Information handles unsolicited off-label questions.", CODE, 6),
  q("li-p5", "c-compliance", "practice", 1, "\"Safest biologic\" is:", ["Fine to say", "An unapproved superlative", "Required fair balance", "A label statement"], 1, "Avoid superlatives.", CODE, 5),
];
