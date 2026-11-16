"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { COMPETENCIES, competency } from "@/data/org";
import type { Course, CourseSettings } from "@/data/types";
import { editCall } from "@/lib/roleplay-draft";
import { CHARACTERS, characterOf, evenTo100, weightsOf, withWeights } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Composer, Suggestions } from "@/features/copilot/composer";
import { directModules } from "../materials";
import { useUpload } from "../direct-course";
import { applyChanges, directRespond } from "./chat";
import { useAddScenario } from "./scenarios";
import { useCourse } from "./use-course";
import { stepOf, turnId, useTrainingChat, type TrainingTurn } from "./training-chat-store";

const EMPTY: TrainingTurn[] = [];
const SUGGEST = {
  details: ["Make it public", "Move lesson 2 to the start", "Brief: reps can handle a first call with a dermatologist", "Rename the training to “Lumora first calls”"],
  scenarios: ["A practice nurse worried about who teaches the injections", "A tough pharmacist asking about storage and the formulary", "Use the first 3 scenarios in screening"],
  scenario: ["Make it tougher", "Add an objection about dosing", "Put 40% on objection handling", "Make it a 4-minute call"],
  assign: ["Set the pass mark to 80%", "Allow 2 tries on each scenario", "Wait 24 hours between tries", "Turn hints off on the scored call"],
};
const HELP = {
  details: "Here I can rename the training, make it public or private, change the brief, and move, rename or remove lessons. Attach a file with the paperclip to add it as a lesson.",
  scenarios: "Describe a scenario and I'll draft it: who the rep meets and what happens. I can also change which scenarios screening uses. Attach a document to use it as a source for the demo call.",
  scenario: "Tell me how to change this scenario: tougher or easier, add or drop an objection, a line in quotes, the call length, or how much a competency counts.",
  assign: "Here I can set the pass mark, the tries on each scenario, the wait between tries, and hints on the scored call. Assigning opens once the training is published.",
};

/**
 * The agent for a training built with the trainer's own material: one conversation for all three
 * steps, on the left of the editor. It knows the step (and the scenario) on screen and changes
 * whatever the trainer asks there: details and lessons, scenarios, the pass rules. Edits can be undone;
 * lesson changes wait for an OK.
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
  const saveScenario = useApp((s) => s.saveScenario);
  const upload = useUpload(course.productId);
  const addScenario = useAddScenario(course);
  const chat = useTrainingChat();
  const thread = chat.threads[course.id] ?? EMPTY;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const base = `/trainer/courses/${course.id}`;
  const step = stepOf(pathname, base);
  const sc = step === 2 && search.get("sc") ? allScenarios().find((x) => x.id === search.get("sc")) : undefined;
  const ctx = step === 1 ? "details" : step === 3 ? "assign" : sc ? "scenario" : "scenarios";
  const where = step === 1 ? "Details & materials" : step === 3 ? "Assign to people" : sc ? `Scenario · ${sc.title}` : "Scenarios";
  const editable = !!data?.editable;
  const focus = chat.focus && sc && chat.focus.scId === sc.id ? chat.focus : null;
  const say = (t: string, extra?: Partial<TrainingTurn>) => chat.push(course.id, { id: turnId("a"), from: "ai", text: t, ...extra });

  /* A training opened without a setup conversation starts with a hello; every move to another step leaves a marker. */
  useEffect(() => {
    const s = useTrainingChat.getState();
    if (!s.threads[course.id]?.length)
      s.push(course.id, { id: turnId("a"), from: "ai", text: data?.editable
        ? `I'm with you on all three steps of ${course.title}: details and lessons, scenarios, and assigning. Tell me what to change, or pick a suggestion.`
        : `${course.title} v${data?.cur.version} is live and locked. Use “Edit as v${(data?.cur.version ?? 0) + 1}” in the top bar and I'll make changes there.` });
  }, [course.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const s = useTrainingChat.getState();
    const t = s.threads[course.id] ?? [];
    const last = t.at(-1);
    /* Passing through a step without a word moves the marker instead of stacking another. */
    if (last?.from === "divider") { if (last.text !== where) s.patch(course.id, last.id, { text: where }); }
    else if ([...t].reverse().find((x) => x.from === "divider")?.text !== where) s.push(course.id, { id: turnId("d"), from: "divider", text: where });
  }, [where, course.id]);
  /* "Add scenario" on the page: the agent asks for it here. */
  const asked = useRef(chat.asks);
  useEffect(() => {
    if (chat.asks === asked.current) return;
    asked.current = chat.asks;
    say("Tell me about the scenario: who the rep meets (a doctor, nurse, practice manager or pharmacist), what happens on the call, and what you want to test.");
    window.setTimeout(() => document.getElementById("training-chat")?.focus(), 60);
  }, [chat.asks]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (focus) document.getElementById("training-chat")?.focus(); }, [focus]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [thread.length, busy]);
  if (!data) return null;

  const cur = () => useApp.getState().courses.find((c) => c.id === course.id) ?? course;

  function draftScenario(prompt: string) {
    const id = turnId("a");
    chat.push(course.id, { id, from: "ai", text: "", steps: [], at: 0 });
    addScenario(prompt, (steps, at) => useTrainingChat.getState().patch(course.id, id, { steps, at }), (d) => {
      const ws = weightsOf(d).map((w) => `${competency(w.competency)?.name.toLowerCase()} (${w.pct}%)`).join(", ");
      useTrainingChat.getState().patch(course.id, id, { steps: undefined, text: `Added “${d.title}” with ${d.persona.name}, scored on ${ws}.`, link: { href: `${base}/roleplay?sc=${d.id}`, label: "Open it" } });
      useTrainingChat.getState().setAdded(d.id);
      if (step !== 2) router.push(`${base}/roleplay`);
    });
  }

  /** What the trainer asked, wherever they are. Settings and scenarios work from any step. */
  function handle(prompt: string, f: typeof focus) {
    const l = prompt.toLowerCase();
    const c = cur();
    const st = c.settings;
    const scs = allScenarios().filter((x) => c.scenarioIds.includes(x.id));

    if (/\b(add|create|new|another|draft)\b.*\bscenarios?\b/.test(l) && !/screening/.test(l)) return draftScenario(prompt);

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
    if (/publish/.test(l)) return say("Publishing makes this version live for reps; the next edits become a new draft.", { link: { href: `${base}/review`, label: "Go to publish" } });
    if (/\bassign\b|who takes/.test(l))
      return data!.lv ? say("Pick who takes it on the Assign step.", { link: { href: `${base}/assign`, label: "Assign to people" } }) : say("Publish it first; then you can pick who takes it. Reps never see a draft.", { link: { href: `${base}/review`, label: "Go to publish" } });

    /* The open scenario. */
    if (sc) {
      const now = useApp.getState().scenarios.find((x) => x.id === sc.id) ?? sc;
      const pct = Number(l.match(/(\d{1,2})\s*%/)?.[1]);
      const comp = pct ? COMPETENCIES.find((x) => x.name.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 4).some((w) => l.includes(w))) : undefined;
      if (comp) {
        const ws = weightsOf(now);
        const others = ws.filter((w) => w.competency !== comp.id);
        const scaled = evenTo100(others.length ? others : [{ competency: comp.id, pct: 100 }]).map((w) => ({ ...w, pct: Math.max(1, Math.round((w.pct * (100 - pct)) / 100)) }));
        const next = evenTo100([{ competency: comp.id, pct }, ...scaled.filter((w) => w.competency !== comp.id)]);
        saveScenario(withWeights(now, next), { practice: now.use.includes("practice"), final: c.settings.assessmentScenarioId === now.id });
        return say(`${comp.name} counts for ${next[0].pct}% now; the others are scaled to fit: ${next.slice(1).map((w) => `${competency(w.competency)?.name} ${w.pct}%`).join(", ")}.`, { undo: () => saveScenario(now, { practice: now.use.includes("practice"), final: c.settings.assessmentScenarioId === now.id }) });
      }
      const r = editCall(now, prompt, f?.focus);
      /* The edit replies speak of "the doctor"; this scenario's character may be someone else. */
      const who = CHARACTERS[characterOf(now)].label.toLowerCase();
      if (who !== "doctor") r.reply = r.reply.replace(/\b([Tt])he doctor\b/g, (_m, t) => `${t}he ${who}`);
      if (r.next) {
        saveScenario(r.next, { practice: now.use.includes("practice"), final: c.settings.assessmentScenarioId === now.id });
        useTrainingChat.getState().setFlash(r.changed);
        return say(r.reply, { undo: () => { saveScenario(now, { practice: now.use.includes("practice"), final: c.settings.assessmentScenarioId === now.id }); useTrainingChat.getState().setFlash([]); } });
      }
      return say(r.reply);
    }

    /* Lessons. */
    if (step === 1 || /\b(lesson|file|module)s?\b/.test(l)) {
      const r = directRespond(prompt, c, search.get("module") ?? undefined);
      return chat.push(course.id, { id: r.id, from: "ai", text: r.text, changes: r.changes, status: r.status });
    }
    /* On the scenario list, a description is a new scenario. */
    if (step === 2 && prompt.trim().split(/\s+/).length >= 4 && !/tough|easier|minute|objection|line/.test(l)) return draftScenario(prompt);
    if (step === 2) return say("Open a scenario first, then tell me what to change in it. Or describe a new one and I'll draft it.");
    return say(HELP[ctx]);
  }

  function send(prompt: string) {
    if (!prompt.trim() || busy) return;
    chat.push(course.id, { id: turnId("u"), from: "you", text: prompt.trim(), focus: focus?.label });
    setText("");
    if (!editable) { say(`This version is live and locked. Use “Edit as v${(data!.cur.version) + 1}” in the top bar first, and I'll make the change there.`); return; }
    setBusy(true);
    const f = focus;
    window.setTimeout(() => { handle(prompt.trim(), f); chat.setFocus(null); setBusy(false); }, 600);
  }

  /* On the scenarios, a file is a source for the demo call; anywhere else, a new lesson. */
  function attach(files: File[]) {
    if (!files.length || !editable) return;
    const added = upload(files, step === 2 ? "rp" : "rep");
    const c = cur();
    chat.push(course.id, { id: turnId("u"), from: "you", text: `Attached ${files.map((f) => f.name).join(", ")}` });
    if (step === 2) {
      const prev = c.roleplaySourceIds ?? [];
      updateCourse(c.id, { roleplaySourceIds: [...prev, ...added.map((a) => a.id)], sourceIds: [...new Set([...c.sourceIds, ...added.map((a) => a.id)])] });
      return say(`Added ${added.length === 1 ? "it" : "them"} as ${added.length === 1 ? "a source" : "sources"} for the demo call. New scenarios I draft will use ${added.length === 1 ? "it" : "them"}; reps never see ${added.length === 1 ? "it" : "them"}.`, { undo: () => updateCourse(c.id, { roleplaySourceIds: prev }) });
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
        {focus && (
          <span className="flex items-center gap-1.5 self-start rounded-chip border border-tint-line bg-tint py-1 pl-2.5 pr-1 text-caption font-semibold text-brand-deep">
            {focus.label}
            <button type="button" aria-label="Remove from chat" onClick={() => chat.setFocus(null)} className="grid size-5 place-items-center rounded-full hover:bg-white/70"><X className="size-3" /></button>
          </span>
        )}
        <Composer id="training-chat" value={text} onChange={setText} onSend={() => send(text)} busy={busy} onAttach={attach}
          placeholder={ctx === "details" ? "Rename, make it public, change the brief, or move a lesson" : ctx === "scenarios" ? "Describe a scenario to add, e.g. a nurse who asks about missed doses" : ctx === "scenario" ? (focus ? `Change ${focus.label.toLowerCase()}` : "Tell me what to change in this scenario") : "Set the pass mark, tries or wait between tries"}
          hint={`On ${where}. Every change can be undone.`} />
      </div>
    </div>
  );
}
