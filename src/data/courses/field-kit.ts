import type { Course, Scenario, Source } from "../types";
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
  title: "First call with a busy dermatologist", character: "doctor",
  description: "Dr. Kim has five minutes between patients and is happy with what she prescribes. Open on the right patient, handle the pushback on cost, and ask for a next step.",
};

/** The screening actor: a separate, shorter first call. Not graded; it decides which files each rep skips. */
export const FIELD_KIT_SCREENER: Scenario = {
  ...withWeights(draftScenario({ courseId: FIELD_KIT_ID, productId: "p-lumora", sources: ROLEPLAY_DOCS.map(src), sellingModelId: "src-selling", id: FIELD_KIT_SCREENER_ID, name: "Dr. Elena Ruiz", createdAt: "2026-11-05T10:06:00" }),
    [{ competency: "c-opening", pct: 40 }, { competency: "c-objections", pct: 35 }, { competency: "c-safety", pct: 25 }]),
  title: "A sceptical dermatologist, happy with current treatment", character: "doctor", durationMin: 3, use: ["screening"],
  description: "Dr. Ruiz doesn't see why she'd change what works. Find the patients who still aren't at goal, and keep fair balance when she asks about side effects.",
};

export function fieldKitCourse(settings: Course["settings"]): Course {
  const at = "2026-11-06";
  return {
    id: FIELD_KIT_ID, title: "Lumora field kit", productId: "p-lumora", format: "long", type: "linear", origin: "direct",
    objective: "Reps go through the training team's own Lumora files, as they are, then practise the call and pass it.",
    audience: "Field reps · Immunology", writtenFor: "reps", teams: ["div-imm"], divisionId: "div-imm",
    sourceIds: [...REP_FILES.map((s) => s.id), ...ROLEPLAY_DOCS], roleplaySourceIds: ROLEPLAY_DOCS,
    competencyIds: [...new Set(FIELD_KIT_MODULES.map((m) => m.competency))],
    modules: FIELD_KIT_MODULES, items: [], scenarioIds: [FIELD_KIT_SCREENER_ID, FIELD_KIT_SCENARIO_ID],
    brief: "Reps can open a first call with a dermatologist on the right patient, handle the cost objection with the support program, and stay on-label.",
    settings: { ...settings, screeningIds: [FIELD_KIT_SCREENER_ID] },
    versions: [{
      version: 1, versionId: "FIELDKIT-v1-fk01", state: "published", publishedAt: at, comments: [], acknowledged: [], modules: FIELD_KIT_MODULES,
      history: [{ at: "2026-11-05", by: "Maya Chen", action: "Created from your materials" }, { at, by: "Maya Chen", action: "Published" }],
    }],
    ownerId: "u-maya", updatedAt: at, visibility: "audience", prerequisites: [], allowExplore: true,
  };
}
