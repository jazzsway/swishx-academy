import type { Course, Objective, Scenario, Source } from "../types";
import { SOURCES } from "../org";
import { directModules } from "@/features/trainer/materials";
import { draftScenario } from "@/lib/roleplay-draft";
import { withWeights } from "@/lib/scenario-set";

/*
 * The direct-course story, prebuilt: the Corvana training team's own Lumora files, shown to reps
 * exactly as they are, plus a roleplay drafted from their objection handler and selling model.
 * SwishX wrote nothing in it and added no questions.
 */

export const FIELD_KIT_ID = "c-fieldkit";
export const FIELD_KIT_SCENARIO_ID = "sc-fieldkit";
export const FIELD_KIT_SCREENER_ID = "sc-fieldkit-screen";
export const FIELD_KIT_MANAGER_ID = "sc-fieldkit-pm";

/** The team's own video. There's no file behind it in the demo, so it plays as the stand-in. */
const MOA_VIDEO: Source = {
  id: "up-fk-moa", title: "Lumora mechanism explainer", type: "Uploaded file", pages: 0, productId: "p-lumora",
  uploaded: { fileName: "Lumora mechanism explainer.mp4", format: "video", at: "2026-11-05T10:00:00" },
};

const src = (id: string) => SOURCES.find((s) => s.id === id)!;
const REP_FILES = [MOA_VIDEO, src("src-lum-va"), src("src-lum-pi"), src("src-lum-payer")];
const ROLEPLAY_DOCS = ["src-lum-obj", "src-selling"];

export const FIELD_KIT_MODULES = directModules(REP_FILES, "fk");

export const FIELD_KIT_SCENARIO: Scenario = {
  ...withWeights(draftScenario({
    courseId: FIELD_KIT_ID, productId: "p-lumora", sources: ROLEPLAY_DOCS.map(src), sellingModelId: "src-selling",
    id: FIELD_KIT_SCENARIO_ID, name: "Dr. Lena Kim", createdAt: "2026-11-05T10:05:00",
  }), [{ competency: "c-opening", pct: 30 }, { competency: "c-objections", pct: 40 }, { competency: "c-access", pct: 15 }, { competency: "c-compliance", pct: 15 }]),
  title: "First call with a busy dermatologist", character: "doctor", objectiveId: "ob-fk-open",
  description: "Dr. Kim has five minutes between patients and is happy with what she prescribes. Open on the right patient, handle the pushback on cost, and ask for a next step.",
};

/** The screening actor: a separate, shorter first call. Not graded; it decides which files each rep skips. */
export const FIELD_KIT_SCREENER: Scenario = {
  ...withWeights(draftScenario({ courseId: FIELD_KIT_ID, productId: "p-lumora", sources: ROLEPLAY_DOCS.map(src), sellingModelId: "src-selling", id: FIELD_KIT_SCREENER_ID, name: "Dr. Elena Ruiz", createdAt: "2026-11-05T10:06:00" }),
    [{ competency: "c-opening", pct: 40 }, { competency: "c-objections", pct: 35 }, { competency: "c-safety", pct: 25 }]),
  title: "A sceptical dermatologist, happy with current treatment", character: "doctor", durationMin: 3, use: ["screening"], objectiveId: "ob-fk-open",
  description: "Dr. Ruiz doesn't see why she'd change what works. Find the patients who still aren't at goal, and keep fair balance when she asks about side effects.",
};

/** The practice manager: the support program, without promising what a plan will pay. */
const pm = draftScenario({ courseId: FIELD_KIT_ID, productId: "p-lumora", sources: ROLEPLAY_DOCS.map(src), sellingModelId: "src-selling", id: FIELD_KIT_MANAGER_ID, name: "Dana Whitfield", createdAt: "2026-11-05T10:07:00" });
export const FIELD_KIT_MANAGER: Scenario = {
  ...withWeights(pm, [{ competency: "c-access", pct: 60 }, { competency: "c-objections", pct: 25 }, { competency: "c-compliance", pct: 15 }]),
  title: "The practice manager worries about prior auths", character: "manager", objectiveId: "ob-fk-access", durationMin: 4, objectionIds: ["ob-cost"],
  persona: { ...pm.persona, name: "Dana Whitfield", specialty: "Practice manager", setting: "Dermatology group, front office", traits: ["Practical", "Short on staff", "Wary of paperwork"],
    opening: "I've got two minutes. Every new biologic means more prior auths for my team. What does Lumora do about that?" },
  description: "Staff are drowning in paperwork. Show what the support program takes off their hands, and don't promise what any plan will cover.",
  objective: "Explain the Lumora support program to Dana, without promising coverage, and agree a next step.",
};

/** What reps should be able to do on the call, each tested by one or more situations. */
export const FIELD_KIT_OBJECTIVES: Objective[] = [
  {
    id: "ob-fk-open", title: "Open on the right patient and handle the pushback", people: ["doctor"],
    description: "With a dermatologist who's happy with what she prescribes, reps open on the adults who still aren't at goal, handle the pushback, and ask for a next step.",
    weights: [{ competency: "c-opening", pct: 35 }, { competency: "c-objections", pct: 40 }, { competency: "c-safety", pct: 25 }],
    cites: [{ sourceId: "src-lum-va", page: 3, quote: "adults with moderate-to-severe disease not adequately controlled with topical therapies" }, { sourceId: "src-lum-obj", page: 2, quote: "acknowledge, then answer with the approved data" }],
    lookFors: ["Names the patient type the label supports in the first minute", "Acknowledges the pushback before answering it", "Gives the safety information alongside any benefit", "Asks for a next step"],
  },
  {
    id: "ob-fk-access", title: "Explain the support program without promising coverage", people: ["manager"],
    description: "Reps explain what the support program does for the office and the patient, and never promise that a plan will cover it.",
    weights: [{ competency: "c-access", pct: 60 }, { competency: "c-objections", pct: 25 }, { competency: "c-compliance", pct: 15 }],
    cites: [{ sourceId: "src-lum-payer", page: 2, quote: "the program provides benefits verification and prior authorization support" }],
    lookFors: ["Explains what the support program takes off the office", "Never promises coverage or a copay amount", "Gives the next step: a benefits check"],
  },
];

export function fieldKitCourse(settings: Course["settings"]): Course {
  const at = "2026-11-06";
  return {
    id: FIELD_KIT_ID, title: "Lumora field kit", productId: "p-lumora", format: "long", type: "linear", origin: "direct",
    objective: "Reps go through the training team's own Lumora files, as they are, then practise the call and pass it.",
    audience: "Field reps · Immunology", writtenFor: "reps", teams: ["div-imm"], divisionId: "div-imm",
    sourceIds: [...REP_FILES.map((s) => s.id), ...ROLEPLAY_DOCS], roleplaySourceIds: ROLEPLAY_DOCS,
    competencyIds: [...new Set(FIELD_KIT_MODULES.map((m) => m.competency))],
    modules: FIELD_KIT_MODULES, items: [], scenarioIds: [FIELD_KIT_SCREENER_ID, FIELD_KIT_SCENARIO_ID, FIELD_KIT_MANAGER_ID], objectives: FIELD_KIT_OBJECTIVES,
    brief: "Reps can open a first call with a dermatologist on the right patient, handle the cost objection with the support program, and stay on-label.",
    settings: { ...settings, screeningIds: [FIELD_KIT_SCREENER_ID] },
    versions: [{
      version: 1, versionId: "FIELDKIT-v1-fk01", state: "published", publishedAt: at, comments: [], acknowledged: [], modules: FIELD_KIT_MODULES,
      history: [{ at: "2026-11-05", by: "Maya Chen", action: "Created from your materials" }, { at, by: "Maya Chen", action: "Published" }],
    }],
    ownerId: "u-maya", updatedAt: at, visibility: "audience", prerequisites: [], allowExplore: true,
  };
}
