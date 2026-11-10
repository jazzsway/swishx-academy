import type { Item, Pool } from "../types";

const PI = "src-lum-pi", P3 = "src-lum-p3", OBJ = "src-lum-obj", PAY = "src-lum-payer", AD = "src-ad-guide", CODE = "src-code", VA = "src-lum-va";

function q(
  id: string, competency: string, pool: Pool, difficulty: 1 | 2 | 3,
  question: string, options: string[], answer: number, rationale: string, sourceId: string, page: number,
): Item {
  return { id, competency, pool, difficulty, question, options, answer, rationale, cite: { sourceId, page } };
}

/** An open assessment question: SwishX's suggested answer, and the points a good answer must cover. */
function open(
  id: string, competency: string, moduleId: string, difficulty: 1 | 2 | 3, question: string,
  suggested: string, mustCover: [string, string[]][], sourceId: string, page: number, trainerNote?: string,
): Item {
  return {
    id, competency, moduleId, pool: "assessment", difficulty, format: "open", question, options: [], answer: -1,
    rationale: suggested, cite: { sourceId, page },
    guide: { suggested, mustCover: mustCover.map(([text, keywords]) => ({ text, keywords })), trainerNote },
  };
}

const ITEMS: Item[] = [
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

  /* ── Open answers: one per module, marked against what a good answer covers ── */
  open("li-w1", "c-disease", "lm1", 2, "In your own words, describe the moderate-to-severe atopic dermatitis patient to an HCP.",
    "An adult with chronic, relapsing atopic dermatitis driven by type 2 inflammation, whose disease is extensive or intense enough to affect daily life. Itch is their most burdensome symptom: it disrupts sleep, work and mood.",
    [["Chronic and relapsing", ["chronic", "relaps", "flare"]], ["Itch is the biggest burden", ["itch"]], ["Affects daily life: sleep, work or mood", ["sleep", "work", "mood", "daily"]]], AD, 3),
  open("li-w2", "c-disease", "lm2", 2, "An HCP says their patients seem fine at visits. Why might that be, and what would you ask?",
    "Flares have often settled by the time the patient is seen, so symptoms are under-reported. Ask about the last month: how many flares, how many nights itch woke them, and any missed work.",
    [["Flares settle before the visit", ["settle", "between flares", "under-report", "underreport", "by the time"]], ["Ask about the last month", ["last month", "past month", "last 4 weeks"]], ["Sleep, itch or missed work", ["sleep", "itch", "work"]]], AD, 8,
    "Must ask about the last month. Asking only about today misses the point."),
  open("li-w3", "c-moa", "lm3", 2, "Explain how Lumora works, as you would to a busy dermatologist.",
    "Lumora (relvokimab) is a human monoclonal antibody that binds IL-13, a key driver of type 2 inflammation in the skin, and stops it signalling through its receptor complex. That reduces barrier dysfunction, itch and inflammation.",
    [["Binds IL-13", ["il-13", "il13", "interleukin"]], ["A human monoclonal antibody", ["antibody", "monoclonal", "mab"]], ["Blocks its signalling", ["signal", "receptor", "block", "prevent"]]], PI, 9),
  open("li-w4", "c-efficacy", "lm4", 3, "Summarise the week-16 LUMEN results the way you're approved to.",
    "In LUMEN-1 and LUMEN-2, 51% of patients reached EASI-75 at week 16 versus 17% with placebo, and 36% reached clear or almost clear skin versus 10%. Then I present the important safety information.",
    [["EASI-75: 51%", ["51"]], ["With the placebo number", ["placebo", "17%", "17 %"]], ["Followed by safety information", ["safety"]]], PI, 11,
    "A number quoted without its placebo comparison doesn't count."),
  open("li-w5", "c-efficacy", "lm5", 2, "An HCP asks how quickly patients feel a difference. What can you say?",
    "Itch separated from placebo as early as week 2, and at week 16, 44% had at least a 4-point itch improvement versus 13% with placebo. Week 2 refers to itch, not skin clearance.",
    [["As early as week 2", ["week 2", "2 weeks", "two weeks"]], ["44% vs 13% at week 16", ["44"]], ["It's about itch, not clearance", ["itch"]]], PI, 12),
  open("li-w6", "c-dosing", "lm6", 2, "Walk an office nurse through the Lumora dosing schedule.",
    "A 500 mg loading dose, given as two 250 mg injections, at week 0. Then 250 mg every 2 weeks through week 16. After week 16, patients with clear or almost clear skin may move to every 4 weeks.",
    [["500 mg loading dose", ["500", "loading"]], ["250 mg every 2 weeks to week 16", ["every 2 weeks", "every two weeks", "q2w", "fortnight"]], ["Every 4 weeks after week 16, if clear", ["4 weeks", "four weeks", "q4w"]]], PI, 2),
  open("li-w7", "c-dosing", "lm7", 1, "A patient is nervous about injecting at home. What should the office tell them?",
    "Let the pen reach room temperature for 30 minutes, then inject into the thigh or abdomen, avoiding 2 inches around the navel. A caregiver can use the upper arm. Patients self-inject after training.",
    [["30 minutes at room temperature", ["30 min", "room temperature"]], ["Thigh or abdomen", ["thigh", "abdomen", "stomach", "belly"]], ["After training, or a caregiver helps", ["train", "caregiver"]]], PI, 16),
  open("li-w8", "c-safety", "lm8", 3, "An HCP asks, “What's the catch?” Give them the important safety information.",
    "Lumora is contraindicated with known hypersensitivity to relvokimab or its excipients; hypersensitivity, including rare anaphylaxis, has been reported. Conjunctivitis and keratitis occurred more often: conjunctivitis 9% versus 3% with placebo. Treat helminth infections first, and avoid live vaccines.",
    [["Contraindication: hypersensitivity", ["hypersensitiv", "allerg"]], ["Conjunctivitis, with its rate", ["conjunctivitis", "keratitis", "eye"]], ["Helminth infections or live vaccines", ["helminth", "parasit", "vaccin"]]], PI, 4,
    "Don't let reps soften it. “Mild” or “nothing to worry about” should lose marks."),
  open("li-w9", "c-compliance", "lm9", 2, "An HCP asks if Lumora is fine for their 15-year-old patient. What do you say?",
    "Lumora is approved for adults, so I can't discuss use in teenagers. I can submit a medical information request so our Medical team can answer you directly.",
    [["Approved for adults only", ["adult"]], ["Won't discuss the off-label use", ["can't", "cannot", "not able", "off-label", "off label", "not approved"]], ["Offers a medical information request", ["medical information", "mi request", "medical team", "medical affairs"]]], CODE, 6),
  open("li-w10", "c-competitive", "lm10", 2, "An HCP says another biologic works better. How do you respond without comparing?",
    "Lumora hasn't been studied head-to-head against other systemic therapies, so I can't make that comparison. What I can share is what Lumora showed in LUMEN-1 and LUMEN-2, along with its safety profile.",
    [["No head-to-head data", ["head-to-head", "head to head", "not been compared", "no comparison", "not compared"]], ["Redirect to Lumora's own data", ["lumen", "our data", "lumora showed", "lumora's"]], ["Mention safety", ["safety"]]], OBJ, 6),
  open("li-w11", "c-access", "lm11", 2, "An office manager asks what they need for a Lumora prior authorization. What do you tell them?",
    "Most commercial plans want documentation of an inadequate response to at least one topical prescription therapy: the diagnosis, the topicals tried with dates and outcome, and a body surface area or severity score. The Access Hub can prepare PA support.",
    [["Inadequate response to a topical", ["topical"]], ["Diagnosis, dates or a severity score", ["diagnos", "dates", "bsa", "severity", "body surface"]], ["The Access Hub can help", ["hub", "access"]]], PAY, 2),
  open("li-w12", "c-access", "lm12", 2, "A patient's PA is taking weeks. What can the Hub do, and what must you not promise?",
    "The Hub confirms benefits within 2 business days, and eligible commercially insured patients facing a PA delay may get a bridge supply. I must never promise coverage; the Hub confirms each patient's eligibility.",
    [["A bridge supply", ["bridge"]], ["Only for eligible commercial patients", ["commercial", "eligib"]], ["Never promise coverage", ["promise", "guarantee"]]], PAY, 5),
  open("li-w13", "c-opening", "lm13", 2, "Write the first two lines you'd say to open a Lumora call.",
    "“Think of your adult patients still flaring despite topicals. How many did you see this month?” Then: “What makes you decide a patient needs more than topicals?”",
    [["Leads with the patient type", ["flaring", "topical", "your patients", "adult patients"]], ["Asks how many they see", ["how many", "this month"]], ["Asks a needs question", ["what makes", "decide", "needs more"]]], VA, 1,
    "Opening on the product name or the price is a fail, even if the rest is right."),
  open("li-w14", "c-objections", "lm14", 3, "An HCP says, “The prior auth paperwork kills my staff.” Write your response.",
    "“I hear you, the paperwork is real and it lands on your staff. The Corvana Access Hub runs benefits verification and prepares PA support for your office, and eligible commercially insured patients can use the copay program. Could I send the enrolment form to your nurse?”",
    [["Acknowledges it first", ["hear you", "understand", "is real", "fair point", "i get"]], ["Describes the Hub's services", ["hub", "benefits verification", "pa support"]], ["Asks for a next step", ["send", "enrol", "form", "next step"]]], OBJ, 2),

  /* ── Multiple choice for the two modules that had none in the final assessment ── */
  q("li-g7", "c-dosing", "assessment", 2, "On day one, the loading dose is given as:", ["One 500 mg injection", "Two 250 mg injections at different sites", "Two 250 mg injections at the same site", "250 mg, repeated after a week"], 1, "500 mg as two 250 mg injections, at different sites.", PI, 2),
  q("li-a6", "c-access", "assessment", 2, "A patient's PA is delayed. Who may receive a bridge supply?", ["Any patient", "Eligible commercially insured patients", "Medicare patients only", "Only patients already on the copay program"], 1, "Bridge supply is for eligible commercially insured patients facing a PA delay.", PAY, 5),
];

/* Where a competency is taught in more than one module, the module each question tests. The rest go to the module that teaches their competency. */
const HOME: Record<string, string> = {
  "li-d1": "lm1", "li-d2": "lm2", "li-d3": "lm1", "li-d4": "lm2", "li-d5": "lm2",
  "li-e1": "lm4", "li-e2": "lm4", "li-e3": "lm4", "li-e4": "lm5", "li-e5": "lm4", "li-e6": "lm5",
  "li-g1": "lm6", "li-g2": "lm6", "li-g3": "lm6", "li-g4": "lm6", "li-g5": "lm6", "li-g6": "lm7",
  "li-s1": "lm8", "li-s2": "lm8", "li-s3": "lm8", "li-s4": "lm8", "li-s5": "lm9", "li-s6": "lm8",
  "li-a1": "lm11", "li-a2": "lm11", "li-a3": "lm12", "li-a4": "lm11", "li-a5": "lm12", "li-a6": "lm12", "li-g7": "lm7",
  "li-p1": "lm9", "li-p2": "lm9", "li-p3": "lm9", "li-p4": "lm9", "li-p5": "lm9",
};

export const LUMORA_ITEMS: Item[] = ITEMS.map((i) => (HOME[i.id] ? { ...i, moduleId: HOME[i.id] } : i));

