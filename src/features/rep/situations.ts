import { nowIso } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import type { Course, Objective, Progress, Scenario } from "@/data/types";

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

/**
 * The call, grouped the way the trainer built it: each objective with its situations, and any situation
 * without one at the end. Each group says where the rep stands on it as a whole.
 */
export function objectiveGroups(c: Course, p: Progress, presenter = false) {
  const { scs } = scenarioStatus(c, p);
  const obs = c.objectives ?? [];
  const groups: { ob?: Objective; scs: Scenario[] }[] = obs.map((ob) => ({ ob, scs: scs.filter((x) => x.objectiveId === ob.id) })).filter((g) => g.scs.length);
  const loose = scs.filter((x) => !obs.some((o) => o.id === x.objectiveId));
  if (loose.length) groups.push({ scs: loose });
  return groups.map((g) => {
    const each = g.scs.map((sc) => ({ sc, ...situationState(c, p, sc, presenter) }));
    const n = (k: SituationState) => each.filter((x) => x.state === k).length;
    const state: ObjectiveState = n("passed") === each.length ? "passed"
      : n("todo") === each.length ? "todo"
      : n("todo") > 0 ? "started"
      : n("retry") > 0 ? "retry"
      : n("waiting") > 0 ? "waiting" : "out";
    return { ...g, each, state, passed: n("passed"), todo: n("todo") };
  });
}
