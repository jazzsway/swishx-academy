import type { Course, Scenario, Source } from "../types";
import { SOURCES } from "../org";
import { directModules } from "@/features/trainer/materials";
import { draftScenario } from "@/lib/roleplay-draft";

/*
 * The direct-course story, prebuilt: the Corvana training team's own Lumora files, shown to reps
 * exactly as they are, plus a roleplay drafted from their objection handler and selling model.
 * SwishX wrote nothing in it and added no questions.
 */

export const FIELD_KIT_ID = "c-fieldkit";
export const FIELD_KIT_SCENARIO_ID = "sc-fieldkit";

/** The team's own video. There's no file behind it in the demo, so it plays as the stand-in. */
const MOA_VIDEO: Source = {
  id: "up-fk-moa", title: "Lumora mechanism explainer", type: "Uploaded file", pages: 0, productId: "p-lumora",
  uploaded: { fileName: "Lumora mechanism explainer.mp4", format: "video", at: "2026-11-05T10:00:00" },
};

const src = (id: string) => SOURCES.find((s) => s.id === id)!;
const REP_FILES = [MOA_VIDEO, src("src-lum-va"), src("src-lum-pi"), src("src-lum-payer")];
const ROLEPLAY_DOCS = ["src-lum-obj", "src-selling"];

export const FIELD_KIT_MODULES = directModules(REP_FILES, "fk");

export const FIELD_KIT_SCENARIO: Scenario = draftScenario({
  courseId: FIELD_KIT_ID, productId: "p-lumora", sources: ROLEPLAY_DOCS.map(src), sellingModelId: "src-selling",
  id: FIELD_KIT_SCENARIO_ID, name: "Dr. Lena Kim", createdAt: "2026-11-05T10:05:00",
});

export function fieldKitCourse(settings: Course["settings"]): Course {
  const at = "2026-11-06";
  return {
    id: FIELD_KIT_ID, title: "Lumora field kit · Direct from sources", productId: "p-lumora", format: "long", type: "linear", origin: "direct",
    objective: "Reps go through the training team's own Lumora files, as they are, then practise the call and pass it.",
    audience: "Field reps · Immunology", writtenFor: "reps", teams: ["div-imm"], divisionId: "div-imm",
    sourceIds: [...REP_FILES.map((s) => s.id), ...ROLEPLAY_DOCS], roleplaySourceIds: ROLEPLAY_DOCS,
    competencyIds: [...new Set(FIELD_KIT_MODULES.map((m) => m.competency))],
    modules: FIELD_KIT_MODULES, items: [], scenarioIds: [FIELD_KIT_SCENARIO_ID],
    settings,
    versions: [{
      version: 1, versionId: "FIELDKIT-v1-fk01", state: "published", publishedAt: at, comments: [], acknowledged: [], modules: FIELD_KIT_MODULES,
      history: [{ at: "2026-11-05", by: "Maya Chen", action: "Created from your materials" }, { at, by: "Maya Chen", action: "Published" }],
    }],
    ownerId: "u-maya", updatedAt: at, visibility: "audience", prerequisites: [], allowExplore: true,
  };
}
