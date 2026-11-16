"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, ChevronDown, Mic, Pill, Plus, ShieldCheck, Stethoscope, Syringe, Trash2, X, type LucideIcon } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { COMPETENCIES, competency } from "@/data/org";
import type { Character, Course, Scenario } from "@/data/types";
import { CHARACTERS, characterOf, draftFromPrompt, evenTo100, screeningOf, weightsOf, withWeights } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useCopilot } from "@/features/copilot/copilot-store";
import { askForScenario, useTrainingChat } from "./training-chat-store";

/** One colour per competency slot, the same in the bar and its legend. */
const SEG = ["bg-brand", "bg-info", "bg-ok", "bg-warn", "bg-ink-3", "bg-brand-2"];

/** Who the rep meets, as an icon: the role, not a made-up face. */
const ROLE_ICON: Record<Character, LucideIcon> = { doctor: Stethoscope, nurse: Syringe, manager: Briefcase, pharmacist: Pill };

const useOf = (c: Course, sc: Scenario) => ({ practice: sc.use.includes("practice"), final: c.settings.assessmentScenarioId === sc.id });

/**
 * Step 2: the training's scenarios, as a list in call order. Reps take them back to back in one call;
 * each has one character and its own competency weights. A row opens in place; the agent adds new ones.
 */
export function ScenarioList({ course, editable }: { course: Course; editable: boolean }) {
  const custom = useApp((s) => s.scenarios);
  const updateSettings = useApp((s) => s.updateSettings);
  const drafting = useCopilot((s) => s.drafting);
  /* The scenario the agent just added, shown where it lands. */
  const fresh = useTrainingChat((s) => s.added);
  useEffect(() => { if (fresh) window.setTimeout(() => document.getElementById(`sc-${fresh}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80); }, [fresh]);
  /* A tile opens in place; ?sc= says which, so the chat knows what's open. */
  const router = useRouter();
  const openId = useSearchParams().get("sc");
  useEffect(() => { if (openId) window.setTimeout(() => document.getElementById(`sc-${openId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80); }, [openId]);
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const base = `/trainer/courses/${course.id}`;
  const screen = screeningOf(course, scs);
  const inScreen = new Set(screen.map((x) => x.id));
  const screening = course.settings.screening && scs.length > 0;

  function toggleScreen(id: string) {
    const ids = inScreen.has(id) ? screen.map((x) => x.id).filter((x) => x !== id) : [...screen.map((x) => x.id), id];
    if (ids.length) updateSettings(course.id, { screeningIds: ids });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <Text as="h1" size="display" weight="extrabold" tracking="tight">Scenarios <span className="font-semibold text-ink-4">{scs.length || ""}</span></Text>
          <Text size="body" tone="subtle">Reps take them in this order, back to back in one call.</Text>
        </div>
        {scs.length > 0 && <Link href={`${base}/roleplay/test?run=all`} className="inline-flex h-9 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle"><Mic className="size-4" aria-hidden="true" />Test the full call</Link>}
        {editable && <Button size="sm" onClick={askForScenario}><Plus className="size-4" aria-hidden="true" />Add scenario</Button>}
      </div>

      {screening && (
        <section id="screening" className="squircle flex scroll-mt-4 flex-wrap items-center gap-3 rounded-panel border border-info/20 bg-info-bg/40 px-4 py-2.5">
          <ShieldCheck className="size-4 shrink-0 text-info" aria-hidden="true" />
          <Text size="body" tone="muted" className="min-w-0 flex-1"><b className="text-ink">Screening</b> · a 3-minute call from {screen.length} scenario{screen.length === 1 ? "" : "s"} before the lessons. Not graded.</Text>
          <Link href={`${base}/roleplay/test?run=screening`} className="text-body font-semibold text-info hover:underline">Test it</Link>
        </section>
      )}

      {/* The call, in order: one row per scenario, opened in place. */}
      <ol className="squircle flex flex-col overflow-hidden rounded-card border border-hair bg-card" aria-label="Scenarios, in call order">
        {scs.map((sc, i) => {
          const ch = CHARACTERS[characterOf(sc)];
          const Icon = ROLE_ICON[characterOf(sc)];
          const open = openId === sc.id;
          const on = inScreen.has(sc.id);
          return (
            <li key={sc.id} id={`sc-${sc.id}`} className={cn("scroll-mt-4 border-b border-hair last:border-0", fresh === sc.id && !open && "node-flash")}>
              <div className={cn("flex items-center gap-3 px-4 py-3 transition-colors", open ? "bg-tint/50" : "hover:bg-subtle/60")}>
                <span className="w-5 shrink-0 text-center text-caption font-bold tabular-nums text-ink-4">{i + 1}</span>
                <button type="button" aria-expanded={open} onClick={() => router.replace(open ? `${base}/roleplay` : `${base}/roleplay?sc=${sc.id}`, { scroll: false })}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><Icon className="size-4.5" aria-hidden="true" /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-lg font-semibold text-ink">{sc.title}</span>
                    <span className="truncate text-caption text-ink-3">{ch.label} · {sc.persona.name.replace(/,.*$/, "")} · {sc.durationMin} min</span>
                  </span>
                </button>
                {screening && (
                  <button type="button" aria-pressed={on} disabled={!editable || (on && screen.length === 1)} onClick={() => toggleScreen(sc.id)}
                    title={on ? "In the screening call. Click to take it out." : "Add it to the screening call"}
                    className={cn("hidden shrink-0 items-center gap-1 rounded-chip px-2 py-0.5 text-caption font-semibold transition-colors disabled:cursor-default sm:flex", on ? "bg-info-bg text-info" : "text-ink-4 hover:bg-subtle hover:text-ink")}>
                    <ShieldCheck className="size-3.5" aria-hidden="true" />{on ? "Screening" : "Add to screening"}
                  </button>
                )}
                <Link href={`${base}/roleplay/test?sc=${sc.id}`} title="Test this scenario" aria-label={`Test ${sc.title}`} className="grid size-8 shrink-0 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-brand-deep"><Mic className="size-4" /></Link>
                <button type="button" aria-label={open ? "Close" : "Open"} onClick={() => router.replace(open ? `${base}/roleplay` : `${base}/roleplay?sc=${sc.id}`, { scroll: false })}
                  className="grid size-8 shrink-0 place-items-center rounded-control text-ink-3 hover:bg-subtle"><ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" /></button>
              </div>
              {open && <ScenarioDetail sc={sc} course={course} editable={editable} />}
            </li>
          );
        })}
        {drafting && (
          <li className="shimmer flex items-center gap-3 border-b border-hair bg-tint px-4 py-3 last:border-0">
            <span className="w-5" />
            <span className="grid size-9 place-items-center rounded-control bg-card text-brand"><AgentIcon className="size-4.5" aria-hidden="true" /></span>
            <span className="flex flex-col"><span className="text-body-lg font-semibold text-ink">{drafting}</span><span className="text-caption text-ink-3">Drafting…</span></span>
          </li>
        )}
        {editable && !drafting && (
          <li>
            <button type="button" onClick={askForScenario} className="flex w-full items-center gap-3 px-4 py-3 text-left text-body font-semibold text-brand-deep transition-colors hover:bg-tint">
              <span className="w-5" />
              <span className="grid size-9 place-items-center rounded-control border border-dashed border-tint-line"><Plus className="size-4" aria-hidden="true" /></span>
              Add scenario<span className="font-normal text-ink-3">· describe it to the agent</span>
            </button>
          </li>
        )}
      </ol>
    </div>
  );
}

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

/**
 * A scenario, opened in its tile: what happens and who the rep meets on the left, what it's scored on
 * on the right. Changes to the call itself go through the chat.
 */
function ScenarioDetail({ sc, course, editable }: { sc: Scenario; course: Course; editable: boolean }) {
  const router = useRouter();
  const base = `/trainer/courses/${course.id}`;
  const canEdit = editable && !!sc.custom;
  return (
    <div className="grid gap-5 bg-tint/20 px-4 pb-5 pt-2 sm:pl-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] md:gap-8">
      <div className="flex flex-col gap-3">
        <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">What happens</Text>
        {sc.description && <Text size="body" className="leading-relaxed text-ink-2">{sc.description}</Text>}
        <span className="flex flex-wrap gap-1.5">{sc.persona.traits.map((t) => <span key={t} className="rounded-chip bg-subtle px-2 py-0.5 text-caption font-semibold text-ink-2">{t}</span>)}</span>
        <Text size="body" tone="muted"><b className="text-ink-2">Rep&apos;s goal:</b> {sc.objective}</Text>
        {canEdit && <span className="mt-auto pt-1"><DeleteScenario sc={sc} onDeleted={() => router.replace(`${base}/roleplay`, { scroll: false })} /></span>}
      </div>
      <WeightsEditor sc={sc} course={course} canEdit={canEdit} />
    </div>
  );
}

/**
 * What a scenario is scored on, and how much each competency counts. SwishX proposes them; the
 * trainer adjusts the percentages, adds or drops one. They add up to 100.
 */
export function WeightsEditor({ sc, course, canEdit }: { sc: Scenario; course: Course; canEdit: boolean }) {
  const saveScenario = useApp((s) => s.saveScenario);
  const ws = weightsOf(sc);
  const total = ws.reduce((a, w) => a + w.pct, 0);
  const unused = COMPETENCIES.filter((c) => !ws.some((w) => w.competency === c.id));
  const save = (next: { competency: string; pct: number }[]) => saveScenario(withWeights(sc, next), useOf(course, sc));
  const set = (i: number, pct: number) => save(ws.map((w, k) => (k === i ? { ...w, pct } : w)));
  return (
    <section aria-label="Scored on" className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="flex-1">Scored on</Text>
        {total !== 100 && <>
          <span className="rounded-chip bg-warn-bg px-2 py-0.5 text-caption font-bold tabular-nums text-warn">{total}%</span>
          {canEdit && <button type="button" onClick={() => save(evenTo100(ws))} className="text-caption font-semibold text-brand-deep hover:underline">Scale to 100%</button>}
        </>}
      </div>
      <ul className="flex flex-col">
        {ws.map((w, i) => (
          <li key={w.competency} className="group flex items-center gap-2.5 py-1.5">
            <span className={cn("size-2 shrink-0 rounded-full", SEG[i % SEG.length])} />
            <span className="min-w-0 flex-1 truncate text-body text-ink">{competency(w.competency)?.name}</span>
            <input type="range" min={5} max={90} step={5} value={w.pct} disabled={!canEdit} aria-label={`${competency(w.competency)?.name} weight`}
              onChange={(e) => set(i, Number(e.target.value))} className="w-20 accent-[var(--color-brand)] xl:w-28" />
            <span className="flex w-14 items-center justify-end gap-0.5">
              <input type="number" min={1} max={100} value={w.pct} disabled={!canEdit} aria-label={`${competency(w.competency)?.name} percent`}
                onChange={(e) => set(i, Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                className="w-9 rounded-glyph bg-transparent text-right text-body font-bold tabular-nums text-ink outline-none focus:bg-subtle" />
              <span className="text-caption text-ink-3">%</span>
            </span>
            {canEdit && ws.length > 1
              ? <button type="button" aria-label={`Remove ${competency(w.competency)?.name}`} onClick={() => save(evenTo100(ws.filter((_, k) => k !== i)))} className="grid size-6 place-items-center rounded-glyph text-ink-4 opacity-0 transition-opacity hover:bg-subtle hover:text-ink group-hover:opacity-100 focus:opacity-100"><X className="size-3.5" /></button>
              : <span className="size-6" />}
          </li>
        ))}
      </ul>
      {canEdit && unused.length > 0 && (
        <select aria-label="Add a competency" value="" onChange={(e) => e.target.value && save(evenTo100([...ws, { competency: e.target.value, pct: Math.round(100 / (ws.length + 1)) }]))}
          className="self-start rounded-control bg-transparent text-caption font-semibold text-brand-deep outline-none hover:underline">
          <option value="">+ Add a competency</option>
          {unused.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
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
    <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-1.5 self-start text-caption font-semibold text-ink-3 hover:text-danger"><Trash2 className="size-3.5" aria-hidden="true" />Delete scenario</button>
  );
}
