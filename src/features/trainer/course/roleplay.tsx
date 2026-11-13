"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, FileText, Flag, Lock, Mic, MessageSquarePlus, Minus, Plus, RotateCcw, ShieldAlert, Trash2, Undo2, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios, objection, prohibited } from "@/data/scenarios";
import { source } from "@/data/org";
import type { Course, Objection, ProhibitedRule, Scenario } from "@/data/types";
import { draftScenario, editCall, withLists, type CallFocus } from "@/lib/roleplay-draft";
import { objectionsFor } from "@/features/roleplay/engine";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CopilotOverride } from "@/features/copilot/copilot-panel";
import { Composer, Suggestions } from "@/features/copilot/composer";
import { useCopilot } from "@/features/copilot/copilot-store";
import { useCourse } from "./use-course";

type Role = "screening" | "practice" | "final";
type Lens = "all" | Role;
const keyOf = (f: CallFocus) => (f.kind === "objection" ? `objection:${f.id}` : f.kind === "rule" ? `rule:${f.id}` : f.kind);
const initials = (name: string) => name.replace(/^(Dr|NP)\.?\s*/, "").split(" ").map((x) => x[0]).join("").slice(0, 2);
const DOCTORS = ["Dr. Lena Kim", "Dr. Elena Ruiz", "Dr. Marcus Hale", "NP Ana Ruiz", "Dr. Priya Raman", "Dr. Owen Brooks", "Dr. Sofia Alvarez"];

/** What this actor is used for in the course: one screening actor, one final actor, any number for practice. */
function rolesOf(sc: Scenario, c: Course) {
  return {
    screening: !!c.settings.screening && !!c.settings.screeningCall && c.settings.screeningScenarioId === sc.id,
    practice: sc.use.includes("practice"),
    final: c.settings.assessmentScenarioId === sc.id,
  };
}

/** The course's first roleplay, from its roleplay documents (or its own files when there are none). */
export function draftFor(course: Course, name?: string) {
  const ids = course.roleplaySourceIds?.length ? course.roleplaySourceIds : course.sourceIds;
  return draftScenario({ courseId: course.id, productId: course.productId, name, sources: ids.map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x) });
}

/** A shipped, approved doctor as an editable copy: its objections and rules become the course's own. */
function editableCopy(sc: Scenario): Scenario {
  const p = `sc-${Math.random().toString(36).slice(2, 7)}`;
  const obs: Objection[] = sc.objectionIds.map((id, i) => ({ ...objection(id), id: `${p}-ob${i + 1}` }));
  const prs: ProhibitedRule[] = sc.prohibitedIds.map((id, i) => ({ ...prohibited(id), id: `${p}-pr${i + 1}` }));
  return withLists({ ...sc, id: p, rubric: sc.rubric.map((r, i) => ({ ...r, id: `${p}-r${i + 1}` })), custom: { objections: obs, prohibited: prs, sourceIds: [], cites: {}, createdAt: new Date().toISOString() } });
}

function label(f: CallFocus, sc: Scenario, obs: Objection[]) {
  if (f.kind === "persona") return sc.persona.name;
  if (f.kind === "opening") return "The opening";
  if (f.kind === "close") return "The close";
  if (f.kind === "rubric") return "The scorecard";
  if (f.kind === "objection") { const i = obs.findIndex((o) => o.id === f.id); return `Objection ${i + 1} · ${obs[i]?.label ?? ""}`; }
  return `Never say · ${prohibited(f.id)?.label ?? ""}`;
}

/**
 * A roleplay actor's scenario builder. The rail lists the course's actors; this is one of them:
 * who the doctor is and what the course uses them for, then their call as a Diagram or a List.
 * Nothing is edited in place: select a step, add it to the chat, and the agent changes it.
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
  const updateSettings = useApp((s) => s.updateSettings);
  const [view, setView] = useState<"diagram" | "list">("diagram");
  const [lens, setLens] = useState<Lens>("all");
  const [selected, setSelected] = useState<CallFocus | null>(null);
  const [attached, setAttached] = useState<CallFocus | null>(null);
  const [flash, setFlash] = useState<{ keys: string[]; n: number }>({ keys: [], n: 0 });
  const [confirmRemove, setConfirmRemove] = useState(false);
  const course = data?.course;
  const scs = useMemo(() => (course ? allScenarios().filter((x) => course.scenarioIds.includes(x.id)) : []), [course, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = scs.find((x) => x.id === search.get("sc")) ?? scs[0];
  useEffect(() => { setSelected(null); setAttached(null); setConfirmRemove(false); setLens("all"); }, [sc?.id]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, []);
  /* "Add a roleplay" from the rail arrives as ?draft=1: the agent drafts it in the chat. */
  const autoDraft = search.get("draft") === "1";
  if (!data || !course) return null;
  const base = `/trainer/courses/${course.id}`;
  const editable = data.editable;

  const chat = editable && (
    <CopilotOverride>
      <RoleplayChat key={sc?.id ?? "none"} sc={sc} course={course} autoDraft={autoDraft} attached={attached} onDetach={() => setAttached(null)}
        onEdited={(keys) => {
          setFlash((f) => ({ keys, n: f.n + 1 }));
          if (keys[0]) window.setTimeout(() => document.querySelector(`[data-node="${keys[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" }), 80);
        }}
        onCopy={sc && !sc.custom ? () => makeCopy(sc) : undefined} />
    </CopilotOverride>
  );

  function makeCopy(from: Scenario) {
    const copy = editableCopy(from);
    const r = rolesOf(from, course!);
    updateCourse(course!.id, { scenarioIds: course!.scenarioIds.filter((x) => x !== from.id) });
    saveScenario(copy, { practice: r.practice, final: r.final });
    if (r.screening) updateSettings(course!.id, { screeningScenarioId: copy.id });
    router.replace(`${base}/roleplay?sc=${copy.id}`);
  }

  if (!sc)
    return (
      <>
        <div className="squircle flex flex-col items-center gap-3 rounded-card border border-dashed border-hair-3 bg-card px-6 py-14 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-tint text-brand-deep"><Mic className="size-6" aria-hidden="true" /></span>
          <Text as="h1" size="title" weight="bold">No roleplay actors yet</Text>
          <Text size="body" tone="muted" className="max-w-[440px]">Ask the agent on the right to add one, for example a screening doctor and a final-assessment doctor. It drafts each from {course.roleplaySourceIds?.length ? "your roleplay documents" : "the course's files"}.</Text>
        </div>
        {chat}
      </>
    );

  const obs: Objection[] = sc.custom ? sc.custom.objections : sc.objectionIds.map(objection);
  const rules: ProhibitedRule[] = sc.custom ? sc.custom.prohibited : sc.prohibitedIds.map(prohibited);
  const roles = rolesOf(sc, course);
  const canEdit = editable && !!sc.custom;
  const inCall = (o: Objection) => lens === "all" || (lens === "screening" ? objectionsFor(sc, "screening").includes(o.id) : lens === "practice" ? !o.finalOnly : true);
  const callsOf = (o: Objection) => [roles.screening && objectionsFor(sc, "screening").includes(o.id) && "Screening", roles.practice && !o.finalOnly && "Practice", roles.final && "Final"].filter(Boolean) as string[];
  const isSel = (f: CallFocus) => !!selected && keyOf(selected) === keyOf(f);
  const flashing = (f: CallFocus) => flash.keys.includes(keyOf(f));
  const pick = (f: CallFocus) => setSelected(isSel(f) ? null : f);
  const addToChat = (f: CallFocus) => { setAttached(f); setSelected(null); useCopilot.getState().setOpen(true); };

  function setRole(role: Role, on: boolean) {
    const r = rolesOf(sc!, course!);
    if (role === "screening") {
      const hasQuestions = course!.items.some((i) => i.pool === "screening");
      updateSettings(course!.id, on ? { screening: true, screeningCall: true, screeningScenarioId: sc!.id, baseline: true } : hasQuestions ? { screeningCall: false } : { screening: false, screeningCall: false });
    } else saveScenario(sc!, { practice: role === "practice" ? on : r.practice, final: role === "final" ? on : r.final });
  }
  const holder = (role: "screening" | "final") => scs.find((x) => x.id !== sc.id && rolesOf(x, course)[role]);

  const node = { isSel, flashing, pick, addToChat, canEdit, flashN: flash.n };

  return (
    <div className="flex flex-col gap-4">
      {/* The actor, and what the course uses them for. */}
      <section className={cn("squircle overflow-hidden rounded-card border bg-card", isSel({ kind: "persona" }) ? "border-brand ring-2 ring-brand/20" : "border-hair")}>
        <div className="flex flex-wrap items-start gap-4 p-5">
          <button type="button" onClick={() => pick({ kind: "persona" })} aria-label={`Select ${sc.persona.name}`} key={`p${flashing({ kind: "persona" }) ? flash.n : 0}`}
            className={cn("relative grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-title font-extrabold text-white shadow-brand-lift transition-transform hover:scale-105", flashing({ kind: "persona" }) && "node-flash")}>
            {initials(sc.persona.name)}
            <span className="absolute -bottom-0.5 -right-0.5 grid size-6 place-items-center rounded-full border-2 border-card bg-ink text-white"><Mic className="size-3" aria-hidden="true" /></span>
          </button>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Text as="h1" size="display" weight="extrabold" tracking="tight">{sc.persona.name}</Text>
              {!sc.custom && <Chip size="sm" iconLeft={<Lock className="size-3" aria-hidden="true" />}>Approved package</Chip>}
            </div>
            <Text size="body-lg" tone="muted">{sc.persona.specialty} · {sc.persona.setting} · about {sc.durationMin} min</Text>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {sc.persona.traits.map((t) => <Chip key={t} size="sm">{t}</Chip>)}
              {sc.custom?.sourceIds.map((sid) => <span key={sid} className="inline-flex items-center gap-1 rounded-glyph bg-info-bg px-1.5 py-0.5 text-micro font-bold text-info"><FileText className="size-3" aria-hidden="true" />{source(sid)?.title ?? "Your document"}{sid === sc.custom!.sellingModelId ? " · scoring" : ""}</span>)}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Link href={`${base}/roleplay/test?sc=${sc.id}`} className="inline-flex h-10 items-center gap-2 rounded-control bg-brand px-4 text-body-lg font-semibold text-white shadow-brand-lift transition-colors hover:bg-brand-deep">
              <Mic className="size-4" aria-hidden="true" />Test call
            </Link>
            {isSel({ kind: "persona" }) && canEdit && <AddPill onClick={() => addToChat({ kind: "persona" })} />}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-hair bg-subtle/50 px-5 py-3">
          <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">Used for</Text>
          {([
            { role: "screening" as const, label: "Screening call", hint: holder("screening") && !roles.screening ? `Now ${holder("screening")!.persona.name}` : "Short version, before the content" },
            { role: "practice" as const, label: "Practice", hint: "Reps rehearse privately" },
            { role: "final" as const, label: "Final assessment", hint: holder("final") && !roles.final ? `Now ${holder("final")!.persona.name}` : "Scored, ends the course" },
          ]).map((r) => <Toggle key={r.role} label={r.label} hint={r.hint} on={roles[r.role]} disabled={!editable} onChange={(v) => setRole(r.role, v)} />)}
          <Text size="caption" tone="subtle" className="basis-full">One actor is the screening call and one the final; switching it on here moves it from the other actor.</Text>
        </div>
      </section>

      {!sc.custom && editable && (
        <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
          <Lock className="size-4 text-ink-3" aria-hidden="true" />
          <Text size="body" tone="muted" className="min-w-0 flex-1">This doctor ships with the product&apos;s approved roleplay package, so it&apos;s read-only. Make the course its own copy to change it by chat.</Text>
          <Button size="sm" variant="secondary" onClick={() => makeCopy(sc)}>Make an editable copy</Button>
        </div>
      )}

      {/* The builder: the same call as a diagram or a list. */}
      <section aria-label="Scenario builder" className="squircle overflow-hidden rounded-card border border-hair bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-hair px-4 py-2.5">
          <Seg value={view} onChange={(v) => setView(v as "diagram" | "list")} items={[["diagram", "Diagram"], ["list", "List"]]} label="View" />
          <Seg value={lens} onChange={(v) => setLens(v as Lens)} label="Show"
            items={[["all", "All calls"], ...(roles.screening ? [["screening", "Screening"]] : []), ...(roles.practice ? [["practice", "Practice"]] : []), ...(roles.final ? [["final", "Final"]] : [])] as [string, string][]} />
          <Text size="caption" tone="subtle" className="ml-auto hidden md:block">{canEdit ? "Select a step, then add it to the chat" : "Read-only"}</Text>
        </div>
        {view === "diagram"
          ? <Diagram sc={sc} obs={obs} rules={rules} inCall={inCall} callsOf={callsOf} passMark={course.settings.passRoleplay} n={node} onClear={() => setSelected(null)} />
          : <ListView sc={sc} obs={obs} rules={rules} inCall={inCall} callsOf={callsOf} passMark={course.settings.passRoleplay} n={node} />}
      </section>

      {editable && sc.custom && (
        confirmRemove
          ? <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-danger-line bg-danger-bg p-3">
              <Text size="body" weight="semibold" tone="danger" className="flex-1">Remove {sc.persona.name} from this course?</Text>
              <Button size="sm" variant="danger" onClick={() => { removeScenario(sc.id); router.replace(`${base}/roleplay`); }}>Remove</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirmRemove(false)}>Keep</Button>
            </div>
          : <button type="button" onClick={() => setConfirmRemove(true)} className="flex items-center gap-1.5 self-start px-1 text-caption font-semibold text-ink-3 hover:text-danger"><Trash2 className="size-3.5" aria-hidden="true" />Remove this actor</button>
      )}
      {chat}
    </div>
  );
}

type NodeCtx = { isSel: (f: CallFocus) => boolean; flashing: (f: CallFocus) => boolean; pick: (f: CallFocus) => void; addToChat: (f: CallFocus) => void; canEdit: boolean; flashN: number };
type ViewProps = { sc: Scenario; obs: Objection[]; rules: ProhibitedRule[]; inCall: (o: Objection) => boolean; callsOf: (o: Objection) => string[]; passMark: number; n: NodeCtx };

function Seg({ value, onChange, items, label }: { value: string; onChange: (v: string) => void; items: [string, string][]; label: string }) {
  return (
    <span role="group" aria-label={label} className="inline-flex gap-0.5 rounded-control border border-hair-2 bg-subtle p-0.5">
      {items.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={cn("rounded-[8px] px-2.5 py-1 text-caption font-bold transition-colors", value === v ? "bg-ink text-white" : "text-ink-3 hover:text-ink")}>{l}</button>
      ))}
    </span>
  );
}

function AddPill({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="select-pop flex items-center gap-1.5 rounded-control bg-ink px-2.5 py-1.5 text-caption font-bold text-white shadow-float transition-colors hover:bg-brand">
      <MessageSquarePlus className="size-3.5" aria-hidden="true" />Add to chat
    </button>
  );
}

/* ── Diagram ─────────────────────────────────────────────────────────────── */

type Box = { id: string; x: number; y: number; w: number; h: number };
const W = 760;

/**
 * The call as the engine plays it, as a diagram: the doctor opens, raises each objection; a handled
 * answer moves on, a miss gets one pushback and a second chance, then the doctor moves on anyway.
 * Never-say rules apply at any point and end the call when critical. Then the close and the scorecard.
 */
function Diagram({ sc, obs, rules, inCall, callsOf, passMark, n, onClear }: ViewProps & { onClear: () => void }) {
  const [zoom, setZoom] = useState(1);
  const boxes: Box[] = [];
  const edges: { a: string; b: string; tone?: "ok" | "warn" | "danger" | "muted" }[] = [];
  const add = (b: Box) => { boxes.push(b); return b; };
  add({ id: "opening", x: 120, y: 24, w: 300, h: 96 });
  add({ id: "guard", x: 480, y: 24, w: 256, h: 64 + rules.length * 34 });
  add({ id: "fail", x: 520, y: 24 + 64 + rules.length * 34 + 40, w: 176, h: 58 });
  edges.push({ a: "opening", b: "guard", tone: "danger" }, { a: "guard", b: "fail", tone: "danger" });
  let y = 170;
  let prev: string[] = ["opening"];
  obs.forEach((o) => {
    const k = `objection:${o.id}`;
    add({ id: k, x: 120, y, w: 300, h: 118 });
    add({ id: `${k}:hd`, x: 30, y: y + 168, w: 230, h: 104 });
    add({ id: `${k}:ms`, x: 290, y: y + 168, w: 230, h: 104 });
    add({ id: `${k}:rt`, x: 230, y: y + 318, w: 150, h: 56 });
    add({ id: `${k}:mv`, x: 400, y: y + 318, w: 150, h: 56 });
    prev.forEach((p) => edges.push({ a: p, b: k }));
    edges.push({ a: k, b: `${k}:hd`, tone: "ok" }, { a: k, b: `${k}:ms`, tone: "warn" }, { a: `${k}:ms`, b: `${k}:rt`, tone: "ok" }, { a: `${k}:ms`, b: `${k}:mv`, tone: "muted" });
    prev = [`${k}:hd`, `${k}:rt`, `${k}:mv`];
    y += 430;
  });
  add({ id: "close", x: 120, y, w: 300, h: 96 });
  prev.forEach((p) => edges.push({ a: p, b: "close" }));
  add({ id: "score", x: 120, y: y + 146, w: 300, h: 70 + sc.rubric.length * 26 });
  edges.push({ a: "close", b: "score" });
  const H = y + 146 + 70 + sc.rubric.length * 26 + 30;
  const at = Object.fromEntries(boxes.map((b) => [b.id, b]));
  const dimOf = (id: string) => { const m = id.match(/^objection:([^:]+)/); const o = m && obs.find((x) => x.id === m[1]); return !!o && !inCall(o); };
  const path = (a: Box, b: Box) => {
    if (b.y >= a.y + a.h - 4) {
      const x1 = a.x + a.w / 2, y1 = a.y + a.h, x2 = b.x + b.w / 2, y2 = b.y, m = (y1 + y2) / 2;
      return `M${x1} ${y1} C ${x1} ${m}, ${x2} ${m}, ${x2} ${y2}`;
    }
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, x2 = b.x, y2 = b.y + Math.min(b.h / 2, 30), m = (x1 + x2) / 2;
    return `M${x1} ${y1} C ${m} ${y1}, ${m} ${y2}, ${x2} ${y2}`;
  };
  const stroke = { ok: "var(--color-ok)", warn: "var(--color-warn)", danger: "var(--color-danger)", muted: "var(--color-ink-4)" } as const;

  const place = (b: Box, child: ReactNode) => (
    <div key={b.id} data-node={b.id.replace(/:(hd|ms|rt|mv)$/, "")} className={cn("absolute transition-opacity", dimOf(b.id) && "opacity-25")} style={{ left: b.x, top: b.y, width: b.w, minHeight: b.h }}>{child}</div>
  );
  const focusOf = (id: string): CallFocus => (id.startsWith("objection:") ? { kind: "objection", id: id.split(":")[1] } : id === "guard" ? { kind: "rule", id: rules[0]?.id ?? "" } : id === "score" ? { kind: "rubric" } : (id as "opening") === "opening" ? { kind: "opening" } : { kind: "close" });

  return (
    <div className="relative">
      <div className="absolute bottom-3 right-5 z-10 flex items-center gap-1 rounded-control border border-hair bg-card p-1 shadow-float">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom(Math.max(0.5, +(zoom - 0.1).toFixed(2)))} className="grid size-7 place-items-center rounded-[6px] text-ink-3 hover:bg-subtle"><Minus className="size-3.5" /></button>
        <button type="button" onClick={() => setZoom(1)} className="min-w-11 rounded-[6px] px-1 text-caption font-bold tabular-nums text-ink-2 hover:bg-subtle">{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom(Math.min(1.4, +(zoom + 0.1).toFixed(2)))} className="grid size-7 place-items-center rounded-[6px] text-ink-3 hover:bg-subtle"><Plus className="size-3.5" /></button>
      </div>
      <div className="max-h-[calc(100dvh-260px)] min-h-[480px] overflow-auto" onClick={(e) => { if (e.target === e.currentTarget) onClear(); }}
        style={{ backgroundImage: "radial-gradient(var(--color-hair-2) 1px, transparent 1px)", backgroundSize: "18px 18px" }}>
        <div style={{ width: W * zoom, height: H * zoom }}>
          <div className="relative origin-top-left" style={{ width: W, height: H, transform: `scale(${zoom})` }} onClick={(e) => { if (e.target === e.currentTarget) onClear(); }}>
            <svg className="pointer-events-none absolute inset-0" width={W} height={H} aria-hidden="true">
              {edges.map((e, i) => {
                const a = at[e.a], b = at[e.b];
                const dim = dimOf(e.a) || dimOf(e.b);
                return <path key={i} d={path(a, b)} fill="none" stroke={stroke[e.tone ?? "muted"]} strokeOpacity={dim ? 0.15 : e.tone && e.tone !== "muted" ? 0.75 : 0.5} strokeWidth={1.6} strokeDasharray={e.tone === "danger" ? "5 4" : undefined} />;
              })}
            </svg>
            {place(at.opening, <DNode n={n} f={{ kind: "opening" }} tone="ink" eyebrow="Doctor opens" body={`“${sc.persona.opening}”`} tag="All calls" />)}
            {place(at.guard, (
              <div className="squircle flex flex-col gap-1.5 rounded-panel border-2 border-dashed border-danger-line bg-danger-bg/60 p-3">
                <span className="text-micro font-bold uppercase tracking-wider text-danger">At any point · never say</span>
                {rules.map((r) => {
                  const f: CallFocus = { kind: "rule", id: r.id };
                  return (
                    <div key={r.id} className="relative">
                      <button type="button" onClick={() => n.pick(f)} key={`${r.id}${n.flashing(f) ? n.flashN : ""}`}
                        className={cn("flex w-full items-center gap-2 rounded-control bg-card px-2 py-1.5 text-left text-caption font-semibold text-ink shadow-hair", n.isSel(f) && "ring-2 ring-brand", n.flashing(f) && "node-flash")}>
                        <ShieldAlert className={cn("size-3.5 shrink-0", r.critical ? "text-danger" : "text-warn")} aria-hidden="true" /><span className="min-w-0 flex-1 truncate">{r.label}</span><span className="text-micro text-ink-3">{r.critical ? "fails" : "flags"}</span>
                      </button>
                      {n.isSel(f) && n.canEdit && <div className="absolute -right-2 top-full z-10 mt-1"><AddPill onClick={() => n.addToChat(f)} /></div>}
                    </div>
                  );
                })}
              </div>
            ))}
            {place(at.fail, <div className="squircle flex flex-col gap-0.5 rounded-panel border border-danger-line bg-danger-bg p-2.5"><span className="flex items-center gap-1.5 text-caption font-bold text-danger"><Flag className="size-3.5" aria-hidden="true" />Call ends</span><span className="text-micro text-ink-3">Critical flag · fails the assessment</span></div>)}
            {obs.map((o, i) => {
              const k = `objection:${o.id}`;
              const f: CallFocus = { kind: "objection", id: o.id };
              const calls = callsOf(o);
              return [
                place(at[k], <DNode n={n} f={f} tone="brand" eyebrow={`Objection ${i + 1} · ${o.label}`} body={`“${o.line}”`} tag={o.finalOnly ? "Final only" : calls.join(" · ") || "Not in use"} dark={o.finalOnly} />),
                place(at[`${k}:hd`], <Outcome n={n} f={f} tone="ok" title="Rep handles it" body={o.handled} foot={o.keywords.slice(0, 3).join(" · ")} />),
                place(at[`${k}:ms`], <Outcome n={n} f={f} tone="warn" title="Rep misses it" body={o.pushback} foot="One pushback, a second chance" />),
                place(at[`${k}:rt`], <Mini tone="ok" text="Handles it now" />),
                place(at[`${k}:mv`], <Mini tone="muted" text="Misses again · moves on" />),
              ];
            })}
            {place(at.close, <DNode n={n} f={{ kind: "close" }} tone="ink" eyebrow="Doctor closes" body={`“${sc.persona.closing}”`} tag="All calls" />)}
            {place(at.score, (
              <button type="button" onClick={() => n.pick({ kind: "rubric" })} className={cn("squircle flex w-full flex-col gap-1.5 rounded-panel border bg-ok-bg/60 p-3 text-left", n.isSel({ kind: "rubric" }) ? "border-brand ring-2 ring-brand/20" : "border-ok-line")}>
                <span className="flex items-center justify-between text-micro font-bold uppercase tracking-wider text-ok"><span className="flex items-center gap-1"><Flag className="size-3" aria-hidden="true" />Scorecard</span><span>Pass {passMark}</span></span>
                {sc.rubric.map((r) => <span key={r.id} className="flex items-center justify-between gap-2 text-caption"><span className="truncate text-ink-2">{r.label}</span><b className="tabular-nums text-ink">{r.weight}%</b></span>)}
                {n.isSel({ kind: "rubric" }) && n.canEdit && <span className="self-end"><AddPill onClick={() => n.addToChat({ kind: "rubric" })} /></span>}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DNode({ n, f, tone, eyebrow, body, tag, dark }: { n: NodeCtx; f: CallFocus; tone: "ink" | "brand"; eyebrow: string; body: string; tag?: string; dark?: boolean }) {
  const sel = n.isSel(f);
  return (
    <div className="relative">
      <button type="button" onClick={() => n.pick(f)} aria-pressed={sel} key={n.flashing(f) ? n.flashN : 0}
        className={cn("squircle flex w-full flex-col gap-1.5 rounded-panel border bg-card p-3 text-left shadow-hair transition-all hover:shadow-soft", sel ? "border-brand ring-2 ring-brand/20" : "border-hair-2", n.flashing(f) && "node-flash")}>
        <span className="flex items-center gap-1.5">
          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-white", tone === "brand" ? "bg-brand" : "bg-ink")}><Mic className="size-2.5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 truncate text-micro font-bold uppercase tracking-wider text-ink-3">{eyebrow}</span>
          {tag && <span className={cn("shrink-0 rounded-glyph px-1.5 py-0.5 text-[10px] font-bold", dark ? "bg-ink text-white" : "bg-subtle text-ink-3")}>{tag}</span>}
        </span>
        <span className="line-clamp-3 text-body leading-snug text-ink">{body}</span>
      </button>
      {sel && n.canEdit && <div className="absolute -bottom-4 right-2 z-10"><AddPill onClick={() => n.addToChat(f)} /></div>}
    </div>
  );
}

function Outcome({ n, f, tone, title, body, foot }: { n: NodeCtx; f: CallFocus; tone: "ok" | "warn"; title: string; body: string; foot?: string }) {
  return (
    <button type="button" onClick={() => n.pick(f)} className={cn("squircle flex w-full flex-col gap-1 rounded-panel border p-2.5 text-left transition-shadow hover:shadow-hair", tone === "ok" ? "border-ok-line bg-ok-bg/80" : "border-warn-line bg-warn-bg/80", n.isSel(f) && "ring-2 ring-brand/30")}>
      <span className={cn("flex items-center gap-1 text-micro font-bold uppercase tracking-wider", tone === "ok" ? "text-ok" : "text-warn")}>{tone === "ok" ? <Check className="size-3" aria-hidden="true" /> : <RotateCcw className="size-3" aria-hidden="true" />}{title}</span>
      <span className="line-clamp-2 text-caption leading-snug text-ink-2">“{body}”</span>
      {foot && <span className="truncate text-micro text-ink-3">{tone === "ok" ? `Listens for: ${foot}` : foot}</span>}
    </button>
  );
}

function Mini({ tone, text }: { tone: "ok" | "muted"; text: string }) {
  return <span className={cn("grid h-full place-items-center rounded-panel border px-2 text-center text-micro font-bold", tone === "ok" ? "border-ok-line bg-card text-ok" : "border-hair-2 bg-card text-ink-3")}>{text}</span>;
}

/* ── List ────────────────────────────────────────────────────────────────── */

/** The same call in playback order: each step, with what it leads to indented underneath. */
function ListView({ sc, obs, rules, inCall, callsOf, passMark, n }: ViewProps) {
  const Row = ({ f, num, title, body, tag, dark, dim, children }: { f: CallFocus; num: ReactNode; title: string; body?: string; tag?: string; dark?: boolean; dim?: boolean; children?: ReactNode }) => {
    const sel = n.isSel(f);
    return (
      <li data-node={keyOf(f)} className={cn("border-b border-hair transition-opacity last:border-0", dim && "opacity-30")}>
        <div className={cn("flex items-start gap-3 px-4 py-3", sel && "bg-tint")} key={n.flashing(f) ? n.flashN : 0}>
          <button type="button" onClick={() => n.pick(f)} className={cn("flex min-w-0 flex-1 items-start gap-3 text-left", n.flashing(f) && "node-flash rounded-control")}>
            <span className="grid size-7 shrink-0 place-items-center rounded-glyph bg-subtle text-caption font-bold text-ink-3">{num}</span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-2"><span className="text-body-lg font-semibold text-ink">{title}</span>{tag && <span className={cn("rounded-glyph px-1.5 py-0.5 text-[10px] font-bold", dark ? "bg-ink text-white" : "bg-subtle text-ink-3")}>{tag}</span>}</span>
              {body && <span className="text-body text-ink-2">{body}</span>}
            </span>
          </button>
          {sel && n.canEdit && <AddPill onClick={() => n.addToChat(f)} />}
        </div>
        {children && <div className="flex flex-col gap-1.5 pb-3 pl-14 pr-4">{children}</div>}
      </li>
    );
  };
  const Child = ({ tone, title, text }: { tone: "ok" | "warn" | "muted" | "danger"; title: string; text: string }) => (
    <div className={cn("flex items-start gap-2 rounded-control px-2.5 py-1.5 text-caption", tone === "ok" ? "bg-ok-bg/70" : tone === "warn" ? "bg-warn-bg/70" : tone === "danger" ? "bg-danger-bg/70" : "bg-subtle")}>
      <b className={cn("shrink-0", tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "danger" ? "text-danger" : "text-ink-3")}>↳ {title}</b><span className="text-ink-2">{text}</span>
    </div>
  );
  let step = 1;
  return (
    <ol className="flex flex-col">
      <Row f={{ kind: "opening" }} num={step++} title="Doctor opens" body={`“${sc.persona.opening}”`} tag="All calls" />
      <Row f={{ kind: "rule", id: rules[0]?.id ?? "" }} num={<ShieldAlert className="size-3.5 text-danger" />} title="At any point · never say" tag={`${rules.length} rules`}>
        {rules.map((r) => <Child key={r.id} tone={r.critical ? "danger" : "warn"} title={r.critical ? "Call fails" : "Flagged"} text={`${r.label}: ${r.explanation}`} />)}
      </Row>
      {obs.map((o, i) => (
        <Row key={o.id} f={{ kind: "objection", id: o.id }} num={step++} title={`Objection ${i + 1} · ${o.label}`} body={`“${o.line}”`} tag={o.finalOnly ? "Final only" : callsOf(o).join(" · ") || "Not in use"} dark={o.finalOnly} dim={!inCall(o)}>
          <Child tone="ok" title="Handled" text={`“${o.handled}” · listens for ${o.keywords.slice(0, 3).join(", ")}`} />
          <Child tone="warn" title="Missed" text={`“${o.pushback}”`} />
          <Child tone="muted" title="Then" text="Handled on the second try, or the doctor moves on" />
          {o.answer && <Child tone="ok" title="Good answer" text={o.answer} />}
        </Row>
      ))}
      <Row f={{ kind: "close" }} num={step++} title="Doctor closes" body={`“${sc.persona.closing}”`} tag="All calls" />
      <Row f={{ kind: "rubric" }} num={<Flag className="size-3.5 text-ok" />} title={`Scorecard · pass ${passMark}`}>
        {sc.rubric.map((r) => <Child key={r.id} tone="muted" title={`${r.weight}%`} text={r.label} />)}
      </Row>
    </ol>
  );
}

function Toggle({ label, hint, on, disabled, onChange }: { label: string; hint: string; on: boolean; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => onChange(!on)} title={hint} className="flex items-center gap-2 disabled:opacity-60">
      <span className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors", on ? "bg-ok" : "bg-hair-3")}>
        <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-hair transition-all", on ? "left-[18px]" : "left-0.5")} />
      </span>
      <span className="flex flex-col text-left leading-tight"><span className="text-body font-semibold text-ink">{label}</span><span className="text-micro text-ink-3">{hint}</span></span>
    </button>
  );
}

/* ── Chat ────────────────────────────────────────────────────────────────── */

interface Turn { id: string; from: "you" | "ai"; text: string; focus?: string; undo?: Scenario; undone?: boolean; steps?: string[]; at?: number; opens?: string }

const PROMPTS = ["Make the doctor tougher", "Add an objection about dosing", "Hold back objection 2 for the final call", "Add a screening doctor"];
const ADD_ACTOR = /\b(add|create|new|another)\b.*\b(roleplay|actor|doctor|scenario|np|nurse)\b/;

/**
 * The agent, pointed at the course's roleplays. It edits the selected actor's call, and adds new actors:
 * it drafts them step by step, the rail shows a placeholder, and the new actor opens when it's ready.
 */
function RoleplayChat({ sc, course, autoDraft, attached, onDetach, onEdited, onCopy }: {
  sc?: Scenario; course: Course; autoDraft: boolean; attached: CallFocus | null; onDetach: () => void; onEdited: (keys: string[]) => void; onCopy?: () => void;
}) {
  const router = useRouter();
  const saveScenario = useApp((s) => s.saveScenario);
  const updateSettings = useApp((s) => s.updateSettings);
  const setDrafting = useCopilot((s) => s.setDrafting);
  const fresh = !!sc?.custom && Date.now() - new Date(sc.custom.createdAt).getTime() < 3 * 60_000;
  const docs = sc?.custom?.sourceIds.length ?? 0;
  const [turns, setTurns] = useState<Turn[]>(() => [{
    id: "hello", from: "ai",
    text: !sc ? "This course has no roleplay actors yet. Tell me who to add, e.g. \"add a screening doctor\" or \"add a final-assessment doctor\"."
      : !sc.custom ? `${sc.persona.name} comes from the product's approved roleplay package, so I can't change it. Make an editable copy and I'll reshape it however you like.`
      : fresh ? `I drafted ${sc.persona.name}'s call from ${docs ? `your ${docs} roleplay ${docs === 1 ? "document" : "documents"}` : "the course's files"}: ${sc.custom.objections.length} objections, a ${sc.rubric.length}-part rubric${sc.custom.sellingModelId ? " from your selling model" : ""}, and ${sc.custom.prohibited.length} never-say rules. Tell me what to change, or select a step and add it here.`
      : `Tell me how to change ${sc.persona.name}'s call. Select a step in the diagram or list to change just that part.`,
  }]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, thinking]);
  useEffect(() => { if (attached) document.getElementById("roleplay-chat")?.focus(); }, [attached]);
  const started = useRef(false);
  useEffect(() => { if (autoDraft && !started.current) { started.current = true; send("Add a roleplay actor"); } }); // eslint-disable-line react-hooks/exhaustive-deps
  const obs = sc?.custom?.objections ?? [];

  /** A new actor: drafted in steps the trainer can watch, then opened. */
  function addActor(prompt: string) {
    const l = prompt.toLowerCase();
    const role: Role = /screen/.test(l) ? "screening" : /final|assess/.test(l) ? "final" : "practice";
    const used = new Set(allScenarios().filter((x) => course.scenarioIds.includes(x.id)).map((x) => x.persona.name));
    const name = (/\bnp\b|nurse/.test(l) ? DOCTORS.filter((d) => d.startsWith("NP")) : DOCTORS.filter((d) => d.startsWith("Dr"))).find((d) => !used.has(d)) ?? DOCTORS.find((d) => !used.has(d)) ?? "Dr. Sam Rivera";
    const docs = (course.roleplaySourceIds?.length ? course.roleplaySourceIds : course.sourceIds).map((x) => source(x)?.title).filter(Boolean);
    const steps = [`Reading ${docs[0] ?? "your documents"}${docs.length > 1 ? ` and ${docs.length - 1} more` : ""}`, `Drafting ${name}: who they are and how they talk`, "Laying out the call: opening, 3 objections, close", "Scoring it and setting the never-say rules"];
    const id = `a${Date.now()}`;
    setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt }, { id, from: "ai", text: "", steps, at: 0 }]);
    setText("");
    setDrafting(name);
    let at = 0;
    const tick = () => {
      at++;
      if (at < steps.length) { setTurns((t) => t.map((x) => (x.id === id ? { ...x, at } : x))); window.setTimeout(tick, 700); return; }
      const d = draftFor(useApp.getState().courses.find((c) => c.id === course.id) ?? course, name);
      saveScenario(d, { practice: role !== "screening", final: role === "final" });
      if (role === "screening") updateSettings(course.id, { screening: true, screeningCall: true, screeningScenarioId: d.id, baseline: true });
      setDrafting(null);
      const what = role === "screening" ? "the screening call" : role === "final" ? "the final assessment, plus practice" : "practice";
      setTurns((t) => t.map((x) => (x.id === id ? { ...x, steps: undefined, text: `Added ${name}, used for ${what}. Their call is open now: 3 objections, the same scorecard, and the course's never-say rules. Tell me what to change.`, opens: d.id } : x)));
      router.push(`/trainer/courses/${course.id}/roleplay?sc=${d.id}`);
    };
    window.setTimeout(tick, 700);
  }

  function send(prompt: string) {
    if (!prompt.trim() || thinking) return;
    if (ADD_ACTOR.test(prompt.toLowerCase()) && !/objection|branch|line/.test(prompt.toLowerCase())) { addActor(prompt); return; }
    if (!sc) { setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt }, { id: `a${Date.now()}`, from: "ai", text: "Add an actor first, e.g. \"add a screening doctor\"." }]); setText(""); return; }
    const focus = attached ?? undefined;
    setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt, focus: focus ? label(focus, sc, obs) : undefined }]);
    setText("");
    setThinking(true);
    window.setTimeout(() => {
      const current = useApp.getState().scenarios.find((x) => x.id === sc.id) ?? sc;
      const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course;
      const r = editCall(current, prompt, focus);
      if (r.next) {
        const roles = rolesOf(current, c);
        saveScenario(r.next, { practice: roles.practice, final: roles.final });
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
        <Text size="caption" weight="semibold" tone="muted" className="truncate">{sc ? `Editing the roleplay · ${sc.persona.name}` : "AI roleplay"}</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {turns.map((t) => (
          <div key={t.id} className={cn("flex flex-col gap-1.5", t.from === "you" && "items-end")}>
            {t.focus && <span className="rounded-chip bg-tint px-2 py-0.5 text-micro font-bold text-brand-deep">{t.focus}</span>}
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
            {t.undo && (t.undone
              ? <Text size="caption" weight="semibold" tone="subtle">Undone</Text>
              : <button type="button" onClick={() => { const c = useApp.getState().courses.find((x) => x.id === course.id) ?? course; const r = rolesOf(t.undo!, c); saveScenario(t.undo!, { practice: r.practice, final: r.final }); setTurns((all) => all.map((x) => (x.id === t.id ? { ...x, undone: true } : x))); onEdited([]); }}
                  className="flex items-center gap-1 text-caption font-semibold text-ink-3 hover:text-ink"><Undo2 className="size-3.5" aria-hidden="true" />Undo</button>)}
          </div>
        ))}
        {onCopy && <Button size="sm" variant="secondary" className="self-start" onClick={onCopy}>Make an editable copy</Button>}
        {turns.length === 1 && <Suggestions items={sc?.custom ? PROMPTS : ["Add a screening doctor", "Add a final-assessment doctor"]} onPick={send} variant="list" />}
        {thinking && <div className="flex gap-1 self-start rounded-panel bg-subtle px-3.5 py-3 text-ink-3"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
        <div ref={endRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-hair p-3">
        {turns.length > 1 && sc?.custom && <Suggestions items={PROMPTS} onPick={send} variant="row" />}
        {attached && sc && (
          <span className="flex items-center gap-1.5 self-start rounded-chip border border-tint-line bg-tint py-1 pl-2.5 pr-1 text-caption font-semibold text-brand-deep">
            {label(attached, sc, obs)}
            <button type="button" aria-label="Remove from chat" onClick={onDetach} className="grid size-5 place-items-center rounded-full hover:bg-white/70"><X className="size-3" /></button>
          </span>
        )}
        <Composer id="roleplay-chat" value={text} onChange={setText} onSend={() => send(text)} busy={thinking || (!!sc && !sc.custom)}
          placeholder={attached && sc ? `Change ${label(attached, sc, obs).toLowerCase()}, e.g. put the new line in quotes` : "Tell the agent what to change, or who to add"}
          hint="Every change goes through the agent and can be undone." />
      </div>
    </div>
  );
}

