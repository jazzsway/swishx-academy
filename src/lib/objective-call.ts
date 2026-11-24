import type { Course, Objective, Scenario } from "@/data/types";
import { registerObjectiveCall } from "@/data/scenarios";
import { CHARACTERS, build } from "./scenario-set";

/*
 * An objective is a call. Its situations are the specific moments and edge cases a call can be about; an
 * objective with none still has its call, made from the objective itself: who it involves, what it asks
 * for and what it's scored on. That call is the same every time (a fixed id), so runs and reports find it.
 */

const made = new Map<string, Scenario>();

/** The call for an objective that has no situations: one person it involves, its own description and criteria. */
export function objectiveCall(course: Course, ob: Objective): Scenario {
  const key = `${course.id}:${ob.id}:${ob.title}:${ob.description}:${ob.weights.map((w) => `${w.competency}${w.pct}`).join()}`;
  const had = made.get(key);
  if (had) return had;
  const character = ob.people[0] ?? "doctor";
  const name = CHARACTERS[character].names[0];
  const sc = build({ course, character, name, title: ob.title, description: ob.description || `A call about: ${ob.title.toLowerCase()}.`, weights: ob.weights.length ? ob.weights : [{ competency: "c-objections", pct: 100 }], objective: `${ob.title}, with ${name.replace(/,.*$/, "")}.` });
  const id = `sc-ob-${course.id}-${ob.id}`;
  const fixed = JSON.parse(JSON.stringify(sc).split(sc.id).join(id)) as Scenario;
  const call: Scenario = { ...fixed, objectiveId: ob.id };
  made.set(key, call);
  registerObjectiveCall(call);
  return call;
}

/** An objective's situations, or its own call when it has none. */
export function objectiveBank(course: Course, ob: Objective, scs: Scenario[]): Scenario[] {
  const own = scs.filter((x) => x.objectiveId === ob.id && (!x.use.includes("screening") || x.use.includes("assessment")));
  return own.length ? own : [objectiveCall(course, ob)];
}

/** True when the objective's call is its own (no situations written for it). */
export const isObjectiveCall = (sc: Scenario) => sc.id.startsWith("sc-ob-");
