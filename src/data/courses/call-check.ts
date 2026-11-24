import type { Course, Scenario } from "../types";
import { FIELD_KIT_SCREENER, FIELD_KIT_SCENARIO, FIELD_KIT_MANAGER, FIELD_KIT_OBJECTIVES } from "./field-kit";

/*
 * A calls-only training, prebuilt: the trainer added a single document, the objection handler, as
 * context only. Reps see no material; the training is a screening call, the scored calls and the
 * certificate. Same people and objectives as the field kit, so the calls feel familiar.
 */

export const CALL_CHECK_ID = "c-callcheck";
const CONTEXT_DOC = "src-lum-obj";

const own = (sc: Scenario, id: string): Scenario => ({ ...sc, id, courseId: CALL_CHECK_ID });
export const CALL_CHECK_SCREENER = own(FIELD_KIT_SCREENER, "sc-cc-screen");
export const CALL_CHECK_DOCTOR = own(FIELD_KIT_SCENARIO, "sc-cc-doc");
export const CALL_CHECK_MANAGER = own(FIELD_KIT_MANAGER, "sc-cc-pm");
export const CALL_CHECK_SCENARIOS = [CALL_CHECK_SCREENER, CALL_CHECK_DOCTOR, CALL_CHECK_MANAGER];

export function callCheckCourse(settings: Course["settings"]): Course {
  const at = "2026-11-06";
  return {
    id: CALL_CHECK_ID, title: "Lumora call check", productId: "p-lumora", format: "long", type: "personalised", origin: "direct",
    objective: "Reps show they can handle the first call and the practice manager's access questions. No lessons: just the calls.",
    audience: "Field reps · Immunology", writtenFor: "reps", teams: ["div-imm"], divisionId: "div-imm",
    sourceIds: [CONTEXT_DOC], roleplaySourceIds: [CONTEXT_DOC], competencyIds: ["c-opening", "c-objections", "c-access"],
    modules: [], items: [], scenarioIds: CALL_CHECK_SCENARIOS.map((x) => x.id), objectives: FIELD_KIT_OBJECTIVES.slice(0, 2),
    brief: "Check that reps can open on the right patient, handle the pushback, and explain the support program without promising coverage.",
    settings: { ...settings, callsOnly: true, screeningIds: [CALL_CHECK_SCREENER.id], screeningScenarioId: CALL_CHECK_SCREENER.id, assessmentScenarioId: CALL_CHECK_DOCTOR.id },
    versions: [{
      version: 1, versionId: "CALLCHECK-v1-cc01", state: "published", publishedAt: at, comments: [], acknowledged: [], modules: [],
      history: [{ at: "2026-11-05", by: "Maya Chen", action: "Created from your materials · calls only" }, { at, by: "Maya Chen", action: "Published" }],
    }],
    ownerId: "u-maya", updatedAt: at, visibility: "audience", prerequisites: [], allowExplore: false,
  };
}
