"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, CornerDownRight, FileText, Flag, Lock, Mic, MessageSquarePlus, RotateCcw, ShieldAlert, Trash2, Undo2, X } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios, objection, prohibited } from "@/data/scenarios";
import { source } from "@/data/org";
import type { Citation, Course, Objection, ProhibitedRule, RubricCriterion, Scenario } from "@/data/types";
import { draftScenario, editCall, withLists, type CallFocus } from "@/lib/roleplay-draft";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CopilotOverride } from "@/features/copilot/copilot-panel";
import { Composer, Suggestions } from "@/features/copilot/composer";
import { useCopilot } from "@/features/copilot/copilot-store";
import { useCourse } from "./use-course";

const useOf = (sc: Scenario, c: Course) => ({ practice: sc.use.includes("practice"), final: c.settings.assessmentScenarioId === sc.id });
const keyOf = (f: CallFocus) => (f.kind === "objection" ? `objection:${f.id}` : f.kind === "rule" ? `rule:${f.id}` : f.kind);
const initials = (name: string) => name.replace(/^Dr\.?\s*/, "").split(" ").map((x) => x[0]).join("").slice(0, 2);

/** The course's first roleplay, from its roleplay documents (or its own files when there are none). */
export function draftFor(course: Course) {
  const ids = course.roleplaySourceIds?.length ? course.roleplaySourceIds : course.sourceIds;
  return draftScenario({ courseId: course.id, productId: course.productId, sources: ids.map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x) });
}

/** A shipped, approved doctor as an editable copy: its objections and rules become the course's own. */
function editableCopy(sc: Scenario): Scenario {
  const p = `sc-${Math.random().toString(36).slice(2, 7)}`;
  const obs: Objection[] = sc.objectionIds.map((id, i) => ({ ...objection(id), id: `${p}-ob${i + 1}` }));
  const prs: ProhibitedRule[] = sc.prohibitedIds.map((id, i) => ({ ...prohibited(id), id: `${p}-pr${i + 1}` }));
  return withLists({ ...sc, id: p, title: sc.title, rubric: sc.rubric.map((r, i) => ({ ...r, id: `${p}-r${i + 1}` })), custom: { objections: obs, prohibited: prs, sourceIds: [], cites: {}, createdAt: new Date().toISOString() } });
}

function label(f: CallFocus, sc: Scenario, obs: Objection[]) {
  if (f.kind === "persona") return `${sc.persona.name}`;
  if (f.kind === "opening") return "The opening";
  if (f.kind === "close") return "The close";
  if (f.kind === "rubric") return "The rubric";
  if (f.kind === "objection") { const i = obs.findIndex((o) => o.id === f.id); return `Objection ${i + 1} · ${obs[i]?.label ?? ""}`; }
  return `Never say · ${prohibited(f.id)?.label ?? ""}`;
}

/**
 * The course's AI roleplay as a call tree. The doctor opens, raises each objection in turn (handled
 * moves on, missed gets one pushback), then closes. Never-say rules and the rubric sit alongside.
 * Every change goes through the agent on the right; select a step to point the agent at it.
 */
export function RoleplaySetup() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const data = useCourse(id);
  const custom = useApp((s) => s.scenarios);
  const saveScenario = useApp((s) => s.saveScenario);
  const removeScenario = useApp((s) => s.removeScenario);
  const updateCourse = useApp((s) => s.updateCourse);
  const [selected, setSelected] = useState<CallFocus | null>(null);
  const [attached, setAttached] = useState<CallFocus | null>(null);
  const [flash, setFlash] = useState<{ keys: string[]; n: number }>({ keys: [], n: 0 });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const course = data?.course;
  const scs = useMemo(() => (course ? allScenarios().filter((x) => course.scenarioIds.includes(x.id)) : []), [course, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = scs.find((x) => x.id === search.get("sc")) ?? scs[0];
  useEffect(() => { setSelected(null); setAttached(null); setConfirmRemove(false); }, [sc?.id]);
  /* Escape clears the selection, as on a canvas. */
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);
  if (!data || !course) return null;
  const base = `/trainer/courses/${course.id}`;
  const editable = data.editable;

  if (!sc)
    return (
      <div className="squircle flex flex-col items-center gap-3 rounded-card border border-dashed border-hair-3 bg-card px-6 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-tint text-brand-deep"><Mic className="size-6" aria-hidden="true" /></span>
        <Text as="h1" size="title" weight="bold">This course has no roleplay yet</Text>
        <Text size="body" tone="muted" className="max-w-[440px]">SwishX drafts the call from {course.roleplaySourceIds?.length ? "your roleplay documents" : "the course's files"}: the doctor, the objections, how it's scored and what must never be said. Then you shape it here by chat.</Text>
        {editable && <Button onClick={() => { const d = draftFor(course); saveScenario(d, { practice: true, final: course.origin === "direct" }); router.replace(`${base}/roleplay?sc=${d.id}`); }}><AgentIcon className="size-4" aria-hidden="true" />Draft a roleplay</Button>}
      </div>
    );

  const obs: Objection[] = sc.custom ? sc.custom.objections : sc.objectionIds.map(objection);
  const rules: ProhibitedRule[] = sc.custom ? sc.custom.prohibited : sc.prohibitedIds.map(prohibited);
  const cites = sc.custom?.cites ?? {};
  const use = useOf(sc, course);
  const canEdit = editable && !!sc.custom;
  const openCrit = sc.rubric.filter((r) => r.competency === "c-opening");
  const closeCrit = sc.rubric.filter((r) => /next step|close/i.test(r.label));
  const midCrit = sc.rubric.filter((r) => !openCrit.includes(r) && !closeCrit.includes(r));
  const isSel = (f: CallFocus) => !!selected && keyOf(selected) === keyOf(f);
  const flashing = (f: CallFocus) => flash.keys.includes(keyOf(f));
  const pick = (f: CallFocus) => setSelected(selected && keyOf(selected) === keyOf(f) ? null : f);
  const addToChat = (f: CallFocus) => { setAttached(f); setSelected(null); useCopilot.getState().setOpen(true); };
  const node = (f: CallFocus) => ({ id: keyOf(f), selected: isSel(f), flash: flashing(f) ? flash.n : 0, onSelect: () => pick(f), onAdd: () => addToChat(f) });

  const setUse = (next: { practice: boolean; final: boolean }) => saveScenario(sc!, next);
  function makeCopy() {
    const copy = editableCopy(sc!);
    const final = course!.settings.assessmentScenarioId === sc!.id;
    updateCourse(course!.id, { scenarioIds: course!.scenarioIds.filter((x) => x !== sc!.id) });
    saveScenario(copy, { practice: sc!.use.includes("practice"), final });
    router.replace(`${base}/roleplay?sc=${copy.id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The doctor, and what this call is for. */}
      <section className={cn("squircle relative overflow-hidden rounded-card border bg-card", isSel({ kind: "persona" }) ? "border-brand ring-2 ring-brand/20" : "border-hair")}>
        <div className="flex flex-wrap items-start gap-4 p-5">
          <button type="button" onClick={() => pick({ kind: "persona" })} aria-label={`Select ${sc.persona.name}`}
            className={cn("relative grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-title font-extrabold text-white shadow-brand-lift transition-transform hover:scale-105", flashing({ kind: "persona" }) && "node-flash")} key={`p${flash.n}`}>
            {initials(sc.persona.name)}
            <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border-2 border-card bg-ink text-white"><Mic className="size-3" aria-hidden="true" /></span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Text as="h1" size="display" weight="extrabold" tracking="tight">{sc.persona.name}</Text>
              {!sc.custom && <Chip size="sm" iconLeft={<Lock className="size-3" aria-hidden="true" />}>Approved package</Chip>}
            </div>
            <Text size="body-lg" tone="muted">{sc.persona.specialty} · {sc.persona.setting} · {sc.context.toLowerCase()} · about {sc.durationMin} min</Text>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {sc.persona.traits.map((t) => <Chip key={t} size="sm">{t}</Chip>)}
              <CiteChip c={cites.persona} />
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Link href={`/trainer/test-call?scenario=${sc.id}&back=${encodeURIComponent(`${base}/roleplay?sc=${sc.id}`)}`}
              className="inline-flex h-10 items-center gap-2 rounded-control bg-brand px-4 text-body-lg font-semibold text-white shadow-brand-lift transition-colors hover:bg-brand-deep">
              <Mic className="size-4" aria-hidden="true" />Test call
            </Link>
            {isSel({ kind: "persona" }) && canEdit && <AddPill onClick={() => addToChat({ kind: "persona" })} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-hair bg-subtle/50 px-5 py-3">
          <Text size="body" tone="muted" className="min-w-0 flex-1"><strong className="text-ink">Goal for the rep:</strong> {sc.objective}</Text>
          <div className="flex flex-wrap items-center gap-4">
            <Toggle label="Practice" hint="Reps rehearse it privately" on={use.practice} disabled={!editable} onChange={(v) => setUse({ ...use, practice: v })} />
            <Toggle label="Final assessment call" hint="Scored, ends the course" on={use.final} disabled={!editable} onChange={(v) => setUse({ ...use, final: v })} />
          </div>
        </div>
      </section>

      {!sc.custom && editable && (
        <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
          <Lock className="size-4 text-ink-3" aria-hidden="true" />
          <Text size="body" tone="muted" className="min-w-0 flex-1">This doctor ships with the product&apos;s approved roleplay package, so it&apos;s read-only. Make the course its own copy to change it by chat.</Text>
          <Button size="sm" variant="secondary" onClick={makeCopy}>Make an editable copy</Button>
        </div>
      )}

      <div className="@container"><div className="grid gap-4 @[860px]:grid-cols-[minmax(0,1fr)_270px]">
        {/* The call, top to bottom. */}
        <section aria-label="The call" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
          className="squircle relative flex flex-col items-center overflow-hidden rounded-card border border-hair px-4 pb-8 pt-6 sm:px-8"
          style={{ backgroundColor: "var(--color-card)", backgroundImage: "radial-gradient(var(--color-hair-2) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
          <div className="mb-4 flex w-full items-center justify-between gap-3">
            <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">The call · {obs.length} objection{obs.length === 1 ? "" : "s"}</Text>
            <Text size="caption" tone="subtle" className="hidden sm:block">Select a step, then add it to the chat</Text>
          </div>

          <Terminal label="Call starts" />
          <Stem />
          <Node {...node({ kind: "opening" })} tone="ink" eyebrow="Doctor opens" quote={sc.persona.opening} cite={cites.opening} canEdit={canEdit}
            pins={openCrit} />
          {obs.map((o, i) => (
            <div key={o.id} className="flex w-full flex-col items-center">
              <Stem />
              <Node {...node({ kind: "objection", id: o.id })} tone="brand" eyebrow={`Objection ${i + 1} · ${o.label}`} quote={o.line} cite={i === 0 ? cites.objections : undefined} canEdit={canEdit} pins={midCrit} />
              <Branches
                left={<Outcome tone="ok" title="Rep handles it" body={o.handled} listen={o.keywords} answer={o.answer} />}
                right={<Outcome tone="warn" title="Rep misses it" body={o.pushback} note="One pushback, then the doctor moves on" />} />
            </div>
          ))}
          <Stem />
          <Node {...node({ kind: "close" })} tone="ink" eyebrow="Doctor closes" quote={sc.persona.closing} canEdit={canEdit} pins={closeCrit} />
          <Stem />
          <Terminal label={`Scorecard · pass at ${course.settings.passRoleplay}%`} done />
        </section>

        {/* Alongside the call: what it's scored on, what ends it, where it came from. */}
        <aside className="grid content-start gap-4 @[560px]:grid-cols-2 @[860px]:grid-cols-1">
          <Lane title="Scored on" cite={cites.rubric} selected={isSel({ kind: "rubric" })} onSelect={() => pick({ kind: "rubric" })} onAdd={canEdit ? () => addToChat({ kind: "rubric" }) : undefined}>
            <ul className="flex flex-col gap-2.5">
              {sc.rubric.map((r) => (
                <li key={r.id} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2"><span className="text-body font-semibold text-ink-2">{r.label}</span><span className="text-caption font-bold tabular-nums text-brand-deep">{r.weight}%</span></span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, r.weight * 2.5)}%` }} /></span>
                </li>
              ))}
            </ul>
          </Lane>
          <Lane title="Never say" cite={cites.prohibited}>
            <ul className="flex flex-col gap-1.5">
              {rules.map((r) => {
                const f: CallFocus = { kind: "rule", id: r.id };
                return (
                  <li key={r.id}>
                    <button type="button" onClick={() => pick(f)} key={`${r.id}${flashing(f) ? flash.n : ""}`}
                      className={cn("flex w-full items-start gap-2 rounded-control px-2 py-1.5 text-left transition-colors", isSel(f) ? "bg-tint ring-1 ring-brand" : "hover:bg-subtle", flashing(f) && "node-flash")}>
                      <ShieldAlert className={cn("mt-0.5 size-4 shrink-0", r.critical ? "text-danger" : "text-warn")} aria-hidden="true" />
                      <span className="flex min-w-0 flex-col"><span className="text-body font-semibold text-ink">{r.label}</span><span className="truncate text-caption text-ink-3">{r.critical ? "Flags and fails the call" : "Flagged on the scorecard"}</span></span>
                    </button>
                    {isSel(f) && canEdit && <div className="flex justify-end pt-1"><AddPill onClick={() => addToChat(f)} /></div>}
                  </li>
                );
              })}
            </ul>
          </Lane>
          {sc.custom && sc.custom.sourceIds.length > 0 && (
            <Lane title="Built from">
              <ul className="flex flex-col gap-1.5">
                {sc.custom.sourceIds.map((sid) => (
                  <li key={sid} className="flex items-center gap-2 text-body text-ink-2"><FileText className="size-4 shrink-0 text-ink-3" aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{source(sid)?.title ?? "Document"}</span>{sid === sc.custom!.sellingModelId && <Chip size="xs" tone="brand">Selling model</Chip>}</li>
                ))}
              </ul>
            </Lane>
          )}
          {canEdit && (
            confirmRemove
              ? <div className="squircle flex flex-col gap-2 rounded-panel border border-danger-line bg-danger-bg p-3">
                  <Text size="body" weight="semibold" tone="danger">Remove {sc.persona.name} from this course?</Text>
                  <div className="flex gap-2"><Button size="sm" variant="danger" onClick={() => { removeScenario(sc.id); router.replace(`${base}/roleplay`); }}>Remove</Button><Button size="sm" variant="secondary" onClick={() => setConfirmRemove(false)}>Keep</Button></div>
                </div>
              : <button type="button" onClick={() => setConfirmRemove(true)} className="flex items-center gap-1.5 self-start px-1 text-caption font-semibold text-ink-3 hover:text-danger"><Trash2 className="size-3.5" aria-hidden="true" />Remove this roleplay</button>
          )}
        </aside>
      </div></div>

      {editable && (
        <CopilotOverride>
          <RoleplayChat key={sc.id} sc={sc} course={course} attached={attached} onDetach={() => setAttached(null)}
            onEdited={(keys) => {
              setFlash((f) => ({ keys, n: f.n + 1 }));
              /* Bring the changed step into view, as a canvas follows the edit. */
              if (keys[0]) window.setTimeout(() => document.querySelector(`[data-node="${keys[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
            }} onCopy={!sc.custom ? makeCopy : undefined} />
        </CopilotOverride>
      )}
    </div>
  );
}

function Stem() { return <span className="h-6 w-px shrink-0 bg-hair-3" aria-hidden="true" />; }

function Terminal({ label, done }: { label: string; done?: boolean }) {
  return (
    <span className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-bold", done ? "border-ok-line bg-ok-bg text-ok" : "border-hair-2 bg-card text-ink-3")}>
      {done ? <Flag className="size-3.5" aria-hidden="true" /> : <span className="size-1.5 rounded-full bg-ok" />}{label}
    </span>
  );
}

function CiteChip({ c }: { c?: Citation }) {
  if (!c) return null;
  return <span className="inline-flex items-center gap-1 rounded-glyph bg-info-bg px-1.5 py-0.5 text-micro font-bold text-info"><FileText className="size-3" aria-hidden="true" />{source(c.sourceId)?.title ?? "Your document"} · p.{c.page}</span>;
}

function AddPill({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="select-pop flex items-center gap-1.5 rounded-control bg-ink px-2.5 py-1.5 text-caption font-bold text-white shadow-float transition-colors hover:bg-brand">
      <MessageSquarePlus className="size-3.5" aria-hidden="true" />Add to chat
    </button>
  );
}

function Node({ id, tone, eyebrow, quote, cite, pins, selected, flash, onSelect, onAdd, canEdit }: {
  id: string; tone: "ink" | "brand"; eyebrow: string; quote: string; cite?: Citation; pins: RubricCriterion[];
  selected: boolean; flash: number; onSelect: () => void; onAdd: () => void; canEdit: boolean;
}) {
  return (
    <div data-node={id} className="relative flex w-full max-w-[540px] scroll-m-24 flex-col items-center">
      <button type="button" onClick={onSelect} key={flash} aria-pressed={selected}
        className={cn("squircle group flex w-full flex-col gap-2 rounded-panel border bg-card p-4 text-left shadow-hair transition-all hover:-translate-y-px hover:shadow-soft",
          selected ? "border-brand ring-2 ring-brand/20" : "border-hair-2", flash > 0 && "node-flash")}>
        <span className="flex items-center gap-2">
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-white", tone === "brand" ? "bg-brand" : "bg-ink")}><Mic className="size-3" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 text-caption font-bold uppercase tracking-wider text-ink-3">{eyebrow}</span>
        </span>
        <span className="text-body-lg leading-relaxed text-ink">“{quote}”</span>
        {cite && <span><CiteChip c={cite} /></span>}
        {pins.length > 0 && (
          <span className="flex flex-wrap gap-1.5 border-t border-hair pt-2">
            {pins.map((r) => <span key={r.id} className="inline-flex items-center gap-1 rounded-glyph bg-tint px-1.5 py-0.5 text-micro font-bold text-brand-deep"><Check className="size-3" aria-hidden="true" />{r.label} · {r.weight}%</span>)}
          </span>
        )}
      </button>
      {selected && canEdit && <div className="absolute -bottom-4 right-3 z-10"><AddPill onClick={onAdd} /></div>}
    </div>
  );
}

/** Where the call goes after an objection: handled, or missed. Both lines come back together. */
function Branches({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex w-full max-w-[680px] flex-col items-center">
      <Stem />
      <div className="relative grid w-full grid-cols-2 gap-4">
        <span className="absolute left-1/4 right-1/4 top-0 h-px bg-hair-3" aria-hidden="true" />
        <span className="absolute bottom-0 left-1/4 right-1/4 h-px bg-hair-3" aria-hidden="true" />
        {[left, right].map((x, i) => (
          <div key={i} className="flex min-w-0 flex-col items-center">
            <span className="h-4 w-px bg-hair-3" aria-hidden="true" />
            {x}
            <span className="h-4 w-px bg-hair-3" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Outcome({ tone, title, body, listen, answer, note }: { tone: "ok" | "warn"; title: string; body: string; listen?: string[]; answer?: string; note?: string }) {
  return (
    <div className={cn("squircle flex w-full flex-col gap-1.5 rounded-panel border p-3", tone === "ok" ? "border-ok-line bg-ok-bg/70" : "border-warn-line bg-warn-bg/70")}>
      <span className={cn("flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider", tone === "ok" ? "text-ok" : "text-warn")}>
        {tone === "ok" ? <Check className="size-3.5" aria-hidden="true" /> : <RotateCcw className="size-3.5" aria-hidden="true" />}{title}
      </span>
      <span className="text-body leading-snug text-ink-2">“{body}”</span>
      {listen && listen.length > 0 && (
        <span className="flex flex-wrap gap-1 pt-0.5">
          <span className="text-micro font-semibold text-ink-3">Listens for</span>
          {listen.slice(0, 4).map((k) => <span key={k} className="rounded-glyph bg-white/70 px-1.5 text-micro font-semibold text-ok">{k}</span>)}
        </span>
      )}
      {answer && <span className="flex items-start gap-1 text-caption text-ink-3"><CornerDownRight className="mt-0.5 size-3 shrink-0" aria-hidden="true" /><span className="line-clamp-2">Good answer: {answer}</span></span>}
      {note && <span className="text-caption text-ink-3">{note}</span>}
    </div>
  );
}

function Lane({ title, cite, children, selected, onSelect, onAdd }: { title: string; cite?: Citation; children: ReactNode; selected?: boolean; onSelect?: () => void; onAdd?: () => void }) {
  return (
    <section className={cn("squircle flex flex-col gap-3 rounded-card border bg-card p-4", selected ? "border-brand ring-2 ring-brand/20" : "border-hair")}>
      <div className="flex items-center justify-between gap-2">
        {onSelect
          ? <button type="button" onClick={onSelect} className="text-left"><Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{title}</Text></button>
          : <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{title}</Text>}
        <CiteChip c={cite} />
      </div>
      {children}
      {selected && onAdd && <div className="flex justify-end"><AddPill onClick={onAdd} /></div>}
    </section>
  );
}

function Toggle({ label, hint, on, disabled, onChange }: { label: string; hint: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} title={hint}
      className="flex items-center gap-2 disabled:opacity-60">
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-ok" : "bg-hair-3")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-hair transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
      <span className="flex flex-col text-left leading-tight"><span className="text-body font-semibold text-ink">{label}</span><span className="text-micro text-ink-3">{hint}</span></span>
    </button>
  );
}

interface Turn { id: string; from: "you" | "ai"; text: string; focus?: string; undo?: Scenario; undone?: boolean }

const PROMPTS = ["Make the doctor tougher", "Add an objection about dosing", "Make it a 4-minute call", "Never say \"works for everyone\""];

/** The agent, pointed at the roleplay: every edit lands in the call tree straight away, and can be undone. */
function RoleplayChat({ sc, course, attached, onDetach, onEdited, onCopy }: {
  sc: Scenario; course: Course; attached: CallFocus | null; onDetach: () => void; onEdited: (keys: string[]) => void; onCopy?: () => void;
}) {
  const saveScenario = useApp((s) => s.saveScenario);
  const fresh = !!sc.custom && Date.now() - new Date(sc.custom.createdAt).getTime() < 3 * 60_000;
  const docs = sc.custom?.sourceIds.length ?? 0;
  const [turns, setTurns] = useState<Turn[]>(() => [{
    id: "hello", from: "ai",
    text: !sc.custom
      ? `${sc.persona.name} comes from the product's approved roleplay package, so I can't change it. Make an editable copy and I'll reshape it however you like.`
      : fresh
        ? `I drafted ${sc.persona.name}'s call from ${docs ? `your ${docs} roleplay ${docs === 1 ? "document" : "documents"}` : "the course's files"}: ${sc.custom.objections.length} objections, a ${sc.rubric.length}-part rubric${sc.custom.sellingModelId ? " from your selling model" : ""}, and ${sc.custom.prohibited.length} never-say rules. Tell me what to change, or select a step and add it here.`
        : `Tell me how to change ${sc.persona.name}'s call. Select a step in the tree to change just that part.`,
  }]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, thinking]);
  /* Adding a step to the chat puts the cursor in the composer. */
  useEffect(() => { if (attached) document.getElementById("roleplay-chat")?.focus(); }, [attached]);
  const obs = sc.custom?.objections ?? [];
  const started = turns.some((t) => t.from === "you");

  function send(prompt: string) {
    if (!prompt.trim() || thinking) return;
    const focus = attached ?? undefined;
    setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt, focus: focus ? label(focus, sc, obs) : undefined }]);
    setText("");
    setThinking(true);
    window.setTimeout(() => {
      const current = useApp.getState().scenarios.find((x) => x.id === sc.id) ?? sc;
      const r = editCall(current, prompt, focus);
      if (r.next) {
        saveScenario(r.next, useOf(current, useApp.getState().courses.find((c) => c.id === course.id) ?? course));
        onEdited(r.changed);
      }
      setTurns((t) => [...t, { id: `a${Date.now()}`, from: "ai", text: r.reply, undo: r.next ? current : undefined }]);
      setThinking(false);
      onDetach();
    }, 700);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-hair bg-tint/60 px-4 py-2.5">
        <Mic className="size-4 text-brand-deep" aria-hidden="true" />
        <Text size="caption" weight="semibold" tone="muted" className="truncate">Editing the roleplay · {sc.persona.name}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {turns.map((t) => (
          <div key={t.id} className={cn("flex flex-col gap-1.5", t.from === "you" && "items-end")}>
            {t.focus && <span className="rounded-chip bg-tint px-2 py-0.5 text-micro font-bold text-brand-deep">{t.focus}</span>}
            <div className={cn("max-w-[92%] rounded-panel px-3.5 py-2.5 text-body leading-relaxed", t.from === "you" ? "bg-ink text-white" : "bg-subtle text-ink")}>{t.text}</div>
            {t.undo && (t.undone
              ? <Text size="caption" weight="semibold" tone="subtle">Undone</Text>
              : <button type="button" onClick={() => { saveScenario(t.undo!, useOf(t.undo!, course)); setTurns((all) => all.map((x) => (x.id === t.id ? { ...x, undone: true } : x))); onEdited([]); }}
                  className="flex items-center gap-1 text-caption font-semibold text-ink-3 hover:text-ink"><Undo2 className="size-3.5" aria-hidden="true" />Undo</button>)}
          </div>
        ))}
        {onCopy && <Button size="sm" variant="secondary" className="self-start" onClick={onCopy}>Make an editable copy</Button>}
        {!started && sc.custom && <Suggestions items={PROMPTS} onPick={send} variant="list" />}
        {thinking && <div className="flex gap-1 self-start rounded-panel bg-subtle px-3.5 py-3 text-ink-3"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
        <div ref={endRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-hair p-3">
        {started && sc.custom && <Suggestions items={PROMPTS} onPick={send} variant="row" />}
        {attached && (
          <span className="flex items-center gap-1.5 self-start rounded-chip border border-tint-line bg-tint py-1 pl-2.5 pr-1 text-caption font-semibold text-brand-deep">
            {label(attached, sc, obs)}
            <button type="button" aria-label="Remove from chat" onClick={onDetach} className="grid size-5 place-items-center rounded-full hover:bg-white/70"><X className="size-3" /></button>
          </span>
        )}
        <Composer id="roleplay-chat" value={text} onChange={setText} onSend={() => send(text)} busy={thinking || !sc.custom}
          placeholder={attached ? `Change ${label(attached, sc, obs).toLowerCase()}, e.g. put the new line in quotes` : "Tell the agent how to change the call"}
          hint="Edits apply to the call straight away. Undo any of them." />
      </div>
    </div>
  );
}
