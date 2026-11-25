import type { PracticeSession, RoleplayResult, Turn } from "./types";

/*
 * Priya's past practice calls: a few rehearsals she set up and one situation from a training, each with
 * its full transcript, what it met and missed, and (once) a compliance flag. Private to her.
 */

const t = (lines: [Turn["speaker"], string][]): Turn[] => {
  let at = 2;
  return lines.map(([speaker, text]) => { const turn = { speaker, text, at }; at += Math.max(14, Math.round(text.length / 3.2)); return turn; });
};
const result = (lines: [Turn["speaker"], string][], criteria: RoleplayResult["criteria"], score: number, flags: RoleplayResult["flags"] = []): RoleplayResult => {
  const transcript = t(lines);
  return { transcript, criteria, flags, score, typed: false, durationSec: (transcript.at(-1)?.at ?? 0) + 14 };
};

export const PRIYA_PRACTICE: PracticeSession[] = [
  /* Practising Psorivex objective 1 ("Find the patient who isn't at goal"): two of its four situations covered. */
  {
    id: "ps-priya-sw-brooks", userId: "u-priya", at: "2026-11-05T17:05:00", kind: "roleplay", title: "The patient still flaring after a year", deletesAt: "2026-12-05",
    setup: { specialty: "Dermatologist", traits: ["Time-pressed", "Sceptical"], objectionIds: [], callType: "Follow-up visit", assisted: true, role: "doctor", persona: "Dr. Owen Brooks", minutes: 5, source: "training", courseId: "c-switch", scenarioId: "sc-sw-2" },
    result: result([
      ["hcp", "I've got about five minutes before my next patient. Go on, tell me about Psorivex."],
      ["rep", "Before that, you mentioned a patient still flaring on his first biologic. How much of his skin is still involved?"],
      ["hcp", "About 8% body surface area. He's frustrated, and so am I."],
      ["rep", "For adults with moderate-to-severe plaque psoriasis who are candidates for systemic therapy, Psorivex is an option. In the studies, many reached almost clear skin at week 16."],
      ["hcp", "Any infection risk I should know about?"],
      ["rep", "Upper respiratory infections were the most common side effect. Patients should be checked for TB before starting."],
      ["hcp", "Okay. I'll think about him."],
      ["rep", "Would you consider Psorivex for him at his next visit?"],
    ], [
      { id: "c1", label: "Asks about patients not at goal before naming the product", met: true, quote: "How much of his skin is still involved" },
      { id: "c2", label: "Names the patient type the label supports", met: true, quote: "moderate-to-severe plaque psoriasis" },
      { id: "c3", label: "Gives the safety information alongside any benefit", met: true, quote: "Upper respiratory infections" },
    ], 84),
  },
  {
    id: "ps-priya-sw-hale", userId: "u-priya", at: "2026-11-04T09:30:00", kind: "roleplay", title: "Two minutes in the corridor", deletesAt: "2026-12-04",
    setup: { specialty: "Dermatologist", traits: ["Time-pressed"], objectionIds: [], callType: "Follow-up visit", assisted: true, role: "doctor", persona: "Dr. Marcus Hale", minutes: 5, source: "training", courseId: "c-switch", scenarioId: "sc-sw-3" },
    result: result([
      ["hcp", "I'm between rooms. You've got two minutes."],
      ["rep", "Psorivex gives great results for psoriasis patients, most of them clear up quickly."],
      ["hcp", "Most of them? Which patients are we talking about?"],
      ["rep", "Sorry, let me start again. Which of your psoriasis patients still aren't clear at their last visit?"],
      ["hcp", "A couple. Come back Thursday and we'll talk."],
    ], [
      { id: "c1", label: "Asks about patients not at goal before naming the product", met: false },
      { id: "c2", label: "Names the patient type the label supports", met: false },
      { id: "c3", label: "Gives the safety information alongside any benefit", met: false },
      { id: "c4", label: "Earns a next step", met: true, quote: "Which of your psoriasis patients still aren't clear" },
    ], 41),
  },
  {
    id: "ps-priya-rao", userId: "u-priya", at: "2026-11-05T19:20:00", kind: "roleplay", title: "Dr. Priyanka Rao · follow-up", deletesAt: "2026-12-05",
    setup: { specialty: "Dermatologist", traits: ["Sceptical", "Cost-focused"], objectionIds: ["ob-cost", "ob-eyes"], callType: "Follow-up", assisted: true, role: "doctor", productId: "p-lumora", minutes: 5, persona: "Dr. Priyanka Rao", source: "rehearsal" },
    result: result([
      ["hcp", "Back again. I've thought about Lumora since last time. I still have questions."],
      ["rep", "Thanks for making time. Last visit you mentioned a few adults still flaring on topicals. How are they doing?"],
      ["hcp", "Two of them are no better. But honestly, my patients' plans fight every biologic. The prior auth paperwork alone kills my staff."],
      ["rep", "That's fair. The Corvana Access Hub does the benefits check and prepares the prior auth for your office, so your staff aren't chasing it."],
      ["hcp", "Okay, if the Hub really takes the PA work off my staff, that helps. What about the eye side effects I keep hearing about?"],
      ["rep", "Conjunctivitis was one of the most common side effects in the studies. Most cases were mild, and patients should tell you about any new eye symptoms."],
      ["hcp", "Fine. So what are you asking me for?"],
      ["rep", "Would you consider Lumora for one of those two patients, and let me start the benefits check for them?"],
    ], [
      { id: "c1", label: "Opens on a patient who isn't at goal", met: true, quote: "a few adults still flaring" },
      { id: "c2", label: "Handles the cost objection with the Hub", met: true, quote: "Access Hub does the benefits check" },
      { id: "c3", label: "Gives safety in balance", met: true, quote: "Conjunctivitis was one of the most common" },
      { id: "c4", label: "Uses the approved data, exactly", met: false },
      { id: "c5", label: "Asks for a next step", met: true, quote: "start the benefits check" },
    ], 72),
  },
  {
    id: "ps-priya-kim", userId: "u-priya", at: "2026-11-04T12:44:00", kind: "roleplay", title: "First call with a busy dermatologist", deletesAt: "2026-12-04",
    setup: { specialty: "Dermatologist", traits: ["Time-pressed", "Sceptical", "Happy with current treatment"], objectionIds: [], callType: "First call", assisted: false, role: "doctor", persona: "Dr. Lena Kim", minutes: 5, source: "training", courseId: "c-callcheck", scenarioId: "sc-cc-doc" },
    result: result([
      ["hcp", "I've got about five minutes before my next patient. Go on, tell me about Lumora."],
      ["rep", "I'll be quick. Which of your adult patients with atopic dermatitis are still not where you'd like them on topicals?"],
      ["hcp", "A handful. But I'm happy with what I prescribe. Why change?"],
      ["rep", "I understand. For adults whose disease isn't controlled on topicals, Lumora is an option. In the studies, more patients reached clear or almost clear skin at week 16 than with placebo."],
      ["hcp", "And it's another injection to pay for."],
      ["rep", "The Access Hub handles the benefits check and the prior auth paperwork. The most common side effects were injection site reactions and conjunctivitis."],
      ["hcp", "Alright. Leave me the information."],
      ["rep", "I will. Could we look at one of those patients together at my next visit?"],
    ], [
      { id: "c1", label: "Opens on a patient who isn't at goal", met: true, quote: "still not where you'd like them" },
      { id: "c2", label: "Acknowledges the pushback before answering", met: true, quote: "I understand" },
      { id: "c3", label: "Uses the approved data, exactly", met: true, quote: "clear or almost clear skin at week 16" },
      { id: "c4", label: "Gives safety in balance", met: true, quote: "injection site reactions and conjunctivitis" },
      { id: "c5", label: "Asks for a next step", met: true, quote: "look at one of those patients together" },
    ], 81),
  },
  {
    id: "ps-priya-becker", userId: "u-priya", at: "2026-11-03T08:05:00", kind: "roleplay", title: "Nurse Tom Becker · first call", deletesAt: "2026-12-03",
    setup: { specialty: "Dermatology nurse", traits: ["Data-driven"], objectionIds: ["ob-speed", "ob-eyes"], callType: "First call", assisted: true, role: "nurse", productId: "p-psorivex", minutes: 3, persona: "Nurse Tom Becker", source: "rehearsal" },
    result: result([
      ["hcp", "Hi. I don't have long. What's Psorivex and why should I care?"],
      ["rep", "It's a biologic for adults with moderate-to-severe plaque psoriasis. Patients usually see results really fast."],
      ["hcp", "How fast is fast? I'm the one patients call."],
      ["rep", "Honestly most of them are clear in a couple of weeks, and side effects are basically nothing to worry about."],
      ["hcp", "That's not what the label says, is it?"],
      ["rep", "You're right, let me correct that. I'll stick to what's in the prescribing information and send you the dosing summary."],
    ], [
      { id: "c1", label: "States the dosing exactly", met: false },
      { id: "c2", label: "Uses the approved data, exactly", met: false },
      { id: "c3", label: "Gives safety in balance", met: false },
      { id: "c4", label: "Corrects a misstatement", met: true, quote: "let me correct that" },
    ], 48, [
      { ruleId: "r-minimise", label: "Minimising risk", critical: true, quote: "Honestly most of them are clear in a couple of weeks, and side effects are basically nothing to worry about.", at: 0, explanation: "Side effects can't be played down, and the speed claim isn't in the label." },
    ]),
  },
  {
    id: "ps-priya-whitfield", userId: "u-priya", at: "2026-11-01T08:30:00", kind: "roleplay", title: "Dana Whitfield · post-launch check-in", deletesAt: "2026-12-01",
    setup: { specialty: "Practice manager", traits: ["Time-pressed", "Cost-focused"], objectionIds: ["ob-cost"], callType: "Post-launch check-in", assisted: false, role: "manager", productId: "p-lumora", minutes: 3, persona: "Dana Whitfield", source: "rehearsal" },
    result: result([
      ["hcp", "So Lumora's been out a few weeks. Tell me what you're hearing from other offices."],
      ["rep", "Offices mostly ask about the paperwork. The Access Hub runs the benefits check and the prior auth for you."],
      ["hcp", "Will it be covered for our patients?"],
      ["rep", "I can't promise what a plan will cover, but the Hub checks each patient's benefits and tells you within a couple of days."],
      ["hcp", "Okay. Send me the enrolment form."],
    ], [
      { id: "c1", label: "Explains what the Hub takes off the office", met: true, quote: "runs the benefits check and the prior auth" },
      { id: "c2", label: "Never promises coverage", met: true, quote: "can't promise what a plan will cover" },
      { id: "c3", label: "Agrees a next step", met: false },
    ], 66),
  },
];
