import type { Character, Course, CourseSettings, Objective, Scenario, Source } from "../types";
import { SOURCES, registerSeedFiles } from "../org";
import { directModules } from "@/features/trainer/materials";
import { build } from "@/lib/scenario-set";

/*
 * The demo's trainings built from the trainer's own material, beyond the field kit, the call check and
 * the Psorivex switch training. Each is a few files (shown to reps, or context only), a handful of
 * objectives and three situations under each, published and assigned. One builder keeps them consistent.
 */

type Sit = [character: Character, name: string, title: string, description: string];
interface ObjectiveSpec { id: string; title: string; people: Character[]; description: string; weights: { competency: string; pct: number }[]; lookFors: string[]; situations: Sit[] }
interface Spec {
  id: string; short: string; title: string; productId?: string; divisionId?: string; teams: string[]; audience: string;
  visibility: Course["visibility"]; brief: string; repFiles: Source[]; contextIds: string[]; objectives: ObjectiveSpec[];
  materialOptional?: boolean; createdAt: string; publishedAt: string;
}

const lib = (id: string) => SOURCES.find((s) => s.id === id)!;
const up = (id: string, title: string, fileName: string, format: "video" | "slides" | "pdf", pages: number, productId?: string): Source =>
  ({ id, title, type: "Uploaded file", pages, productId, uploaded: { fileName, format, at: "2026-10-01T09:00:00" } });

function directCourse(spec: Spec, settings: CourseSettings): { course: Course; scenarios: Scenario[] } {
  registerSeedFiles(spec.repFiles.filter((s) => s.uploaded));
  const shell = { id: spec.id, productId: spec.productId, roleplaySourceIds: spec.contextIds, sourceIds: spec.contextIds } as Course;
  let n = 0;
  const scenarios = spec.objectives.flatMap((o) => o.situations.map(([character, name, title, description]) => {
    const sc = build({ course: shell, character, name, title, description, weights: o.weights, objective: `${o.title}, with ${name.replace(/,.*$/, "")}.` });
    const id = `sc-${spec.short}-${++n}`;
    const fixed = JSON.parse(JSON.stringify(sc).split(sc.id).join(id)) as Scenario;
    return { ...fixed, objectiveId: o.id, custom: fixed.custom && { ...fixed.custom, createdAt: `${spec.createdAt}T10:00:00` } };
  }));
  const objectives: Objective[] = spec.objectives.map(({ situations: _s, ...o }) => ({ ...o, cites: [{ sourceId: spec.contextIds[0] ?? spec.repFiles[0].id, page: 2, quote: o.lookFors[0] }] }));
  const modules = directModules(spec.repFiles, spec.short);
  const screen = scenarios[0].id;
  const course: Course = {
    id: spec.id, title: spec.title, productId: spec.productId, format: "long", type: "personalised", origin: "direct",
    objective: spec.brief, brief: spec.brief, audience: spec.audience, writtenFor: "reps", teams: spec.teams, divisionId: spec.divisionId,
    sourceIds: [...spec.repFiles.map((s) => s.id), ...spec.contextIds], roleplaySourceIds: spec.contextIds,
    competencyIds: [...new Set(spec.objectives.flatMap((o) => o.weights.map((w) => w.competency)))],
    modules, items: [], scenarioIds: scenarios.map((x) => x.id), objectives,
    settings: { ...settings, materialOptional: spec.materialOptional, screeningIds: [screen], screeningScenarioId: screen, assessmentScenarioId: scenarios[1]?.id ?? screen },
    versions: [{
      version: 1, versionId: `${spec.short.toUpperCase()}-v1`, state: "published", publishedAt: spec.publishedAt, comments: [], acknowledged: [], modules,
      history: [{ at: spec.createdAt, by: "Maya Chen", action: "Created from your materials" }, { at: spec.publishedAt, by: "Maya Chen", action: "Published" }],
    }],
    ownerId: "u-maya", updatedAt: spec.publishedAt, visibility: spec.visibility, prerequisites: [], allowExplore: true,
  };
  return { course, scenarios };
}

const SPECS: Spec[] = [
  {
    id: "c-colivant", short: "col", title: "Colivant: first calls in gastroenterology", productId: "p-colivant", divisionId: "div-imm", teams: ["div-imm"],
    audience: "Field reps · Immunology", visibility: "audience", createdAt: "2026-10-12", publishedAt: "2026-10-15",
    brief: "Reps open on the IBD patients who keep flaring, explain how Colivant works in a sentence, get induction and maintenance dosing right, and keep fair balance on infections.",
    repFiles: [
      up("up-col-video", "How Colivant works", "How Colivant works.mp4", "video", 0, "p-colivant"),
      up("up-col-deck", "Colivant core story", "Colivant core story.pptx", "slides", 10, "p-colivant"),
      lib("src-colivant-pi"),
    ],
    contextIds: ["src-selling", "src-code"],
    objectives: [
      { id: "ob-col-open", title: "Open on the patient who keeps flaring", people: ["doctor"],
        description: "Reps ask about the patients still flaring or stuck on steroids before they bring up Colivant.",
        weights: [{ competency: "c-opening", pct: 45 }, { competency: "c-disease", pct: 35 }, { competency: "c-safety", pct: 20 }],
        lookFors: ["Asks about patients still flaring before naming the product", "Names the patient type the label supports", "Gives the safety information with any benefit"],
        situations: [
          ["doctor", "Dr. Daniel Cho", "A gastroenterologist with a full IBD clinic", "Dr. Cho has back-to-back appointments. Find out which of his patients still flare, and earn a proper visit."],
          ["doctor", "Dr. Sofia Alvarez", "Patients who can't come off steroids", "Dr. Alvarez has several patients stuck on steroids. Ask about them before you say anything about Colivant."],
          ["doctor", "Dr. Owen Brooks", "Five minutes before an endoscopy list", "Dr. Brooks is about to start his list. One good question about his flaring patients, then a next step."],
        ] },
      { id: "ob-col-moa", title: "Explain how it works, simply", people: ["doctor", "nurse"],
        description: "Reps explain the mechanism in plain words, the way the core story puts it, and connect it to the approved data.",
        weights: [{ competency: "c-moa", pct: 55 }, { competency: "c-efficacy", pct: 45 }],
        lookFors: ["Explains the mechanism in one or two plain sentences", "Links it to the approved results", "Doesn't overstate what it does"],
        situations: [
          ["doctor", "Dr. Lena Kim", "“How is it different at the cell level?”", "Dr. Kim wants the mechanism, briefly. Keep it to what the core story says, and tie it to the results."],
          ["nurse", "Nurse Ana Ruiz", "The infusion nurse wants the short version", "Nurse Ruiz will explain it to patients. Give her a version she can repeat, without claims the label doesn't make."],
          ["doctor", "Dr. Marcus Hale", "A fellow who wants it in one line", "Dr. Hale is teaching a fellow and asks for a one-line explanation. Make it simple and accurate."],
        ] },
      { id: "ob-col-dose", title: "Walk through induction and maintenance", people: ["nurse", "pharmacist"],
        description: "Reps explain the IV induction, the switch to injections for maintenance, and what to do about a missed dose, straight from the PI.",
        weights: [{ competency: "c-dosing", pct: 60 }, { competency: "c-safety", pct: 40 }],
        lookFors: ["States the induction and maintenance schedule exactly", "Explains what to do about a missed dose", "Mentions the infusion and injection site reactions"],
        situations: [
          ["nurse", "Nurse Grace Obi", "IV induction, then the switch to injections", "Nurse Obi runs the infusion suite. Walk her through induction and when patients move to injections."],
          ["pharmacist", "Mei Lin, PharmD", "The pharmacist checks the maintenance schedule", "Mei Lin wants the maintenance dosing exactly as labelled before she sets up refills."],
          ["nurse", "Nurse Tom Becker", "A patient missed an injection", "Nurse Becker has a patient who missed a maintenance dose by ten days. Say what the PI says to do."],
        ] },
      { id: "ob-col-safety", title: "Keep fair balance on infections", people: ["doctor", "patient"],
        description: "Every benefit comes with the infection risk as the PI states it, and any adverse event mentioned is reported within 24 hours.",
        weights: [{ competency: "c-safety", pct: 50 }, { competency: "c-compliance", pct: 50 }],
        lookFors: ["Gives the infection risk alongside any benefit", "Says the event will be reported within 24 hours", "Doesn't give medical advice"],
        situations: [
          ["doctor", "Dr. Priya Raman", "“Is the infection risk worth it?”", "Dr. Raman pushes on infections. Give the safety information as the PI does, without minimising it."],
          ["patient", "Mark Ellison", "A patient worried about catching colds", "Mark asks if Colivant will make him ill all winter. Point him to his doctor, and don't give medical advice."],
          ["doctor", "Dr. Marcus Lee", "A doctor mentions a patient's pneumonia", "Dr. Lee mentions a patient admitted with pneumonia after starting. Report it within 24 hours, and don't guess the cause."],
        ] },
    ],
  },
  {
    id: "c-lumora-drills", short: "lod", title: "Lumora objection drills", productId: "p-lumora", divisionId: "div-imm", teams: ["div-imm"],
    audience: "Field reps · Immunology", visibility: "audience", createdAt: "2026-10-20", publishedAt: "2026-10-22",
    brief: "Short, repeatable calls on the three objections reps hear most about Lumora: cost, “the topical works fine”, and side effects.",
    repFiles: [], contextIds: ["src-lum-obj", "src-selling", "src-lum-pi"],
    objectives: [
      { id: "ob-lod-cost", title: "Handle “it's too expensive”", people: ["doctor", "manager"],
        description: "Reps acknowledge the cost concern, explain the support program, and never promise what a plan will pay.",
        weights: [{ competency: "c-objections", pct: 50 }, { competency: "c-access", pct: 50 }],
        lookFors: ["Acknowledges the concern before answering", "Explains the support program", "Never promises coverage"],
        situations: [
          ["doctor", "Dr. Lena Kim", "“My patients can't afford another biologic”", "Dr. Kim says cost rules Lumora out. Acknowledge it, explain the support program, and ask for one patient."],
          ["manager", "Dana Whitfield", "Prior authorizations, again", "Dana says her team can't take on more paperwork. Show what the program takes off them."],
          ["doctor", "Dr. Marcus Hale", "“Insurance will just deny it”", "Dr. Hale expects denials. Explain the benefits check, without promising the outcome."],
        ] },
      { id: "ob-lod-topical", title: "Handle “the topical works fine”", people: ["doctor"],
        description: "Reps find the patients the topical isn't controlling, without criticising it or comparing products.",
        weights: [{ competency: "c-objections", pct: 50 }, { competency: "c-disease", pct: 30 }, { competency: "c-competitive", pct: 20 }],
        lookFors: ["Asks about patients who aren't controlled", "Makes no comparative claims", "Asks for a next step"],
        situations: [
          ["doctor", "Dr. Sofia Alvarez", "Happy with her current routine", "Dr. Alvarez says topicals work for her patients. Find the ones they don't, respectfully."],
          ["doctor", "Dr. Owen Brooks", "“I only use biologics as a last resort”", "Dr. Brooks waits a long time before a biologic. Ask about the patients still itching at night."],
          ["doctor", "Dr. Daniel Cho", "“Show me it's better than what I use”", "Dr. Cho wants a head-to-head. Don't compare: share the approved data and ask about his patients."],
        ] },
      { id: "ob-lod-safety", title: "Handle side-effect worries", people: ["doctor", "patient"],
        description: "Reps give the safety information as the PI states it, and report any adverse event within 24 hours.",
        weights: [{ competency: "c-safety", pct: 60 }, { competency: "c-compliance", pct: 40 }],
        lookFors: ["Gives the common side effects in balance", "Reports any adverse event within 24 hours", "Doesn't minimise risks"],
        situations: [
          ["doctor", "Dr. Priya Raman", "“I've heard about eye problems”", "Dr. Raman asks about conjunctivitis. Give the safety information exactly as the PI does."],
          ["patient", "Rosa Delgado", "A patient worried about her eyes", "Rosa asks if Lumora will hurt her eyes. Don't advise her: send her to her doctor."],
          ["doctor", "Dr. Marcus Lee", "A patient's red eyes after a dose", "Dr. Lee mentions a patient with red eyes after starting. Report it within 24 hours."],
        ] },
    ],
  },
  {
    id: "c-arthelis", short: "art", title: "Arthelis safety essentials", productId: "p-arthelis", divisionId: "div-imm", teams: ["div-imm"],
    audience: "Field reps · Immunology", visibility: "audience", createdAt: "2026-09-22", publishedAt: "2026-09-25", materialOptional: true,
    brief: "Reps lead with the boxed warning, check the right patient before anything else, and report adverse events within 24 hours.",
    repFiles: [lib("src-arthelis-pi"), up("up-art-boxed", "Arthelis boxed warning summary", "Arthelis boxed warning summary.pdf", "pdf", 3, "p-arthelis")],
    contextIds: ["src-code"],
    objectives: [
      { id: "ob-art-boxed", title: "Lead with the boxed warning", people: ["doctor"],
        description: "Reps bring up the boxed warning early and in full, before any benefit.",
        weights: [{ competency: "c-safety", pct: 60 }, { competency: "c-compliance", pct: 40 }],
        lookFors: ["Raises the boxed warning before any benefit", "States it in full", "Doesn't soften it"],
        situations: [
          ["doctor", "Dr. Marcus Hale", "A rheumatologist who wants the upside first", "Dr. Hale asks for the benefits first. Lead with the boxed warning anyway, then the data."],
          ["doctor", "Dr. Lena Kim", "“Is it safe for my older patients?”", "Dr. Kim treats many patients over 65. Give the boxed warning and what the PI says about age."],
          ["doctor", "Dr. Owen Brooks", "Two minutes between patients", "Dr. Brooks has two minutes. Don't drop the boxed warning to save time."],
        ] },
      { id: "ob-art-screen", title: "Check for the right patient first", people: ["doctor", "nurse"],
        description: "Reps cover the checks the PI asks for before the first dose: infections, labs and risk factors.",
        weights: [{ competency: "c-opening", pct: 40 }, { competency: "c-safety", pct: 40 }, { competency: "c-dosing", pct: 20 }],
        lookFors: ["Mentions the baseline checks", "Asks about risk factors", "Keeps to the label's patient type"],
        situations: [
          ["nurse", "Nurse Ana Ruiz", "Baseline labs before the first dose", "Nurse Ruiz asks what to check before starting. Go through it as the PI lists it."],
          ["doctor", "Dr. Sofia Alvarez", "A patient who smokes", "Dr. Alvarez has a patient who smokes and has heart risk factors. Say what the PI says, nothing more."],
          ["doctor", "Dr. Daniel Cho", "Patients who failed one TNF blocker", "Dr. Cho asks who Arthelis is for. Keep to the approved patient type."],
        ] },
      { id: "ob-art-ae", title: "Report adverse events within 24 hours", people: ["doctor", "pharmacist"],
        description: "Any side effect someone mentions is reported within 24 hours, without guessing at the cause.",
        weights: [{ competency: "c-compliance", pct: 60 }, { competency: "c-safety", pct: 40 }],
        lookFors: ["Says it will be reported within 24 hours", "Collects the basics", "Doesn't speculate on the cause"],
        situations: [
          ["pharmacist", "Mei Lin, PharmD", "A pharmacist mentions a blood clot", "Mei Lin mentions a patient with a clot. Report it, and don't discuss the cause."],
          ["doctor", "Dr. Marcus Lee", "A patient's shingles", "Dr. Lee mentions shingles in a patient on Arthelis. Report it within 24 hours."],
          ["pharmacist", "Sam Patel, PharmD", "“Do I need to report a rash?”", "Sam asks whether a mild rash counts. Explain that you report it, and how."],
        ] },
    ],
  },
  {
    id: "c-ae-refresher", short: "aer", title: "Adverse event reporting refresher", teams: [],
    audience: "Everyone in the field", visibility: "everyone", createdAt: "2025-10-28", publishedAt: "2025-11-01",
    brief: "Everyone in the field spots an adverse event in conversation, reports it within 24 hours, and routes off-label questions to Medical Information.",
    repFiles: [up("up-aer-steps", "Adverse event reporting in four steps", "AE reporting in 4 steps.pdf", "pdf", 2)],
    contextIds: ["src-code"],
    objectives: [
      { id: "ob-aer-spot", title: "Spot an adverse event in conversation", people: ["doctor", "nurse", "patient"],
        description: "Reps recognise an adverse event even when it's mentioned in passing, and report it within 24 hours.",
        weights: [{ competency: "c-compliance", pct: 60 }, { competency: "c-safety", pct: 40 }],
        lookFors: ["Recognises the event", "Says it will be reported within 24 hours", "Doesn't give medical advice"],
        situations: [
          ["doctor", "Dr. Owen Brooks", "Mentioned in passing", "Dr. Brooks mentions a patient's headache at the end of a call. It still counts: report it."],
          ["nurse", "Nurse Grace Obi", "“A patient fainted after the injection”", "Nurse Obi tells you about a fainting episode. Report it within 24 hours."],
          ["patient", "Rosa Delgado", "A patient at a support event", "Rosa mentions dizziness since starting treatment. Point her to her doctor and report it."],
        ] },
      { id: "ob-aer-offlabel", title: "Route off-label questions to Medical Information", people: ["doctor", "pharmacist"],
        description: "Reps don't answer off-label questions; they offer a Medical Information request instead.",
        weights: [{ competency: "c-compliance", pct: 70 }, { competency: "c-safety", pct: 30 }],
        lookFors: ["Doesn't answer the off-label question", "Offers a Medical Information request", "Stays friendly and helpful"],
        situations: [
          ["doctor", "Dr. Lena Kim", "“Can I use it in children?”", "Dr. Kim asks about use in children, which isn't approved. Offer a Medical Information request."],
          ["pharmacist", "Jon Reyes, PharmD", "Dosing in kidney disease", "Jon asks about dosing the label doesn't cover. Route it to Medical Information."],
          ["doctor", "Dr. Marcus Hale", "A result from a congress poster", "Dr. Hale asks about unpublished data. Don't discuss it: offer a Medical Information request."],
        ] },
    ],
  },
  {
    id: "c-cardexa-label", short: "cdx", title: "Cardexa label update: what changed", productId: "p-cardexa", divisionId: "div-cm", teams: ["div-cm"],
    audience: "Field reps · Cardiometabolic", visibility: "audience", createdAt: "2026-10-26", publishedAt: "2026-10-28",
    brief: "Reps explain the new renal dosing and share the updated data exactly as the revised label states it.",
    repFiles: [lib("src-cdx-pi"), lib("src-cdx-va")], contextIds: ["src-selling"],
    objectives: [
      { id: "ob-cdx-renal", title: "Explain the new dosing in kidney disease", people: ["doctor", "pharmacist", "nurse"],
        description: "Reps explain the revised dose adjustment for kidney disease exactly as the October label states it.",
        weights: [{ competency: "c-dosing", pct: 60 }, { competency: "c-safety", pct: 40 }],
        lookFors: ["States the new adjustment exactly", "Says when it applies", "Mentions the monitoring the label asks for"],
        situations: [
          ["doctor", "Dr. Daniel Cho", "A cardiologist with many CKD patients", "Dr. Cho asks what changed for his patients with kidney disease."],
          ["pharmacist", "Sam Patel, PharmD", "The pharmacist updates the protocol", "Sam is updating the hospital protocol and wants the new dosing exactly."],
          ["nurse", "Nurse Tom Becker", "A patient's dose needs changing", "Nurse Becker asks how to explain the dose change to a patient."],
        ] },
      { id: "ob-cdx-data", title: "Share the new data, exactly as labelled", people: ["doctor"],
        description: "Reps share the updated results the way the revised label states them, and nothing beyond.",
        weights: [{ competency: "c-efficacy", pct: 60 }, { competency: "c-compliance", pct: 40 }],
        lookFors: ["Quotes the endpoint and population", "Keeps to the revised label", "Doesn't extrapolate"],
        situations: [
          ["doctor", "Dr. Marcus Hale", "“What does the new data actually show?”", "Dr. Hale wants the headline result. Give it exactly as labelled."],
          ["doctor", "Dr. Lena Kim", "Asked about a subgroup", "Dr. Kim asks about a subgroup the label doesn't cover. Say so, and offer Medical Information."],
          ["doctor", "Dr. Owen Brooks", "Rounding up the numbers", "Dr. Brooks summarises the result more generously than the label. Correct it politely."],
        ] },
    ],
  },
];

export const DIRECT_DEMO_IDS = SPECS.map((s) => s.id);

/** The demo trainings, with the defaults the rest of the seed uses. */
export const directDemoCourses = (settings: CourseSettings) => SPECS.map((s) => directCourse(s, settings).course);
/** Their situations: the same every load, so saved progress always finds them. */
export const DIRECT_DEMO_SCENARIOS: Scenario[] = SPECS.flatMap((s) => directCourse(s, {} as CourseSettings).scenarios);
