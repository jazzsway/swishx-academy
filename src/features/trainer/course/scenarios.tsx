"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronRight, Mic, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { COMPETENCIES, competency } from "@/data/org";
import type { Course, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, draftFromPrompt, evenTo100, personInitials, screeningOf, weightsOf, withWeights } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { CopilotOverride } from "@/features/copilot/copilot-panel";
import { Composer, Suggestions } from "@/features/copilot/composer";
import { useCopilot } from "@/features/copilot/copilot-store";

/** One colour per competency slot, the same in the bar and its legend. */
const SEG = ["bg-brand", "bg-info", "bg-ok", "bg-warn", "bg-ink-3", "bg-brand-2"];
const IDEAS = ["A practice nurse worried about who teaches the injections", "A tough pharmacist asking about storage and the formulary", "A practice manager pushing back on prior auth paperwork"];

const useOf = (c: Course, sc: Scenario) => ({ practice: sc.use.includes("practice"), final: c.settings.assessmentScenarioId === sc.id });

/** How a scenario's score is made up, as one bar and its legend. */
export function CompetencyBar({ sc, compact }: { sc: Scenario; compact?: boolean }) {
  const ws = weightsOf(sc);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-2 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden="true">
        {ws.map((w, i) => <span key={w.competency} className={cn("h-full", SEG[i % SEG.length])} style={{ width: `${w.pct}%` }} />)}
      </div>
      <ul className={cn("flex flex-wrap gap-x-3 gap-y-1", compact && "gap-x-2")} aria-label="Competencies measured">
        {ws.map((w, i) => (
          <li key={w.competency} className="flex items-center gap-1.5 text-caption text-ink-2">
            <span className={cn("size-2 shrink-0 rounded-full", SEG[i % SEG.length])} />{competency(w.competency)?.name ?? w.competency}<b className="tabular-nums text-ink">{w.pct}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Step 2: the training's scenarios, as a list. Reps take them back to back in one call; each has one
 * character and its own competency weights. A scenario is added by describing it to the agent.
 */
export function ScenarioList({ course, editable }: { course: Course; editable: boolean }) {
  const router = useRouter();
  const search = useSearchParams();
  const custom = useApp((s) => s.scenarios);
  const updateSettings = useApp((s) => s.updateSettings);
  const drafting = useCopilot((s) => s.drafting);
  const [ask, setAsk] = useState(0);
  const [fresh, setFresh] = useState<string | null>(null);
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = `/trainer/courses/${course.id}`;
  const screen = screeningOf(course, scs);
  const inScreen = new Set(screen.map((x) => x.id));
  useEffect(() => { if (window.location.hash === "#screening") document.getElementById("screening")?.scrollIntoView({ block: "start" }); }, []);

  function toggleScreen(id: string) {
    const ids = inScreen.has(id) ? screen.map((x) => x.id).filter((x) => x !== id) : [...screen.map((x) => x.id), id];
    if (ids.length) updateSettings(course.id, { screeningIds: ids });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="micro" weight="bold" tone="brand-deep" uppercase tracking="wider">Step 2 of 3</Text>
          <Text as="h1" size="display" weight="extrabold" tracking="tight">Scenarios</Text>
          <Text size="body-lg" tone="subtle">Reps take these back to back in one call. Each has one character and is scored on its own competencies.</Text>
        </div>
        {scs.length > 0 && <Link href={`${base}/roleplay/test?run=all`} className="inline-flex h-10 items-center gap-2 rounded-control border border-hair-2 bg-card px-3.5 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle"><Mic className="size-4" aria-hidden="true" />Test the full call</Link>}
        {editable && <Button onClick={() => { useCopilot.getState().setOpen(true); setAsk(ask + 1); }}><Plus className="size-4" aria-hidden="true" />Add scenario</Button>}
      </div>

      {course.settings.screening && scs.length > 0 && (
        <section id="screening" className="squircle flex scroll-mt-4 flex-col gap-3 rounded-card border border-info/25 bg-info-bg/50 p-4">
          <div className="flex flex-wrap items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-info text-white"><ShieldCheck className="size-4" aria-hidden="true" /></span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text size="title" weight="bold">Screening · before the lessons</Text>
              <Text size="body" tone="muted">Reps start with a short call, about 3 minutes, built from {screen.length === 1 ? "this scenario" : `these ${screen.length} scenarios`}. It isn&apos;t graded: it sets each rep&apos;s baseline and lets them skip lessons they already know.</Text>
            </div>
            <Link href={`${base}/roleplay/test?run=screening`} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control bg-info px-3 text-body font-semibold text-white transition-opacity hover:opacity-90"><Mic className="size-4" aria-hidden="true" />Test the screening call</Link>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-12" role="group" aria-label="Scenarios in the screening call">
            {scs.map((sc) => {
              const on = inScreen.has(sc.id);
              return (
                <button key={sc.id} type="button" aria-pressed={on} disabled={!editable || (on && screen.length === 1)} onClick={() => toggleScreen(sc.id)}
                  className={cn("flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-caption font-semibold transition-colors disabled:cursor-default", on ? "border-info bg-card text-info" : "border-dashed border-hair-3 text-ink-3 hover:border-info hover:text-info")}>
                  {on ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}{sc.title}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <ol className="flex flex-col gap-2.5" aria-label="Scenarios">
        {scs.map((sc, i) => {
          const ch = CHARACTERS[characterOf(sc)];
          return (
            <li key={sc.id}>
              <Link href={`${base}/roleplay?sc=${sc.id}`} className={cn("squircle group flex gap-4 rounded-card border bg-card p-4 transition-all hover:border-hair-3 hover:shadow-hair", fresh === sc.id ? "node-flash border-brand" : "border-hair")}>
                <span className="flex flex-col items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-glyph bg-black/[0.06] text-micro font-bold text-ink-3">{i + 1}</span>
                  <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-body font-extrabold text-white">{personInitials(sc.persona.name)}</span>
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-body-lg font-bold text-ink">{sc.title}</span>
                    <span className="rounded-chip bg-tint px-2 py-0.5 text-micro font-bold text-brand-deep">{ch.label}</span>
                    {course.settings.screening && inScreen.has(sc.id) && <span className="rounded-chip bg-info-bg px-2 py-0.5 text-micro font-bold text-info">In screening</span>}
                  </span>
                  <span className="text-caption text-ink-3">{sc.persona.name}{sc.persona.specialty !== ch.label ? ` · ${sc.persona.specialty}` : ""} · about {sc.durationMin} min</span>
                  {sc.description && <span className="line-clamp-2 text-body text-ink-2">{sc.description}</span>}
                  <span className="pt-1"><CompetencyBar sc={sc} /></span>
                </span>
                <ChevronRight className="mt-1 size-4 shrink-0 text-ink-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
        {drafting && (
          <li className="squircle shimmer flex items-center gap-4 rounded-card border border-tint-line bg-tint p-4">
            <span className="grid size-11 place-items-center rounded-full bg-card text-brand"><AgentIcon className="size-5" aria-hidden="true" /></span>
            <span className="flex flex-col"><span className="text-body-lg font-bold text-ink">{drafting}</span><span className="text-caption text-ink-3">Drafting the scenario…</span></span>
          </li>
        )}
      </ol>
      {editable && !drafting && (
        <button type="button" onClick={() => { useCopilot.getState().setOpen(true); setAsk(ask + 1); }}
          className="squircle flex items-center justify-center gap-2 rounded-card border border-dashed border-hair-3 p-4 text-body font-semibold text-brand-deep transition-colors hover:border-brand hover:bg-tint">
          <Plus className="size-4" aria-hidden="true" />Add scenario<span className="font-normal text-ink-3">· describe it to the agent</span>
        </button>
      )}
      {editable && <CopilotOverride><ScenarioChat course={course} scs={scs} ask={ask} fresh={search.get("fresh") === "1"} onAdded={(id) => { setFresh(id); window.setTimeout(() => document.querySelector(`a[href$="sc=${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80); }} onOpen={(id) => router.push(`${base}/roleplay?sc=${id}`)} /></CopilotOverride>}
    </div>
  );
}

interface Turn { id: string; from: "you" | "ai"; text: string; steps?: string[]; at?: number; opens?: string }

/** Drafts a scenario from what the trainer wrote, in steps they can watch, and adds it to the training. */
export function useAddScenario(course: Course) {
  const saveScenario = useApp((s) => s.saveScenario);
  const setDrafting = useCopilot((s) => s.setDrafting);
  return (prompt: string, onStep: (steps: string[], at: number) => void, onDone: (sc: Scenario) => void) => {
    const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course;
    const used = allScenarios().filter((x) => c.scenarioIds.includes(x.id)).map((x) => x.persona.name);
    const sc = draftFromPrompt(c, prompt, used);
    const ch = CHARACTERS[characterOf(sc)];
    const ws = weightsOf(sc).map((w) => `${competency(w.competency)?.name} ${w.pct}%`).join(", ");
    const steps = [`Reading ${c.brief ? "your brief and " : ""}the demo-call documents`, `Choosing the character: ${ch.label.toLowerCase()}, ${sc.persona.name}`, "Writing the opening, the objections and the close", `Weighting the competencies: ${ws}`];
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

function ScenarioChat({ course, scs, ask, fresh, onAdded, onOpen }: { course: Course; scs: Scenario[]; ask: number; fresh: boolean; onAdded: (id: string) => void; onOpen: (id: string) => void }) {
  const add = useAddScenario(course);
  const [turns, setTurns] = useState<Turn[]>(() => [{
    id: "hello", from: "ai",
    text: fresh && scs.length
      ? `I drafted ${scs.length} scenarios from ${course.brief ? "your brief" : "your files"}${course.roleplaySourceIds?.length ? " and demo-call documents" : ""}: ${scs.map((x) => `“${x.title}”`).join(", ")}. Each has one character and its own competency weights. Open one to change it, or describe another to add.`
      : scs.length ? "Describe a scenario to add: who the rep meets, what happens, and what you want to test. Open a scenario to change it." : "This training has no scenarios yet. Describe the first one: who the rep meets, what happens, and what you want to test.",
  }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns]);
  useEffect(() => {
    if (!ask) return;
    setTurns((t) => [...t, { id: `a${Date.now()}`, from: "ai", text: "Tell me about the scenario: who the rep meets (a doctor, nurse, practice manager or pharmacist), what happens on the call, and what you want to test." }]);
    window.setTimeout(() => document.getElementById("scenario-chat")?.focus(), 60);
  }, [ask]);

  function send(prompt: string) {
    if (!prompt.trim() || busy) return;
    const id = `a${Date.now()}`;
    setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt }, { id, from: "ai", text: "", steps: [], at: 0 }]);
    setText("");
    setBusy(true);
    add(prompt, (steps, at) => setTurns((t) => t.map((x) => (x.id === id ? { ...x, steps, at } : x))), (sc) => {
      const ws = weightsOf(sc).map((w) => `${competency(w.competency)?.name.toLowerCase()} (${w.pct}%)`).join(", ");
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, steps: undefined, text: `Added “${sc.title}” with ${sc.persona.name}, scored on ${ws}. Open it to see the call and change the weights, or describe another.`, opens: sc.id } : x)));
      setBusy(false);
      onAdded(sc.id);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-hair bg-tint/60 px-4 py-2.5">
        <Mic className="size-4 text-brand-deep" aria-hidden="true" />
        <Text size="caption" weight="semibold" tone="muted" className="truncate">Scenarios · {course.title}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {turns.map((t) => (
          <div key={t.id} className={cn("flex flex-col gap-1.5", t.from === "you" && "items-end")}>
            {t.steps ? (
              <div className="flex max-w-[92%] flex-col gap-1 rounded-panel bg-subtle px-3.5 py-2.5 text-body">
                {t.steps.map((st, k) => (
                  <span key={st} className={cn("flex items-center gap-2", k > (t.at ?? 0) && "opacity-35")}>
                    {k < (t.at ?? 0) ? <Check className="size-3.5 shrink-0 text-ok" aria-hidden="true" /> : <span className={cn("size-2 shrink-0 rounded-full", k === t.at ? "animate-pulse bg-brand" : "bg-hair-3")} />}
                    {st}{k === t.at ? "…" : ""}
                  </span>
                ))}
              </div>
            ) : (
              <div className={cn("max-w-[92%] rounded-panel px-3.5 py-2.5 text-body leading-relaxed", t.from === "you" ? "bg-ink text-white" : "bg-subtle text-ink")}>{t.text}</div>
            )}
            {t.opens && <Button size="sm" variant="secondary" className="self-start" onClick={() => onOpen(t.opens!)}>Open it<ArrowRight className="size-3.5" aria-hidden="true" /></Button>}
          </div>
        ))}
        {turns.length <= 2 && !busy && <Suggestions items={IDEAS} onPick={send} variant="list" />}
        <div ref={endRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-hair p-3">
        <Composer id="scenario-chat" value={text} onChange={setText} onSend={() => send(text)} busy={busy}
          placeholder="Describe a scenario, e.g. a nurse who asks about missed doses and reports a reaction" hint="SwishX picks the character and the competency weights; you can change both." />
      </div>
    </div>
  );
}

/**
 * The competencies a scenario measures and how much each counts. SwishX proposes them from the
 * scenario; the trainer adjusts the percentages, swaps or adds one. They should add up to 100.
 */
export function WeightsEditor({ sc, course, canEdit }: { sc: Scenario; course: Course; canEdit: boolean }) {
  const saveScenario = useApp((s) => s.saveScenario);
  const ws = weightsOf(sc);
  const total = ws.reduce((a, w) => a + w.pct, 0);
  const unused = COMPETENCIES.filter((c) => !ws.some((w) => w.competency === c.id));
  const save = (next: { competency: string; pct: number }[]) => saveScenario(withWeights(sc, next), useOf(course, sc));
  const set = (i: number, patch: Partial<{ competency: string; pct: number }>) => save(ws.map((w, k) => (k === i ? { ...w, ...patch } : w)));
  return (
    <section aria-label="Competencies measured" className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="micro" weight="bold" tone="brand-deep" uppercase tracking="wider">Scored on</Text>
          <Text as="h2" size="title" weight="bold">Competencies measured</Text>
          <Text size="caption" tone="subtle">SwishX proposed these from the scenario. {canEdit ? "Adjust how much each counts; they add up to 100%." : "Read-only."}</Text>
        </div>
        <span className={cn("rounded-chip px-2.5 py-1 text-caption font-bold tabular-nums", total === 100 ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn")}>{total}% of 100%</span>
      </div>
      <ul className="flex flex-col divide-y divide-hair rounded-panel border border-hair">
        {ws.map((w, i) => (
          <li key={w.competency} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className={cn("size-2.5 shrink-0 rounded-full", SEG[i % SEG.length])} />
            {canEdit ? (
              <select aria-label="Competency" value={w.competency} onChange={(e) => set(i, { competency: e.target.value })}
                className="h-9 min-w-0 flex-1 basis-48 rounded-control border border-hair-2 bg-card px-2 text-body font-semibold text-ink">
                {[competency(w.competency), ...unused].filter(Boolean).map((c) => <option key={c!.id} value={c!.id}>{c!.name}</option>)}
              </select>
            ) : <span className="min-w-0 flex-1 basis-48 text-body font-semibold text-ink">{competency(w.competency)?.name}</span>}
            <input type="range" min={5} max={90} step={5} value={w.pct} disabled={!canEdit} aria-label={`${competency(w.competency)?.name} weight`}
              onChange={(e) => set(i, { pct: Number(e.target.value) })} className="w-32 accent-[var(--color-brand)] sm:w-44" />
            <span className="flex items-center gap-0.5">
              <input type="number" min={1} max={100} value={w.pct} disabled={!canEdit} aria-label={`${competency(w.competency)?.name} percent`}
                onChange={(e) => set(i, { pct: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })}
                className="h-9 w-14 rounded-control border border-hair-2 bg-card px-2 text-right text-body font-bold tabular-nums text-ink" />
              <span className="text-body text-ink-3">%</span>
            </span>
            {canEdit && ws.length > 1 && <IconButton aria-label={`Remove ${competency(w.competency)?.name}`} onClick={() => save(evenTo100(ws.filter((_, k) => k !== i)))}><X className="size-4" /></IconButton>}
          </li>
        ))}
      </ul>
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          {unused.length > 0 && (
            <select aria-label="Add a competency" value="" onChange={(e) => e.target.value && save(evenTo100([...ws, { competency: e.target.value, pct: Math.round(100 / (ws.length + 1)) }]))}
              className="h-9 rounded-control border border-dashed border-hair-3 bg-card px-2 text-body font-semibold text-brand-deep">
              <option value="">+ Add a competency</option>
              {unused.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {total !== 100 && <Button size="sm" variant="secondary" onClick={() => save(evenTo100(ws))}>Scale to 100%</Button>}
        </div>
      )}
    </section>
  );
}

/** Deleting a scenario, with one confirm. */
export function DeleteScenario({ sc, onDeleted }: { sc: Scenario; onDeleted: () => void }) {
  const removeScenario = useApp((s) => s.removeScenario);
  const [confirm, setConfirm] = useState(false);
  /* The training's call is all of its scenarios: if this one anchored it, the next one does. */
  function remove() {
    removeScenario(sc.id);
    const st = useApp.getState();
    const c = st.courses.find((x) => x.id === sc.courseId);
    if (!c) return;
    if (c.settings.screeningIds?.includes(sc.id)) st.updateSettings(c.id, { screeningIds: c.settings.screeningIds.filter((x) => x !== sc.id) });
    const first = allScenarios().find((x) => c.scenarioIds.includes(x.id));
    if (first && !c.settings.assessmentScenarioId) st.saveScenario(first, { practice: true, final: true });
  }
  return confirm ? (
    <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-danger-line bg-danger-bg p-3">
      <Text size="body" weight="semibold" tone="danger" className="flex-1">Delete “{sc.title}” from this training?</Text>
      <Button size="sm" variant="danger" onClick={() => { remove(); onDeleted(); }}>Delete</Button>
      <Button size="sm" variant="secondary" onClick={() => setConfirm(false)}>Keep</Button>
    </div>
  ) : (
    <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-1.5 self-start px-1 text-caption font-semibold text-ink-3 hover:text-danger"><Trash2 className="size-3.5" aria-hidden="true" />Delete this scenario</button>
  );
}
