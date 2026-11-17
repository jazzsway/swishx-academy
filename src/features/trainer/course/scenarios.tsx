"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Briefcase, Check, ChevronDown, Maximize2, Target, Mic, Pill, Plus, Search, ShieldCheck, Stethoscope, Syringe, Trash2, UserRound, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios, objection } from "@/data/scenarios";
import { Modal } from "@/components/ui/modal";
import { competency, source } from "@/data/org";
import type { Character, Course, Objective, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, draftFromPrompt, screeningOf, weightsOf, withWeights } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/features/copilot/copilot-store";
import { SourcePreview } from "../source-preview";
import { describe, draftObjectives, exampleSituations, lookForsOf, objectiveFromPrompt } from "@/lib/objectives";
import { StageHeader } from "./stage-ui";
import { CitationPill } from "@/features/shared/citation-pill";
import { AgentIcon } from "@/components/ui/logo-mark";
import { askFor, turnId, useTrainingChat } from "./training-chat-store";

const GENERATE_SECONDS = 120;

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

/**
 * Step 2: the training's objectives, what reps should be able to do. Each is scored on its own
 * criteria, comes from the trainer's material, and has example situations: one person each, the
 * moments a rep meets it on the call. Reps take every situation back to back. A row opens in place.
 */
export function ScenarioList({ course, editable }: { course: Course; editable: boolean }) {
  const custom = useApp((s) => s.scenarios);
  const updateSettings = useApp((s) => s.updateSettings);
  const updateCourse = useApp((s) => s.updateCourse);
  const drafting = useCopilot((s) => s.drafting);
  const fresh = useTrainingChat((s) => s.added);
  const router = useRouter();
  const openId = useSearchParams().get("obj");
  const [preview, setPreview] = useState<string | null>(null);
  const [openSc, setOpenSc] = useState<string | null>(null);
  useEffect(() => { const id = fresh ?? openId; if (id) window.setTimeout(() => document.getElementById(`ob-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }, [fresh, openId]);
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = `/trainer/courses/${course.id}`;
  const obs = course.objectives ?? [];
  const loose = scs.filter((x) => !obs.some((o) => o.id === x.objectiveId));
  const screen = screeningOf(course, scs);
  const inScreen = new Set(screen.map((x) => x.id));
  const screening = course.settings.screening && scs.length > 0;
  const toggle = (id: string) => router.replace(openId === id ? `${base}/roleplay` : `${base}/roleplay?obj=${id}`, { scroll: false });
  const bare = obs.filter((o) => !scs.some((x) => x.objectiveId === o.id));
  const [q, setQ] = useState("");
  const [who, setWho] = useState<Character[]>([]);
  const [needs, setNeeds] = useState(false);
  const everyone = [...new Set(obs.flatMap((o) => o.people))];
  const filtered = q.trim() !== "" || who.length > 0 || needs;
  const shown = obs.map((ob, i) => ({ ob, i })).filter(({ ob }) => {
    const mine = scs.filter((x) => x.objectiveId === ob.id);
    if (needs && mine.length) return false;
    if (who.length && !ob.people.some((p) => who.includes(p))) return false;
    const hay = [ob.title, describe(ob), ...lookForsOf(ob), ...mine.map((x) => `${x.title} ${x.persona.name}`)].join(" ").toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
  });
  const clear = () => { setQ(""); setWho([]); setNeeds(false); };

  /* Every situation sits under an objective. Ones made before objectives existed go under one drawn from the brief, scored as they were. */
  useEffect(() => {
    if (!loose.length || homing.has(course.id)) return;
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
  }, [loose.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Example situations for the objectives that have none: about two minutes, one objective at a time, or skip ahead. */
  const [gen, setGen] = useState<{ left: number; plan: { ob: Objective; scs: Scenario[] }[]; placed: string[] } | null>(null);
  const asked = useTrainingChat((s) => s.generating);
  const seen = useRef(asked);
  useEffect(() => { if (asked !== seen.current) { seen.current = asked; startGen(); } }); // eslint-disable-line react-hooks/exhaustive-deps
  function startGen() {
    const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course;
    const todo = (c.objectives ?? []).filter((o) => !scs.some((x) => x.objectiveId === o.id));
    if (!todo.length || gen) return;
    const used = scs.map((x) => x.persona.name);
    setGen({ left: GENERATE_SECONDS, plan: todo.map((ob) => ({ ob, scs: exampleSituations(c, ob, used) })), placed: [] });
  }
  useEffect(() => {
    if (!gen) return;
    const t = window.setTimeout(() => {
      const left = gen.left - 1;
      const due = Math.min(gen.plan.length, Math.floor(((GENERATE_SECONDS - left) / GENERATE_SECONDS) * gen.plan.length + 0.0001));
      const placed = [...gen.placed];
      gen.plan.slice(0, due).forEach((p) => { if (!placed.includes(p.ob.id)) { place(p.scs); placed.push(p.ob.id); } });
      if (left <= 0) finishGen(placed); else setGen({ ...gen, left, placed });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [gen]); // eslint-disable-line react-hooks/exhaustive-deps
  function place(list: Scenario[]) {
    const st = useApp.getState();
    list.forEach((sc, k) => st.saveScenario(sc, { practice: true, final: k === 0 && !st.courses.find((x) => x.id === course.id)?.settings.assessmentScenarioId }));
  }
  function finishGen(placed = gen?.placed ?? []) {
    if (!gen) return;
    gen.plan.forEach((p) => { if (!placed.includes(p.ob.id)) place(p.scs); });
    const all = gen.plan.flatMap((p) => p.scs);
    const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course;
    if (!c.settings.screeningIds?.length) updateSettings(course.id, { screening: true, screeningCall: true, screeningIds: all.slice(0, 2).map((x) => x.id), baseline: true });
    useTrainingChat.getState().push(course.id, { id: turnId("a"), from: "ai", text: `Added ${all.length} example situations across ${gen.plan.length} objective${gen.plan.length === 1 ? "" : "s"}. They show how each objective gets tested on a call; open one to see them, add your own, or say “next” for the settings.` });
    setGen(null);
  }

  function toggleScreen(id: string) {
    const ids = inScreen.has(id) ? screen.map((x) => x.id).filter((x) => x !== id) : [...screen.map((x) => x.id), id];
    if (ids.length) updateSettings(course.id, { screeningIds: ids });
  }
  function removeObjective(ob: Objective) {
    for (const sc of scs.filter((x) => x.objectiveId === ob.id)) removeSituation(sc);
    const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course;
    updateCourse(course.id, { objectives: (c.objectives ?? []).filter((x) => x.id !== ob.id) });
    router.replace(`${base}/roleplay`, { scroll: false });
  }

  /** A situation, as a tile in its objective's row: who, what happens, and the controls. */
  const situation = (sc: Scenario) => {
    const Icon = ROLE_ICON[characterOf(sc)];
    const on = inScreen.has(sc.id);
    return (
      <li key={sc.id} id={`ob-${sc.id}`} className={cn("squircle group flex min-h-[176px] w-[256px] shrink-0 snap-start flex-col gap-2 rounded-panel border border-hair bg-card p-4 shadow-hair transition-shadow hover:shadow-soft", fresh === sc.id && "node-flash border-brand")}>
        <button type="button" onClick={() => setOpenSc(sc.id)} title="Open the full situation" className="-m-1 flex flex-col gap-2 rounded-control p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          <span className="flex w-full items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><Icon className="size-4" aria-hidden="true" /></span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight"><span className="truncate text-caption font-bold text-ink-2">{CHARACTERS[characterOf(sc)].label}</span><span className="truncate text-micro text-ink-3">{sc.persona.name.replace(/,.*$/, "")} · {sc.durationMin} min</span></span>
            <Maximize2 className="size-3.5 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          </span>
          <span className="line-clamp-2 text-body font-semibold leading-snug text-ink group-hover:text-brand-deep">{sc.title}</span>
          {sc.description && <span className="line-clamp-3 text-caption leading-relaxed text-ink-3">{sc.description}</span>}
        </button>
        <span className="mt-auto flex items-center gap-1 border-t border-hair pt-2.5">
          {screening && (
            <button type="button" aria-pressed={on} disabled={!editable || (on && screen.length === 1)} onClick={() => toggleScreen(sc.id)} title={on ? "In the screening call. Click to take it out." : "Add it to the screening call"}
              className={cn("flex items-center gap-1 rounded-chip px-2 py-0.5 text-micro font-bold transition-colors disabled:cursor-default", on ? "bg-info-bg text-info" : "text-ink-4 hover:bg-subtle hover:text-ink")}>
              <ShieldCheck className="size-3" aria-hidden="true" />{on ? "In screening" : "Screening"}
            </button>
          )}
          {editable && sc.custom && <button type="button" aria-label={`Delete ${sc.title}`} title="Delete" onClick={() => removeSituation(sc)} className="ml-auto grid size-7 place-items-center rounded-control text-ink-4 hover:bg-subtle hover:text-danger"><Trash2 className="size-3.5" /></button>}
        </span>
      </li>
    );
  };

  /** What a situation looks like, for an objective that has none yet. Shown only until one is added. */
  const example = (ob: Objective) => {
    const who = ob.people[0] ?? "doctor";
    const Icon = ROLE_ICON[who];
    return (
      <li className="squircle relative flex min-h-[176px] w-[288px] shrink-0 snap-start flex-col gap-2 overflow-hidden rounded-panel border border-dashed border-brand/40 p-4" style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 10px, var(--color-tint) 10px 11px)" }}>
        <span className="absolute right-2.5 top-2.5 rounded-chip bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">Example</span>
        <span className="flex items-center gap-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-control bg-card text-brand-deep shadow-hair"><Icon className="size-4" aria-hidden="true" /></span>
          <span className="text-caption font-bold text-ink-2">{CHARACTERS[who].label} · one person, one moment</span>
        </span>
        <span className="text-body font-semibold leading-snug text-ink">A {CHARACTERS[who].label.toLowerCase()} brings it up mid-call</span>
        <span className="text-caption leading-relaxed text-ink-3">“{ob.cites[0]?.quote ? `So is it really ${ob.cites[0].quote.split(" ").slice(0, 6).join(" ")}…?` : "Can you be specific about that?"}” The rep has to {ob.title.charAt(0).toLowerCase() + ob.title.slice(1)}, there and then.</span>
        <span className="mt-auto flex flex-col gap-1.5 border-t border-dashed border-brand/30 pt-2.5">
          <Text size="micro" tone="subtle">A situation is one moment where this objective is tested. Add your own, or let SwishX write a couple.</Text>
          {editable && <span className="flex gap-1.5"><Button size="sm" onClick={startGen}><AgentIcon className="size-3.5" aria-hidden="true" />Write examples</Button><Button size="sm" variant="secondary" onClick={() => { router.replace(`${base}/roleplay?obj=${ob.id}`, { scroll: false }); askFor("situation"); }}>Describe one</Button></span>}
        </span>
      </li>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <StageHeader n={2} sub="What reps should be able to do, and where each is tested on a call." />

      {/* Nothing yet: draft the objectives from the material. */}
      {obs.length === 0 && scs.length === 0 && (
        <section className="squircle flex flex-col items-center gap-3 rounded-card border border-dashed border-hair-3 bg-card px-6 py-10 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-tint text-brand"><Target className="size-6" aria-hidden="true" /></span>
          <Text size="title" weight="bold">No objectives yet</Text>
          <Text size="body" tone="muted" className="max-w-[460px]">SwishX drafts them from your objective and every file, and shows where each comes from. You can add your own in the chat.</Text>
          {editable && <div className="flex gap-2"><Button onClick={() => draftObjectivesFor(course)}><AgentIcon className="size-4" aria-hidden="true" />Draft objectives</Button><Button variant="secondary" onClick={() => askFor("objective")}>Write my own</Button></div>}
        </section>
      )}

      {/* Objectives without examples yet: generate them, with the timer. */}
      {editable && (bare.length > 0 || gen) && (
        <section className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-tint-line bg-tint/60 px-4 py-3">
          {gen ? (
            <>
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Text size="body" weight="semibold">Generating example situations · <span className="tabular-nums">{Math.floor(gen.left / 60)}:{String(gen.left % 60).padStart(2, "0")}</span> left</Text>
                <span className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${((GENERATE_SECONDS - gen.left) / GENERATE_SECONDS) * 100}%` }} /></span>
              </span>
              <Button size="sm" variant="secondary" onClick={() => finishGen()}>Skip ahead</Button>
            </>
          ) : (
            <>
              <Text size="body" className="min-w-0 flex-1"><b>{bare.length} objective{bare.length === 1 ? " has" : "s have"} no situations yet.</b> SwishX writes a couple of examples for each, so you can see how it&apos;s tested on a call.</Text>
              <Button size="sm" onClick={startGen}><AgentIcon className="size-4" aria-hidden="true" />Generate example situations</Button>
            </>
          )}
        </section>
      )}

      {screening && (
        <section id="screening" className="squircle flex scroll-mt-4 flex-wrap items-center gap-3 rounded-panel border border-info/20 bg-info-bg/40 px-4 py-2.5">
          <ShieldCheck className="size-4 shrink-0 text-info" aria-hidden="true" />
          <Text size="body" tone="muted" className="min-w-0 flex-1"><b className="text-ink">Screening</b> · a 3-minute call from {screen.length} situation{screen.length === 1 ? "" : "s"} before the lessons. Not graded.</Text>
        </section>
      )}

      {obs.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-9 min-w-[220px] flex-1 items-center gap-2 rounded-control border border-hair-2 bg-card px-3 transition-colors focus-within:border-brand/60">
            <Search className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search objectives and situations" aria-label="Search objectives and situations" className="min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-ink-4" />
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
          {bare.length > 0 && <button type="button" aria-pressed={needs} onClick={() => setNeeds(!needs)} className={chip(needs)}>No situations<span className="tabular-nums text-ink-4">{bare.length}</span></button>}
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
          const mine = scs.filter((x) => x.objectiveId === ob.id);
          return (
            <li key={ob.id} id={`ob-${ob.id}`} className={cn("squircle relative scroll-mt-4 overflow-hidden rounded-card border bg-card transition-all", open ? "border-brand/30 shadow-soft" : "border-hair shadow-hair hover:border-hair-3 hover:shadow-soft", fresh === ob.id && !open && "node-flash")}>
              <div role="button" tabIndex={0} aria-expanded={open} onClick={() => toggle(ob.id)} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(ob.id); } }} className={cn("flex w-full cursor-pointer gap-3.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40", open ? "items-start p-5" : "items-center px-4 py-3")}>
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-control text-caption font-extrabold tabular-nums transition-colors", open ? "bg-brand text-white" : "bg-tint text-brand-deep")}>{String(i + 1).padStart(2, "0")}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className={cn("font-bold leading-snug text-ink", open ? "text-body-lg" : "truncate text-body")}>{ob.title}</span>
                  {open ? (
                    <>
                      <span className="mt-0.5 text-body leading-relaxed text-ink-3">{describe(ob)}<CitationPill cites={ob.cites} onView={setPreview} /></span>
                      <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-caption text-ink-3">
                        <People people={ob.people} />
                        <span className="size-1 rounded-full bg-hair-3" aria-hidden="true" />
                        <span className={cn("font-semibold", mine.length ? "text-ink-2" : "text-warn")}>{mine.length ? `${mine.length} situation${mine.length === 1 ? "" : "s"}` : "No situations yet"}</span>
                      </span>
                    </>
                  ) : <span className="truncate text-caption text-ink-3">{describe(ob)}</span>}
                </span>
                {!open && (
                  <span className="hidden shrink-0 items-center gap-3 text-caption md:flex">
                    <People people={ob.people} icons />
                    <span className={cn("w-[84px] font-semibold", mine.length ? "text-ink-2" : "text-warn")}>{mine.length ? `${mine.length} situation${mine.length === 1 ? "" : "s"}` : "No situations"}</span>
                  </span>
                )}
                <span className="w-20 shrink-0" aria-hidden="true" />
                <ChevronDown className={cn("size-4 shrink-0 text-ink-4 transition-transform", open && "mt-2 rotate-180 text-ink-2")} aria-hidden="true" />
              </div>
              {mine.length > 0 && (
                <Link href={`${base}/roleplay/test?run=objective&obj=${ob.id}`} title={`Test the ${mine.length} situation${mine.length === 1 ? "" : "s"} of this objective`}
                  className={cn("absolute right-12 inline-flex h-8", open ? "top-5" : "top-1/2 -translate-y-1/2", " items-center gap-1.5 rounded-control border border-hair-2 bg-card px-2.5 text-caption font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep")}>
                  <Mic className="size-3.5" aria-hidden="true" />Test
                </Link>
              )}
              {open && (
                <div className="flex flex-col gap-6 border-t border-hair bg-canvas/60 p-5">
                  <Block label={`Situations${mine.length ? ` · ${mine.length}` : ""}`} action={editable && mine.length > 0 && !drafting ? <button type="button" onClick={() => askFor("situation")} className="flex items-center gap-1 text-caption font-semibold text-brand-deep hover:underline"><Plus className="size-3.5" aria-hidden="true" />Add a situation</button> : undefined}>
                    <ul className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                      {mine.map(situation)}
                      {!mine.length && !gen && example(ob)}
                      {gen && !mine.length && <li className="squircle shimmer grid min-h-[176px] w-[256px] shrink-0 place-items-center rounded-panel bg-tint p-4 text-caption font-semibold text-brand-deep">Writing example situations…</li>}
                      {drafting && <li className="squircle shimmer grid min-h-[176px] w-[256px] shrink-0 place-items-center rounded-panel bg-tint p-4 text-center text-caption font-semibold text-brand-deep">Drafting “{drafting}”…</li>}
                      {editable && mine.length > 0 && !drafting && (
                        <li className="w-[168px] shrink-0">
                          <button type="button" onClick={() => askFor("situation")} className="squircle flex h-full min-h-[176px] w-full flex-col items-center justify-center gap-1.5 rounded-panel border border-dashed border-hair-3 p-3 text-caption font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-tint">
                            <span className="grid size-8 place-items-center rounded-full bg-tint"><Plus className="size-4" aria-hidden="true" /></span>Add a situation<span className="font-normal text-ink-3">Describe it in the chat</span>
                          </button>
                        </li>
                      )}
                    </ul>
                  </Block>

                  <Block label="What good looks like">
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {lookForsOf(ob).map((x) => <li key={x} className="flex items-start gap-2 text-body text-ink-2"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-ok-bg text-ok"><Check className="size-3" aria-hidden="true" /></span>{x}</li>)}
                    </ul>
                  </Block>

                  <Block label="Scored on" action={editable ? <Text size="caption" tone="subtle">Change it in the chat</Text> : undefined}>
                    <Criteria weights={ob.weights} />
                  </Block>

                  {editable && <button type="button" onClick={() => removeObjective(ob)} className="flex items-center gap-1.5 self-end text-caption font-semibold text-ink-4 transition-colors hover:text-danger"><Trash2 className="size-3.5" aria-hidden="true" />Delete objective</button>}
                </div>
              )}
            </li>
          );
        })}
        {editable && (obs.length > 0 || scs.length > 0) && (
          <li>
            <button type="button" onClick={() => askFor("objective")} className="squircle flex w-full items-center gap-3.5 rounded-card border border-dashed border-hair-3 px-4 py-3 text-left transition-colors hover:border-brand hover:bg-tint">
              <span className="grid size-8 place-items-center rounded-control border border-dashed border-brand/40 text-brand-deep"><Plus className="size-4" aria-hidden="true" /></span>
              <span className="flex flex-col"><span className="text-body font-bold text-brand-deep">Add objective</span><span className="text-caption text-ink-3">Describe it to the agent: what reps should do, and with whom</span></span>
            </button>
          </li>
        )}
      </ol>
      {preview && source(preview) && <SourcePreview s={source(preview)!} onClose={() => setPreview(null)} />}
      {(() => {
        const sc = scs.find((x) => x.id === openSc);
        if (!sc) return null;
        const on = inScreen.has(sc.id);
        return (
          <Modal open onClose={() => setOpenSc(null)} size="md"
            footer={<>
              {editable && sc.custom && <Button variant="secondary" className="mr-auto" onClick={() => { removeSituation(sc); setOpenSc(null); }}><Trash2 className="size-4" aria-hidden="true" />Delete</Button>}
              {screening && editable && <Button variant="secondary" disabled={on && screen.length === 1} onClick={() => toggleScreen(sc.id)}><ShieldCheck className="size-4" aria-hidden="true" />{on ? "Take out of screening" : "Add to screening"}</Button>}
              <Button onClick={() => setOpenSc(null)}>Done</Button>
            </>}>
            <SituationDetail sc={sc} objective={obs.find((o) => o.id === sc.objectiveId)} inScreening={screening && on} />
          </Modal>
        );
      })()}
    </div>
  );
}

/** A situation in full: who the rep meets, what happens, how it opens, what they'll push on, and how it's scored. */
function SituationDetail({ sc, objective: ob, inScreening }: { sc: Scenario; objective?: Objective; inScreening: boolean }) {
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
      <Block label="Scored on"><Criteria weights={weightsOf(sc)} /></Block>
    </div>
  );
}

/** A labelled part of an opened objective, the same everywhere. */
function Block({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <span className="flex items-center gap-2"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="flex-1">{label}</Text>{action}</span>
      {children}
    </section>
  );
}

/** The kinds of people an objective involves: their icons, overlapping, then their names. */
function People({ people, icons }: { people: Character[]; icons?: boolean }) {
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
