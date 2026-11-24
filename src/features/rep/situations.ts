import { nowIso } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import type { Character, Course, Objective, Progress, Scenario } from "@/data/types";
import { characterOf } from "@/lib/scenario-set";
import { objectiveBank } from "@/lib/objective-call";

/** A training's scenarios, in order, and where this rep stands on each. */
export function scenarioStatus(c: Course, p: Progress) {
  const scs = allScenarios().filter((x) => c.scenarioIds.includes(x.id)).sort((a, b) => c.scenarioIds.indexOf(a.id) - c.scenarioIds.indexOf(b.id));
  const runs = p.scenarioRuns ?? {};
  const todo = scs.filter((x) => !runs[x.id]);
  const failed = scs.filter((x) => runs[x.id] && !runs[x.id].passed);
  const passed = scs.filter((x) => runs[x.id]?.passed);
  return { scs, runs, todo, failed, passed, allPassed: scs.length > 0 && passed.length === scs.length };
}

export type SituationState = "todo" | "passed" | "retry" | "waiting" | "out";

/** One situation, for the rep: taken or not, passed or not, and whether (and when) it can be retried. */
export function situationState(c: Course, p: Progress, sc: Scenario, presenter = false) {
  const run = p.scenarioRuns?.[sc.id];
  const st = c.settings;
  const triesLeft = st.attempts - (run?.tries ?? 0);
  const retryAt = run ? new Date(new Date(run.at).getTime() + st.cooldownHours * 3600_000) : undefined;
  const cooling = !!run && !presenter && st.cooldownHours > 0 && (retryAt?.getTime() ?? 0) > new Date(nowIso()).getTime();
  const state: SituationState = !run ? "todo" : run.passed ? "passed" : triesLeft <= 0 ? "out" : cooling ? "waiting" : "retry";
  return { run, state, triesLeft, retryAt };
}

export type ObjectiveState = "todo" | "started" | "passed" | "retry" | "waiting" | "out";

/* ── The call plan: one situation drawn per objective, the draws grouped into one call per person ── */

export type ObjectivePlanState = "todo" | "started" | "passed" | "retry" | "waiting" | "out";

export interface ObjectivePlan {
  ob?: Objective;
  /** The objective's situations: its bank. */
  bank: Scenario[];
  state: ObjectivePlanState;
  /** "1 drawn": the situation it was passed (or last tried) with. */
  tested?: Scenario;
  /** The situations its next call tests: the draw, a fresh draw on a retry, or (with "All") every one not passed. */
  next: Scenario[];
  triesLeft: number;
  retryAt?: Date;
}

export interface PlannedCall {
  /** One call per person: who the rep meets. */
  key: Character;
  items: { ob?: Objective; sc: Scenario }[];
  minutes: number;
}

const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

/** Draw a situation for an objective: the one closest to the rep's gaps from screening, and never the one they just failed if there's another. */
export function drawSituation(p: Progress, obId: string, bank: Scenario[], avoid: string[] = []): Scenario | undefined {
  const pool = bank.filter((x) => !avoid.includes(x.id));
  const from = pool.length ? pool : bank;
  const gap = (sc: Scenario) => (sc.weights ?? []).reduce((a, w) => a + (100 - (p.screening?.scores[w.competency] ?? 60)) * w.pct, 0);
  return [...from].sort((a, b) => gap(b) - gap(a) || hash(p.userId + obId + a.id) - hash(p.userId + obId + b.id))[0];
}

export function callPlan(c: Course, p: Progress, presenter = false) {
  /* The screening call's own situations set the baseline; they're never drawn for an assessment. */
  const scs = scenarioStatus(c, p).scs.filter((x) => !x.use.includes("screening") || x.use.includes("assessment"));
  const all = (c.settings.situationsPerObjective ?? "one") === "all";
  const obs = c.objectives ?? [];
  /* Every objective has a call: on one of its situations, or (with none) on the objective itself. */
  const groups: { ob?: Objective; bank: Scenario[] }[] = obs.map((ob) => ({ ob, bank: objectiveBank(c, ob, scs) }));
  const loose = scs.filter((x) => !obs.some((o) => o.id === x.objectiveId));
  if (loose.length) groups.push({ bank: loose });
  const now = new Date(nowIso()).getTime();
  const st = c.settings;

  const objectives: ObjectivePlan[] = groups.map(({ ob, bank }) => {
    const each = bank.map((sc) => ({ sc, ...situationState(c, p, sc, presenter) }));
    /* "All", or situations with no objective: every situation counts on its own. */
    if (all || !ob) {
      const n = (k: SituationState) => each.filter((x) => x.state === k).length;
      const state: ObjectivePlanState = n("passed") === each.length ? "passed" : n("todo") === each.length ? "todo" : n("todo") > 0 ? "started" : n("retry") > 0 ? "retry" : n("waiting") > 0 ? "waiting" : "out";
      return { ob, bank, state, next: each.filter((x) => x.state === "todo" || x.state === "retry").map((x) => x.sc), triesLeft: Math.min(...each.map((x) => x.triesLeft)), retryAt: each.find((x) => x.state === "waiting")?.retryAt };
    }
    /* "1 drawn": the objective passes with any one of its situations; tries and the wait count across the objective. */
    const taken = each.filter((x) => x.run).sort((a, b) => b.run!.at.localeCompare(a.run!.at));
    const passed = taken.find((x) => x.run!.passed);
    if (passed) return { ob, bank, state: "passed", tested: passed.sc, next: [], triesLeft: 0 };
    const triesLeft = st.attempts - taken.reduce((a, x) => a + x.run!.tries, 0);
    const drawn = bank.find((x) => x.id === p.draws?.[ob.id]);
    /* The last one tried is the current draw (set when its call started); the demo clock makes timestamps unreliable. */
    const last = taken.find((x) => x.sc.id === drawn?.id) ?? taken[0];
    if (!last) return { ob, bank, state: "todo", next: [drawn ?? drawSituation(p, ob.id, bank)!], triesLeft };
    const retryAt = new Date(new Date(last.run!.at).getTime() + st.cooldownHours * 3600_000);
    const state: ObjectivePlanState = triesLeft <= 0 ? "out" : !presenter && st.cooldownHours > 0 && retryAt.getTime() > now ? "waiting" : "retry";
    /* A retry is a fresh draw: a different situation from the bank when there is one. */
    const untried = bank.some((x) => !taken.some((t) => t.sc.id === x.id));
    const redraw = drawn && drawn.id !== last.sc.id ? drawn : drawSituation(p, ob.id, bank, untried ? taken.map((x) => x.sc.id) : [last.sc.id]);
    return { ob, bank, state, tested: last.sc, next: state === "retry" && redraw ? [redraw] : [], triesLeft, retryAt };
  });

  /* What's ready to take now, grouped into one call per person, in objective order. */
  const calls: PlannedCall[] = [];
  for (const o of objectives) {
    if (!["todo", "started", "retry"].includes(o.state)) continue;
    for (const sc of o.next) {
      const key = characterOf(sc);
      const call = calls.find((x) => x.key === key) ?? (calls.push({ key, items: [], minutes: 0 }), calls.at(-1)!);
      call.items.push({ ob: o.ob, sc });
    }
  }
  for (const call of calls) call.minutes = Math.min(15, Math.max(3, call.items.reduce((a, x) => a + Math.ceil(x.sc.durationMin * 0.7), 0)));
  return { objectives, calls, allPassed: objectives.length > 0 && objectives.every((o) => o.state === "passed") };
}
