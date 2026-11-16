"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUp, Check, Eye, FileText, Globe, Lock, Mic, Paperclip, Trash2, X } from "lucide-react";
import { AgentIcon, LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { DIVISIONS, SOURCES, product } from "@/data/org";
import type { Source } from "@/data/types";
import { draftScenarioSet } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Composer } from "@/features/copilot/composer";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { FORMAT_ICON, SourcePreview } from "./source-preview";
import { directKind, directModules } from "./materials";
import { FOR_ROLEPLAY, THUMB, kindOf, lengthOf, useUpload } from "./direct-course";
import { useTrainingChat } from "./course/training-chat-store";

type Role = "lesson" | "source";
interface Turn { id: string; from: "ai" | "you"; text: string }

/* Sample briefs, as in the studios: a label, and the brief it fills in. */
const SAMPLES: [string, string][] = [
  ["First calls", "Reps open a first call with a busy dermatologist on the right patient, handle the cost objection and ask for a next step."],
  ["Nurse questions", "Reps answer nurses' dosing and side-effect questions on-label, and report any adverse event they hear about."],
  ["Access & support", "Reps explain the support program to practice managers without promising coverage."],
];

/** Which pile a file goes in, from what it is: call material feeds the AI, everything else is a lesson. */
const roleOf = (s: Source): Role => (FOR_ROLEPLAY.has(s.type) || /objection|selling|sales model|payer|scenario|handler|framework|script|faq|call guide/i.test(s.title) ? "source" : "lesson");

/** A short name from the brief: its first clause, without "reps can…". */
function nameFrom(brief: string, brand?: string) {
  const first = brief.split(/[.!?\n]/)[0].replace(/^\s*(train |teach |help )?reps?\s+(to\s+|can\s+|should\s+|will\s+)?(be able to\s+)?/i, "").trim();
  /* Up to a natural break (a comma, "on the", "without"), and never more than nine words. */
  const phrase = first.split(/,|;|\s+(?:on the|without|so that|then)\s+/i)[0];
  const words = phrase.split(/\s+/).slice(0, 9).join(" ").replace(/[,;:]$/, "");
  const name = words ? words.charAt(0).toUpperCase() + words.slice(1) : "New training";
  return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand}: ${name}` : name;
}

/**
 * A new training with the trainer's own material starts the way a studio project does: one open
 * brief with the files attached. SwishX then sorts it into a review (name, who can find it, the
 * objective, and each file as training material reps see or an information source only the AI
 * reads), with the agent on the left. Confirming drafts the first scenarios and opens the editor.
 */
export function DirectSetup() {
  const router = useRouter();
  const productId = product(useSearchParams().get("product") ?? undefined)?.id;
  const prod = product(productId);
  const s = useApp();
  const me = useMe();
  const upload = useUpload(productId);
  const [stage, setStage] = useState<"prompt" | "review" | "drafting">("prompt");
  const [brief, setBrief] = useState("");
  const [files, setFiles] = useState<{ id: string; role: Role }[]>([]);
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [objective, setObjective] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [drafted, setDrafted] = useState<string[]>([]);
  const [preview, setPreview] = useState<Source | null>(null);
  const [leaving, setLeaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = `${Math.max(el.scrollHeight, 120)}px`; } }, [brief]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, drafted]);

  const all = [...SOURCES, ...s.uploads];
  const byId = (id: string) => all.find((x) => x.id === id);
  const items = files.map((f) => ({ ...f, src: byId(f.id) })).filter((f): f is { id: string; role: Role; src: Source } => !!f.src);
  const lessons = items.filter((f) => f.role === "lesson");
  const sources = items.filter((f) => f.role === "source");
  const minutes = directModules(lessons.map((f) => f.src), "x").reduce((a, m) => a + m.minutes, 0);
  const add = (list: Source[]) => setFiles((fs) => [...fs, ...list.filter((x) => !fs.some((f) => f.id === x.id)).map((x) => ({ id: x.id, role: roleOf(x) }))]);
  const setRole = (id: string, role: Role) => setFiles((fs) => fs.map((f) => (f.id === id ? { ...f, role } : f)));
  const touched = !!(brief || files.length);
  const missing = !title.trim() ? "Name the training" : !lessons.length ? "Mark at least one file as training material" : !objective.trim() ? "Add the objective" : null;

  /** The brief, sorted: a name, the objective, and each file in its pile. */
  function start() {
    if (!brief.trim()) return;
    const name = nameFrom(brief, prod?.brand);
    setTitle(name);
    setObjective(brief.trim());
    const ls = items.filter((f) => f.role === "lesson"), ss = items.filter((f) => f.role === "source");
    const list = (xs: typeof items) => xs.map((x) => `“${x.src.title}”`).join(", ");
    setTurns([
      { id: "u0", from: "you", text: brief.trim() + (items.length ? `\n📎 ${items.length} file${items.length === 1 ? "" : "s"}` : "") },
      { id: "a0", from: "ai", text: `Here's how I've set it up, ${me.first}. I named it “${name}” and kept it private. ${items.length
        ? `I sorted your ${items.length} file${items.length === 1 ? "" : "s"}: ${ls.length ? `${list(ls)} as training material reps see` : "none as training material yet"}${ss.length ? `, and ${list(ss)} as ${ss.length === 1 ? "an information source" : "information sources"} only I read` : ""}.`
        : "You haven't attached any files yet: add the training material on the right."} Check it, change anything, then confirm and I'll draft the first scenarios.` },
    ]);
    setStage("review");
  }

  /* The chat in the review understands the quick changes; everything else is on the right. */
  function send(v: string) {
    const t = v.trim();
    if (!t) return;
    const l = t.toLowerCase();
    let reply = "Change anything on the right, or tell me: “call it …”, “make it public”, “objective: …”, or which file is a source.";
    const name = t.match(/(?:call|name|rename)\s+it\s+(?:to\s+)?["“]?(.+?)["”]?\.?$/i)?.[1];
    const file = items.find((f) => f.src.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3).some((w) => l.includes(w)));
    if (name) { setTitle(name); reply = `Renamed it “${name}”.`; }
    else if (/\b(public|private)\b/.test(l)) { const v2 = /public/.test(l) ? "public" : "private"; setVisibility(v2); reply = v2 === "public" ? "It's public now: it shows in the Library once published." : "It's private now: only people you assign see it."; }
    else if (/objective|brief/.test(l) && /[:]/.test(t)) { setObjective(t.split(/:(.+)/)[1].trim()); reply = "Updated the objective."; }
    else if (file && /source|only (the )?ai|not for reps|reference/.test(l)) { setRole(file.id, "source"); reply = `“${file.src.title}” is an information source now: only I read it.`; }
    else if (file && /material|lesson|reps see|for reps/.test(l)) { setRole(file.id, "lesson"); reply = `“${file.src.title}” is training material now: reps see it as a lesson.`; }
    else if (/confirm|go ahead|looks good|draft|create/.test(l)) { setTurns((ts) => [...ts, { id: `u${ts.length}`, from: "you", text: t }]); setText(""); confirm(); return; }
    setTurns((ts) => [...ts, { id: `u${ts.length}`, from: "you", text: t }, { id: `a${ts.length}`, from: "ai", text: reply }]);
    setText("");
  }

  function confirm() {
    if (missing) return;
    setStage("drafting");
    const teams = prod ? [prod.divisionId] : [];
    const teamNames = teams.length ? teams.map((t) => DIVISIONS.find((d) => d.id === t)?.name).join(" + ") : "everyone";
    const mods = directModules(lessons.map((f) => f.src), `d${Date.now().toString(36).slice(-4)}`);
    const rpIds = sources.map((f) => f.id);
    const id = s.createCourse({
      title: title.trim(), productId, format: "long", type: "linear", origin: "direct", roleplaySourceIds: rpIds,
      objective: objective.trim(), audience: `Field reps · ${teamNames}`, writtenFor: "reps", teams, sourceIds: items.map((f) => f.id),
      competencyIds: [...new Set(mods.map((m) => m.competency))], scope: { variants: [], indications: [], therapyAreas: [] },
      visibility: visibility === "public" ? "audience" : "assigned", screening: true,
    });
    s.updateCourse(id, { brief: objective.trim() });
    s.setModules(id, mods);
    /* The first few scenarios: enough to start shaping, more come from the chat. */
    const set = draftScenarioSet(useApp.getState().courses.find((c) => c.id === id)!).slice(0, 3);
    const history = turns;
    let k = 0;
    const tick = () => {
      const sc = set[k];
      useApp.getState().saveScenario(sc, { practice: true, final: k === 0 });
      setDrafted((d) => [...d, sc.title]);
      k++;
      if (k < set.length) { window.setTimeout(tick, 650); return; }
      useApp.getState().updateSettings(id, { screening: true, screeningCall: true, screeningIds: set.slice(0, 2).map((x) => x.id), baseline: true });
      /* The conversation carries on in the editor's chat, where it left off. */
      useTrainingChat.getState().push(id, ...history.map((t) => ({ id: `s-${t.id}`, from: t.from, text: t.text })),
        { id: "s-done", from: "ai", text: `Created “${title.trim()}” with ${lessons.length} lesson${lessons.length === 1 ? "" : "s"}${sources.length ? ` and ${sources.length} source${sources.length === 1 ? "" : "s"}` : ""}, and drafted ${set.length} scenarios: ${set.map((x) => `“${x.title}”`).join(", ")}. I'm here for all three steps now: tell me what to change, or describe another scenario.` });
      window.setTimeout(() => router.push(`/trainer/courses/${id}/roleplay?fresh=1`), 800);
    };
    window.setTimeout(tick, 800);
  }

  const header = (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-card px-3 sm:px-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-control border border-tint-line bg-gradient-to-br from-tint to-white"><LogoMark size={17} className="text-brand" /></span>
      <span className="h-5 w-px shrink-0 bg-hair-2" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <Text as="h1" size="body-lg" weight="extrabold" truncate className={cn("leading-tight", !title && "text-ink-3")}>{title || "New training"}</Text>
        <span className="flex items-center gap-1.5 text-micro font-semibold text-ink-3">{stage === "prompt" ? "Describe it" : stage === "review" ? "Check and confirm" : "Drafting scenarios"} · {prod?.brand ?? "Company"}<span className="rounded-glyph bg-info-bg px-1.5 py-px text-info">With my material</span></span>
      </div>
      <div className="relative ml-auto">
        <button type="button" aria-label="Close" title="Close" onClick={() => (touched && stage !== "drafting" ? setLeaving(true) : router.push("/trainer/courses"))}
          className="grid size-9 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-ink"><X className="size-4.5" /></button>
        {leaving && (
          <div className="select-pop absolute right-0 top-full z-20 mt-2 flex w-[280px] flex-col gap-3 rounded-panel border border-hair bg-card p-4 shadow-modal">
            <Text size="body" weight="semibold">Leave without creating it?</Text>
            <Text size="caption" tone="subtle">Nothing is saved until you confirm.</Text>
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => router.push("/trainer/courses")}>Leave</Button><Button size="sm" onClick={() => setLeaving(false)}>Keep going</Button></div>
          </div>
        )}
      </div>
    </header>
  );

  /* 1. The brief: one open box, with the files attached. */
  if (stage === "prompt")
    return (
      <div className="flex h-dvh flex-col bg-canvas">
        {header}
        <main className="min-h-0 flex-1 overflow-y-auto bg-subtle/60">
          <div className="mx-auto flex w-full max-w-[860px] flex-col gap-5 px-5 pb-16 pt-[11vh]">
            <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="text-center leading-tight">Describe the training you want to build</Text>
            <form onSubmit={(e) => { e.preventDefault(); start(); }} className="squircle flex flex-col overflow-hidden rounded-[24px] border border-hair bg-card shadow-float">
              <textarea ref={ref} value={brief} onChange={(e) => setBrief(e.target.value)} autoFocus aria-label="Describe the training"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); start(); } }}
                placeholder="What should reps learn and be able to do? Attach your training material, and any sources for the call like objection lists or your selling model."
                className="w-full resize-none bg-transparent px-5 py-4 text-body-lg leading-relaxed text-ink outline-none placeholder:text-ink-4" />
              {items.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 px-4 pb-3" aria-label="Attached">
                  {items.map((f) => (
                    <li key={f.id} className="flex items-center gap-1.5 rounded-control border border-hair-2 bg-subtle py-1 pl-2 pr-1 text-caption font-semibold text-ink-2">
                      <FileText className="size-3.5 shrink-0 text-ink-3" aria-hidden="true" /><span className="max-w-[240px] truncate">{f.src.title}</span>
                      <button type="button" aria-label={`Remove ${f.src.title}`} onClick={() => setFiles(files.filter((x) => x.id !== f.id))} className="grid size-5 place-items-center rounded-full text-ink-3 hover:bg-card hover:text-ink"><X className="size-3" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2 border-t border-hair bg-canvas/50 px-4 py-2.5">
                <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-control px-2 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle">
                  <Paperclip className="size-4" aria-hidden="true" />Attach
                  <input type="file" multiple className="sr-only" onChange={(e) => { add(upload(Array.from(e.target.files ?? []), "f")); e.target.value = ""; }} />
                </label>
                <button type="submit" disabled={!brief.trim()} aria-label="Send" className="ml-auto grid size-9 place-items-center rounded-control bg-brand text-white transition-colors hover:bg-brand-deep disabled:opacity-40"><ArrowUp className="size-4.5" /></button>
              </div>
            </form>
            <ul className="flex flex-col gap-2" aria-label="Sample briefs">
              {SAMPLES.map(([label, t]) => (
                <li key={label}>
                  <button type="button" onClick={() => { setBrief(t); ref.current?.focus(); }}
                    className={cn("squircle flex w-full items-center gap-3 rounded-panel border bg-card px-4 py-3 text-left transition-colors hover:border-brand", brief === t ? "border-brand bg-tint/50" : "border-hair")}>
                    <span className="shrink-0 rounded-chip border border-tint-line bg-tint px-2 py-0.5 text-caption font-bold text-brand-deep">{label}</span>
                    <span className="min-w-0 flex-1 truncate text-body text-ink-2">“{t}”</span>
                    <span className="flex shrink-0 items-center gap-1 text-caption font-bold text-brand-deep">Use brief<ArrowRight className="size-3.5" aria-hidden="true" /></span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    );

  /* 2. The review, with the agent on the left; 3. drafting, in the same place. */
  return (
    <div className="flex h-dvh flex-col bg-canvas">
      {header}
      <div className="flex min-h-0 flex-1">
        <aside aria-label="SwishX AI Agent" className="flex w-full max-w-[400px] shrink-0 flex-col border-r border-hair bg-card">
          <div className="flex h-11 shrink-0 items-center gap-2 border-b border-hair px-4"><AgentIcon className="size-4 text-brand" aria-hidden="true" /><Text size="body" weight="semibold">Agent</Text></div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
            {turns.map((t) => (
              <div key={t.id} className={cn("flex", t.from === "you" && "justify-end")}>
                <div className={cn("max-w-[92%] whitespace-pre-line rounded-panel px-3.5 py-2.5 text-body leading-relaxed", t.from === "you" ? "bg-ink text-white" : "bg-subtle text-ink")}>{t.text}</div>
              </div>
            ))}
            {stage === "drafting" && (
              <div className="flex max-w-[92%] flex-col gap-1.5 rounded-panel bg-subtle px-3.5 py-2.5 text-body">
                <span className="flex items-center gap-2"><Check className="size-3.5 text-ok" aria-hidden="true" />Placed {lessons.length} lesson{lessons.length === 1 ? "" : "s"} as uploaded</span>
                {drafted.map((d) => <span key={d} className="select-pop flex items-center gap-2"><Check className="size-3.5 shrink-0 text-ok" aria-hidden="true" />Drafted “{d}”</span>)}
                <span className="flex items-center gap-2 text-ink-3"><span className="size-2 animate-pulse rounded-full bg-brand" />{drafted.length ? "Drafting the next one…" : "Reading your brief…"}</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-hair p-3">
            <Composer id="setup-chat" value={text} onChange={setText} onSend={() => send(text)} busy={stage === "drafting"}
              placeholder={stage === "drafting" ? "Drafting…" : "Rename it, make it public, or say which file is a source"} hint="Or change anything on the right." />
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto bg-subtle/60 [scrollbar-width:thin]">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-3 px-5 py-6 lg:px-8">
            <div className="flex flex-col gap-0.5 pb-1">
              <Text size="micro" weight="bold" tone="brand-deep" uppercase tracking="wider">Check and confirm</Text>
              <Text as="h2" size="display" weight="extrabold" tracking="tight">Here&apos;s your training</Text>
            </div>
            <Card label="Name">
              <div className="flex flex-wrap items-center gap-3">
                <input aria-label="Training name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name the training" disabled={stage === "drafting"}
                  className="min-w-[220px] flex-1 bg-transparent text-title font-bold text-ink outline-none placeholder:text-ink-4" />
                <Segmented aria-label="Who can find it" title={visibility === "private" ? "Only people you assign see it." : "Shows in the Library. Anyone there can take it."}>
                  <SegmentedButton type="button" active={visibility === "private"} onClick={() => setVisibility("private")}><Lock className="size-3.5" aria-hidden="true" />Private</SegmentedButton>
                  <SegmentedButton type="button" active={visibility === "public"} onClick={() => setVisibility("public")}><Globe className="size-3.5" aria-hidden="true" />Public</SegmentedButton>
                </Segmented>
              </div>
            </Card>
            <Card label="Objective" hint="SwishX drafts the scenarios from this">
              <textarea aria-label="Objective" value={objective} onChange={(e) => setObjective(e.target.value)} rows={2} disabled={stage === "drafting"}
                className="w-full resize-none rounded-control border border-hair-2 bg-card px-3 py-2 text-body-lg leading-relaxed text-ink outline-none focus:border-brand/60" />
            </Card>
            <Card label="Materials" hint={`${lessons.length} training material${lessons.length === 1 ? "" : "s"} · ${sources.length} information source${sources.length === 1 ? "" : "s"}`}>
              {items.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {items.map((f) => {
                    const Icon = FORMAT_ICON[kindOf(f.src)];
                    return (
                      <li key={f.id} className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-hair-2 bg-card p-2 pr-1.5">
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-control", f.role === "lesson" ? THUMB[kindOf(f.src)] : "bg-info-bg text-info")}><Icon className="size-4" aria-hidden="true" /></span>
                        <span className="flex min-w-[160px] flex-1 flex-col">
                          <span className="truncate text-body font-semibold text-ink">{f.src.title}</span>
                          <span className="truncate text-caption text-ink-3">{f.role === "lesson" ? `Lesson · ${directKind(f.src)} · ${lengthOf(f.src)}` : "Only the AI reads it"}</span>
                        </span>
                        <span className="ml-auto flex shrink-0 items-center gap-1">
                          <Segmented aria-label={`What ${f.src.title} is`}>
                            <SegmentedButton type="button" active={f.role === "lesson"} onClick={() => setRole(f.id, "lesson")}>Training material</SegmentedButton>
                            <SegmentedButton type="button" active={f.role === "source"} onClick={() => setRole(f.id, "source")}>Information source</SegmentedButton>
                          </Segmented>
                          <IconButton aria-label={`Preview ${f.src.title}`} onClick={() => setPreview(f.src)}><Eye className="size-4" /></IconButton>
                          <IconButton aria-label={`Remove ${f.src.title}`} onClick={() => setFiles(files.filter((x) => x.id !== f.id))}><Trash2 className="size-4" /></IconButton>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-control border border-dashed border-hair-3 px-2.5 text-caption font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep">
                  <Paperclip className="size-3.5" aria-hidden="true" />Attach more
                  <input type="file" multiple className="sr-only" onChange={(e) => { add(upload(Array.from(e.target.files ?? []), "f")); e.target.value = ""; }} />
                </label>
              </div>
              <Text size="caption" tone="subtle">Training material becomes lessons reps see, exactly as uploaded, in this order. Information sources only feed the AI.</Text>
            </Card>
            {stage === "drafting" && (
              <Card label="Scenarios" hint="Drafting from your objective">
                <ul className="flex flex-col gap-1.5">{drafted.map((d) => <li key={d} className="select-pop flex items-center gap-2 text-body font-semibold text-ink"><Mic className="size-4 text-brand" aria-hidden="true" />{d}</li>)}</ul>
              </Card>
            )}
            {stage === "review" && (
              <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3 shadow-float">
                <Text size="body" tone={missing ? "subtle" : "muted"} className="min-w-0 flex-1">{missing ?? `${lessons.length} lesson${lessons.length === 1 ? "" : "s"} · about ${minutes} min${sources.length ? ` · ${sources.length} source${sources.length === 1 ? "" : "s"}` : ""} · 3 scenarios drafted next`}</Text>
                <Button disabled={!!missing} onClick={confirm}><AgentIcon className="size-4" aria-hidden="true" />Confirm and draft scenarios</Button>
              </div>
            )}
          </div>
        </main>
      </div>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function Card({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-4 sm:px-5">
      <span className="flex items-baseline gap-2">
        <Text size="micro" weight="bold" uppercase tracking="wider" className="text-ink-2">{label}</Text>
        {hint && <Text size="caption" tone="subtle" truncate>{hint}</Text>}
      </span>
      {children}
    </section>
  );
}

