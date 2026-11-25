"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { GitBranch, Maximize2, Mic, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import type { Objective, Scenario } from "@/data/types";
import { screeningOf } from "@/lib/scenario-set"; // v1-hidden: CHARACTERS, characterOf
import { exampleSituations } from "@/lib/objectives";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { AgentIcon } from "@/components/ui/logo-mark";
import { useCopilot } from "@/features/copilot/copilot-store";
import { useCourse } from "./use-course";
import { StageHeader } from "./stage-ui";
import { People, SituationDetail, removeSituation, useHomeStrays } from "./scenarios"; // v1-hidden: ROLE_ICON
import { askFor, turnId, useTrainingChat } from "./training-chat-store";
import { ObjectiveFlow } from "./roleplay";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { objectiveBank } from "@/lib/objective-call";

const GENERATE_SECONDS = 120;
/** v1-hidden: trainers picking which situations go into screening. SwishX sets screening up. */
const SCREENING_PICK = false;

/**
 * Stage 2: the situations, the moments on a call where each objective is tested. One tab per objective,
 * like browser tabs, and the open objective's situations laid out in full under it. SwishX writes a few
 * for each as the trainer arrives; they add their own in the chat, open one to read it in full, or test it.
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
  /* Inside an objective: its situations, or its call as a flow. */
  const [obTab, setObTab] = useState<"situations" | "flow">("situations");
  const course = data?.course;
  const scs = useMemo(() => (course ? allScenarios().filter((x) => course.scenarioIds.includes(x.id)) : []), [course?.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const [gen, setGen] = useState<{ left: number; total: number; plan: { ob: Objective; scs: Scenario[] }[]; placed: string[] } | null>(null);
  const asked = useTrainingChat((s) => s.generating);
  const seen = useRef(asked);
  const auto = useRef(false);
  useHomeStrays(course, scs);

  /* A situation just added in the chat opens its objective's tab. */
  useEffect(() => {
    const at = fresh ? scs.find((x) => x.id === fresh)?.objectiveId : undefined;
    if (at && at !== focusId && course) router.replace(`/trainer/courses/${course.id}/situations?obj=${at}`, { scroll: false });
  }, [fresh]); // eslint-disable-line react-hooks/exhaustive-deps
  /* The open tab stays in view when there are more than fit. */
  useEffect(() => { if (focusId) window.setTimeout(() => document.getElementById(`tab-${focusId}`)?.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" }), 60); }, [focusId]);
  /* The chat's "generate". */
  useEffect(() => { if (asked !== seen.current) { seen.current = asked; startGen(); } }); // eslint-disable-line react-hooks/exhaustive-deps
  /* Arriving with no situations at all: SwishX starts writing them straight away. */
  /* The objectives can land after the trainer gets here (setup still drafting): it starts once they do. */
  const obCount = course?.objectives?.length ?? 0;
  useEffect(() => {
    if (auto.current || !data?.editable || !course || !obCount) return;
    auto.current = true;
    if (!scs.length) startGen();
  }, [data?.editable, obCount]); // eslint-disable-line react-hooks/exhaustive-deps
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
    useTrainingChat.getState().push(id, { id: turnId("a"), from: "ai", text: `Wrote ${all.length} situations and questions across ${gen.plan.length} objective${gen.plan.length === 1 ? "" : "s"}. Open one to read it in full, or tell me a situation or question you want tested. Say “next” for the settings.` });
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
      <StageHeader n={3} title="Situations & questions" sub="The moments on a call where each objective gets tested: a scene the rep walks into, or a question a doctor, nurse or patient asks. Add the ones you most want reps ready for."
        actions={editable && !gen && bare.length > 0 && scs.length > 0 ? <Button size="sm" onClick={() => startGen()}><AgentIcon className="size-4" aria-hidden="true" />Write for {bare.length} more objective{bare.length === 1 ? "" : "s"}</Button> : undefined} />

      {gen && (
        <section className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-tint-line bg-tint/60 px-4 py-3">
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Text size="body" weight="semibold">Writing situations and questions for {gen.plan.length} objective{gen.plan.length === 1 ? "" : "s"} · <span className="tabular-nums">{Math.floor(gen.left / 60)}:{String(gen.left % 60).padStart(2, "0")}</span> left</Text>
            <span className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-brand transition-all" style={{ width: `${((gen.total - gen.left) / gen.total) * 100}%` }} /></span>
          </span>
          <Button size="sm" variant="secondary" onClick={() => finishGen()}>Skip ahead</Button>
        </section>
      )}

      {(screening || scs.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-caption text-ink-3">
          {/* v1-hidden: which situations screening uses. SwishX sets screening up.
          {screening && <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-info" aria-hidden="true" /><b className="text-ink-2">Screening</b> uses {screen.length} of these, a 3-minute call before the lessons. Not graded.</span>} */}
          <span>{one ? "One situation drawn per rep. A retry draws another." : "Every situation is scored."}</span>
        </div>
      )}

      {obs.length === 0 ? (
        <section className="squircle flex flex-col items-center gap-2 rounded-card border border-dashed border-hair-3 bg-card px-6 py-10 text-center">
          <Text size="title" weight="bold">No objectives yet</Text>
          <Text size="body" tone="muted">Situations and questions test objectives. Add the objectives first.</Text>
          <Link href={`${base}/roleplay`} className="mt-1 text-body font-semibold text-brand-deep hover:underline">Go to objectives</Link>
        </section>
      ) : (() => {
        const cur = obs.find((o) => o.id === focusId) ?? obs[0];
        const ci = obs.indexOf(cur);
        const mine = scs.filter((x) => x.objectiveId === cur.id);
        const pick = (ob: Objective) => router.replace(`${base}/situations?obj=${ob.id}`, { scroll: false });
        return (
          <div className="flex flex-col">
            {/* The objectives, as tabs. The open one joins the sheet below it. */}
            <div role="tablist" aria-label="Objectives" className="-mb-px flex items-end gap-1 overflow-x-auto px-1 [scrollbar-width:none]">
              {obs.map((ob, i) => {
                const n = scs.filter((x) => x.objectiveId === ob.id).length;
                const on = ob.id === cur.id;
                return (
                  <button key={ob.id} id={`tab-${ob.id}`} type="button" role="tab" aria-selected={on} aria-controls="situations-panel" onClick={() => pick(ob)} title={ob.title}
                    className={cn("group relative flex min-w-[150px] max-w-[260px] flex-1 items-center gap-2 rounded-t-panel border px-3 py-2.5 text-left transition-colors",
                      on ? "z-10 border-hair border-b-card bg-card text-ink" : "border-transparent bg-black/[0.04] text-ink-3 hover:bg-black/[0.07] hover:text-ink")}>
                    <span className={cn("grid size-5 shrink-0 place-items-center rounded-glyph text-micro font-extrabold tabular-nums", on ? "bg-brand text-white" : "bg-black/[0.08] text-ink-3")}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={cn("min-w-0 flex-1 truncate text-body", on ? "font-bold" : "font-semibold")}>{ob.title}</span>
                    {waiting(ob)
                      ? <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-brand/25 border-t-brand" aria-label="Writing situations" />
                      : <span className={cn("shrink-0 rounded-chip px-1.5 text-micro font-bold tabular-nums", on ? "bg-tint text-brand-deep" : n ? "bg-black/[0.06] text-ink-3" : "text-ink-4")}>{n}</span>}
                  </button>
                );
              })}
            </div>

            {/* The open objective: what it is, then every one of its situations, in full. */}
            <section id="situations-panel" role="tabpanel" aria-label={cur.title} className="squircle flex flex-col gap-4 rounded-card rounded-tl-none border border-hair bg-card p-4 shadow-hair sm:p-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex min-w-0 flex-1 basis-[260px] flex-col gap-1">
                  <span className="text-micro font-bold uppercase tracking-wider text-ink-4">Objective {String(ci + 1).padStart(2, "0")} · {mine.length} situation{mine.length === 1 ? "" : "s"}</span>
                  <Link href={`${base}/roleplay?obj=${cur.id}`} title="Open the objective" className="text-title font-bold leading-snug text-ink hover:text-brand-deep">{cur.title}</Link>
                  <span className="text-caption text-ink-3"><People people={cur.people} /></span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!editable && (
                    <Link href={`${base}/roleplay/test?run=objective&obj=${cur.id}`} title={one ? "Test this objective's call, on a situation drawn for you" : `Test this objective's ${mine.length} situations`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 text-caption font-bold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep">
                      <Mic className="size-3.5" aria-hidden="true" />Test
                    </Link>
                  )}
                  {editable && <Button size="sm" onClick={() => addTo(cur)} disabled={!!drafting}><Plus className="size-4" aria-hidden="true" />Add a situation or question</Button>}
                </div>
              </div>

              {/* The objective's situations, or its call as a flow (only when viewing a live training). */}
              {!editable && (
                <Segmented role="tablist" aria-label="Objective" className="self-start">
                  {([["situations", `Situations · ${mine.length}`], ["flow", "Call flow"]] as const).map(([k, l]) => (
                    <SegmentedButton key={k} active={obTab === k} role="tab" aria-pressed={undefined} aria-selected={obTab === k} onClick={() => setObTab(k)}>
                      {k === "flow" && <GitBranch className="size-3.5" aria-hidden="true" />}{l}
                    </SegmentedButton>
                  ))}
                </Segmented>
              )}
              {!editable && obTab === "flow"
                ? <div className="-mx-4 -mb-4 overflow-hidden rounded-b-card border-t border-hair sm:-mx-5 sm:-mb-5"><ObjectiveFlow key={cur.id} scs={objectiveBank(course, cur, scs)} passMark={course.settings.passRoleplay} /></div>
                : <>
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
                {mine.map((sc) => {
                  const scr = inScreen.has(sc.id);
                  return (
                    <li key={sc.id} className={cn("squircle group flex flex-col gap-1 rounded-panel border border-hair bg-card p-3.5 shadow-hair transition-shadow hover:shadow-soft", fresh === sc.id && "node-flash border-brand")}>
                      <button type="button" onClick={() => setOpenSc(sc.id)} title="Open the full situation" className="-m-1 flex flex-1 flex-col gap-2 rounded-control p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                        {/* v1-hidden: who the situation is with (role and name). A situation is the moment, not the person.
                        <span className="flex w-full items-center gap-2"><Icon />{CHARACTERS[characterOf(sc)].label} · {sc.persona.name}</span> */}
                        <span className="flex items-start gap-2">
                          <span className="min-w-0 flex-1 text-body-lg font-semibold leading-snug text-ink group-hover:text-brand-deep">{sc.title}</span>
                          <Maximize2 className="mt-1 size-3.5 shrink-0 text-ink-4 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                        </span>
                        {sc.description && <span className="line-clamp-4 text-body leading-relaxed text-ink-3">{sc.description}</span>}
                      </button>
                      {editable && sc.custom && (
                        <span className="flex items-center gap-1">
                          {/* v1-hidden: the per-situation screening toggle. */}
                          {SCREENING_PICK && screening && (
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
                {waiting(cur) && [0, 1].map((k) => <li key={k} className="squircle shimmer h-[150px] rounded-panel bg-tint" aria-label="Writing a situation" />)}
                {drafting && <li className="squircle shimmer grid min-h-[150px] place-items-center rounded-panel bg-tint p-3 text-center text-caption font-semibold text-brand-deep">Drafting “{drafting}”…</li>}
                {editable && mine.length > 0 && !drafting && (
                  <li>
                    <button type="button" onClick={() => addTo(cur)} className="squircle flex size-full min-h-[150px] flex-col items-center justify-center gap-1.5 rounded-panel border border-dashed border-hair-3 text-caption font-semibold text-ink-3 transition-colors hover:border-brand hover:bg-tint/50 hover:text-brand-deep">
                      <Plus className="size-5" aria-hidden="true" />Add a situation or question<span className="font-normal text-ink-4">Describe it in the chat</span>
                    </button>
                  </li>
                )}
              </ul>
              {!mine.length && !waiting(cur) && !drafting && (
                <div className="squircle flex flex-col items-center gap-2 rounded-panel border border-dashed border-hair-3 px-4 py-10 text-center">
                  <Text size="body" weight="semibold">Nothing for this objective yet</Text>
                  <Text size="caption" tone="subtle">SwishX can write a few, or describe a situation or question in the chat.</Text>
                  {editable && !gen && <Button size="sm" onClick={() => startGen(cur)}><AgentIcon className="size-3.5" aria-hidden="true" />Write a few</Button>}
                </div>
              )}
                </>}
            </section>
          </div>
        );
      })()}

      {(() => {
        const sc = scs.find((x) => x.id === openSc);
        if (!sc) return null;
        const scr = inScreen.has(sc.id);
        return (
          <Modal open onClose={() => setOpenSc(null)} size="md"
            footer={<>
              {editable && sc.custom && <Button variant="secondary" className="mr-auto" onClick={() => { removeSituation(sc); setOpenSc(null); }}><Trash2 className="size-4" aria-hidden="true" />Delete</Button>}
              {/* v1-hidden: the screening toggle. */}
              {SCREENING_PICK && screening && editable && <Button variant="secondary" disabled={scr && screen.length === 1} onClick={() => toggleScreen(sc.id)}><ShieldCheck className="size-4" aria-hidden="true" />{scr ? "Take out of screening" : "Add to screening"}</Button>}
              <Button onClick={() => setOpenSc(null)}>Done</Button>
            </>}>
            <SituationDetail sc={sc} objective={obs.find((o) => o.id === sc.objectiveId)} inScreening={SCREENING_PICK && screening && scr} />
          </Modal>
        );
      })()}
    </div>
  );
}
