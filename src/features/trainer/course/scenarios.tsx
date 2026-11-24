"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Briefcase, Check, ChevronDown, Mic, Target, Pill, Plus, Search, Stethoscope, Syringe, Trash2, UserRound, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios, objection } from "@/data/scenarios";
import { competency, source } from "@/data/org";
import type { Character, Course, Objective, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, draftFromPrompt, weightsOf, withWeights } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/features/copilot/copilot-store";
import { SourcePreview } from "../source-preview";
import { describe, draftObjectives, lookForsOf, objectiveFromPrompt } from "@/lib/objectives";
import { StageHeader } from "./stage-ui";
import { CitationPill } from "@/features/shared/citation-pill";
import { AgentIcon } from "@/components/ui/logo-mark";
import { askFor, turnId, useSetupDrafting, useTrainingChat } from "./training-chat-store";
import { ObjectiveFlow } from "./roleplay";
import { objectiveBank } from "@/lib/objective-call";

/** One colour per criterion, the same wherever it's shown. */
const chip = (on: boolean) => cn("inline-flex h-9 items-center gap-1.5 rounded-control border px-2.5 text-caption font-semibold transition-colors", on ? "border-brand bg-tint text-brand-deep" : "border-hair-2 bg-card text-ink-2 hover:border-hair-3");
const SEG = ["bg-brand", "bg-info", "bg-ok", "bg-warn", "bg-ink-3", "bg-brand-2"];

/** Who the rep meets, as an icon: the role, not a made-up face. */
export const ROLE_ICON: Record<Character, LucideIcon> = { doctor: Stethoscope, nurse: Syringe, manager: Briefcase, pharmacist: Pill, patient: UserRound };

/* Trainings whose loose situations are being moved under an objective right now, so it happens once. */
const homing = new Set<string>();

const useOf = (c: Course, sc: Scenario) => ({ practice: sc.use.includes("practice"), final: c.settings.assessmentScenarioId === sc.id });

/** An objective's new criteria weights, and its example situations scored on them too. */
export function saveObjectiveWeights(course: Course, ob: Objective, weights: Objective["weights"]) {
  const st = useApp.getState();
  const c = st.courses.find((x) => x.id === course.id) ?? course;
  st.updateCourse(c.id, { objectives: (c.objectives ?? []).map((x) => (x.id === ob.id ? { ...x, weights } : x)) });
  for (const sc of allScenarios().filter((x) => x.objectiveId === ob.id && c.scenarioIds.includes(x.id))) st.saveScenario(withWeights(sc, weights), useOf(c, sc));
}

/** Objectives for a training, drawn from its brief and every file; the chat tells the trainer what it did. */
export function draftObjectivesFor(course: Course) {
  const st = useApp.getState();
  const c = st.courses.find((x) => x.id === course.id) ?? course;
  const materials = c.sourceIds.map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x);
  const obs = draftObjectives({ brief: c.brief ?? c.objective, productId: c.productId, materials });
  st.updateCourse(c.id, { objectives: [...(c.objectives ?? []), ...obs] });
  useTrainingChat.getState().push(c.id, { id: turnId("a"), from: "ai", text: `I drafted ${obs.length} objectives from your brief and material: ${obs.map((o, i) => `${i + 1}. ${o.title}`).join("; ")}. Each shows where it comes from in your files. Add, change or remove any, then I'll generate example situations for each.` });
  return obs;
}

/** Situations made before objectives existed go under one drawn from the brief, scored as they were. Once per training. */
export function useHomeStrays(course: Course | undefined, scs: Scenario[]) {
  const loose = course ? scs.filter((x) => !(course.objectives ?? []).some((o) => o.id === x.objectiveId)).length : 0;
  useEffect(() => {
    if (!course || !loose || homing.has(course.id)) return;
    homing.add(course.id);
    const st = useApp.getState();
    const c = st.courses.find((x) => x.id === course.id) ?? course;
    const strays = allScenarios().filter((x) => c.scenarioIds.includes(x.id) && !(c.objectives ?? []).some((o) => o.id === x.objectiveId));
    if (!strays.length) return void homing.delete(course.id);
    const materials = c.sourceIds.map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x);
    const ob = { ...objectiveFromPrompt(c.brief ?? c.objective ?? c.title, materials, (c.objectives ?? []).length), weights: weightsOf(strays[0]) };
    const people = [...new Set(strays.map((x) => characterOf(x)))];
    st.updateCourse(c.id, { objectives: [...(c.objectives ?? []), { ...ob, people }] });
    for (const sc of strays) st.saveScenario({ ...sc, objectiveId: ob.id }, useOf(c, sc));
    homing.delete(course.id);
  }, [loose]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Stage 1: the training's objectives, what reps should be able to do, drafted from the brief and the
 * files as the training is created. Each comes from the material, involves certain people, and is
 * scored on its own criteria. The trainer sharpens, adds and removes them in the chat. A row opens in place.
 */
export function ObjectiveList({ course, editable }: { course: Course; editable: boolean }) {
  const custom = useApp((s) => s.scenarios);
  const updateCourse = useApp((s) => s.updateCourse);
  const fresh = useTrainingChat((s) => s.added);
  const router = useRouter();
  const openId = useSearchParams().get("obj");
  const [preview, setPreview] = useState<string | null>(null);
  const [editingGoal, setEditingGoal] = useState(false);
  const drafting = useSetupDrafting(course.id);
  useEffect(() => { const id = fresh ?? openId; if (id) window.setTimeout(() => document.getElementById(`ob-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }, [fresh, openId]);
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  useHomeStrays(course, scs);
  const base = `/trainer/courses/${course.id}`;
  const obs = course.objectives ?? [];
  const toggle = (id: string) => router.replace(openId === id ? `${base}/roleplay` : `${base}/roleplay?obj=${id}`, { scroll: false });
  const [q, setQ] = useState("");
  const [who, setWho] = useState<Character[]>([]);
  const everyone = [...new Set(obs.flatMap((o) => o.people))];
  const filtered = q.trim() !== "" || who.length > 0;
  const shown = obs.map((ob, i) => ({ ob, i })).filter(({ ob }) => {
    if (who.length && !ob.people.some((p) => who.includes(p))) return false;
    const hay = [ob.title, describe(ob), ...lookForsOf(ob)].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });
  const clear = () => { setQ(""); setWho([]); };

  function removeObjective(ob: Objective) {
    for (const sc of scs.filter((x) => x.objectiveId === ob.id)) removeSituation(sc);
    const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course;
    updateCourse(course.id, { objectives: (c.objectives ?? []).filter((x) => x.id !== ob.id) });
    router.replace(`${base}/roleplay`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-4 pb-4">
      <StageHeader n={2} sub="What reps should be able to do. Change them in the chat." />

      {/* The training's goal: the brief it was made from, which every objective serves. */}
      <section className="squircle flex items-start gap-3 rounded-panel border border-hair bg-card px-4 py-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><Target className="size-4" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">Goal</Text>
          {editingGoal
            ? <textarea autoFocus aria-label="Goal" rows={2} value={course.brief ?? ""} onChange={(e) => updateCourse(course.id, { brief: e.target.value, objective: e.target.value })} onBlur={() => setEditingGoal(false)}
                className="w-full resize-none rounded-control border border-brand/50 bg-card px-2 py-1 text-body leading-relaxed text-ink outline-none" />
            : <Text size="body" className="leading-relaxed text-ink-2">{course.brief || course.objective || "Say what reps should be able to do overall."}</Text>}
        </div>
        {editable && !editingGoal && <button type="button" onClick={() => setEditingGoal(true)} className="shrink-0 rounded-control px-2 py-1 text-caption font-semibold text-brand-deep hover:bg-tint">Edit</button>}
      </section>

      {/* Straight from setup: placeholders where the objectives land, while the agent drafts them in the chat. */}
      {drafting && obs.length === 0 && (
        <div className="flex flex-col gap-2" role="status" aria-label="Drafting objectives" aria-busy="true">
          {[0, 1, 2, 3].map((k) => (
            <div key={k} className="squircle flex items-center gap-3.5 rounded-card border border-hair bg-card px-4 py-3 shadow-hair" style={{ animationDelay: `${k * 120}ms` }}>
              <span className="shimmer size-8 shrink-0 rounded-control bg-tint" />
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="shimmer h-3.5 rounded-full bg-subtle" style={{ width: `${62 - k * 7}%` }} />
                <span className="shimmer h-2.5 rounded-full bg-subtle" style={{ width: `${84 - k * 5}%` }} />
              </span>
            </div>
          ))}
          <Text size="caption" tone="subtle" className="flex items-center justify-center gap-1.5 pt-1"><AgentIcon className="size-3.5 animate-pulse text-brand" aria-hidden="true" />Drafting objectives from your brief and files…</Text>
        </div>
      )}

      {/* None left: write one, or draw them from the material again. */}
      {obs.length === 0 && !drafting && (
        <section className="squircle flex flex-col items-center gap-3 rounded-card border border-dashed border-hair-3 bg-card px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-tint text-brand"><Target className="size-6" aria-hidden="true" /></span>
          <Text size="title" weight="bold">No objectives</Text>
          <Text size="body" tone="muted" className="max-w-[460px]">Describe one in the chat, or let SwishX draw them from your goal and files again.</Text>
          {editable && <div className="flex gap-2"><Button onClick={() => askFor("objective")}>Write one</Button><Button variant="secondary" onClick={() => draftObjectivesFor(course)}><AgentIcon className="size-4" aria-hidden="true" />Draft from my files</Button></div>}
        </section>
      )}

      {obs.length > 3 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-control border border-hair-2 bg-card px-3 transition-colors focus-within:border-brand/60">
            <Search className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search objectives" aria-label="Search objectives" className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-4" />
            {q && <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="grid size-5 place-items-center rounded-full text-ink-4 hover:bg-subtle hover:text-ink"><X className="size-3.5" /></button>}
          </label>
          {everyone.map((p) => {
            const Icon = ROLE_ICON[p];
            const on = who.includes(p);
            return (
              <button key={p} type="button" aria-pressed={on} onClick={() => setWho(on ? who.filter((x) => x !== p) : [...who, p])} className={chip(on)}>
                <Icon className="size-3.5" aria-hidden="true" />{CHARACTERS[p].label}
              </button>
            );
          })}
          {filtered && <button type="button" onClick={clear} className="px-1.5 text-caption font-semibold text-brand-deep hover:underline">Clear</button>}
        </div>
      )}

      <ol className="flex flex-col gap-2" aria-label="Objectives">
        {filtered && !shown.length && (
          <li className="squircle flex flex-col items-center gap-1.5 rounded-card border border-dashed border-hair-3 px-6 py-8 text-center">
            <Text size="body" weight="semibold">No objectives match</Text>
            <button type="button" onClick={clear} className="text-caption font-semibold text-brand-deep hover:underline">Clear search and filters</button>
          </li>
        )}
        {shown.map(({ ob, i }) => {
          const open = openId === ob.id;
          return (
            <li key={ob.id} id={`ob-${ob.id}`} className={cn("squircle relative scroll-mt-4 overflow-hidden rounded-card border bg-card transition-all", open ? "border-brand/30 shadow-soft" : "border-hair shadow-hair hover:border-hair-3 hover:shadow-soft", fresh === ob.id && !open && "node-flash")}>
              <div role="button" tabIndex={0} aria-expanded={open} onClick={() => toggle(ob.id)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(ob.id); } }} className={cn("flex w-full cursor-pointer gap-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40", open ? "items-start p-5" : "items-center px-4 py-3")}>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-control text-caption font-extrabold tabular-nums transition-colors", open ? "bg-brand text-white" : "bg-tint text-brand-deep")}>{String(i + 1).padStart(2, "0")}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("font-bold leading-snug text-ink", open ? "text-body-lg" : "truncate text-body")}>{ob.title}</span>
                  {open ? (
                    <>
                      <span className="mt-0.5 text-body leading-relaxed text-ink-3">{describe(ob)}<CitationPill cites={ob.cites} onView={setPreview} /></span>
                      <span className="mt-2 text-caption text-ink-3"><People people={ob.people} /></span>
                    </>
                  ) : <span className="truncate text-caption text-ink-3">{describe(ob)}</span>}
                </span>
                {!open && <span className="hidden shrink-0 md:flex"><People people={ob.people} icons /></span>}
                <ChevronDown className={cn("size-4 shrink-0 text-ink-4 transition-transform", open && "mt-2 rotate-180 text-ink-2")} aria-hidden="true" />
              </div>
              {open && (
                <div className="flex flex-col gap-6 border-t border-hair bg-canvas/60 p-5">
                  <Block label="What good looks like" action={editable ? <Text size="caption" tone="subtle">Add to it in the chat</Text> : undefined}>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {lookForsOf(ob).map((x) => <li key={x} className="flex items-start gap-2 text-body text-ink-2"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-ok-bg text-ok"><Check className="size-3" aria-hidden="true" /></span>{x}</li>)}
                    </ul>
                  </Block>
                  <Block label="Scored on" action={editable ? <Text size="caption" tone="subtle">Change it in the chat</Text> : undefined}>
                    {/* Just what it's scored on; the weights stay behind the scenes. */}
                    <ul className="flex flex-wrap gap-1.5">
                      {ob.weights.map((w, i) => (
                        <li key={w.competency} className="flex items-center gap-1.5 rounded-chip border border-hair-2 bg-card px-2.5 py-1 text-body text-ink-2">
                          <span className={cn("size-2 shrink-0 rounded-full", SEG[i % SEG.length])} aria-hidden="true" />{competency(w.competency)?.name}
                        </li>
                      ))}
                    </ul>
                  </Block>
                  {/* The objective's call, as a flow: only when viewing a live training, not while building or editing. */}
                  {!editable && (() => {
                    const bank = objectiveBank(course, ob, scs);
                    return (
                      <Block label="Call flow" action={<Link href={`${base}/roleplay/test?run=objective&obj=${ob.id}`} className="inline-flex items-center gap-1 text-caption font-semibold text-brand-deep hover:underline"><Mic className="size-3.5" aria-hidden="true" />Test the call</Link>}>
                        <div className="squircle overflow-hidden rounded-panel border border-hair bg-card"><ObjectiveFlow scs={bank} passMark={course.settings.passRoleplay} /></div>
                      </Block>
                    );
                  })()}
                  {editable && <button type="button" onClick={() => removeObjective(ob)} className="flex items-center gap-1.5 self-end text-caption font-semibold text-ink-4 transition-colors hover:text-danger"><Trash2 className="size-3.5" aria-hidden="true" />Delete objective</button>}
                </div>
              )}
            </li>
          );
        })}
        {editable && obs.length > 0 && (
          <li>
            <button type="button" onClick={() => askFor("objective")} className="squircle flex w-full items-center gap-3.5 rounded-card border border-dashed border-hair-3 px-4 py-3 text-left transition-colors hover:border-brand hover:bg-tint">
              <span className="grid size-8 place-items-center rounded-control border border-dashed border-brand/40 text-brand-deep"><Plus className="size-4" aria-hidden="true" /></span>
              <span className="flex flex-col"><span className="text-body font-bold text-brand-deep">Add objective</span><span className="text-caption text-ink-3">Describe it to the agent: what reps should do, and with whom</span></span>
            </button>
          </li>
        )}
      </ol>
      {preview && source(preview) && <SourcePreview s={source(preview)!} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** A situation in full: who the rep meets, what happens, how it opens, what they'll push on, and how it's scored. */
export function SituationDetail({ sc, objective: ob, inScreening }: { sc: Scenario; objective?: Objective; inScreening: boolean }) {
  const who = characterOf(sc);
  const Icon = ROLE_ICON[who];
  const pushes = sc.custom?.objections ?? sc.objectionIds.map((x) => objection(x)).filter(Boolean);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><Icon className="size-5" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="caption" weight="bold" tone="muted">{CHARACTERS[who].label} · {sc.persona.name} · {sc.durationMin} min{inScreening ? " · in screening" : ""}</Text>
          <Text as="h2" size="title" weight="bold" className="leading-snug">{sc.title}</Text>
          {ob && <Text size="caption" tone="subtle">Tests: {ob.title}</Text>}
        </div>
      </div>
      {sc.description && <Text size="body-lg" className="leading-relaxed text-ink-2">{sc.description}</Text>}
      {sc.context && sc.context !== sc.description && (
        <Block label="The setup"><Text size="body" className="leading-relaxed text-ink-2">{sc.context}</Text></Block>
      )}
      {sc.persona.opening && (
        <Block label={`How ${sc.persona.name.replace(/,.*$/, "")} opens`}>
          <p className="squircle rounded-panel border-l-[3px] border-brand bg-tint/60 px-4 py-3 text-body italic leading-relaxed text-ink-2">“{sc.persona.opening}”</p>
        </Block>
      )}
      {pushes.length > 0 && (
        <Block label="What they'll push on">
          <ul className="flex flex-col gap-2">
            {pushes.map((o) => (
              <li key={o.id} className="flex flex-col gap-0.5 rounded-control border border-hair bg-card px-3 py-2.5">
                <span className="text-body font-semibold text-ink">{o.label}</span>
                <span className="text-caption italic leading-relaxed text-ink-3">“{o.line}”</span>
              </li>
            ))}
          </ul>
        </Block>
      )}
      {/* v1-hidden: what the situation is scored on. <Block label="Scored on"><Criteria weights={weightsOf(sc)} /></Block> */}
    </div>
  );
}

/** A labelled part of an opened objective, the same everywhere. */
export function Block({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <span className="flex items-center gap-2"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="flex-1">{label}</Text>{action}</span>
      {children}
    </section>
  );
}

/** The kinds of people an objective involves: their icons, overlapping, then their names. */
export function People({ people, icons }: { people: Character[]; icons?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="flex -space-x-1.5">
        {people.map((p) => { const Icon = ROLE_ICON[p]; return <span key={p} title={CHARACTERS[p].label} className="grid size-6 place-items-center rounded-full border-2 border-card bg-tint text-brand-deep"><Icon className="size-3" aria-hidden="true" /></span>; })}
      </span>
      {!icons && <span>{people.length <= 2 ? people.map((p) => CHARACTERS[p].label).join(" & ") : `${CHARACTERS[people[0]].label}, ${CHARACTERS[people[1]].label} +${people.length - 2}`}</span>}
    </span>
  );
}

/** Drafts a situation from what the trainer wrote, in steps they can watch; under an objective, it's scored on its criteria. */
export function useAddScenario(course: Course) {
  const saveScenario = useApp((s) => s.saveScenario);
  const setDrafting = useCopilot((s) => s.setDrafting);
  return (prompt: string, onStep: (steps: string[], at: number) => void, onDone: (sc: Scenario) => void, objective?: Objective) => {
    const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course;
    const used = allScenarios().filter((x) => c.scenarioIds.includes(x.id)).map((x) => x.persona.name);
    const drafted = draftFromPrompt(c, prompt, used);
    const sc = objective ? { ...withWeights(drafted, objective.weights), objectiveId: objective.id } : drafted;
    const ch = CHARACTERS[characterOf(sc)];
    const ws = weightsOf(sc).map((w) => `${competency(w.competency)?.name} ${w.pct}%`).join(", ");
    const steps = [`Reading ${c.brief ? "your brief and " : ""}your material`, `Choosing the person: ${ch.label.toLowerCase()}, ${sc.persona.name}`, "Writing what they say and how they push back", objective ? `Scoring it on “${objective.title}”: ${ws}` : `Weighting the criteria: ${ws}`];
    setDrafting(sc.title);
    let at = 0;
    onStep(steps, 0);
    const tick = () => {
      at++;
      if (at < steps.length) { onStep(steps, at); window.setTimeout(tick, 650); return; }
      saveScenario(sc, { practice: true, final: !c.settings.assessmentScenarioId });
      setDrafting(null);
      onDone(sc);
    };
    window.setTimeout(tick, 650);
  };
}

/** What an objective is scored on: its criteria and how much each counts, as one bar and its key. */
function Criteria({ weights: ws }: { weights: { competency: string; pct: number }[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
        {ws.map((w, i) => <span key={w.competency} className={SEG[i % SEG.length]} style={{ width: `${w.pct}%` }} />)}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
        {ws.map((w, i) => (
          <li key={w.competency} className="flex items-center gap-2 text-body text-ink-2">
            <span className={cn("size-2 shrink-0 rounded-full", SEG[i % SEG.length])} aria-hidden="true" />
            {competency(w.competency)?.name}<span className="font-bold tabular-nums text-ink">{w.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Removes a situation; if it anchored the call, the next one does. */
export function removeSituation(sc: Scenario) {
  const st = useApp.getState();
  st.removeScenario(sc.id);
  const c = st.courses.find((x) => x.id === sc.courseId);
  if (!c) return;
  if (c.settings.screeningIds?.includes(sc.id)) st.updateSettings(c.id, { screeningIds: c.settings.screeningIds.filter((x) => x !== sc.id) });
  const first = allScenarios().find((x) => c.scenarioIds.includes(x.id) && x.id !== sc.id);
  if (first && !useApp.getState().courses.find((x) => x.id === c.id)?.settings.assessmentScenarioId) st.saveScenario(first, { practice: true, final: true });
}
