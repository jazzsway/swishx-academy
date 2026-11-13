import type { Objection, RoleplayResult, Scenario, Turn } from "@/data/types";
import { objection, prohibited } from "@/data/scenarios";

/* A scripted AI HCP (PRD AS-3, §10.3). It stays in persona, raises objections only from the
   scenario's pool, and the scorecard compares what the rep said against the approved rubric
   and prohibited list. Deterministic, so the demo behaves the same every time. */

export interface CallState {
  scenario: Scenario;
  queue: Objection[];
  idx: number;
  pushedBack: boolean;
  turns: Turn[];
  done: boolean;
  start: number;
}

/**
 * Which objections a call raises. One doctor serves every call: screening is the short version (the
 * first two that aren't held back), practice leaves out the held-back one, the final call has them all.
 */
export function objectionsFor(scenario: Scenario, mode?: "screening" | "practice" | "assessment" | "test"): string[] {
  const all = scenario.objectionIds;
  const open = all.filter((id) => !objection(id)?.finalOnly);
  if (mode === "screening") return open.slice(0, 2);
  if (mode === "practice") return open;
  return all;
}

export function startCall(scenario: Scenario, objectionIds?: string[], mode?: "screening" | "practice" | "assessment" | "test"): CallState {
  const ids = objectionIds?.length ? objectionIds : objectionsFor(scenario, mode);
  return {
    scenario,
    queue: ids.map(objection),
    idx: -1,
    pushedBack: false,
    turns: [{ speaker: "hcp", text: scenario.persona.opening, at: 0 }],
    done: false,
    start: Date.now(),
  };
}

const has = (text: string, words: string[]) => {
  const t = text.toLowerCase();
  return words.some((w) => (w === "?" ? t.includes("?") : t.includes(w.toLowerCase())));
};

function offLabelHit(text: string, ruleIds: string[]) {
  for (const id of ruleIds) {
    const r = prohibited(id);
    if (has(text, r.keywords) && !(r.negations && has(text, r.negations))) return r;
  }
  return undefined;
}

export function repSays(state: CallState, text: string): CallState {
  if (state.done || !text.trim()) return state;
  const at = Math.round((Date.now() - state.start) / 1000);
  const turns: Turn[] = [...state.turns, { speaker: "rep", text: text.trim(), at }];
  const repCount = turns.filter((t) => t.speaker === "rep").length;
  const persona = state.scenario.persona;
  let { idx, pushedBack } = state;
  const parts: string[] = [];

  const hit = offLabelHit(text, state.scenario.prohibitedIds);
  if (hit?.id === "pr-adolescent") parts.push("Oh, that's good to know for my teenage patients.");
  else if (hit?.id === "pr-nose") parts.push("No side effects at all? That sounds too good to be true.");
  else if (hit?.id === "pr-superlative") parts.push("Best? Based on what comparison?");

  let done = false;
  if (idx === -1) {
    idx = 0;
    if (state.queue[0]) parts.push(state.queue[0].line);
  } else {
    const cur = state.queue[idx];
    const handled = cur && has(text, cur.keywords);
    if (cur && !handled && !pushedBack) {
      parts.push(cur.pushback);
      pushedBack = true;
    } else {
      if (cur) parts.push(handled ? cur.handled : "Okay. Let's move on.");
      idx += 1;
      pushedBack = false;
      const next = state.queue[idx];
      if (next) parts.push(next.line);
      else {
        parts.push(persona.closing);
        done = true;
      }
    }
  }
  if (!done && repCount >= 8) {
    parts.push(`I'm out of time. ${persona.closing}`);
    done = true;
  }
  turns.push({ speaker: "hcp", text: parts.join(" "), at: at + 2 });
  return { ...state, idx, pushedBack, turns, done };
}

export function scoreCall(scenario: Scenario, turns: Turn[], typed: boolean): RoleplayResult & { competencyScores: Record<string, number> } {
  const rep = turns.filter((t) => t.speaker === "rep");
  const total = scenario.rubric.reduce((a, r) => a + r.weight, 0);
  let got = 0;
  const criteria = scenario.rubric.map((r) => {
    const t = rep.find((x) => has(x.text, r.keywords));
    if (t) got += r.weight;
    return { id: r.id, label: r.label, met: !!t, at: t?.at, quote: t?.text };
  });
  const flags: RoleplayResult["flags"] = [];
  for (const t of rep) {
    for (const id of scenario.prohibitedIds) {
      const r = prohibited(id);
      if (has(t.text, r.keywords) && !(r.negations && has(t.text, r.negations)) && !flags.some((f) => f.ruleId === id))
        flags.push({ ruleId: id, label: r.label, critical: r.critical, quote: t.text, at: t.at, explanation: r.explanation });
    }
  }
  const comp: Record<string, number[]> = {};
  for (const r of scenario.rubric) (comp[r.competency] ??= []).push(criteria.find((c) => c.id === r.id)!.met ? 92 : 35);
  if (flags.some((f) => f.critical)) (comp["c-compliance"] ??= []).push(20);
  const competencyScores = Object.fromEntries(Object.entries(comp).map(([k, v]) => [k, Math.round(v.reduce((a, b) => a + b, 0) / v.length)]));
  const durationSec = turns.at(-1)?.at ?? 0;
  return { transcript: turns, criteria, flags, score: Math.round((got / total) * 100), typed, durationSec, competencyScores };
}

/** Sample lines a rep can tap to answer in the demo (no microphone needed). */
export function sampleAnswers(state: CallState): { label: string; text: string }[] {
  if (state.done) return [];
  if (state.idx === -1 && state.scenario.custom)
    return [{ label: "Open on the patient", text: "Thanks, Doctor, I'll be quick. Think of the patients you see who still aren't where you'd like them on current treatment. How many did you see this month?" },
      { label: "Lead with the product (try it)", text: "Hi Doctor, I'm here to tell you about our product. It's the best option out there." }];
  if (state.idx === -1)
    return [{ label: "Open on the patient", text: state.scenario.id === "sc-kim" ? "Thanks, Doctor. Think of your adult patients still flaring despite topicals. In LUMEN-1 and LUMEN-2, 51% reached EASI-75 at week 16 versus 17% on placebo. How many of those patients did you see this month?" : "Thanks for the time. Think of your adult patients with moderate-to-severe eczema who are still flaring despite topicals. How many of those did you see this month?" },
      { label: "Lead with the product (try it)", text: "Hi Doctor, I'm here to tell you about Lumora, our new biologic. It's the best option out there." }];
  const cur = state.queue[state.idx];
  const answers: Record<string, string> = {
    "ob-cost": "I hear you, the paperwork is real. The Corvana Access Hub runs benefits verification and prepares the prior auth support for your office, and eligible commercially insured patients can use the copay program.",
    "ob-speed": "In LUMEN-1 and LUMEN-2, itch separated from placebo as early as week 2, and at week 16, 51% reached EASI-75 versus 17% on placebo. The most common side effects include conjunctivitis and injection-site reactions.",
    "ob-eyes": "Good question. Conjunctivitis occurred in 9% of Lumora patients versus 3% on placebo, so patients should report any new eye symptoms. Would you consider it for your next adult patient who's still flaring?",
    "ob-topicals": "Totally fair. Which of your adult patients are still flaring or losing sleep despite topicals? Those are the patients Lumora is for. Would you consider it for the next one?",
    "ob-teen": "Lumora is only approved for adults, so I can't discuss use in teenagers. I can submit a medical information request for you. Would that help?",
  };
  const good = cur ? answers[cur.id] ?? cur.answer : undefined;
  const out = cur && good ? [{ label: "Approved answer", text: good }] : [];
  if (cur?.id === "ob-teen") out.push({ label: "Off-label answer (try it)", text: "Sure, it works great for teenagers too. Lots of offices are using it for their 15-year-olds." });
  if (cur?.id === "ob-eyes") out.push({ label: "Minimise risk (try it)", text: "Honestly there are basically no side effects, it's completely safe." });
  /* A vague answer, to see the doctor push back. */
  if (cur && out.length < 2) out.push({ label: "Vague answer (try it)", text: "Honestly, it just works really well. I think you'd like it." });
  return out;
}

/** Canned recording for seeded reps awaiting verification. */
export function seededCall(scenario: Scenario, repFirst: string, strong: boolean): RoleplayResult {
  const lines: Turn[] = [
    { speaker: "hcp", text: scenario.persona.opening, at: 0 },
    { speaker: "rep", text: "Thanks, Doctor. Think of your adult patients still flaring despite topicals. How many did you see this month?", at: 9 },
    { speaker: "hcp", text: objection("ob-cost").line, at: 18 },
    { speaker: "rep", text: strong ? "I understand. The Corvana Access Hub does benefits verification and prepares the PA support for your office." : "Most plans cover it, so it should be fine.", at: 31 },
    { speaker: "hcp", text: strong ? objection("ob-cost").handled + " " + objection("ob-eyes").line : objection("ob-cost").pushback, at: 44 },
    { speaker: "rep", text: strong ? "Conjunctivitis occurred in 9% versus 3% with placebo, so patients should report new eye symptoms." : "The Hub can help with the paperwork. And the eye issues are rare.", at: 58 },
    { speaker: "hcp", text: objection("ob-teen").line, at: 70 },
    { speaker: "rep", text: "It's only approved for adults, so I'll submit a medical information request for you. Would you consider Lumora for your next adult patient who qualifies?", at: 84 },
    { speaker: "hcp", text: scenario.persona.closing, at: 95 },
  ];
  const r = scoreCall(scenario, lines, false);
  void repFirst;
  return { transcript: r.transcript, criteria: r.criteria, flags: r.flags, score: r.score, typed: false, durationSec: r.durationSec };
}
