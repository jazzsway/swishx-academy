import type { VideoSpec } from "./types";

/* Fictional media for the prototype: video scripts (captions are the approved words),
   pages of the approved PDFs, and the Lumora visual aid. */

export const VIDEO_MOA: VideoSpec = {
  durationSec: 160, origin: "upload", fileName: "lumora-moa-animation.mp4",
  chapters: [
    { at: 0, title: "Type 2 inflammation", check: { question: "What drives itch, barrier damage and flares in atopic dermatitis?", options: ["Bacterial infection", "Type 2 inflammation", "Dry air", "A fungal overgrowth"], answer: 1, rationale: "Type 2 inflammation drives itch, barrier damage and flares." } },
    { at: 55, title: "Where IL-13 acts" },
    { at: 110, title: "How relvokimab blocks it", check: { question: "How does relvokimab work?", options: ["It replaces the skin barrier", "It binds IL-13 so it can't signal through its receptor", "It suppresses every immune cell", "It kills skin bacteria"], answer: 1, rationale: "Relvokimab binds IL-13 and stops it signalling through its receptor complex." } },
  ],
  captions: [
    { at: 0, text: "In atopic dermatitis, type 2 inflammation drives itch, barrier damage and flares." },
    { at: 28, text: "Cytokines released in the skin keep that cycle going." },
    { at: 55, text: "IL-13 is a key driver of type 2 inflammation in the skin." },
    { at: 82, text: "It contributes to barrier dysfunction, itch and inflammation." },
    { at: 110, text: "Relvokimab is a human monoclonal antibody that binds IL-13." },
    { at: 135, text: "By binding IL-13, it prevents IL-13 from signalling through its receptor complex." },
  ],
  scenes: [
    { at: 0, headline: "Type 2 inflammation", sub: "Itch · barrier damage · flares" },
    { at: 55, headline: "IL-13", sub: "A key driver in the skin" },
    { at: 110, headline: "Relvokimab binds IL-13", sub: "Signalling blocked" },
  ],
};

export const VIDEO_LUMEN: VideoSpec = {
  durationSec: 190, origin: "upload", fileName: "lumen-results-in-3-minutes.mp4",
  chapters: [
    { at: 0, title: "Who was studied", check: { question: "How many adults were in LUMEN-1 and LUMEN-2?", options: ["540", "1,040", "1,540", "2,540"], answer: 2, rationale: "1,540 adults with moderate-to-severe atopic dermatitis." } },
    { at: 60, title: "Week-16 results", check: { question: "EASI-75 at week 16 with Lumora vs placebo was:", options: ["36% vs 10%", "51% vs 17%", "44% vs 13%", "78% vs 20%"], answer: 1, rationale: "51% vs 17%. 36% vs 10% is clear or almost clear skin." } },
    { at: 130, title: "Holding the response" },
    { at: 165, title: "Safety in balance", check: { question: "Which adverse reactions does the video name as most common?", options: ["Headache and nausea", "Conjunctivitis and injection-site reactions", "Weight gain", "Liver enzyme changes"], answer: 1, rationale: "Conjunctivitis and injection-site reactions were among the most common." } },
  ],
  captions: [
    { at: 0, text: "LUMEN-1 and LUMEN-2 enrolled 1,540 adults with moderate-to-severe atopic dermatitis." },
    { at: 30, text: "Both were 16-week, randomized, double-blind, placebo-controlled Phase 3 trials." },
    { at: 60, text: "At week 16, 51% of Lumora patients reached EASI-75, versus 17% with placebo." },
    { at: 95, text: "36% reached clear or almost clear skin, versus 10% with placebo." },
    { at: 130, text: "In LUMEN-EXT, 78% of week-16 responders kept EASI-75 at week 52 on every-4-week dosing." },
    { at: 165, text: "The most common adverse reactions included conjunctivitis and injection-site reactions." },
  ],
  scenes: [
    { at: 0, headline: "1,540 adults", sub: "Moderate-to-severe AD · two Phase 3 trials" },
    { at: 60, headline: "EASI-75 at week 16", stat: "51% vs 17%" },
    { at: 95, headline: "Clear or almost clear", stat: "36% vs 10%" },
    { at: 130, headline: "Response held at week 52", stat: "78%" },
    { at: 165, headline: "Safety in balance", sub: "Conjunctivitis · injection-site reactions" },
  ],
};

export const VIDEO_INJECTION: VideoSpec = {
  durationSec: 110, origin: "upload", fileName: "lumora-first-injection.mp4",
  chapters: [
    { at: 0, title: "Before injecting", check: { question: "How long should the pen sit at room temperature?", options: ["5 minutes", "15 minutes", "30 minutes", "2 hours"], answer: 2, rationale: "30 minutes out of the fridge before injecting." } },
    { at: 45, title: "Sites" },
    { at: 80, title: "Day one", check: { question: "On day one, the loading dose is given as:", options: ["One injection", "Two 250 mg injections at different sites", "Two injections at the same site", "Four injections"], answer: 1, rationale: "500 mg as two 250 mg injections at different sites." } },
  ],
  captions: [
    { at: 0, text: "Take the pen out of the fridge and let it reach room temperature for 30 minutes." },
    { at: 45, text: "Inject into the thigh or abdomen, avoiding two inches around the navel." },
    { at: 62, text: "A caregiver may use the upper arm." },
    { at: 80, text: "On day one, the 500 mg loading dose is two 250 mg injections at different sites." },
  ],
  scenes: [
    { at: 0, headline: "30 minutes", sub: "Room temperature before injecting" },
    { at: 45, headline: "Thigh or abdomen", sub: "Upper arm only by a caregiver" },
    { at: 80, headline: "Day one: two injections", stat: "2 × 250 mg" },
  ],
};

export const VIDEO_MODEL_CALL: VideoSpec = {
  durationSec: 150, origin: "upload", fileName: "model-call-cost-objection.mp4",
  chapters: [
    { at: 0, title: "The objection" },
    { at: 40, title: "Acknowledge", check: { question: "What does the rep do first?", options: ["Argues the drug is worth it", "Acknowledges the paperwork is real", "Promises the plan will cover it", "Changes the subject"], answer: 1, rationale: "Acknowledge first: don't argue, don't promise." } },
    { at: 75, title: "The Access Hub" },
    { at: 120, title: "Ask for the next step", check: { question: "How does the rep close?", options: ["Asks for a prescription today", "Offers to send the Hub enrolment form to the nurse", "Leaves samples", "Books lunch"], answer: 1, rationale: "A small, concrete next step: the enrolment form to the nurse." } },
  ],
  captions: [
    { at: 0, text: "Doctor: My patients' plans fight every biologic. The prior auth paperwork kills my staff." },
    { at: 40, text: "Rep: I hear you, the paperwork is real, and it lands on your staff." },
    { at: 75, text: "Rep: The Corvana Access Hub runs benefits verification and prepares the PA support for your office." },
    { at: 100, text: "Rep: Eligible commercially insured patients can use the copay program." },
    { at: 120, text: "Rep: Would it help if I sent the Hub enrolment form to your nurse today?" },
  ],
  scenes: [
    { at: 0, headline: "“The paperwork kills my staff.”", sub: "The objection" },
    { at: 40, headline: "Acknowledge first", sub: "Don't argue, don't promise" },
    { at: 75, headline: "Describe the Access Hub", sub: "Benefits verification · PA support · copay" },
    { at: 120, headline: "Ask for the next step", sub: "Enrolment form to the nurse" },
  ],
};

export const VIDEO_WEBINAR: VideoSpec = {
  durationSec: 720, origin: "upload", fileName: "access-webinar-recording.mp4",
  chapters: [
    { at: 0, title: "Why offices push back" }, { at: 180, title: "What payers ask for" },
    { at: 390, title: "Inside the Access Hub" }, { at: 570, title: "What never to promise" },
  ],
  captions: [
    { at: 0, text: "For many offices, the burden is staff time spent on paperwork, not the decision to prescribe." },
    { at: 180, text: "Most commercial plans require prior authorization documenting an inadequate response to at least one topical prescription therapy." },
    { at: 390, text: "The Hub confirms benefits within 2 business days and prepares PA support for the office." },
    { at: 570, text: "Never promise coverage. Describe the Hub's services and let the Hub confirm eligibility." },
  ],
  scenes: [
    { at: 0, headline: "Why offices push back", sub: "Staff time, not the prescribing decision" },
    { at: 180, headline: "What payers ask for", sub: "Inadequate response to a topical prescription therapy" },
    { at: 390, headline: "Inside the Access Hub", stat: "2 business days" },
    { at: 570, headline: "Never promise coverage", sub: "Let the Hub confirm eligibility" },
  ],
};

/* Short videos SwishX scripted from the cited sentences of a module, and a short series of model-call clips. */
export const VIDEO_PATIENT_MONTH: VideoSpec = {
  durationSec: 95, origin: "ai",
  chapters: [
    { at: 0, title: "The visit" },
    { at: 40, title: "The month before", check: { question: "Why might a patient seem fine at the visit?", options: ["Their disease is mild", "The flare has often settled by the time they're seen", "They're on a biologic", "Doctors don't ask"], answer: 1, rationale: "Flares often settle before the visit, so symptoms are under-reported." } },
    { at: 70, title: "What to ask" },
  ],
  captions: [
    { at: 0, text: "Many adults start on topical corticosteroids and cycle through several before a systemic therapy is considered." },
    { at: 40, text: "By the time they are seen, a flare may have settled, so symptoms are often under-reported." },
    { at: 70, text: "Asking about sleep, itch and missed work in the last month surfaces disease a single visit can miss." },
  ],
  scenes: [
    { at: 0, headline: "Cycling through topicals", sub: "Before a systemic is considered" },
    { at: 40, headline: "“It's fine today”", sub: "The flare has settled by the visit" },
    { at: 70, headline: "Ask about the last month", sub: "Sleep · itch · missed work" },
  ],
};

export const VIDEO_FAIR_BALANCE: VideoSpec = {
  durationSec: 80, origin: "ai",
  chapters: [
    { at: 0, title: "Comparable prominence" },
    { at: 35, title: "Words to avoid", check: { question: "Which word should you never use?", options: ["Studied", "Safest", "Approved", "Placebo"], answer: 1, rationale: "Absolute terms like “safest” minimise risk." } },
    { at: 60, title: "Off-label questions" },
  ],
  captions: [
    { at: 0, text: "Whenever you discuss efficacy, present the important safety information with comparable prominence." },
    { at: 35, text: "Never minimise risk. Avoid absolute terms such as safest, no side effects or guaranteed." },
    { at: 60, text: "If an HCP asks about a use outside the approved indication, offer a medical information request." },
  ],
  scenes: [
    { at: 0, headline: "Efficacy and safety, together", sub: "Comparable prominence" },
    { at: 35, headline: "No absolutes", sub: "“Safest” · “no side effects” · “guaranteed”" },
    { at: 60, headline: "Off-label? Medical Information", sub: "Don't discuss it yourself" },
  ],
};

export const VIDEO_HUB_ENROL: VideoSpec = {
  durationSec: 105, origin: "upload", fileName: "access-hub-enrolment.mp4",
  chapters: [
    { at: 0, title: "One form" },
    { at: 40, title: "Benefits in 2 days", check: { question: "How fast does the Hub confirm benefits?", options: ["Same day", "Within 2 business days", "Within 2 weeks", "After the PA is approved"], answer: 1, rationale: "Within 2 business days." } },
    { at: 75, title: "Bridge supply" },
  ],
  captions: [
    { at: 0, text: "Offices enrol patients in the Corvana Access Hub with one form." },
    { at: 40, text: "The Hub runs benefits verification and confirms benefits within 2 business days." },
    { at: 75, text: "Eligible commercially insured patients facing a PA delay may receive a bridge supply." },
  ],
  scenes: [
    { at: 0, headline: "One enrolment form", sub: "Sent by the office" },
    { at: 40, headline: "Benefits confirmed", stat: "2 business days" },
    { at: 75, headline: "Bridge supply", sub: "Eligible commercial patients, during a PA delay" },
  ],
};

const clip = (fileName: string, durationSec: number, lines: [string, string, string?][]): VideoSpec => ({
  durationSec, origin: "upload", fileName,
  chapters: [{ at: 0, title: lines[0][1] }],
  captions: lines.map(([text], i) => ({ at: Math.round((durationSec / lines.length) * i), text })),
  scenes: lines.map(([, headline, sub], i) => ({ at: Math.round((durationSec / lines.length) * i), headline, sub })),
});

export const CLIP_OPEN_PATIENT = clip("opener-patient-type.mp4", 45, [
  ["Rep: Think of your adult patients still flaring despite topicals.", "Lead with the patient", "Not the product"],
  ["Rep: How many of them did you see this month?", "Ask a number", "Let them picture one patient"],
]);
export const CLIP_OPEN_NEEDS = clip("opener-needs-question.mp4", 50, [
  ["Rep: What makes you decide a patient needs more than topicals?", "Ask before you tell", "A needs-discovery question"],
  ["Doctor: Usually when they keep flaring and can't sleep.", "Listen for the signal", "Flares · sleep"],
]);
export const CLIP_OPEN_BRIDGE = clip("opener-bridge-to-data.mp4", 55, [
  ["Rep: For patients like that, LUMEN-1 and LUMEN-2 studied 1,540 adults.", "Bridge to the data", "Only once they've described the patient"],
  ["Rep: At week 16, 51% reached EASI-75 versus 17% with placebo, and here is the safety information.", "Data with safety", "51% vs 17% · then the ISI"],
]);
export const CLIP_OBJ_EYES = clip("objection-eye-safety.mp4", 60, [
  ["Doctor: I've heard about the eye problems.", "“What about the eyes?”", "The objection"],
  ["Rep: Conjunctivitis occurred in 9% with Lumora versus 3% with placebo.", "Quote the label rate", "9% vs 3%"],
  ["Rep: Advise patients to report new or worsening eye symptoms.", "What patients should do", "Report new eye symptoms"],
]);
export const CLIP_OBJ_TOPICALS = clip("objection-fine-on-topicals.mp4", 60, [
  ["Doctor: Honestly, my patients are fine on topicals.", "“They're fine on topicals”", "The objection"],
  ["Rep: In the last month, how many of them had a flare or lost sleep to itch?", "Ask about the last month", "Flares · sleep · missed work"],
]);

/* Public videos embedded from YouTube. Their in-video questions stay within what each chapter's title says it covers. */
export const YT_AD_LECTURE: VideoSpec = {
  durationSec: 365, origin: "youtube", youtubeId: "dfQTiTfiUG0", credit: "MedNerd, Dr. Waqas Fazal · YouTube",
  chapters: [
    { at: 0, title: "A patient scenario" },
    { at: 55, title: "What atopic dermatitis is", check: { question: "Atopic dermatitis is best described as:", options: ["An acute skin infection", "A chronic, relapsing inflammatory skin disease", "An allergy that clears in weeks", "A fungal condition"], answer: 1, rationale: "It's chronic and relapsing: flares come back even after the skin clears." } },
    { at: 85, title: "Pathophysiology", check: { question: "Which two things drive atopic dermatitis?", options: ["Sun damage and ageing", "A weakened skin barrier and immune (type 2) inflammation", "Diet and dehydration", "Bacteria and fungi"], answer: 1, rationale: "Barrier dysfunction and immune dysregulation feed each other." } },
    { at: 152, title: "Commonly affected areas", check: { question: "In adults, atopic dermatitis typically affects:", options: ["Only the scalp", "Skin creases such as the elbows and behind the knees, plus hands and face", "Only the feet", "Only sun-exposed skin"], answer: 1, rationale: "Flexural areas, hands, face and neck are typical in adults." } },
    { at: 193, title: "Clinical presentation & associations", check: { question: "Atopic dermatitis is commonly associated with:", options: ["Diabetes and gout", "Asthma and allergic rhinitis", "Migraine", "High blood pressure"], answer: 1, rationale: "The “atopic triad”: eczema, asthma and allergic rhinitis." } },
    { at: 218, title: "Diagnosis" },
    { at: 232, title: "Treatment", check: { question: "What is the foundation of care for every patient?", options: ["Antibiotics", "Moisturisers (emollients), with topical anti-inflammatories for flares", "Surgery", "Antihistamines alone"], answer: 1, rationale: "Emollients for everyone; topical anti-inflammatories for flares; systemics when that isn't enough." } },
    { at: 299, title: "Summary" },
  ],
  captions: [], scenes: [],
};

export const YT_AD_PATHOPHYS: VideoSpec = {
  durationSec: 192, origin: "youtube", youtubeId: "Jz_k9AWjZAM", credit: "AJMCtv · YouTube",
  chapters: [
    { at: 0, title: "How the disease evolves in adolescents and adults", check: { question: "Which kind of inflammation is central to atopic dermatitis?", options: ["Type 1", "Type 2", "Type 3", "None: it isn't inflammatory"], answer: 1, rationale: "Type 2 inflammation, driven by cytokines such as IL-4 and IL-13." } },
  ],
  captions: [], scenes: [],
};

export interface DocPage { title: string; sections: { h?: string; p: string }[] }

export const DOC_PAGES: Record<string, Record<number, DocPage>> = {
  "src-lum-pi": {
    1: { title: "Highlights of prescribing information", sections: [{ h: "Indications and usage", p: "Lumora is indicated for the treatment of adults with moderate-to-severe atopic dermatitis whose disease is not adequately controlled with topical prescription therapies or when those therapies are not advisable. Lumora can be used with or without topical corticosteroids." }] },
    2: { title: "2 Dosage and administration", sections: [{ h: "2.1 Recommended dosage", p: "500 mg (two 250 mg injections) subcutaneously at week 0, followed by 250 mg every 2 weeks through week 16." }, { h: "2.2 Maintenance", p: "After week 16, patients who achieve clear or almost clear skin may be dosed at 250 mg every 4 weeks." }] },
    3: { title: "2–4 Dosing, missed doses, contraindications", sections: [{ h: "2.3 Missed dose", p: "If a dose is missed, administer within 7 days and resume the original schedule. If more than 7 days have passed, skip the dose and administer the next scheduled dose." }, { h: "2.4 Special populations", p: "No dose adjustment is recommended for renal or hepatic impairment." }, { h: "4 Contraindications", p: "Known hypersensitivity to relvokimab or to any of its excipients." }] },
    4: { title: "5 Warnings and precautions", sections: [{ h: "5.1 Hypersensitivity", p: "Hypersensitivity reactions, including rare anaphylaxis, have been reported. If a clinically significant reaction occurs, discontinue Lumora and initiate appropriate therapy." }, { h: "5.2 Conjunctivitis and keratitis", p: "Conjunctivitis and keratitis occurred more frequently with Lumora. Advise patients to report new onset or worsening eye symptoms." }] },
    5: { title: "5 Warnings and precautions (continued)", sections: [{ h: "5.3 Parasitic (helminth) infections", p: "Treat patients with pre-existing helminth infections before initiating Lumora." }, { h: "5.4 Vaccinations", p: "Avoid use of live vaccines in patients treated with Lumora." }] },
    6: { title: "6 Adverse reactions", sections: [{ h: "6.1 Clinical trials experience", p: "Adverse reactions occurring in ≥1% of Lumora-treated patients and more frequently than placebo: conjunctivitis (9% vs 3%), injection-site reactions (6% vs 2%), upper respiratory tract infection, and eosinophilia." }] },
    9: { title: "12 Clinical pharmacology", sections: [{ h: "12.1 Mechanism of action", p: "Relvokimab is a human IgG4 monoclonal antibody that binds interleukin-13 (IL-13) and inhibits its interaction with the IL-13 receptor complex. IL-13 is a key cytokine in type 2 inflammation implicated in atopic dermatitis." }] },
    11: { title: "14 Clinical studies", sections: [{ h: "14.1 LUMEN-1 and LUMEN-2", p: "1,540 adults with moderate-to-severe atopic dermatitis were randomized to Lumora or placebo for 16 weeks." }, { h: "Week-16 results (pooled)", p: "EASI-75: 51% Lumora vs 17% placebo. IGA 0/1: 36% vs 10%." }] },
    12: { title: "14 Clinical studies (continued)", sections: [{ h: "Itch", p: "A ≥4-point improvement in peak pruritus NRS at week 16 was achieved by 44% of Lumora patients vs 13% with placebo. Separation from placebo was observed as early as week 2." }] },
    13: { title: "14 Clinical studies (continued)", sections: [{ h: "14.2 LUMEN-EXT", p: "Among week-16 EASI-75 responders, 78% maintained EASI-75 at week 52 with 250 mg every 4 weeks." }] },
    16: { title: "16–17 How supplied, patient counseling", sections: [{ h: "16 Storage", p: "Store pens refrigerated. Allow to reach room temperature for 30 minutes before injecting." }, { h: "17 Injection sites", p: "Thigh or abdomen, except the 2 inches around the navel. The upper arm may be used if a caregiver administers the injection." }] },
  },
  "src-ad-guide": {
    2: { title: "What atopic dermatitis is", sections: [{ p: "Atopic dermatitis is a chronic, relapsing inflammatory skin disease driven by type 2 inflammation and a disrupted skin barrier." }, { h: "The itch–scratch cycle", p: "Scratching damages the barrier further, which lets in irritants and drives more inflammation." }] },
    3: { title: "How common it is", sections: [{ p: "Around 1 in 4 adults with atopic dermatitis has moderate-to-severe disease, defined by extent, intensity and impact on daily life." }] },
    4: { title: "What patients feel", sections: [{ p: "Itch is the symptom patients rate as most burdensome. It disrupts sleep, work and mood." }] },
    7: { title: "The treatment journey", sections: [{ p: "Most adults start on topical corticosteroids. Many cycle through several topicals before a systemic therapy is considered." }] },
    8: { title: "Why disease is under-estimated", sections: [{ p: "Patients are often seen between flares, so symptoms are under-reported at the visit. Asking about the last month gives a truer picture." }] },
    11: { title: "Systemic therapy", sections: [{ p: "Systemic options for moderate-to-severe atopic dermatitis include biologics and oral JAK inhibitors. Choice depends on the patient, the label and coverage." }] },
  },
  "src-code": {
    4: { title: "Fair balance", sections: [{ p: "Whenever you discuss efficacy, present the important safety information with comparable prominence." }] },
    5: { title: "Claims you may not make", sections: [{ p: "Never minimise risk. Do not use absolute or superlative terms such as \"safest\", \"no side effects\" or \"guaranteed\"." }] },
    6: { title: "Off-label questions", sections: [{ p: "If an HCP asks about a use outside the approved indication, do not discuss it. Offer to submit a medical information request." }] },
    8: { title: "Adverse event reporting", sections: [{ p: "Report any adverse event you learn about to Pharmacovigilance within 24 hours, whatever its source." }] },
  },
  "src-lum-obj": {
    2: { title: "“Coverage is a nightmare”", sections: [{ h: "Acknowledge", p: "The paperwork is real, and it lands on the office staff." }, { h: "Respond", p: "Describe the Access Hub: benefits verification, PA support and the copay program for eligible commercially insured patients. Never promise coverage." }] },
    3: { title: "“How fast does it work?”", sections: [{ p: "Itch separated from placebo as early as week 2. At week 16, 51% reached EASI-75 vs 17% with placebo." }] },
    4: { title: "“What about the eyes?”", sections: [{ p: "Conjunctivitis occurred in 9% vs 3% with placebo. Advise patients to report new or worsening eye symptoms." }] },
    5: { title: "“My patients are fine on topicals”", sections: [{ p: "Ask about flares, sleep and missed work in the last month to uncover uncontrolled disease." }] },
    6: { title: "“Is it better than …?”", sections: [{ p: "Lumora has not been studied head-to-head against any other systemic therapy. Redirect to Lumora's own data and safety profile." }] },
  },
  "src-lum-payer": {
    2: { title: "Coverage and prior authorization", sections: [{ p: "Most commercial plans require prior authorization documenting an inadequate response to at least one topical prescription therapy." }, { h: "Documentation", p: "Diagnosis of moderate-to-severe AD; topical prescription therapies tried, with dates and outcome; body surface area or severity score." }] },
    3: { title: "The Corvana Access Hub", sections: [{ p: "Offices enrol patients with one form. The Hub runs benefits verification, confirms benefits within 2 business days, and prepares PA support for the office." }] },
    5: { title: "Bridge supply", sections: [{ p: "Eligible commercially insured patients facing a prior authorization delay may receive a bridge supply while the PA is decided." }] },
    6: { title: "What to promise", sections: [{ p: "Never promise coverage or a copay amount. Describe the Hub's services and let the Hub confirm each patient's eligibility." }] },
    4: { title: "Copay program", sections: [{ p: "Eligible commercially insured patients may pay as little as $0 per fill. Patients with government insurance (e.g. Medicare, Medicaid) are not eligible." }] },
  },
};

export interface VaPage { title: string; headline: string; sub: string; visual: "patient" | "chart" | "safety" | "access"; stat?: string }

export const VA_PAGES: Record<string, Record<number, VaPage>> = {
  "src-lum-va": {
    1: { title: "Patient", headline: "Still flaring on topicals?", sub: "Adults with moderate-to-severe atopic dermatitis", visual: "patient" },
    2: { title: "Burden", headline: "Itch that won't let them sleep", sub: "Ask about the last month: flares, sleep, missed work", visual: "patient" },
    3: { title: "Efficacy", headline: "EASI-75 at week 16", sub: "LUMEN-1 and LUMEN-2, pooled", visual: "chart", stat: "51% vs 17%" },
    4: { title: "Safety", headline: "Important safety information", sub: "Contraindication, warnings, most common adverse reactions", visual: "safety" },
    5: { title: "Dosing", headline: "One loading dose, then every 2 weeks", sub: "500 mg at week 0, then 250 mg every 2 weeks through week 16", visual: "chart", stat: "250 mg Q2W" },
    6: { title: "Access", headline: "The Corvana Access Hub", sub: "Benefits verification · PA support · copay for eligible commercial patients", visual: "access", stat: "2 business days" },
  },
};

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
