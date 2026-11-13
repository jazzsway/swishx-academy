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
import { configOf, draftScenario, editCall, withLists, type CallFocus } from "@/lib/roleplay-draft";
import { objectionsFor } from "@/features/roleplay/engine";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CopilotOverride } from "@/features/copilot/copilot-panel";
import { Composer, Suggestions } from "@/features/copilot/composer";
import { useCopilot } from "@/features/copilot/copilot-store";
import { useCourse } from "./use-course";
import { SourcePreview } from "../source-preview";

type Role = "screening" | "final";
const keyOf = (f: CallFocus) => (f.kind === "objection" ? `objection:${f.id}` : f.kind === "rule" ? `rule:${f.id}` : f.kind === "config" ? "config" : f.kind);
const PART_LABEL = { knows: "What she knows", behaves: "How she behaves", settings: "Call settings" } as const;
const initials = (name: string) => name.replace(/^(Dr|NP)\.?\s*/, "").split(" ").map((x) => x[0]).join("").slice(0, 2);
const DOCTORS = ["Dr. Lena Kim", "Dr. Elena Ruiz", "Dr. Marcus Hale", "NP Ana Ruiz", "Dr. Priya Raman", "Dr. Owen Brooks", "Dr. Sofia Alvarez"];

/**
 * Each actor is one of two types: the screening call, or the final assessment. Reps practise the
 * final-assessment call (without the objections held back for the final), so practice isn't a type.
 */
function rolesOf(sc: Scenario, c: Course) {
  const final = c.settings.assessmentScenarioId === sc.id;
  return {
    screening: !final && !!c.settings.screening && !!c.settings.screeningCall && c.settings.screeningScenarioId === sc.id,
    final,
    practice: final && sc.use.includes("practice"),
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
  if (f.kind === "config") return f.part === "brief" ? "Call settings" : PART_LABEL[f.part];
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
  const [view, setView] = useState<"diagram" | "list">("list");
  const [selected, setSelected] = useState<CallFocus | null>(null);
  const [attached, setAttached] = useState<CallFocus | null>(null);
  const [flash, setFlash] = useState<{ keys: string[]; n: number }>({ keys: [], n: 0 });
  const [confirmRemove, setConfirmRemove] = useState(false);
  /* A document opened from the doctor's tile. */
  const [preview, setPreview] = useState<string | null>(null);
  const course = data?.course;
  const scs = useMemo(() => (course ? allScenarios().filter((x) => course.scenarioIds.includes(x.id)) : []), [course, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const sc = scs.find((x) => x.id === search.get("sc")) ?? scs[0];
  useEffect(() => { setSelected(null); setAttached(null); setConfirmRemove(false); }, [sc?.id]);
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
  const inCall = () => true;
  /* What each objection is in: a screening actor's are all in screening; a final actor's are in practice too, unless held back. */
  const callsOf = (o: Objection) => roles.screening ? ["Screening"] : roles.final ? (o.finalOnly ? ["Final only · not in practice"] : ["Final", "Practice"]) : [];
  const isSel = (f: CallFocus) => !!selected && keyOf(selected) === keyOf(f);
  const flashing = (f: CallFocus) => flash.keys.includes(keyOf(f));
  const pick = (f: CallFocus) => setSelected(isSel(f) ? null : f);
  const addToChat = (f: CallFocus) => { setAttached(f); setSelected(null); useCopilot.getState().setOpen(true); };

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
              {roles.final && <span className="rounded-chip bg-brand px-2.5 py-1 text-caption font-bold text-white">Final assessment</span>}
              {roles.final && roles.practice && <span className="rounded-chip bg-tint px-2.5 py-1 text-caption font-bold text-brand-deep">Reps can practise it</span>}
              {roles.screening && <span className="rounded-chip bg-info-bg px-2.5 py-1 text-caption font-bold text-info">Screening call · not graded</span>}
              {!sc.custom && <Chip size="sm" iconLeft={<Lock className="size-3" aria-hidden="true" />}>Approved package</Chip>}
            </div>
            <Text size="body-lg" tone="muted">{sc.persona.specialty} · {sc.persona.setting} · about {sc.durationMin} min</Text>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {sc.persona.traits.map((t) => <Chip key={t} size="sm">{t}</Chip>)}
              {sc.custom?.sourceIds.map((sid) => <button key={sid} type="button" onClick={() => setPreview(sid)} title="Preview" className="inline-flex items-center gap-1 rounded-glyph bg-info-bg px-1.5 py-0.5 text-micro font-bold text-info transition-colors hover:bg-info hover:text-white"><FileText className="size-3" aria-hidden="true" />{source(sid)?.title ?? "Your document"}{sid === sc.custom!.sellingModelId ? " · scoring" : ""}</button>)}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Link href={`${base}/roleplay/test?sc=${sc.id}`} data-anchor="test" className="inline-flex h-10 items-center gap-2 rounded-control bg-brand px-4 text-body-lg font-semibold text-white shadow-brand-lift transition-colors hover:bg-brand-deep">
              <Mic className="size-4" aria-hidden="true" />Test call
            </Link>
            {isSel({ kind: "persona" }) && canEdit && <AddPill onClick={() => addToChat({ kind: "persona" })} />}
          </div>
        </div>
        <HowItWorks sc={sc} course={course} roles={roles} canEdit={canEdit} flash={flashing({ kind: "config", part: "knows" }) ? flash.n : 0} onChat={(part) => addToChat({ kind: "config", part })} onPreview={setPreview} />
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
        <div className="flex flex-wrap items-end gap-3 border-b border-hair px-5 py-4">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Text size="micro" weight="bold" tone="brand-deep" uppercase tracking="wider">Scenario</Text>
            <Text as="h2" size="title" weight="bold">The call, step by step</Text>
            <Text size="caption" tone="subtle">
              {obs.filter((o) => !o.moment).length} objections · {obs.filter((o) => o.moment).length} moments to handle · about {sc.durationMin} min · {canEdit ? "select a step to change it in the chat" : "read-only"}
            </Text>
          </div>
          <Seg value={view} onChange={(v) => setView(v as "diagram" | "list")} items={[["list", "List"], ["diagram", "Diagram"]]} label="View" />
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
      {preview && source(preview) && <SourcePreview s={source(preview)!} onClose={() => setPreview(null)} />}
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

/** A held-back objection is only marked dark on the final actor, where it matters. */
const roles_final = (calls: string[]) => calls.some((c) => c.startsWith("Final only"));

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
            {place(at.opening, <DNode n={n} f={{ kind: "opening" }} tone="ink" eyebrow="Doctor opens" body={`“${sc.persona.opening}”`} />)}
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
              const num = obs.slice(0, i + 1).filter((x) => !x.moment).length;
              return [
                place(at[k], <DNode n={n} f={f} tone={o.moment ? "moment" : "brand"} eyebrow={o.moment ? `Moment · ${o.label}` : `Objection ${num} · ${o.label}`} body={`“${o.line}”`} tag={o.moment ? "Must handle" : calls.join(" · ") || "Not in use"} dark={o.finalOnly && roles_final(calls)} />),
                place(at[`${k}:hd`], <Outcome n={n} f={f} tone="ok" title={o.moment === "ae" ? "Rep reports it" : o.moment === "offlabel" ? "Rep refers it to Medical Information" : "Rep handles it"} body={o.handled} foot={o.keywords.slice(0, 3).join(" · ")} />),
                place(at[`${k}:ms`], <Outcome n={n} f={f} tone="warn" title="Rep misses it" body={o.pushback} foot={o.moment ? "One more chance" : "One pushback, a second chance"} />),
                place(at[`${k}:rt`], <Mini tone="ok" text={o.moment ? "Handles it now" : "Handles it now"} />),
                place(at[`${k}:mv`], <Mini tone={o.moment ? "danger" : "muted"} text={o.moment ? "Critical flag · fails" : "Misses again · moves on"} />),
              ];
            })}
            {place(at.close, <DNode n={n} f={{ kind: "close" }} tone="ink" eyebrow="Doctor closes" body={`“${sc.persona.closing}”`} />)}
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

function DNode({ n, f, tone, eyebrow, body, tag, dark }: { n: NodeCtx; f: CallFocus; tone: "ink" | "brand" | "moment"; eyebrow: string; body: string; tag?: string; dark?: boolean }) {
  const sel = n.isSel(f);
  return (
    <div className="relative">
      <button type="button" onClick={() => n.pick(f)} aria-pressed={sel} key={n.flashing(f) ? n.flashN : 0}
        className={cn("squircle flex w-full flex-col gap-1.5 rounded-panel border p-3 text-left shadow-hair transition-all hover:shadow-soft", tone === "moment" ? "bg-warn-bg/60" : "bg-card", sel ? "border-brand ring-2 ring-brand/20" : tone === "moment" ? "border-warn-line" : "border-hair-2", n.flashing(f) && "node-flash")}>
        <span className="flex items-center gap-1.5">
          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-white", tone === "brand" ? "bg-brand" : tone === "moment" ? "bg-warn" : "bg-ink")}>{tone === "moment" ? <ShieldAlert className="size-2.5" aria-hidden="true" /> : <Mic className="size-2.5" aria-hidden="true" />}</span>
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

function Mini({ tone, text }: { tone: "ok" | "muted" | "danger"; text: string }) {
  return <span className={cn("grid h-full place-items-center rounded-panel border px-2 text-center text-micro font-bold", tone === "ok" ? "border-ok-line bg-card text-ok" : tone === "danger" ? "border-danger-line bg-danger-bg text-danger" : "border-hair-2 bg-card text-ink-3")}>{text}</span>;
}

/* ── List ────────────────────────────────────────────────────────────────── */

/**
 * The call as a script, stage by stage: how she opens, what she raises (and what happens when the rep
 * handles or misses each), how she closes, what's never allowed, and what it's scored on.
 */
function ListView({ sc, obs, rules, inCall, callsOf, passMark, n }: ViewProps) {
  const cfg = configOf(sc);
  const she = cfg.voice.gender === "male" ? "He" : "She";
  const regular = obs.filter((o) => !o.moment);
  const variety = cfg.variety.pick ? `${she} raises ${cfg.variety.pick} of the ${regular.length} objections${cfg.variety.shuffle ? ", in a random order" : ""}; moments always come up.` : cfg.variety.shuffle ? `In a random order; moments always come up.` : "In this order.";
  const Stage = ({ num, title, note, children }: { num: ReactNode; title: string; note?: string; children: ReactNode }) => (
    <section className="border-b border-hair last:border-0">
      <div className="flex items-center gap-2.5 bg-subtle/60 px-5 py-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink text-micro font-bold text-white">{num}</span>
        <Text size="body" weight="bold">{title}</Text>
        {note && <Text size="caption" tone="subtle" className="truncate">· {note}</Text>}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
  const Pick = ({ f, children, dim, className }: { f: CallFocus; children: ReactNode; dim?: boolean; className?: string }) => {
    const sel = n.isSel(f);
    return (
      <div data-node={keyOf(f)} key={n.flashing(f) ? n.flashN : 0} className={cn("group relative border-t border-hair first:border-0 transition-opacity", dim && "opacity-30", sel && "bg-tint", n.flashing(f) && "node-flash")}>
        <button type="button" onClick={() => n.pick(f)} className={cn("flex w-full flex-col gap-2 px-5 py-3 text-left transition-colors", !sel && "hover:bg-subtle/60", className)}>{children}</button>
        {sel && n.canEdit && <div className="absolute right-4 top-3"><AddPill onClick={() => n.addToChat(f)} /></div>}
      </div>
    );
  };
  const Quote = ({ who, text }: { who: string; text: string }) => (
    <span className="flex items-start gap-2 text-body-lg leading-snug text-ink"><span className="mt-0.5 shrink-0 text-caption font-bold uppercase tracking-wider text-ink-4">{who}</span>“{text}”</span>
  );
  return (
    <div className="flex flex-col">
      <Stage num={1} title="Opening">
        <Pick f={{ kind: "opening" }}><Quote who={`${she} says`} text={sc.persona.opening} /></Pick>
      </Stage>

      <Stage num={2} title="The conversation" note={variety}>
        {obs.map((o) => {
          const k = obs.slice(0, obs.indexOf(o) + 1).filter((x) => !x.moment).length;
          const calls = callsOf(o);
          return (
            <Pick key={o.id} f={{ kind: "objection", id: o.id }} dim={!inCall(o)} className={o.moment ? "bg-warn-bg/40" : undefined}>
              <span className="flex flex-wrap items-center gap-2 pr-28">
                <span className={cn("grid h-6 min-w-6 place-items-center rounded-glyph px-1.5 text-micro font-bold", o.moment ? "bg-warn text-white" : "bg-brand text-white")}>{o.moment ? <ShieldAlert className="size-3.5" aria-hidden="true" /> : k}</span>
                <span className="text-body-lg font-bold text-ink">{o.moment ? `Moment · ${o.label}` : o.label}</span>
                <span className={cn("rounded-glyph px-1.5 py-0.5 text-[10px] font-bold", o.moment ? "bg-warn-bg text-warn" : o.finalOnly && roles_final(calls) ? "bg-ink text-white" : "bg-subtle text-ink-3")}>{o.moment ? "Must handle" : calls.join(" · ") || "Not in use"}</span>
              </span>
              <Quote who={`${she} says`} text={o.line} />
              <span className="grid gap-2 sm:grid-cols-2">
                <span className="flex flex-col gap-1 rounded-control border border-ok-line bg-ok-bg/60 px-3 py-2">
                  <span className="flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-ok"><Check className="size-3" aria-hidden="true" />{o.moment === "ae" ? "If the rep reports it" : o.moment === "offlabel" ? "If the rep refers it" : "If the rep handles it"}</span>
                  <span className="text-body text-ink-2">“{o.handled}”</span>
                  <span className="flex flex-wrap gap-1 pt-0.5">{o.keywords.slice(0, 4).map((w) => <span key={w} className="rounded-glyph bg-card px-1.5 text-micro font-semibold text-ok">{w}</span>)}</span>
                </span>
                <span className="flex flex-col gap-1 rounded-control border border-warn-line bg-warn-bg/60 px-3 py-2">
                  <span className="flex items-center gap-1 text-micro font-bold uppercase tracking-wider text-warn"><RotateCcw className="size-3" aria-hidden="true" />If the rep misses it</span>
                  <span className="text-body text-ink-2">“{o.pushback}”</span>
                  <span className={cn("text-caption", o.moment ? "font-semibold text-danger" : "text-ink-3")}>{o.moment ? "Then one more chance, or a critical flag that fails the call" : "Then one more chance, or she moves on".replace("she", she.toLowerCase())}</span>
                </span>
              </span>
              {o.answer && <span className="flex items-start gap-1.5 text-caption text-ink-3"><Check className="mt-0.5 size-3.5 shrink-0 text-ok" aria-hidden="true" /><span><b className="text-ink-2">A good answer:</b> {o.answer}</span></span>}
            </Pick>
          );
        })}
      </Stage>

      <Stage num={3} title="Close">
        <Pick f={{ kind: "close" }}><Quote who={`${she} says`} text={sc.persona.closing} /></Pick>
      </Stage>

      <Stage num={<ShieldAlert className="size-3.5" />} title="Throughout the call · never say" note={`${rules.filter((r) => r.critical).length} fail the call`}>
        {rules.map((r) => (
          <Pick key={r.id} f={{ kind: "rule", id: r.id }}>
            <span className="flex items-start gap-3 pr-28">
              <span className={cn("mt-0.5 shrink-0 rounded-glyph px-1.5 py-0.5 text-[10px] font-bold", r.critical ? "bg-danger-bg text-danger" : "bg-warn-bg text-warn")}>{r.critical ? "Fails the call" : "Flagged"}</span>
              <span className="flex flex-col"><span className="text-body font-semibold text-ink">{r.label}</span><span className="text-caption text-ink-3">{r.explanation}</span></span>
            </span>
          </Pick>
        ))}
      </Stage>

      <Stage num={<Flag className="size-3.5" />} title="Scored on" note={`pass ${passMark}`}>
        <Pick f={{ kind: "rubric" }}>
          <span className="flex flex-col gap-2 pr-28">
            {sc.rubric.map((r) => (
              <span key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                <span className="text-body text-ink-2">{r.label}</span><b className="text-body tabular-nums text-ink">{r.weight}%</b>
                <span className="col-span-2 h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, r.weight * 2.5)}%` }} /></span>
              </span>
            ))}
          </span>
        </Pick>
      </Stage>
    </div>
  );
}

/* ── Chat ────────────────────────────────────────────────────────────────── */

interface Turn { id: string; from: "you" | "ai"; text: string; focus?: string; undo?: Scenario; undone?: boolean; steps?: string[]; at?: number; opens?: string }

const PROMPTS = ["Make the doctor tougher", "Add an objection about dosing", "Hold back objection 2 for the final call", "Make it a 4-minute call"];

/** A course has a final-assessment roleplay, and a screening roleplay when screening is on. These are the ones it lacks. */
export function missingRoles(c: Course): Role[] {
  const inCourse = allScenarios().filter((x) => c.scenarioIds.includes(x.id));
  const out: Role[] = [];
  if (!inCourse.some((x) => c.settings.assessmentScenarioId === x.id)) out.push("final");
  if (c.settings.screening && !inCourse.some((x) => rolesOf(x, c).screening)) out.push("screening");
  return out;
}
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
    text: !sc ? "This course has no roleplay yet. I'll draft the final-assessment roleplay" + (course.settings.screening ? ", and a screening one," : "") + " from your documents."
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
  useEffect(() => {
    if (!autoDraft || started.current) return;
    started.current = true;
    const m = missingRoles(course);
    if (m.length) send(m[0] === "screening" ? "Add the screening roleplay" : "Add the final-assessment roleplay");
  }); // eslint-disable-line react-hooks/exhaustive-deps
  const obs = sc?.custom?.objections ?? [];

  /** A new actor: drafted in steps the trainer can watch, then opened. */
  function addActor(prompt: string) {
    const l = prompt.toLowerCase();
    const c0 = useApp.getState().courses.find((c) => c.id === course.id) ?? course;
    const missing = missingRoles(c0);
    const want: Role | undefined = /screen/.test(l) ? "screening" : /final|assess/.test(l) ? "final" : missing[0];
    if (!want || !missing.includes(want)) {
      setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt }, { id: `a${Date.now()}`, from: "ai", text: !missing.length ? "This course already has its roleplays: the final assessment" + (c0.settings.screening ? " and the screening call." : ". Turn screening on in the rep journey to add a screening call.") : `This course already has a ${want === "screening" ? "screening" : "final-assessment"} roleplay. Tell me what to change in it instead.` }]);
      setText("");
      return;
    }
    const role: Role = want;
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
      saveScenario(d, { practice: role === "final", final: role === "final" });
      if (role === "screening") updateSettings(course.id, { screening: true, screeningCall: true, screeningScenarioId: d.id, baseline: true });
      setDrafting(null);
      const what = role === "screening" ? "the screening call" : "the final assessment (reps can practise it too)";
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
        {turns.length === 1 && <Suggestions items={sc?.custom ? PROMPTS : missingRoles(course).map((r) => (r === "final" ? "Add the final-assessment roleplay" : "Add the screening roleplay"))} onPick={send} variant="list" />}
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


/**
 * How this doctor works, in the doctor's tile: what she knows (her materials), how she behaves (her
 * rules), the call settings, and the brief reps see before the call. Read-only: change it through chat.
 */
function HowItWorks({ sc, course, roles, canEdit, flash, onChat, onPreview }: {
  sc: Scenario; course: Course; roles: { screening: boolean; final: boolean; practice: boolean }; canEdit: boolean; flash: number; onChat: (part: keyof typeof PART_LABEL) => void; onPreview: (sourceId: string) => void;
}) {
  const [part, setPart] = useState<keyof typeof PART_LABEL>("knows");
  const cfg = configOf(sc);
  const she = cfg.voice.gender === "male" ? "he" : "she";
  const She = she === "he" ? "He" : "She";
  const her = she === "he" ? "his" : "her";
  const obs = sc.custom ? sc.custom.objections : sc.objectionIds.map(objection);
  const regular = obs.filter((o) => !o.moment);
  const st = course.settings;
  const va = cfg.showPages ? source(cfg.showPages.sourceId) : undefined;
  const diff = { easy: "Easy: patient and open; no pushback, she moves on after a miss", standard: "Standard: one pushback on a miss, then she moves on", hard: "Hard: interrupts, and pushes back twice before moving on" }[cfg.difficulty].replace(/she/g, she);
  const variety = cfg.variety.pick ? `Raises ${cfg.variety.pick} of ${her} ${regular.length} objections${cfg.variety.shuffle ? ", in a random order" : ""}` : cfg.variety.shuffle ? `Raises all ${regular.length} objections, in a random order` : `Raises all ${regular.length} objections, in order`;
  const rules: { t: string; tone?: "warn" | "danger" }[] = [
    { t: `Stays in character as a ${sc.persona.specialty.toLowerCase()} and never gives medical advice.` },
    { t: `Raises only ${her} listed objections. ${variety}.` },
    { t: diff + "." },
    ...(cfg.fairBalance ? [{ t: `If the rep gives a benefit without the safety, ${she} asks "And the side effects?"`, tone: "warn" as const }] : []),
    ...obs.filter((o) => o.moment === "ae").map(() => ({ t: `Adverse event: mentions a patient's rash. The rep must say it will be reported within 24 hours, or it's a critical flag.`, tone: "danger" as const })),
    ...obs.filter((o) => o.moment === "offlabel").map(() => ({ t: `Off-label trap: asks about use in 15-year-olds. The rep must refer it to Medical Information, or it's a critical flag.`, tone: "danger" as const })),
    ...(cfg.endEarly.critical ? [{ t: `Ends the final call early on a critical never-say claim.` }] : []),
    ...(cfg.endEarly.monologue ? [{ t: `Cuts the rep off after a minute of talking with no question.` }] : []),
  ];
  const settings: [string, string][] = [
    ["Call", `${cfg.callType} · ${cfg.place.toLowerCase()} · about ${sc.durationMin} min`],
    ["Difficulty", cfg.difficulty[0].toUpperCase() + cfg.difficulty.slice(1)],
    ["Variety", variety],
    ["Voice", `${cfg.voice.gender === "male" ? "Male" : "Female"}, ${cfg.voice.accent}, ${cfg.voice.pace} pace`],
    ["Language", cfg.language],
    ["Help", roles.screening ? "None: screening is a clean first call" : "Assisted prompts in practice; never in the final call"],
    ["Scoring", roles.screening ? "Not graded · sets the rep's baseline" : `Pass ${st.passRoleplay} · ${st.attempts} attempts · ${st.cooldownHours} h between attempts`],
  ];
  return (
    <div className="border-t border-hair">
      <div className="flex flex-wrap items-center gap-1 px-5 pt-3">
        <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="mr-2">How {sc.persona.name.split(" ").slice(-1)[0]} works</Text>
        {(Object.keys(PART_LABEL) as (keyof typeof PART_LABEL)[]).map((k) => (
          <button key={k} type="button" aria-pressed={part === k} onClick={() => setPart(k)}
            className={cn("rounded-[8px] px-2.5 py-1 text-caption font-bold transition-colors", part === k ? "bg-ink text-white" : "text-ink-3 hover:bg-subtle hover:text-ink")}>{PART_LABEL[k]}</button>
        ))}
        {canEdit && <button type="button" onClick={() => onChat(part)} className="ml-auto flex items-center gap-1.5 rounded-control px-2 py-1 text-caption font-bold text-brand-deep hover:bg-tint"><MessageSquarePlus className="size-3.5" aria-hidden="true" />Change in chat</button>}
      </div>
      <div key={flash} className={cn("px-5 pb-4 pt-3", flash > 0 && "node-flash rounded-panel")}>
        {part === "knows" && (
          <ul className="flex flex-col divide-y divide-hair rounded-panel border border-hair">
            {cfg.materials.map((m) => (
              <li key={m.sourceId}>
                <button type="button" onClick={() => onPreview(m.sourceId)} className="group flex w-full flex-wrap items-start gap-x-3 gap-y-0.5 px-3 py-2 text-left transition-colors hover:bg-subtle">
                  <span className="flex min-w-[220px] items-center gap-1.5 text-body font-semibold text-ink group-hover:text-info"><FileText className="size-4 shrink-0 text-info" aria-hidden="true" />{source(m.sourceId)?.title ?? "Your document"}{m.pages ? `, pages ${m.pages}` : ""}</span>
                  <span className="min-w-0 flex-1 text-body text-ink-3">{m.use}</span>
                  <span className="hidden shrink-0 text-caption font-semibold text-info group-hover:inline">Preview</span>
                </button>
              </li>
            ))}
            <li className="flex items-start gap-2 px-3 py-2 text-body text-ink-3"><Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Nothing else: {she} won&apos;t invent data, prices or comparisons, and challenges claims that aren&apos;t in these.</li>
          </ul>
        )}
        {part === "behaves" && (
          <ul className="flex flex-col gap-1.5">
            {rules.map((r) => (
              <li key={r.t} className="flex items-start gap-2 text-body text-ink-2">
                <span className={cn("mt-2 size-1.5 shrink-0 rounded-full", r.tone === "danger" ? "bg-danger" : r.tone === "warn" ? "bg-warn" : "bg-ink-4")} />{r.t}
              </li>
            ))}
          </ul>
        )}
        {part === "settings" && (
          <div className="flex flex-col gap-4">
          <dl className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {settings.map(([k, v]) => (
              <div key={k} className="flex gap-3 text-body"><dt className="w-20 shrink-0 font-semibold text-ink-3">{k}</dt><dd className="text-ink">{v}</dd></div>
            ))}
          </dl>
          <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="border-t border-hair pt-3">What reps see before the call</Text>
          <div className="flex flex-wrap items-start gap-4">
            <div className="squircle flex w-full max-w-[340px] flex-col gap-2.5 rounded-[22px] bg-ink p-4 text-white shadow-float">
              <span className="text-micro font-bold uppercase tracking-wider text-white/60">{roles.screening ? "Screening call · not graded" : "Before your call"}</span>
              <span className="flex items-center gap-2.5"><span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-body font-extrabold">{initials(sc.persona.name)}</span><span className="flex flex-col"><b className="text-body-lg">{sc.persona.name}</b><span className="text-caption text-white/70">{sc.persona.specialty} · {cfg.callType.toLowerCase()}, {cfg.place.toLowerCase()}</span></span></span>
              <span className="text-caption text-white/60">YOUR GOAL</span>
              <span className="text-body">{sc.objective}</span>
              <span className="text-caption text-white/80">About {sc.durationMin} min{va && cfg.showPages ? ` · you can show ${va.title}, pages ${cfg.showPages.pages.join(", ")}` : ""}</span>
            </div>
            <Text size="body" tone="muted" className="max-w-[320px]">Exactly what reps see on their phone before the call: who they&apos;re meeting, the goal, the time and what they may show. Not {her} objections, moments, never-say rules or the scorecard.</Text>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
