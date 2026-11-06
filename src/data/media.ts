import type { VideoSpec } from "./types";

/* Fictional media for the prototype: video scripts (captions are the approved words),
   pages of the approved PDFs, and the Lumora visual aid. */

export const VIDEO_MOA: VideoSpec = {
  durationSec: 160, origin: "upload", fileName: "lumora-moa-animation.mp4",
  chapters: [{ at: 0, title: "Type 2 inflammation" }, { at: 55, title: "Where IL-13 acts" }, { at: 110, title: "How relvokimab blocks it" }],
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
  chapters: [{ at: 0, title: "Who was studied" }, { at: 60, title: "Week-16 results" }, { at: 130, title: "Holding the response" }, { at: 165, title: "Safety in balance" }],
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
  chapters: [{ at: 0, title: "Before injecting" }, { at: 45, title: "Sites" }, { at: 80, title: "Day one" }],
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
  chapters: [{ at: 0, title: "The objection" }, { at: 40, title: "Acknowledge" }, { at: 75, title: "The Access Hub" }, { at: 120, title: "Ask for the next step" }],
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
  "src-lum-payer": {
    2: { title: "Coverage and prior authorization", sections: [{ p: "Most commercial plans require prior authorization documenting an inadequate response to at least one topical prescription therapy." }, { h: "Documentation", p: "Diagnosis of moderate-to-severe AD; topical prescription therapies tried, with dates and outcome; body surface area or severity score." }] },
    3: { title: "The Corvana Access Hub", sections: [{ p: "Offices enrol patients with one form. The Hub runs benefits verification, confirms benefits within 2 business days, and prepares PA support for the office." }] },
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
  },
};

export const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
