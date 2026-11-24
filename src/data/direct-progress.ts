import type { Attempt, Course, Progress, Scenario, ScenarioRun, User } from "./types";
import { buildPath } from "@/lib/learning";
import { FIELD_KIT_MANAGER, FIELD_KIT_SAFETY, FIELD_KIT_SCENARIO, FIELD_KIT_SCREENER } from "./courses/field-kit";
import { CALL_CHECK_SCENARIOS } from "./courses/call-check";
import { SWITCH_SCENARIOS } from "./courses/switch-talk";
import { DIRECT_DEMO_SCENARIOS } from "./courses/direct-demo";

/*
 * Who's where on the trainings built from the trainer's own material. Priya's rows are placed by hand so
 * her profile shows every case: not started, overdue mid-assessments, part-way through mandatory material,
 * picked herself from the Library, recommended with no due date, completed, and certified but expiring.
 * Everyone else follows a deterministic mix per training.
 */

const SCENARIOS: Scenario[] = [FIELD_KIT_SCREENER, FIELD_KIT_SCENARIO, FIELD_KIT_MANAGER, FIELD_KIT_SAFETY, ...CALL_CHECK_SCENARIOS, ...SWITCH_SCENARIOS, ...DIRECT_DEMO_SCENARIOS];
const TODAY = "2026-11-06";

const day = (iso: string, plus: number) => { const d = new Date(iso); d.setDate(d.getDate() + plus); return d.toISOString().slice(0, 10); };
const addMonths = (iso: string, n: number) => { const d = new Date(iso); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
const notAfterToday = (iso: string) => (iso > TODAY ? TODAY : iso);
const mandatory = (c: Course) => c.modules.length > 0 && !c.settings.materialOptional;

/** The situation each objective is assessed on: the first one in its bank that isn't screening-only. */
function assessedOn(c: Course) {
  return (c.objectives ?? []).map((ob) => SCENARIOS.find((x) => c.scenarioIds.includes(x.id) && x.objectiveId === ob.id && (!x.use.includes("screening") || x.use.includes("assessment"))));
}

/** A screening baseline across the training's criteria, varied by person. */
function baseline(c: Course, n: number) {
  const scores = Object.fromEntries(c.competencyIds.map((comp, k) => [comp, 44 + ((n * 13 + k * 17) % 42)]));
  const vals = Object.values(scores);
  return { scores, overall: Math.round(vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length)) };
}

/** Assessment calls taken: one per objective, passed, failed, or not taken yet. */
function runs(c: Course, at: string, outcomes: ("pass" | "fail" | null)[], n: number): Record<string, ScenarioRun> {
  const out: Record<string, ScenarioRun> = {};
  assessedOn(c).forEach((sc, k) => {
    const o = outcomes[k];
    if (!sc || !o) return;
    const score = o === "pass" ? 77 + ((n * 7 + k * 5) % 19) : 52 + ((n * 3 + k * 7) % 18);
    out[sc.id] = { at: `${day(at, k)}T1${k % 9}:20:00`, score, passed: o === "pass", tries: 1, scores: Object.fromEntries((sc.weights ?? []).map((w) => [w.competency, Math.min(100, score + ((k * 5) % 9) - 4)])) };
  });
  return out;
}

/** The passed attempt a certified rep has on record, from their calls. */
function passedAttempt(at: string, r: Record<string, ScenarioRun>): Attempt {
  const vals = Object.values(r);
  const overall = Math.round(vals.reduce((a, x) => a + x.score, 0) / Math.max(1, vals.length));
  const comp: Record<string, number[]> = {};
  for (const x of vals) for (const [k, v] of Object.entries(x.scores ?? {})) (comp[k] ??= []).push(v);
  return { at: `${at}T15:00:00`, quiz: 0, roleplay: overall, overall, passed: true, failedCompetencies: [], competencyScores: Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)])) };
}

type Kind = "none" | "learn" | "calls" | "cert";
interface Base { assignedAt: string; dueAt?: string; assignType: Progress["assignType"] }

function row(c: Course, u: User, kind: Kind, n: number, base: Base, over: Partial<Progress> = {}): Progress {
  const p: Progress = { id: `p-${u.id}-${c.id.slice(2)}`, userId: u.id, courseId: c.id, version: 1, state: "not_started", ...base, completedBlocks: [], minutesSpent: 0, attempts: [], coachingNotes: [] };
  if (kind === "none") return { ...p, ...over };
  const startedAt = notAfterToday(day(base.assignedAt, 1 + (n % 4)));
  const b = baseline(c, n);
  p.startedAt = startedAt;
  p.state = "learning";
  if (c.settings.screening) {
    p.screening = { at: `${startedAt}T10:00:00`, overall: b.overall, scores: b.scores };
    if (mandatory(c)) { p.path = buildPath(c.modules, b.scores, "screening"); p.path.builtAt = startedAt; }
  }
  const files = c.modules.filter((m) => !p.path || p.path.moduleIds.includes(m.id)).map((m) => m.blocks[0].id);
  /* Mandatory material: part-way while learning, all of it before the calls. Optional: some looked at. */
  p.completedBlocks = !c.modules.length ? [] : kind === "learn" ? files.slice(0, Math.max(1, Math.floor(files.length / 2))) : mandatory(c) ? files : files.slice(0, n % 2);
  p.minutesSpent = 4 + p.completedBlocks.length * 6;
  const obs = c.objectives?.length ?? 0;
  if (kind === "calls") {
    const callsAt = notAfterToday(day(startedAt, 2));
    p.scenarioRuns = runs(c, callsAt, Array.from({ length: obs }, (_, k) => (k < Math.ceil(obs / 2) ? (k === 0 && n % 3 === 0 ? "fail" : "pass") : null)), n);
    p.state = "assessment";
    p.minutesSpent += 8 * Object.keys(p.scenarioRuns).length;
  }
  if (kind === "cert") {
    const callsAt = notAfterToday(day(startedAt, 2 + (n % 5)));
    p.scenarioRuns = runs(c, callsAt, Array.from({ length: obs }, () => "pass"), n);
    const certAt = notAfterToday(day(callsAt, obs));
    p.attempts = [passedAttempt(certAt, p.scenarioRuns)];
    p.state = "certified";
    p.certifiedAt = certAt;
    p.certExpiresAt = addMonths(certAt, c.settings.recertMonths);
    p.minutesSpent += 8 * obs;
  }
  return { ...p, ...over };
}

/** A training's cohort: a deterministic mix of certified, in the assessments, in the material, and not started. */
function cohort(c: Course, people: User[], base: Base, mix: { cert: number; calls: number; learn: number }): Progress[] {
  return people.map((u, i) => {
    const roll = ((i * 37 + c.id.length * 11) % 100) / 100;
    const kind: Kind = roll < mix.cert ? "cert" : roll < mix.cert + mix.calls ? "calls" : roll < mix.cert + mix.calls + mix.learn && c.modules.length ? "learn" : "none";
    return row(c, u, kind, i + 3, base);
  });
}

export function directProgress(courses: Course[], users: User[]): Progress[] {
  const c = (id: string) => courses.find((x) => x.id === id)!;
  const reps = users.filter((u) => u.roles.includes("rep") && u.id !== "u-priya");
  const imm = reps.filter((u) => u.divisionId === "div-imm");
  const cm = reps.filter((u) => u.divisionId === "div-cm");
  const priya = users.find((u) => u.id === "u-priya")!;
  const out: Progress[] = [];

  /* ── Everyone else ── */
  out.push(...cohort(c("c-switch"), imm.slice(0, 40), { assignedAt: "2026-11-02", dueAt: "2026-11-26", assignType: "required" }, { cert: 0.2, calls: 0.25, learn: 0 }));
  out.push(...cohort(c("c-callcheck"), imm.slice(0, 60), { assignedAt: "2026-10-21", dueAt: "2026-11-04", assignType: "required" }, { cert: 0.55, calls: 0.2, learn: 0 }));
  out.push(...cohort(c("c-fieldkit"), imm, { assignedAt: "2026-10-12", dueAt: "2026-12-06", assignType: "required" }, { cert: 0.42, calls: 0.14, learn: 0.22 }));
  out.push(...cohort(c("c-colivant"), imm.filter((u) => u.regionId === "reg-central"), { assignedAt: "2026-10-16", dueAt: "2026-11-30", assignType: "required" }, { cert: 0.3, calls: 0.2, learn: 0.25 }));
  out.push(...cohort(c("c-lumora-drills"), imm.slice(40, 90), { assignedAt: "2026-10-23", assignType: "recommended" }, { cert: 0.3, calls: 0.15, learn: 0 }));
  out.push(...cohort(c("c-arthelis"), imm, { assignedAt: "2026-09-28", dueAt: "2026-10-26", assignType: "required" }, { cert: 0.82, calls: 0.08, learn: 0.04 }));
  out.push(...cohort(c("c-ae-refresher"), [...reps, ...users.filter((u) => u.roles.includes("manager"))], { assignedAt: "2025-11-01", dueAt: "2025-11-30", assignType: "default" }, { cert: 0.93, calls: 0.03, learn: 0.02 }));
  out.push(...cohort(c("c-cardexa-label"), cm, { assignedAt: "2026-10-28", dueAt: "2026-11-25", assignType: "required" }, { cert: 0.48, calls: 0.18, learn: 0.18 }));
  /* A few reps picked Colivant up from the Library themselves. */
  out.push(...imm.filter((u) => u.regionId !== "reg-central").filter((_, i) => i % 29 === 4).slice(0, 4).map((u, i) => row(c("c-colivant"), u, i % 2 ? "learn" : "cert", i + 11, { assignedAt: day("2026-10-20", i * 3), assignType: "self" })));

  /* ── Priya: one of every case ── */
  out.push(
    /* Assigned this week, not started. Leads her list. */
    row(c("c-switch"), priya, "none", 1, { assignedAt: "2026-11-05", dueAt: "2026-11-20", assignType: "required" }),
    /* Overdue, screened, mid-assessments: one objective passed, one to retry. */
    row(c("c-callcheck"), priya, "learn", 2, { assignedAt: "2026-10-21", dueAt: "2026-11-04", assignType: "required" }, {
      state: "assessment", scenarioRuns: runs(c("c-callcheck"), "2026-10-27", ["pass", "fail"], 2), minutesSpent: 22,
    }),
    /* Screened, part-way through the mandatory material. */
    row(c("c-fieldkit"), priya, "learn", 4, { assignedAt: "2026-11-02", dueAt: "2026-12-06", assignType: "required" }),
    /* Picked it herself from the Library, screened, one file in. */
    row(c("c-colivant"), priya, "learn", 5, { assignedAt: "2026-11-03", assignType: "self" }),
    /* Recommended by her trainer, no due date, not started. */
    row(c("c-lumora-drills"), priya, "none", 6, { assignedAt: "2026-11-04", assignType: "recommended" }),
    /* Completed: certified on every objective. */
    row(c("c-arthelis"), priya, "cert", 7, { assignedAt: "2026-09-28", dueAt: "2026-10-26", assignType: "required" }),
    /* Certified a year ago; the certificate runs out on 18 Nov. */
    { ...row(c("c-ae-refresher"), priya, "cert", 8, { assignedAt: "2025-11-01", dueAt: "2025-11-30", assignType: "default" }), certifiedAt: "2025-11-18", certExpiresAt: "2026-11-18" },
  );
  return out;
}
