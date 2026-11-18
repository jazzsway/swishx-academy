"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Undo2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { COMPETENCIES, competency, source } from "@/data/org";
import type { Course, CourseSettings, Objective } from "@/data/types";
import { CHARACTERS, evenTo100 } from "@/lib/scenario-set";
import { lookForsOf, objectiveFromPrompt } from "@/lib/objectives";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Composer, Suggestions } from "@/features/copilot/composer";
import { directModules } from "../materials";
import { useUpload } from "../direct-course";
import { applyChanges, directRespond } from "./chat";
import { draftObjectivesFor, removeSituation, saveObjectiveWeights, useAddScenario } from "./scenarios";
import { useCourse } from "./use-course";
import { STAGES, stepOf, turnId, useTrainingChat, type TrainingTurn } from "./training-chat-store";

const EMPTY: TrainingTurn[] = [];
const SUGGEST = {
  objectives: ["Add an objective: reps explain the missed-dose guidance to nurses", "Remove objective 3", "Next"],
  objective: ["Good looks like: quotes the label word for word", "Put 40% on objection handling", "Rename this objective to “Quote the label exactly”"],
  situations: ["Add a situation: a patient asks if it's safe long term", "Write situations for the rest", "Next"],
  settings: ["Set the pass mark to 80%", "Allow 2 tries on each situation", "Wait 24 hours between tries", "Next"],
  assign: ["Publish", "Who should take it?"],
};
const HELP = {
  objectives: "Describe an objective and I'll add it, drawn from your material: what reps should be able to do, and who it involves. Say “remove objective 2” to drop one, or open one to sharpen it. Attach a file to use it as information for the training.",
  objective: "Tell me what good looks like (“good looks like: …”), who it involves, a new name, or how much a criterion counts, like “put 40% on objection handling”.",
  situations: "Describe a situation and I'll add it under the highlighted objective: who the rep meets (one person) and what happens. Use “Add a situation” in a column to pick the objective. Say “next” for the settings.",
  settings: "Here I can set the pass mark, the tries on each situation, the wait between tries, hints on the scored call, and which situations screening uses. Say “next” to publish and assign.",
  assign: "Here you publish and assign in one go: check what goes live, choose what happens to anyone on the old version (keep their progress, restart who hasn't finished, or restart everyone), and who else gets it.",
};

/**
 * The agent for a training built with the trainer's own material: one conversation for all four
 * stages, on the right of the editor. It knows the stage (and the objective) on screen and changes
 * whatever the trainer asks there: objectives, their situations, the pass rules, the name and files.
 * Edits can be undone; lesson changes wait for an OK.
 */
export function TrainingChat({ course }: { course: Course }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const data = useCourse(course.id);
  useApp((s) => s.scenarios);
  const updateCourse = useApp((s) => s.updateCourse);
  const updateSettings = useApp((s) => s.updateSettings);
  const setModules = useApp((s) => s.setModules);
  const upload = useUpload(course.productId);
  const addScenario = useAddScenario(course);
  const chat = useTrainingChat();
  const thread = chat.threads[course.id] ?? EMPTY;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const base = `/trainer/courses/${course.id}`;
  const step = stepOf(pathname, base);
  const ob = step <= 2 && search.get("obj") ? course.objectives?.find((x) => x.id === search.get("obj")) : undefined;
  const ctx = step === 1 ? (ob ? "objective" : "objectives") : step === 2 ? "situations" : step === 3 ? "settings" : "assign";
  const where = step === 1 && ob ? `Objective · ${ob.title}` : STAGES[step - 1].label;
  const editable = !!data?.editable;
  const say = (t: string, extra?: Partial<TrainingTurn>) => chat.push(course.id, { id: turnId("a"), from: "ai", text: t, ...extra });

  /* A training opened without a setup conversation starts with a hello; every move to another step leaves a marker. */
  useEffect(() => {
    const s = useTrainingChat.getState();
    if (!s.threads[course.id]?.length)
      s.push(course.id, { id: turnId("a"), from: "ai", text: data?.editable
        ? `I'm with you on all four stages of ${course.title}: objectives, situations, settings, and assigning. Tell me what to change, or pick a suggestion.`
        : `${course.title} v${data?.cur.version} is live and locked. Use “Edit as v${(data?.cur.version ?? 0) + 1}” in the top bar and I'll make changes there.` });
  }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const s = useTrainingChat.getState();
    const t = s.threads[course.id] ?? [];
    const last = t.at(-1);
    /* Passing through a step without a word moves the marker instead of stacking another. */
    if (last?.from === "divider") { if (last.text !== where) s.patch(course.id, last.id, { text: where }); }
    else if ([...t].reverse().find((x) => x.from === "divider")?.text !== where) s.push(course.id, { id: turnId("d"), from: "divider", text: where });
    /* The first time at each stage, the agent says what it's for and what comes next. */
    if (editable && !(s.threads[course.id] ?? []).some((x) => x.id === `stage-${course.id}-${step}`) && !(step === 1 && t.some((x) => x.id === "s-set"))) s.push(course.id, { id: `stage-${course.id}-${step}`, from: "ai", text: intro(step) });
  }, [where, course.id]); // eslint-disable-line react-hooks/exhaustive-deps
  /* "Add objective" or "Add a situation" on the page: the agent asks for it here, and takes the next message as it. */
  const asked = useRef(chat.asked?.n ?? 0);
  useEffect(() => {
    if (!chat.asked || chat.asked.n === asked.current) return;
    asked.current = chat.asked.n;
    say(chat.asked.kind === "objective"
      ? "What's the objective? Tell me what reps should be able to do, and who it involves (a doctor, nurse, practice manager, pharmacist or patient). I'll tie it to your material."
      : `Describe a situation${ob ? ` for “${ob.title}”` : ""}: who the rep meets (one person) and what happens on the call.`);
    window.setTimeout(() => document.getElementById("training-chat")?.focus(), 60);
  }, [chat.asked]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [thread.length, busy]);
  if (!data) return null;

  const cur = () => useApp.getState().courses.find((c) => c.id === course.id) ?? course;
  const go = (n: number) => router.push(`${base}${STAGES[Math.max(0, Math.min(3, n - 1))].path}`);
  function intro(n: number) {
    const c = cur();
    const situations = c.scenarioIds.length, obs = c.objectives?.length ?? 0;
    if (n === 1) return obs ? `Stage 1 of 4 · Objectives. ${obs} objective${obs === 1 ? "" : "s"}. Tell me what to add, change or remove, or open one to sharpen it. Say “next” for the situations.` : "Stage 1 of 4 · Objectives. Describe what reps should be able to do and I'll add it, tied to your files.";
    if (n === 2) return situations ? `Stage 2 of 4 · Situations. ${situations} situation${situations === 1 ? "" : "s"} across ${obs} objective${obs === 1 ? "" : "s"}, one column each. Describe another to add it, or say “next”.`
      : `Stage 2 of 4 · Situations. I'm writing a few for each of the ${obs} objectives now, one column each: the moments on a call where each is tested. Add your own any time.`;
    if (n === 3) return `Stage 3 of 4 · Settings. Pass mark ${c.settings.passRoleplay}% on each situation, ${c.settings.attempts} tries, screening ${c.settings.screening ? "on" : "off"}. Change anything, or say “next”.`;
    return data?.cur.state === "published" ? "Stage 4 of 4 · Publish & assign. It's live: choose who else takes it, and by when." : data?.lv ? `Stage 4 of 4 · Publish & assign. v${data.cur.version} replaces v${data.lv.version}: check it, choose what happens to the people on v${data.lv.version}, and publish.` : "Stage 4 of 4 · Publish & assign. Check what goes live, choose who takes it, and publish both in one go.";
  }

  /** A situation under an objective (the open one, or the first), drafted in steps the trainer watches. */
  function draftSituation(prompt: string, target?: Objective) {
    const c = cur();
    /* A situation always sits under an objective: the open one, the first, or a new one from the brief. */
    let under = target ?? c.objectives?.[0];
    if (!under) {
      const materials = c.sourceIds.map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x);
      under = objectiveFromPrompt(c.brief ?? c.objective ?? c.title, materials, 0);
      updateCourse(c.id, { objectives: [under] });
    }
    const id = turnId("a");
    chat.push(course.id, { id, from: "ai", text: "", steps: [], at: 0 });
    addScenario(prompt.replace(/^(add|new|create)\s+(a\s+)?(situation|scenario|case)\s*(:|-)?\s*/i, ""), (steps, at) => useTrainingChat.getState().patch(course.id, id, { steps, at }), (d) => {
      useTrainingChat.getState().patch(course.id, id, { steps: undefined, text: `Added “${d.title}” with ${d.persona.name} under “${under!.title}”, scored on its criteria.`, link: { href: `${base}/situations?obj=${under!.id}`, label: "Show it" } });
      useTrainingChat.getState().setAdded(d.id);
      router.replace(`${base}/situations?obj=${under!.id}`, { scroll: false });
    }, under);
  }

  /** An objective the trainer described, tied to the training's material. */
  function addObjective(prompt: string) {
    const c = cur();
    const prev = c.objectives ?? [];
    const materials = c.sourceIds.map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x);
    const next = objectiveFromPrompt(prompt, materials, prev.length);
    updateCourse(c.id, { objectives: [...prev, next] });
    useTrainingChat.getState().setAdded(next.id);
    router.replace(`${base}/roleplay?obj=${next.id}`, { scroll: false });
    say(`Added objective ${prev.length + 1}: “${next.title}”, with ${next.people.map((p) => CHARACTERS[p].label.toLowerCase()).join(", ")}${next.cites.length ? `, from ${next.cites.map((x) => `${source(x.sourceId)?.title ?? "your file"} p. ${x.page}`).join(" and ")}` : ""}. It's scored on ${next.weights.map((w) => `${competency(w.competency)?.name.toLowerCase()} (${w.pct}%)`).join(", ")}. I'll write situations for it on the next stage.`,
      { undo: () => updateCourse(c.id, { objectives: prev }) });
  }

  /** What the trainer asked, wherever they are. Settings and scenarios work from any step. */
  function handle(prompt: string, pending?: "objective" | "situation") {
    const l = prompt.toLowerCase();
    const c = cur();
    const st = c.settings;
    const scs = allScenarios().filter((x) => c.scenarioIds.includes(x.id));
    const open = ob ? c.objectives?.find((x) => x.id === ob.id) : undefined;

    /* Moving between the stages. */
    if (/^(next|continue|go on|looks good|done|ok(ay)?|move on)\b/.test(l)) { if (step === 4) return say(HELP.assign); say(`On to ${STAGES[step].label.toLowerCase()}.`); return go(step + 1); }
    if (/^(back|previous|go back)\b/.test(l)) { if (step === 1) return say("This is the first stage."); say(`Back to ${STAGES[step - 2].label.toLowerCase()}.`); return go(step - 1); }
    if (/draft (the )?objectives|suggest objectives/.test(l)) { if (step !== 1) go(1); draftObjectivesFor(c); return; }
    if (/^generate|example situations|write (the )?(examples|situations)|situations for the rest/.test(l)) {
      if (!(c.objectives ?? []).length) return say("There are no objectives yet. Describe one first.");
      if (!(c.objectives ?? []).some((o) => !scs.some((x) => x.objectiveId === o.id))) return say("Every objective has situations already. Describe another and I'll add it.");
      if (step !== 2) go(2);
      say("Writing situations for the objectives that have none. You can skip ahead on the page.");
      return useTrainingChat.getState().generate();
    }
    if (/^(save and publish|publish( it)?)$/.test(l)) {
      if (data!.cur.state === "published") return say("It's already published. Choose who else takes it on this page.", { link: { href: `${base}/assign`, label: "Assign" } });
      if (step !== 4) go(4);
      return say("Here's what goes live, and who gets it. Check both, then publish from the bar at the bottom.");
    }
    if (pending === "objective" || /\b(add|create|new|another)\b.{0,12}\bobjective\b/.test(l)) return addObjective(prompt);
    if (pending === "situation" || (/\b(add|create|new|another|draft)\b.{0,12}\b(situation|scenario|case)s?\b/.test(l) && !/screening/.test(l))) return draftSituation(prompt, open);

    const name = prompt.match(/(?:rename|call)\s+(?:the\s+|this\s+)?training\s+(?:to\s+)?["“]?(.+?)["”]?\.?$/i)?.[1];
    if (name) {
      const prev = c.title;
      updateCourse(c.id, { title: name.trim() });
      return say(`Renamed it “${name.trim()}”.`, { undo: () => updateCourse(c.id, { title: prev }) });
    }
    if (/\b(make|set|turn)\b.*\b(public|private)\b/.test(l)) {
      const v = /public/.test(l) ? "audience" : "assigned";
      const prev = c.visibility;
      updateCourse(c.id, { visibility: v });
      return say(v === "audience" ? "It's public now: it shows in the Library for the field team, once published." : "It's private now: only people you assign see it.", { undo: () => updateCourse(c.id, { visibility: prev }) });
    }
    if (/\bbrief\b/.test(l)) {
      const b = prompt.match(/brief\s*(?:to|:|is)\s*(.+)$/i)?.[1]?.trim();
      if (!b) return say(`The brief is: “${c.brief ?? "not set"}”. Tell me the new one, like: brief: reps can handle a first call with a dermatologist.`);
      const prev = c.brief;
      updateCourse(c.id, { brief: b, objective: b });
      return say("Updated the brief. The scenarios you have stay as they are; new ones I draft will follow it.", { undo: () => updateCourse(c.id, { brief: prev, objective: prev ?? c.objective }) });
    }

    /* The pass rules. */
    const rules: Partial<CourseSettings> = {};
    const said: string[] = [];
    const pass = l.match(/pass(?:\s*mark)?\D{0,14}(\d{2,3})/)?.[1];
    if (pass) { rules.passRoleplay = Math.min(100, Number(pass)); said.push(`pass mark ${rules.passRoleplay}% on each scenario`); }
    const tries = l.match(/(\d+)\s*(?:tries|attempts)/)?.[1];
    if (tries) { rules.attempts = Math.max(1, Number(tries)); said.push(`${rules.attempts} ${rules.attempts === 1 ? "try" : "tries"} on each scenario`); }
    const wait = /wait|between|cooldown/.test(l) && l.match(/(\d+)\s*h(?:ours?|rs?)?\b/)?.[1];
    if (wait) { rules.cooldownHours = Number(wait); said.push(`${rules.cooldownHours} hours between tries`); }
    if (/\bhints?\b/.test(l)) { rules.finalNoHints = /off|no hints|without/.test(l); said.push(rules.finalNoHints ? "no hints on the scored call" : "hints on the scored call"); }
    if (said.length) {
      const prev = Object.fromEntries(Object.keys(rules).map((k) => [k, st[k as keyof CourseSettings]])) as Partial<CourseSettings>;
      updateSettings(c.id, rules);
      return say(`Done: ${said.join(", ")}.`, { undo: () => updateSettings(c.id, prev) });
    }

    if (/screening/.test(l)) {
      const first = Number(l.match(/first\s*(\d)/)?.[1]);
      const nums = first ? Array.from({ length: first }, (_, i) => i + 1) : [...l.matchAll(/\b(\d)\b/g)].map((m) => Number(m[1]));
      const pick = nums.map((n) => scs[n - 1]).filter(Boolean);
      if (!pick.length) return say(`Screening is a short call, about 3 minutes, built from ${st.screeningIds?.length ?? 2} of your scenarios. Say which, like “use scenarios 1 and 3 in screening”.`);
      const prev = st.screeningIds;
      updateSettings(c.id, { screeningIds: pick.map((x) => x.id) });
      return say(`Screening now uses ${pick.map((x) => `“${x.title}”`).join(" and ")}.`, { undo: () => updateSettings(c.id, { screeningIds: prev }) });
    }
    if (/publish|\bassign\b|who takes/.test(l)) return say("Publishing and assigning happen together on the last stage: what goes live, what happens to anyone on the old version, and who else gets it.", { link: { href: `${base}/assign`, label: "Publish & assign" } });

    /* The open objective: its name and what it's scored on. */
    if (open) {
      const re = prompt.match(/rename\s+(?:this\s+|the\s+)?objective\s+(?:to\s+)?["“]?(.+?)["”]?\.?$/i)?.[1];
      if (re) {
        const prev = c.objectives ?? [];
        updateCourse(c.id, { objectives: prev.map((x) => (x.id === open.id ? { ...x, title: re } : x)) });
        return say(`It's “${re}” now.`, { undo: () => updateCourse(c.id, { objectives: prev }) });
      }
      const pct = Number(l.match(/(\d{1,2})\s*%/)?.[1]);
      const comp = pct ? COMPETENCIES.find((x) => x.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4).some((w) => l.includes(w))) : undefined;
      if (comp) {
        const others = open.weights.filter((w) => w.competency !== comp.id);
        const scaled = evenTo100(others.length ? others : [{ competency: comp.id, pct: 100 }]).map((w) => ({ ...w, pct: Math.max(1, Math.round((w.pct * (100 - pct)) / 100)) }));
        const next = evenTo100([{ competency: comp.id, pct }, ...scaled.filter((w) => w.competency !== comp.id)]);
        const before = open.weights;
        saveObjectiveWeights(c, open, next);
        return say(`${comp.name} counts for ${next[0].pct}% now; the others are scaled to fit: ${next.slice(1).map((w) => `${competency(w.competency)?.name} ${w.pct}%`).join(", ")}. Its situations are scored the same way.`, { undo: () => saveObjectiveWeights(cur(), open, before) });
      }
      /* Sharpening it: what good looks like, and who it involves. */
      const good = prompt.match(/^(?:good looks like|look for|they should|a good rep)\s*[:\-]?\s*(.+)$/i)?.[1];
      const people = (Object.keys(CHARACTERS) as (keyof typeof CHARACTERS)[]).filter((k) => new RegExp(`\\b${CHARACTERS[k].label.toLowerCase()}s?\\b`).test(l) && !open.people.includes(k));
      if (step === 1 && (good || (people.length && /\b(add|with|involve|include)\b/.test(l)))) {
        const prev = c.objectives ?? [];
        const point = good ? good.charAt(0).toUpperCase() + good.slice(1).replace(/\.$/, "") : undefined;
        updateCourse(c.id, { objectives: prev.map((x) => (x.id === open.id ? { ...x, lookFors: point ? [...lookForsOf(x), point] : x.lookFors, people: [...x.people, ...people] } : x)) });
        return say([point && `Added to what good looks like: “${point}”.`, people.length && `It involves ${people.map((p) => CHARACTERS[p].label.toLowerCase()).join(" and ")} now too.`].filter(Boolean).join(" "), { undo: () => updateCourse(c.id, { objectives: prev }) });
      }
      if (step === 2 && prompt.trim().split(/\s+/).length >= 4) return draftSituation(prompt, open);
      if (step === 1 && prompt.trim().split(/\s+/).length >= 4) {
        const prev = c.objectives ?? [];
        const point = prompt.trim().charAt(0).toUpperCase() + prompt.trim().slice(1).replace(/\.$/, "");
        updateCourse(c.id, { objectives: prev.map((x) => (x.id === open.id ? { ...x, lookFors: [...lookForsOf(x), point] } : x)) });
        return say(`Added to what good looks like for “${open.title}”: “${point}”. To add a new objective instead, close this one first.`, { undo: () => updateCourse(c.id, { objectives: prev }) });
      }
    }
    const n = Number(l.match(/objective\s*(\d+)/)?.[1]);
    if (n && /remove|delete|drop/.test(l)) {
      const prev = c.objectives ?? [];
      const gone = prev[n - 1];
      if (!gone) return say(`There's no objective ${n}.`);
      const its = scs.filter((x) => x.objectiveId === gone.id);
      its.forEach(removeSituation);
      updateCourse(c.id, { objectives: prev.filter((x) => x.id !== gone.id) });
      return say(`Removed “${gone.title}”${its.length ? ` and its ${its.length} situation${its.length === 1 ? "" : "s"}` : ""}.`);
    }

    /* Lessons. */
    if (/\b(lesson|file|module)s?\b/.test(l)) {
      const r = directRespond(prompt, c, search.get("module") ?? undefined);
      return chat.push(course.id, { id: r.id, from: "ai", text: r.text, changes: r.changes, status: r.status });
    }
    /* On the objectives, a description is a new objective; on the situations, a new situation. */
    if (step === 1 && prompt.trim().split(/\s+/).length >= 4) return addObjective(prompt);
    if (step === 2 && prompt.trim().split(/\s+/).length >= 4) return draftSituation(prompt, open);
    return say(HELP[ctx]);
  }

  function send(prompt: string) {
    if (!prompt.trim() || busy) return;
    chat.push(course.id, { id: turnId("u"), from: "you", text: prompt.trim() });
    setText("");
    if (!editable) { say(`This version is live and locked. Use “Edit as v${(data!.cur.version) + 1}” in the top bar first, and I'll make the change there.`); return; }
    setBusy(true);
    const pending = chat.asked?.kind;
    chat.clearAsk();
    asked.current = 0;
    window.setTimeout(() => { handle(prompt.trim(), pending); setBusy(false); }, 600);
  }

  /* On the objectives and situations, a file is information for the training (reps don't see it); later, a new lesson. */
  function attach(files: File[]) {
    if (!files.length || !editable) return;
    const added = upload(files, step <= 2 ? "rp" : "rep");
    const c = cur();
    chat.push(course.id, { id: turnId("u"), from: "you", text: `Attached ${files.map((f) => f.name).join(", ")}` });
    if (step <= 2) {
      const prev = c.roleplaySourceIds ?? [];
      updateCourse(c.id, { roleplaySourceIds: [...prev, ...added.map((a) => a.id)], sourceIds: [...new Set([...c.sourceIds, ...added.map((a) => a.id)])] });
      return say(`Added ${added.length === 1 ? "it" : "them"} as information for the training: new objectives and situations draw on ${added.length === 1 ? "it" : "them"}, and reps don't see ${added.length === 1 ? "it" : "them"}. To show ${added.length === 1 ? "it" : "them"} to reps, switch ${added.length === 1 ? "it" : "them"} on under Files.`, { undo: () => updateCourse(c.id, { roleplaySourceIds: prev }) });
    }
    const mods = directModules(added, `d${Date.now().toString(36).slice(-4)}`);
    chat.push(course.id, { id: turnId("a"), from: "ai", text: `I'll add ${added.length === 1 ? "it as a new lesson" : `them as ${added.length} new lessons`} at the end, exactly as uploaded.`, changes: mods.map((m) => ({ kind: "addModule" as const, module: m })), status: "pending" });
  }

  function accept(t: TrainingTurn) {
    const c = cur();
    const prev = c.modules;
    setModules(c.id, applyChanges(c, t.changes!).modules);
    chat.patch(course.id, t.id, { status: "accepted", undo: () => setModules(c.id, prev) });
  }

  const suggestions = SUGGEST[ctx];
  const started = thread.some((t) => t.from === "you");
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {/* A step passed through without a word shows no marker of its own. */}
        {thread.filter((t, i) => t.from !== "divider" || thread[i + 1]?.from !== "divider").map((t) => t.from === "divider" ? (
          <div key={t.id} className="flex items-center gap-2 py-1 text-micro font-bold uppercase tracking-wider text-ink-4"><span className="h-px flex-1 bg-hair" />{t.text}<span className="h-px flex-1 bg-hair" /></div>
        ) : (
          <div key={t.id} className={cn("flex flex-col gap-1.5", t.from === "you" && "items-end")}>
            {t.focus && <span className="rounded-chip bg-tint px-2 py-0.5 text-micro font-bold text-brand-deep">{t.focus}</span>}
            {t.steps ? (
              <div className="flex max-w-[92%] flex-col gap-1 rounded-panel bg-subtle px-3.5 py-2.5 text-body">
                {t.steps.length === 0 && <span className="flex gap-1 text-ink-3"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></span>}
                {t.steps.map((s, k) => (
                  <span key={s} className={cn("flex items-center gap-2", k > (t.at ?? 0) && "opacity-35")}>
                    {k < (t.at ?? 0) ? <Check className="size-3.5 shrink-0 text-ok" aria-hidden="true" /> : <span className={cn("size-2 shrink-0 rounded-full", k === t.at ? "animate-pulse bg-brand" : "bg-hair-3")} />}{s}{k === t.at ? "…" : ""}
                  </span>
                ))}
              </div>
            ) : (
              <div className={cn("max-w-[92%] rounded-panel px-3.5 py-2.5 text-body leading-relaxed", t.from === "you" ? "bg-ink text-white" : "bg-subtle text-ink")}>{t.text}</div>
            )}
            {t.changes && (
              <div className="flex w-full flex-col gap-1.5 rounded-panel border border-hair p-3">
                {t.changes.map((ch, i) => (
                  <span key={i} className={cn("rounded-chip px-2 py-1 text-body", ch.kind === "removeModule" ? "bg-danger-bg text-danger line-through decoration-danger/60" : ch.kind === "addModule" ? "bg-ok-bg text-ok" : "bg-tint text-brand-deep")}>
                    {ch.kind === "addModule" ? `+ Lesson: ${ch.module.title}` : "label" in ch ? (ch.kind === "removeModule" ? `Lesson: ${ch.label}` : ch.label) : ""}
                  </span>
                ))}
                {t.status === "pending"
                  ? <div className="flex gap-2 pt-1"><Button size="sm" onClick={() => accept(t)}>Accept</Button><Button size="sm" variant="secondary" onClick={() => chat.patch(course.id, t.id, { status: "rejected" })}>Reject</Button></div>
                  : <Text size="caption" weight="semibold" tone={t.status === "accepted" ? "ok" : "subtle"}>{t.status === "accepted" ? "Applied" : "Rejected"}</Text>}
              </div>
            )}
            {t.link && <Button size="sm" variant="secondary" className="self-start" onClick={() => router.push(t.link!.href)}>{t.link.label}<ArrowRight className="size-3.5" aria-hidden="true" /></Button>}
            {t.undo && (t.undone
              ? <Text size="caption" weight="semibold" tone="subtle">Undone</Text>
              : <button type="button" onClick={() => { t.undo!(); chat.patch(course.id, t.id, { undone: true }); }} className="flex items-center gap-1 text-caption font-semibold text-ink-3 hover:text-ink"><Undo2 className="size-3.5" aria-hidden="true" />Undo</button>)}
          </div>
        ))}
        {!started && editable && <Suggestions items={suggestions} onPick={send} variant="list" />}
        {busy && <div className="flex gap-1 self-start rounded-panel bg-subtle px-3.5 py-3 text-ink-3"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
        <div ref={endRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-hair p-3">
        {started && editable && <Suggestions items={suggestions} onPick={send} variant="row" />}
        <Composer id="training-chat" value={text} onChange={setText} onSend={() => send(text)} busy={busy} onAttach={attach}
          placeholder={chat.asked?.kind === "objective" ? "Describe the objective" : chat.asked?.kind === "situation" ? "Describe the situation" : ctx === "objectives" ? "Describe an objective to add, or say what to change" : ctx === "objective" ? "Sharpen this objective: what good looks like, who, criteria" : ctx === "situations" ? (ob ? `Describe a situation for “${ob.title}”` : "Describe a situation to add") : ctx === "assign" ? "Ask to publish, or about who should take it" : "Set the pass mark, tries or wait between tries"}
          hint={`On ${where}. Every change can be undone.`} />
      </div>
    </div>
  );
}
