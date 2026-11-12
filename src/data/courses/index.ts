import type { Course, CourseSettings, CourseVersion, Module } from "../types";
import { templateFor } from "@/lib/short-form";
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
    verify: "auto", // v1-hidden: was personalised ? "manager" : "auto" (no manager sign-off in v1)
    recertMonths: 12,
    attestation: "I have read and understood the current Prescribing Information and will promote only within the approved indication.",
    completion: personalised
      ? { path: true, assessment: true, verify: true, attestation: true, checks: 0 }
      : { path: true, assessment: false, verify: false, attestation: true, checks: 80 },
    ...over,
  };
}

const vid = (courseId: string, v: number) => `${courseId.replace("c-", "").toUpperCase()}-v${v}-${(v * 7919).toString(36)}`;

function version(courseId: string, v: number, modules: Module[], over: Partial<CourseVersion>): CourseVersion {
  return withoutMlr({ version: v, versionId: vid(courseId, v), state: "draft", comments: [], acknowledged: [], history: [], modules, ...over });
}

/* v1-hidden: no MLR in v1. Unpublished versions are drafts, and the MLR steps drop out of their history.
   Delete this wrapper to bring the MLR demo data back. */
const MLR_STEP = /MLR|Submitted|Marked as submitted|Recorded approval|Changes requested|Resubmitted/;
function withoutMlr(v: CourseVersion): CourseVersion {
  const live = v.state === "published" || v.state === "superseded" || v.state === "withdrawn" || v.state === "expired";
  return {
    ...v, state: live ? v.state : "draft", comments: [],
    history: v.history.filter((h) => !MLR_STEP.test(h.action)).map((h) => ({ ...h, action: h.action.replace(/ · .*campaign$/, "") })),
  };
}

const MAYA = "u-maya";

/** A copy of existing modules with fresh ids, so the same lesson can live in a second course. */
const clone = (mods: Module[], prefix: string): Module[] =>
  mods.map((m, i) => ({ ...m, id: `${prefix}-m${i + 1}`, blocks: m.blocks.map((b, j) => ({ ...b, id: `${prefix}-m${i + 1}-b${j + 1}` })) }));
const launch = (...ids: string[]) => LUMORA_LAUNCH_MODULES.filter((m) => ids.includes(m.id));

/** Open courses reps can pick up themselves: nobody is assigned them. */
function libraryCourse(id: string, title: string, objective: string, mods: Module[], scope: { productId?: string; divisionId?: string; everyone?: boolean }, publishedAt: string): Course {
  return {
    id, title, format: "short", template: templateFor(title), type: "linear", objective, productId: scope.productId, divisionId: scope.divisionId,
    audience: scope.everyone ? "Everyone" : "Immunology division", sourceIds: scope.productId ? ["src-lum-pi", "src-lum-obj"] : ["src-code"],
    competencyIds: [...new Set(mods.map((m) => m.competency))], modules: mods, items: [], scenarioIds: [],
    settings: defaultSettings("linear", { recertMonths: 24 }),
    versions: [version(id, 1, mods, { state: "published", publishedAt, history: [{ at: publishedAt, by: "Maya Chen", action: "Published" }] })],
    ownerId: MAYA, updatedAt: publishedAt, visibility: scope.everyone ? "everyone" : "audience", prerequisites: [], allowExplore: true,
  };
}

export function seedCourses(): Course[] {
  const list: Course[] = [
    {
      id: "c-compliance", title: "Compliance essentials", format: "short", template: "essentials", type: "linear",
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
      visibility: "everyone", prerequisites: [], allowExplore: true,
    },
    {
      id: "c-ad101", title: "Atopic dermatitis 101", format: "short", template: "myth", type: "linear",
      objective: "New and transferring reps understand atopic dermatitis, how severity is measured, and today's care pathway.",
      audience: "Immunology division", sourceIds: ["src-ad-guide"], competencyIds: ["c-disease", "c-competitive"],
      modules: AD101_MODULES, items: [], scenarioIds: [],
      settings: defaultSettings("linear"),
      versions: [version("c-ad101", 2, AD101_MODULES, {
        state: "published", docNumber: "CORV-US-0115", approvedAt: "2026-03-02", expiresAt: "2027-03-02", publishedAt: "2026-03-04",
        history: [{ at: "2026-03-02", by: "Maya Chen", action: "Recorded approval", note: "CORV-US-0115" }, { at: "2026-03-04", by: "Maya Chen", action: "Published" }] })],
      ownerId: MAYA, updatedAt: "2026-03-04", defaultFor: "Immunology",
      divisionId: "div-imm", visibility: "audience", prerequisites: [], allowExplore: true,
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
      visibility: "audience", prerequisites: ["c-compliance", "c-ad101"], allowExplore: true,
    },
    {
      id: "c-lumora-np", title: "Lumora for nurse practitioners", productId: "p-lumora", format: "short", template: "glance", type: "linear",
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
      visibility: "audience", prerequisites: [], allowExplore: true,
    },
    {
      id: "c-cardexa", title: "Cardexa label update 2026", productId: "p-cardexa", format: "short", template: "label", type: "linear",
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
      visibility: "audience", prerequisites: ["c-compliance"], allowExplore: true,
    },
    /* A finished personalised course from Priya's first months, so her record shows a full before and after. */
    {
      id: "c-skills", title: "Field selling skills: open, handle, balance", format: "long", type: "personalised",
      objective: "Reps open on the right patient, handle the access and cost objection, and keep fair balance in every conversation.",
      audience: "Immunology division", divisionId: "div-imm", sourceIds: ["src-lum-pi", "src-lum-obj", "src-lum-payer", "src-code"],
      competencyIds: ["c-opening", "c-objections", "c-access", "c-safety", "c-compliance"],
      modules: clone(launch("lm13", "lm14", "lm11", "lm9"), "skl"),
      items: LUMORA_ITEMS.filter((i) => ["c-opening", "c-objections", "c-access", "c-safety", "c-compliance"].includes(i.competency)).map((i) => ({ ...i, id: `skl-${i.id}` })),
      scenarioIds: [],
      settings: defaultSettings("personalised", { screeningCall: false, assessmentCall: false, screeningScenarioId: undefined, assessmentScenarioId: undefined, criticalCompetencies: ["c-safety", "c-objections"] }),
      versions: [version("c-skills", 1, clone(launch("lm13", "lm14", "lm11", "lm9"), "skl"), { state: "published", publishedAt: "2026-04-28", history: [{ at: "2026-04-28", by: "Maya Chen", action: "Published" }] })],
      ownerId: MAYA, updatedAt: "2026-04-28", visibility: "assigned", prerequisites: [], allowExplore: false,
    },
    /* The flagship's own content as short form: the same approved modules, broken into cards. */
    {
      id: "c-lumora-short", title: "Lumora essentials, card by card", productId: "p-lumora", format: "short", template: "glance", type: "linear",
      objective: "Reps can explain who Lumora is for, how it works, the week-16 data, dosing and the safety information, in a few minutes a day.",
      audience: "Immunology division", divisionId: "div-imm", sourceIds: ["src-lum-pi", "src-lum-va", "src-lum-p3", "src-ad-guide"],
      competencyIds: ["c-disease", "c-moa", "c-efficacy", "c-dosing", "c-safety"],
      modules: clone(launch("lm1", "lm3", "lm4", "lm6", "lm8"), "lsf"), items: [], scenarioIds: [],
      settings: defaultSettings("linear"),
      versions: [version("c-lumora-short", 1, clone(launch("lm1", "lm3", "lm4", "lm6", "lm8"), "lsf"), {
        state: "published", docNumber: "LUM-US-0241", approvedAt: "2026-10-16", expiresAt: "2027-10-16", publishedAt: "2026-10-20",
        history: [{ at: "2026-10-16", by: "Maya Chen", action: "Recorded approval", note: "LUM-US-0241" }, { at: "2026-10-20", by: "Maya Chen", action: "Published" }] })],
      ownerId: MAYA, updatedAt: "2026-10-20", visibility: "audience", prerequisites: [], allowExplore: true,
    },
    libraryCourse("c-lib-objections", "Handling the top Lumora objections", "Reps answer the five objections dermatologists raise most, from the approved objection handler.",
      clone(launch("lm14", "lm12"), "lob"), { productId: "p-lumora" }, "2026-09-22"),
    libraryCourse("c-lib-firstcall", "Opening a great first call", "Reps open on the right patient type and ask questions that earn a second visit.",
      clone(launch("lm13"), "lfc"), { productId: "p-lumora" }, "2026-10-01"),
    libraryCourse("c-lib-mi", "Medical information and adverse events: a refresher", "A five-minute refresher on routing off-label questions and reporting adverse events within 24 hours.",
      clone(COMPLIANCE_MODULES.filter((m) => m.id !== "ce1"), "lmi"), { everyone: true }, "2026-06-10"),
    libraryCourse("c-lib-np", "Working with nurse practitioners", "Who NPs see, what they ask about, and how to support NP-led follow-up visits.",
      clone(NP_MODULES.slice(0, 1), "lnp"), { everyone: true }, "2026-07-15"),
  ];
  /* The flagship course leads every list. */
  const FIRST = "c-lumora-launch";
  return [...list.filter((c) => c.id === FIRST), ...list.filter((c) => c.id !== FIRST)];
}

export { LUMORA_LAUNCH_MODULES, LUMORA_ITEMS };
