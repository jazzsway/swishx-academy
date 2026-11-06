import type { Course, CourseSettings, CourseVersion, Module } from "../types";
import { LUMORA_LAUNCH_MODULES } from "./lumora-launch";
import { LUMORA_ITEMS } from "./lumora-items";
import {
  AD101_MODULES, CARDEXA_ITEMS, CARDEXA_V1_MODULES, CARDEXA_V2_MODULES, COMPLIANCE_MODULES, NP_MODULES,
} from "./other-courses";

export function defaultSettings(type: Course["type"], over: Partial<CourseSettings> = {}): CourseSettings {
  const personalised = type === "personalised";
  return {
    screening: personalised,
    screeningCall: personalised,
    screeningScenarioId: personalised ? "sc-ruiz" : undefined,
    screeningItems: 12,
    assessmentItems: 12,
    assessmentCall: personalised,
    assessmentScenarioId: personalised ? "sc-kim" : undefined,
    passOverall: 80,
    passCritical: 70,
    passRoleplay: 75,
    criticalCompetencies: ["c-safety", "c-dosing"],
    attempts: 3,
    cooldownHours: 24,
    verify: personalised ? "manager" : "auto",
    recertMonths: 12,
    attestation: "I have read and understood the current Prescribing Information and will promote only within the approved indication.",
    aiReorder: false,
    managersMayAssign: true,
    completion: personalised
      ? { path: true, assessment: true, verify: true, attestation: true, checks: 0 }
      : { path: true, assessment: false, verify: false, attestation: true, checks: 80 },
    ...over,
  };
}

const vid = (courseId: string, v: number) => `${courseId.replace("c-", "").toUpperCase()}-v${v}-${(v * 7919).toString(36)}`;

function version(courseId: string, v: number, modules: Module[], over: Partial<CourseVersion>): CourseVersion {
  return { version: v, versionId: vid(courseId, v), state: "draft", comments: [], acknowledged: [], history: [], modules, ...over };
}

const MAYA = "u-maya";

export function seedCourses(): Course[] {
  return [
    {
      id: "c-compliance", title: "Compliance essentials", format: "short", type: "linear",
      objective: "Every rep knows the rules for on-label promotion, medical information requests and adverse event reporting.",
      audience: "All field roles", sourceIds: ["src-code"], competencyIds: ["c-compliance"],
      modules: COMPLIANCE_MODULES, items: [], scenarioIds: [],
      settings: defaultSettings("linear", { recertMonths: 12 }),
      versions: [version("c-compliance", 3, COMPLIANCE_MODULES, {
        state: "published", docNumber: "CORV-US-0101", approvedAt: "2026-01-10", expiresAt: "2027-01-10", publishedAt: "2026-01-12",
        history: [
          { at: "2026-01-02", by: "Maya Chen", action: "Submitted to MLR" },
          { at: "2026-01-10", by: "Maya Chen", action: "Recorded approval", note: "CORV-US-0101" },
          { at: "2026-01-12", by: "Maya Chen", action: "Published" },
        ] })],
      ownerId: MAYA, updatedAt: "2026-01-12", defaultFor: "All reps",
    },
    {
      id: "c-ad101", title: "Atopic dermatitis 101", format: "short", type: "linear",
      objective: "New and transferring reps understand atopic dermatitis, how severity is measured, and today's care pathway.",
      audience: "Immunology division", sourceIds: ["src-ad-guide"], competencyIds: ["c-disease", "c-competitive"],
      modules: AD101_MODULES, items: [], scenarioIds: [],
      settings: defaultSettings("linear"),
      versions: [version("c-ad101", 2, AD101_MODULES, {
        state: "published", docNumber: "CORV-US-0115", approvedAt: "2026-03-02", expiresAt: "2027-03-02", publishedAt: "2026-03-04",
        history: [{ at: "2026-03-02", by: "Maya Chen", action: "Recorded approval", note: "CORV-US-0115" }, { at: "2026-03-04", by: "Maya Chen", action: "Published" }] })],
      ownerId: MAYA, updatedAt: "2026-03-04", defaultFor: "Immunology",
    },
    {
      id: "c-lumora-launch", title: "Lumora launch readiness", productId: "p-lumora", format: "long", type: "personalised",
      objective: "Every Immunology rep can hold a compliant, confident first Lumora conversation: the right patient, the approved data, fair balance, and the top objections.",
      audience: "Immunology field reps and managers",
      sourceIds: ["src-lum-pi", "src-lum-va", "src-lum-p3", "src-lum-obj", "src-lum-payer", "src-ad-guide", "src-code"],
      competencyIds: ["c-disease", "c-moa", "c-efficacy", "c-dosing", "c-safety", "c-competitive", "c-access", "c-opening", "c-objections", "c-compliance"],
      modules: LUMORA_LAUNCH_MODULES, items: LUMORA_ITEMS, scenarioIds: ["sc-ruiz", "sc-kim"],
      settings: defaultSettings("personalised"),
      versions: [version("c-lumora-launch", 1, LUMORA_LAUNCH_MODULES, {
        state: "published", docNumber: "LUM-US-0233", approvedAt: "2026-09-08", expiresAt: "2027-09-08", publishedAt: "2026-09-15",
        submittedAt: "2026-08-25", vaultId: "VV-101293", packageAt: "2026-08-24",
        history: [
          { at: "2026-08-24", by: "Maya Chen", action: "Checks passed · MLR package generated" },
          { at: "2026-08-25", by: "Maya Chen", action: "Marked as submitted", note: "Vault VV-101293" },
          { at: "2026-09-02", by: "Maya Chen", action: "Changes requested", note: "2 comments" },
          { at: "2026-09-04", by: "Maya Chen", action: "Resubmitted" },
          { at: "2026-09-08", by: "Maya Chen", action: "Recorded approval", note: "LUM-US-0233" },
          { at: "2026-09-15", by: "Maya Chen", action: "Published · Launch readiness campaign" },
        ] })],
      ownerId: MAYA, updatedAt: "2026-09-15",
    },
    {
      id: "c-lumora-np", title: "Lumora for nurse practitioners", productId: "p-lumora", format: "short", type: "linear",
      objective: "Reps can support NP-led follow-up visits and the first injection.",
      audience: "Immunology reps", sourceIds: ["src-lum-pi", "src-lum-va", "src-ad-guide"], competencyIds: ["c-opening", "c-dosing"],
      modules: NP_MODULES, items: [], scenarioIds: [],
      settings: defaultSettings("linear"),
      versions: [version("c-lumora-np", 1, NP_MODULES, {
        state: "in_review", submittedAt: "2026-10-28", vaultId: "VV-104772", packageAt: "2026-10-27",
        history: [
          { at: "2026-10-27", by: "Maya Chen", action: "Checks passed · MLR package generated" },
          { at: "2026-10-28", by: "Maya Chen", action: "Marked as submitted", note: "Vault VV-104772" },
        ] })],
      ownerId: MAYA, updatedAt: "2026-10-28",
    },
    {
      id: "c-cardexa", title: "Cardexa label update 2026", productId: "p-cardexa", format: "short", type: "linear",
      objective: "Every Cardiometabolic rep knows what changed in the October 2026 Cardexa label and delivers the updated safety information.",
      audience: "Cardiometabolic division", sourceIds: ["src-cdx-pi", "src-cdx-va", "src-code"], competencyIds: ["c-safety", "c-dosing", "c-compliance"],
      modules: CARDEXA_V2_MODULES, items: CARDEXA_ITEMS, scenarioIds: [],
      settings: defaultSettings("linear", { recertMonths: 12 }),
      versions: [
        version("c-cardexa", 1, CARDEXA_V1_MODULES, {
          state: "published", docNumber: "CDX-US-0412", approvedAt: "2025-11-18", expiresAt: "2026-11-18", publishedAt: "2025-11-20",
          history: [{ at: "2025-11-18", by: "Maya Chen", action: "Recorded approval", note: "CDX-US-0412" }, { at: "2025-11-20", by: "Maya Chen", action: "Published" }] }),
        version("c-cardexa", 2, CARDEXA_V2_MODULES, {
          state: "changes", submittedAt: "2026-10-21", vaultId: "VV-104410", packageAt: "2026-10-20",
          comments: [
            { id: "mc1", text: "Module 1: \"preferred option for all heart failure patients\" is unsupported and broader than the indication (HFrEF only). Remove.", resolved: false, moduleId: "cx2-1" },
            { id: "mc2", text: "Module 2: add the source page for the eGFR <20 statement in the learner view.", resolved: false, moduleId: "cx2-2" },
            { id: "mc3", text: "Module 3: include \"high-dose diuretics\" exactly as in section 5.2.", resolved: false, moduleId: "cx2-3" },
            { id: "mc4", text: "Assessment: question 1 distractor \"Angioedema\" could confuse; replace with a non-label term.", resolved: false },
          ],
          history: [
            { at: "2026-10-20", by: "Maya Chen", action: "Checks passed · MLR package generated" },
            { at: "2026-10-21", by: "Maya Chen", action: "Marked as submitted", note: "Vault VV-104410" },
            { at: "2026-11-04", by: "Maya Chen", action: "Changes requested", note: "4 comments" },
          ] }),
      ],
      ownerId: MAYA, updatedAt: "2026-11-04",
    },
  ];
}

export { LUMORA_LAUNCH_MODULES, LUMORA_ITEMS };
