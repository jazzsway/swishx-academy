"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Maximize2, Mic, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import type { Objective, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, screeningOf } from "@/lib/scenario-set";
import { exampleSituations } from "@/lib/objectives";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AgentIcon } from "@/components/ui/logo-mark";
import { useCopilot } from "@/features/copilot/copilot-store";
import { useCourse } from "./use-course";
import { StageHeader } from "./stage-ui";
import { People, ROLE_ICON, SituationDetail, removeSituation, useHomeStrays } from "./scenarios";
import { askFor, turnId, useTrainingChat } from "./training-chat-store";

const GENERATE_SECONDS = 120;

/**
 * Stage 2: the situations, the moments on a call where each objective is tested. A board with one
 * column per objective, side by side, and its situations down the column. SwishX writes a few for
 * each as the trainer arrives; they add their own in the chat, open one to read it in full, or test it.
 */
export function SituationBoard() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  const custom = useApp((s) => s.scenarios);
  const updateSettings = useApp((s) => s.updateSettings);
  const drafting = useCopilot((s) => s.drafting);
  const fresh = useTrainingChat((s) => s.added);
  const router = useRouter();
  const focusId = useSearchParams().get("obj");
  const [openSc, setOpenSc] = useState<string | null>(null);
  const course = data?.course;
  const scs = useMemo(() => (course ? allScenarios().filter((x) => course.scenarioIds.includes(x.id)) : []), [course?.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const [gen, setGen] = useState<{ left: number; total: number; plan: { ob: Objective; scs: Scenario[] }[]; placed: string[] } | null>(null);
  const asked = useTrainingChat((s) => s.generating);
  const seen = useRef(asked);
  const auto = useRef(false);
  useHomeStrays(course, scs);

  /* The column the chat or a link points at comes into view. */
  useEffect(() => {
    const at = fresh ? scs.find((x) => x.id === fresh)?.objectiveId : focusId;
    if (at) window.setTimeout(() => document.getElementById(`col-${at}`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }), 80);
  }, [fresh, focusId]); // eslint-disable-line react-hooks/exhaustive-deps
  /* The chat's "generate". */
  useEffect(() => { if (asked !== seen.current) { seen.current = asked; startGen(); } }); // eslint-disable-line react-hooks/exhaustive-deps
  /* Arriving with no situations at all: SwishX starts writing them straight away. */
  useEffect(() => {
    if (auto.current || !data?.editable || !course) return;
    auto.current = true;
    if ((course.objectives ?? []).length && !scs.length) startGen();
  }, [data?.editable]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!gen) return;
    const t = window.setTimeout(() => {
      const left = gen.left - 1;
      const due = Math.min(gen.plan.length, Math.floor(((gen.total - left) / gen.total) * gen.plan.length + 0.0001));
      const placed = [...gen.placed];
      gen.plan.slice(0, due).forEach((p) => { if (!placed.includes(p.ob.id)) { place(p.scs); placed.push(p.ob.id); } });
      if (left <= 0) finishGen(placed); else setGen({ ...gen, left, placed });
    }, 1000);
    return () => window.clearTimeout(t);
  }, [gen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || !course) return null;
  const { editable } = data;
  const base = `/trainer/courses/${course.id}`;
  const obs = course.objectives ?? [];
  const screen = screeningOf(course, scs);
  const inScreen = new Set(screen.map((x) => x.id));
  const screening = course.settings.screening && scs.length > 0;
  const bare = obs.filter((o) => !scs.some((x) => x.objectiveId === o.id));
  const one = (course.settings.situationsPerObjective ?? "one") === "one";

  function startGen(only?: Objective) {
    const c = useApp.getState().courses.find((x) => x.id === id);
    if (!c || gen) return;
    const have = allScenarios().filter((x) => c.scenarioIds.includes(x.id));
    const todo = only ? [only] : (c.objectives ?? []).filter((o) => !have.some((x) => x.objectiveId === o.id));
    if (!todo.length) return;
    const used = have.map((x) => x.persona.name);
    const total = only ? Math.ceil(GENERATE_SECONDS / 4) : GENERATE_SECONDS;
    setGen({ left: total, total, plan: todo.map((ob) => ({ ob, scs: exampleSituations(c, ob, used) })), placed: [] });
  }
  function place(list: Scenario[]) {
    const st = useApp.getState();
    list.forEach((sc, k) => st.saveScenario(sc, { practice: true, final: k === 0 && !st.courses.find((x) => x.id === id)?.settings.assessmentScenarioId }));
  }
  function finishGen(placed = gen?.placed ?? []) {
    if (!gen) return;
    gen.plan.forEach((p) => { if (!placed.includes(p.ob.id)) place(p.scs); });
    const all = gen.plan.flatMap((p) => p.scs);
    const c = useApp.getState().courses.find((x) => x.id === id);
    if (c && !c.settings.screeningIds?.length) updateSettings(c.id, { screening: true, screeningCall: true, screeningIds: all.slice(0, 2).map((x) => x.id), baseline: true });
    useTrainingChat.getState().push(id, { id: turnId("a"), from: "ai", text: `Wrote ${all.length} situations across ${gen.plan.length} objective${gen.plan.length === 1 ? "" : "s"}. Open one to read it in full, test it, or tell me another to add. Say “next” for the settings.` });
    setGen(null);
  }
  function toggleScreen(scId: string) {
    const ids = inScreen.has(scId) ? screen.map((x) => x.id).filter((x) => x !== scId) : [...screen.map((x) => x.id), scId];
    if (ids.length) updateSettings(course!.id, { screeningIds: ids });
  }
  /* "Add a situation" in a column: the chat asks for it, for that objective. */
  function addTo(ob: Objective) {
    router.replace(`${base}/situations?obj=${ob.id}`, { scroll: false });
    askFor("situation");
  }
  const waiting = (ob: Objective) => !!gen && gen.plan.some((p) => p.ob.id === ob.id) && !gen.placed.includes(ob.id);

  return (
    <div className="flex flex-col gap-4">
      <StageHeader n={2} sub="The moments on a call where each objective is tested: one column per objective, its situations down the column."
        actions={editable && !gen && bare.length > 0 && scs.length > 0 ? <Button size="sm" onClick={() => startGen()}><AgentIcon className="size-4" aria-hidden="true" />Write situations for {bare.length} more</Button> : undefined} />

      {gen && (
        <section className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-tint-line bg-tint/60 px-4 py-3">
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Text size="body" weight="semibold">Writing situations for {gen.plan.length} objective{gen.plan.length === 1 ? "" : "s"} · <span className="tabular-nums">{Math.floor(gen.left / 60)}:{String(gen.left % 60).padStart(2, "0")}</span> left</Text>
            <span className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${((gen.total - gen.left) / gen.total) * 100}%` }} /></span>
          </span>
          <Button size="sm" variant="secondary" onClick={() => finishGen()}>Skip ahead</Button>
        </section>
      )}

      {(screening || scs.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-ink-3">
          {screening && <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-info" aria-hidden="true" /><b className="text-ink-2">Screening</b> uses {screen.length} of these, a 3-minute call before the lessons. Not graded.</span>}
          <span>{one ? "Each rep is scored on one situation per objective, drawn for them; a retry draws another." : "Each rep is scored on every situation."} <Link href={`${base}/settings`} className="font-semibold text-brand-deep hover:underline">Change</Link></span>
        </div>
      )}

      {obs.length === 0 ? (
        <section className="squircle flex flex-col items-center gap-2 rounded-card border border-dashed border-hair-3 bg-card px-6 py-10 text-center">
          <Text size="title" weight="bold">No objectives yet</Text>
          <Text size="body" tone="muted">Situations test objectives. Add the objectives first.</Text>
          <Link href={`${base}/roleplay`} className="mt-1 text-body font-semibold text-brand-deep hover:underline">Go to objectives</Link>
        </section>
      ) : (
        /* The board: objectives side by side, scrolling sideways when there are more than fit. */
        <div className="-mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:thin] lg:-mx-8 lg:px-8">
          <ol className="flex items-start gap-3" aria-label="Situations by objective">
            {obs.map((ob, i) => {
              const mine = scs.filter((x) => x.objectiveId === ob.id);
              const on = focusId === ob.id;
              return (
                <li key={ob.id} id={`col-${ob.id}`} className={cn("squircle flex w-[296px] shrink-0 flex-col gap-2 rounded-card border p-2.5 transition-colors", on ? "border-brand/40 bg-tint/50" : "border-hair bg-black/[0.025]")}>
                  {/* The column's heading: the objective. */}
                  <div className="flex flex-col gap-1.5 px-1.5 pb-1 pt-1">
                    <span className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-glyph bg-brand text-micro font-extrabold tabular-nums text-white">{String(i + 1).padStart(2, "0")}</span>
                      <span className="flex-1 text-micro font-bold uppercase tracking-wider text-ink-4">{mine.length} situation{mine.length === 1 ? "" : "s"}</span>
                      {mine.length > 0 && (
                        <Link href={`${base}/roleplay/test?run=objective&obj=${ob.id}`} title={`Test ${one ? "a drawn situation" : `the ${mine.length} situations`} of this objective`}
                          className="inline-flex h-7 items-center gap-1 rounded-control border border-hair-2 bg-card px-2 text-micro font-bold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep">
                          <Mic className="size-3" aria-hidden="true" />Test
                        </Link>
                      )}
                    </span>
                    <Link href={`${base}/roleplay?obj=${ob.id}`} title="Open the objective" className="line-clamp-2 text-body font-bold leading-snug text-ink hover:text-brand-deep">{ob.title}</Link>
                    <span className="text-caption text-ink-3"><People people={ob.people} /></span>
                  </div>

                  <ul className="flex flex-col gap-2">
                    {mine.map((sc) => {
                      const Icon = ROLE_ICON[characterOf(sc)];
                      const scr = inScreen.has(sc.id);
                      return (
                        <li key={sc.id} className={cn("squircle group flex flex-col gap-1.5 rounded-panel border border-hair bg-card p-3 shadow-hair transition-shadow hover:shadow-soft", fresh === sc.id && "node-flash border-brand")}>
                          <button type="button" onClick={() => setOpenSc(sc.id)} title="Open the full situation" className="-m-1 flex flex-col gap-1.5 rounded-control p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                            <span className="flex w-full items-center gap-2">
                              <span className="grid size-7 shrink-0 place-items-center rounded-glyph bg-tint text-brand-deep"><Icon className="size-3.5" aria-hidden="true" /></span>
                              <span className="min-w-0 flex-1 truncate text-micro font-semibold text-ink-3">{CHARACTERS[characterOf(sc)].label} · {sc.persona.name.replace(/,.*$/, "")}</span>
                              <Maximize2 className="size-3.5 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                            </span>
                            <span className="line-clamp-2 text-body font-semibold leading-snug text-ink group-hover:text-brand-deep">{sc.title}</span>
                            {sc.description && <span className="line-clamp-2 text-caption leading-relaxed text-ink-3">{sc.description}</span>}
                          </button>
                          {(screening || (editable && sc.custom)) && (
                            <span className="flex items-center gap-1 pt-0.5">
                              {screening && (
                                <button type="button" aria-pressed={scr} disabled={!editable || (scr && screen.length === 1)} onClick={() => toggleScreen(sc.id)} title={scr ? "In the screening call. Click to take it out." : "Add it to the screening call"}
                                  className={cn("flex items-center gap-1 rounded-chip px-2 py-0.5 text-micro font-bold transition-colors disabled:cursor-default", scr ? "bg-info-bg text-info" : "text-ink-4 hover:bg-subtle hover:text-ink")}>
                                  <ShieldCheck className="size-3" aria-hidden="true" />{scr ? "In screening" : "Screening"}
                                </button>
                              )}
                              {editable && sc.custom && <button type="button" aria-label={`Delete ${sc.title}`} title="Delete" onClick={() => removeSituation(sc)} className="ml-auto grid size-6 place-items-center rounded-control text-ink-4 opacity-0 transition-opacity hover:bg-subtle hover:text-danger group-hover:opacity-100 focus:opacity-100"><Trash2 className="size-3.5" /></button>}
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {waiting(ob) && [0, 1].map((k) => <li key={k} className="squircle shimmer h-[104px] rounded-panel bg-tint" aria-label="Writing a situation" />)}
                    {drafting && on && <li className="squircle shimmer grid min-h-[104px] place-items-center rounded-panel bg-tint p-3 text-center text-caption font-semibold text-brand-deep">Drafting “{drafting}”…</li>}
                    {!mine.length && !waiting(ob) && (
                      <li className="squircle flex flex-col items-center gap-2 rounded-panel border border-dashed border-hair-3 px-3 py-5 text-center">
                        <Text size="caption" tone="subtle">No situations yet</Text>
                        {editable && !gen && <Button size="sm" onClick={() => startGen(ob)}><AgentIcon className="size-3.5" aria-hidden="true" />Write a few</Button>}
                      </li>
                    )}
                  </ul>
                  {editable && (
                    <button type="button" onClick={() => addTo(ob)} disabled={!!drafting}
                      className="flex items-center gap-1.5 rounded-control px-2 py-1.5 text-caption font-semibold text-ink-3 transition-colors hover:bg-card hover:text-brand-deep disabled:opacity-40">
                      <Plus className="size-3.5" aria-hidden="true" />Add a situation
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {(() => {
        const sc = scs.find((x) => x.id === openSc);
        if (!sc) return null;
        const scr = inScreen.has(sc.id);
        return (
          <Modal open onClose={() => setOpenSc(null)} size="md"
            footer={<>
              {editable && sc.custom && <Button variant="secondary" className="mr-auto" onClick={() => { removeSituation(sc); setOpenSc(null); }}><Trash2 className="size-4" aria-hidden="true" />Delete</Button>}
              {screening && editable && <Button variant="secondary" disabled={scr && screen.length === 1} onClick={() => toggleScreen(sc.id)}><ShieldCheck className="size-4" aria-hidden="true" />{scr ? "Take out of screening" : "Add to screening"}</Button>}
              <Button onClick={() => setOpenSc(null)}>Done</Button>
            </>}>
            <SituationDetail sc={sc} objective={obs.find((o) => o.id === sc.objectiveId)} inScreening={screening && scr} />
          </Modal>
        );
      })()}
    </div>
  );
}
