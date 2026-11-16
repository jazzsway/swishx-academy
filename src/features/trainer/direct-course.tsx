"use client";

import { useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Eye, FileText, GripVertical, Globe, Lock, Plus, Trash2, Upload } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { DIVISIONS, SOURCES, product } from "@/data/org";
import type { Source } from "@/data/types";
import { draftScenarioSet } from "@/lib/scenario-set";
import { FORMAT_ICON, SourcePreview, fileUrl, formatOf, rememberFile } from "./source-preview";
import { directKind, directModules } from "./materials";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/patterns/academy";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";

/* Library documents that suit each side: what reps read, and what tells the AI how calls go. */
export const FOR_REPS = new Set(["Visual aid", "Prescribing Information", "Clinical summary", "Policy"]);
export const FOR_ROLEPLAY = new Set(["Objection handler", "Payer guide", "Selling model"]);

export const THUMB: Record<string, string> = {
  video: "bg-ink text-white", audio: "bg-ok-bg text-ok", image: "bg-info-bg text-info", slides: "bg-tint text-brand-deep", pdf: "bg-subtle text-ink-3", doc: "bg-info-bg text-info", data: "bg-subtle text-ink-3", other: "bg-subtle text-ink-3",
};
export const kindOf = (s: Source) => s.uploaded?.format ?? (s.type === "Visual aid" ? "slides" : "pdf");
export const lengthOf = (s: Source) => {
  const f = s.uploaded?.format;
  if (f === "video" || f === "audio") return "plays as uploaded";
  if (f === "image") return "full screen";
  return s.pages ? `${s.pages} pages` : "as uploaded";
};

/* Short labels; picking one writes the full sentence into the brief. */
const BRIEF_IDEAS: [string, string][] = [
  ["First calls with specialists", "Handle a first call with a busy specialist and ask for a next step."],
  ["Nurses' dosing questions", "Answer dosing and side-effect questions from nurses, on-label."],
  ["Access with practice managers", "Explain the support program to practice managers without promising coverage."],
];

/** Turns dropped files into uploads the rest of the app can preview. */
export function useUpload(productId?: string) {
  const addUploads = useApp((s) => s.addUploads);
  return (files: File[], tag: string): Source[] => {
    const added: Source[] = files.map((f, i) => {
      const id = `up-${Date.now().toString(36)}-${tag}${i}`;
      rememberFile(id, f);
      return { id, title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), type: "Uploaded file", pages: 0, productId, uploaded: { fileName: f.name, format: formatOf(f.name), at: new Date().toISOString() } };
    });
    addUploads(added);
    return added;
  };
}

/**
 * A training with the trainer's own material, on one page: its name, who can find it, the files reps
 * see (each one a lesson, as it is), the documents the demo call is built from, and a brief that reads
 * like the start of a chat with the agent. Sending the brief creates the training: SwishX places the
 * lessons, drafts the first scenarios from the brief, and opens the editor.
 */
export function DirectCourseWizard() {
  const router = useRouter();
  /* Started from a product page, the training is about that product: it sets the characters' specialty. */
  const productId = product(useSearchParams().get("product") ?? undefined)?.id;
  const s = useApp();
  const upload = useUpload(productId);
  const [title, setTitle] = useState("");
  const prod = product(productId);
  const teams = prod ? [prod.divisionId] : [];
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [repIds, setRepIds] = useState<string[]>([]);
  const [rpIds, setRpIds] = useState<string[]>([]);
  const [sellingId, setSellingId] = useState<string>();
  const [brief, setBrief] = useState("");
  const [preview, setPreview] = useState<Source | null>(null);
  const [built, setBuilt] = useState(-1);
  const [drafted, setDrafted] = useState<string[]>([]);

  const all = [...SOURCES, ...s.uploads];
  const byId = (id: string) => all.find((x) => x.id === id)!;
  const repFiles = repIds.map(byId).filter(Boolean);
  const rpDocs = rpIds.map(byId).filter(Boolean);
  const library = SOURCES.filter((x) => !productId || !x.productId || x.productId === productId);
  const repSuggest = library.filter((x) => FOR_REPS.has(x.type) && !repIds.includes(x.id) && (!!productId || !x.productId));
  const rpSuggest = library.filter((x) => FOR_ROLEPLAY.has(x.type) && !rpIds.includes(x.id) && (!!productId || !x.productId));
  const minutes = directModules(repFiles, "x").reduce((a, m) => a + m.minutes, 0);
  const missing = title.trim().length < 4 ? "Name the training" : !repFiles.length ? "Add at least one file for reps" : null;

  function drop(id: string, side: "rep" | "rp") {
    if (byId(id)?.uploaded) s.removeUpload(id);
    if (side === "rep") setRepIds(repIds.filter((x) => x !== id));
    else { setRpIds(rpIds.filter((x) => x !== id)); if (sellingId === id) setSellingId(undefined); }
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= repIds.length || from === to) return;
    const next = [...repIds];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setRepIds(next);
  }

  function create() {
    if (missing) return;
    setBuilt(0);
    const teamNames = teams.length ? teams.map((t) => DIVISIONS.find((d) => d.id === t)?.name).join(" + ") : "everyone";
    const mods = directModules(repFiles, `d${Date.now().toString(36).slice(-4)}`);
    const id = s.createCourse({
      title: title.trim(), productId, format: "long", type: "linear", origin: "direct", roleplaySourceIds: rpIds,
      objective: brief.trim() || `Reps go through ${repFiles.length} of your own files, as they are, then take the scenario call.`,
      audience: `Field reps · ${teamNames}`, writtenFor: "reps", teams, sourceIds: [...repIds, ...rpIds],
      competencyIds: [...new Set(mods.map((m) => m.competency))],
      scope: { variants: [], indications: [], therapyAreas: [] },
      visibility: visibility === "public" ? "audience" : "assigned", screening: true,
    });
    s.updateCourse(id, { brief: brief.trim() || undefined });
    let i = 0;
    const tick = () => {
      i++;
      setBuilt(i);
      if (i <= repFiles.length) { window.setTimeout(tick, 380); return; }
      useApp.getState().setModules(id, mods);
      const course = useApp.getState().courses.find((c) => c.id === id)!;
      const set = draftScenarioSet(course);
      /* The scenarios appear one by one, so the trainer sees what SwishX drafted from the brief. */
      let k = 0;
      const next = () => {
        const sc = set[k];
        useApp.getState().saveScenario(sc, { practice: true, final: k === 0 });
        setDrafted((d) => [...d, sc.title]);
        k++;
        if (k < set.length) { window.setTimeout(next, 520); return; }
        useApp.getState().updateSettings(id, { screening: true, screeningCall: true, screeningIds: set.slice(0, 2).map((x) => x.id), baseline: true });
        window.setTimeout(() => router.push(`/trainer/courses/${id}/roleplay?fresh=1`), 700);
      };
      window.setTimeout(next, 700);
    };
    window.setTimeout(tick, 450);
  }

  if (built >= 0)
    return (
      <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 pb-24">
        <Card>
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Building {title}</Text>
            <Text tone="subtle" size="body-lg">Your files go in exactly as they are, one lesson each. Then SwishX drafts the first scenarios from your brief.</Text>
          </div>
          <ol className="flex flex-col gap-2">
            {repFiles.map((f, i) => {
              const Icon = FORMAT_ICON[kindOf(f)];
              const done = i < built;
              return (
                <li key={f.id} className={cn("squircle flex items-center gap-3 rounded-panel border p-3 transition-colors duration-300", done ? "border-ok-line bg-ok-bg" : i === built ? "shimmer border-tint-line bg-tint" : "border-hair bg-card")}>
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", done ? "bg-ok text-white" : "bg-black/[0.06] text-ink-3")}>{done ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />}</span>
                  <Text size="body-lg" weight="semibold" className="min-w-0 flex-1 truncate">Lesson {i + 1} · {f.title}</Text>
                  <Text size="caption" tone="subtle">{done ? "Placed as is" : i === built ? "Placing…" : "Queued"}</Text>
                </li>
              );
            })}
            <li className={cn("squircle flex flex-col gap-2 rounded-panel border p-3", built > repFiles.length ? "border-tint-line bg-tint" : "border-hair bg-card")}>
              <span className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white"><AgentIcon className="size-3.5" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <Text size="body-lg" weight="semibold">Drafting scenarios</Text>
                  <Text size="caption" tone="subtle">From {brief.trim() ? "your brief" : "your files"}{rpDocs.length ? ` and ${rpDocs.length} demo-call ${rpDocs.length === 1 ? "document" : "documents"}` : ""}</Text>
                </span>
                <Text size="caption" tone="subtle">{built > repFiles.length ? `${drafted.length} drafted` : "Next"}</Text>
              </span>
              {drafted.length > 0 && (
                <ul className="flex flex-col gap-1 pl-10">
                  {drafted.map((t) => <li key={t} className="select-pop flex items-center gap-2 text-body text-ink-2"><Check className="size-3.5 shrink-0 text-ok" aria-hidden="true" />{t}</li>)}
                </ul>
              )}
            </li>
          </ol>
        </Card>
      </div>
    );

  const lessonItems = repFiles.map((f, i) => ({ id: f.id, title: f.title, sub: `Lesson ${i + 1} · ${directKind(f)} · ${lengthOf(f)}`, src: f }));
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-5 pb-10">
      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => router.push("/trainer/courses")} className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Trainings</button>
        <div className="flex flex-col gap-1">
          <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">New training with your material</Text>
          <Text tone="subtle" size="body-lg">{prod ? `For ${prod.brand}. ` : ""}Your files become lessons, exactly as uploaded. SwishX builds the call scenarios from your brief.</Text>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); create(); }} className="squircle flex flex-col rounded-card border border-hair bg-card">
        <FormRow label="Name" htmlFor="t-name">
          <Field id="t-name" aria-label="Training name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lumora field kit" autoFocus />
        </FormRow>

        <FormRow label="Who can find it">
          <div className="flex flex-col gap-1.5">
            <Segmented aria-label="Who can find it" className="self-start">
              <SegmentedButton type="button" active={visibility === "private"} onClick={() => setVisibility("private")}><Lock className="size-3.5" aria-hidden="true" />Private</SegmentedButton>
              <SegmentedButton type="button" active={visibility === "public"} onClick={() => setVisibility("public")}><Globe className="size-3.5" aria-hidden="true" />Public</SegmentedButton>
            </Segmented>
            <Text size="caption" tone="subtle">{visibility === "private" ? "Only people you assign see it." : `Shows in the Library for ${prod ? `${prod.brand}'s field team` : "everyone"}. Anyone there can take it.`}</Text>
          </div>
        </FormRow>

        <FormRow label="Lessons" hint="What reps see, in this order. Each file is one lesson.">
          <div className="flex flex-col gap-2">
            {repFiles.length > 0 && <LessonList items={lessonItems} onMove={move} onPreview={(x) => setPreview(x.src)} onRemove={(x) => drop(x.id, "rep")} />}
            <Dropzone label={repFiles.length ? "Add more files" : "Upload files"} kinds="Video, audio, PDF, slides or images" onFiles={(f) => setRepIds([...repIds, ...upload(f, "rep").map((a) => a.id)])} />
            {repSuggest.length > 0 && <Suggest label="Add from the product library" items={repSuggest} onAdd={(x) => setRepIds([...repIds, x.id])} />}
          </div>
        </FormRow>

        <FormRow label="Demo call material" hint="Only the AI reads these, to build the scenarios. Reps never see them." optional>
          <div className="flex flex-col gap-2">
            <DemoDocs docs={rpDocs} sellingId={sellingId} onSelling={setSellingId} onRemove={(id) => drop(id, "rp")} />
            <Dropzone label={rpDocs.length ? "Add more" : "Upload documents"} kinds="Call scenarios, objection lists, your selling model" onFiles={(f) => {
              const added = upload(f, "rp");
              setRpIds([...rpIds, ...added.map((a) => a.id)]);
              /* A file called "selling model" (or similar) is taken as the selling model, once. */
              const sm = added.find((a) => /selling|sales model|framework|call model/i.test(a.title));
              if (sm && !sellingId) setSellingId(sm.id);
            }} />
            {rpSuggest.length > 0 && <Suggest label="Add from the product library" items={rpSuggest} onAdd={(x) => { setRpIds([...rpIds, x.id]); if (x.type === "Selling model" && !sellingId) setSellingId(x.id); }} />}
          </div>
        </FormRow>

        {/* The brief, as the first message to the agent. */}
        <FormRow label="Objective brief" hint="What should reps be able to do? SwishX drafts the scenarios from this." htmlFor="brief" optional>
          <div className="flex flex-col gap-2">
            <div className="squircle flex gap-2.5 rounded-control border border-hair-2 bg-card px-3 py-2.5 transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/20">
              <AgentIcon className="mt-1 size-4 shrink-0 text-brand" aria-hidden="true" />
              <textarea id="brief" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)}
                placeholder="e.g. Open a first call with a dermatologist, answer nurses' dosing questions on-label, and explain the support program to practice managers."
                className="w-full resize-none bg-transparent text-body-lg leading-relaxed text-ink outline-none placeholder:text-ink-4" />
            </div>
            {!brief && (
              <div className="flex flex-wrap gap-1.5">
                {BRIEF_IDEAS.map(([label, text]) => (
                  <button key={label} type="button" onClick={() => setBrief(text)} className="flex items-center gap-1 rounded-chip border border-hair-2 px-2.5 py-1 text-caption font-semibold text-ink-2 transition-colors hover:border-brand hover:bg-tint hover:text-brand-deep"><Plus className="size-3" aria-hidden="true" />{label}</button>
                ))}
              </div>
            )}
          </div>
        </FormRow>

        <div className="flex flex-wrap items-center gap-3 rounded-b-card border-t border-hair bg-canvas/60 px-5 py-4 sm:px-6">
          <Text size="body" tone={missing ? "subtle" : "muted"} className="min-w-0 flex-1">
            {missing ?? `${repFiles.length} lesson${repFiles.length === 1 ? "" : "s"} · about ${minutes} min · ${rpDocs.length ? 4 : 3} scenarios drafted next · screening on`}
          </Text>
          <Button type="submit" disabled={!!missing}>Create training<ArrowRight className="size-4" aria-hidden="true" /></Button>
        </div>
      </form>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** One row of the form: the label and its hint on the left, the input on the right, the same for every row. */
function FormRow({ label, hint, htmlFor, optional, children }: { label: string; hint?: string; htmlFor?: string; optional?: boolean; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-hair px-5 py-5 sm:px-6 md:grid-cols-[200px_minmax(0,1fr)] md:gap-8">
      <div className="flex flex-col gap-0.5 md:pt-2">
        <label htmlFor={htmlFor} className="text-body-lg font-semibold text-ink">{label}{optional && <span className="ml-1.5 text-caption font-medium text-ink-4">Optional</span>}</label>
        {hint && <Text size="caption" tone="subtle">{hint}</Text>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** The lessons, in order: drag or use the arrows to reorder, the eye to preview. */
export function LessonList<T extends { id: string; title: string; sub: string; src?: Source }>({ items, onMove, onPreview, onRemove }: {
  items: T[]; onMove: (from: number, to: number) => void; onPreview: (x: T) => void; onRemove?: (x: T) => void;
}) {
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  return (
    <ol className="flex flex-col gap-1.5" aria-label="Lessons, in order">
      {items.map((f, i) => {
        const k = f.src ? kindOf(f.src) : "pdf";
        const Icon = FORMAT_ICON[k];
        const url = f.src?.uploaded ? fileUrl(f.src.id) : undefined;
        const over = drag && drag.over === i && drag.from !== i;
        return (
          <li key={f.id} draggable onDragStart={() => setDrag({ from: i, over: i })} onDragOver={(e) => { e.preventDefault(); if (drag) setDrag({ ...drag, over: i }); }}
            onDrop={(e) => { e.preventDefault(); if (drag) onMove(drag.from, i); setDrag(null); }} onDragEnd={() => setDrag(null)}
            className={cn("squircle group relative flex items-center gap-3 rounded-panel border bg-card p-2.5 pr-2 transition-all",
              drag?.from === i ? "opacity-40" : "border-hair-2 hover:border-hair-3 hover:shadow-hair", over && (drag!.from > i ? "before:absolute before:inset-x-3 before:-top-1 before:h-0.5 before:rounded-full before:bg-brand" : "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-brand"))}>
            <GripVertical className="size-4 shrink-0 cursor-grab text-ink-4 active:cursor-grabbing" aria-hidden="true" />
            <span className="grid size-7 shrink-0 place-items-center rounded-glyph bg-black/[0.06] text-caption font-bold text-ink-2">{i + 1}</span>
            <span className={cn("relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-control", THUMB[k])}>
              {url && k === "image" ? <img src={url} alt="" className="size-full object-cover" /> : url && k === "video" ? <video src={url} muted preload="metadata" className="size-full object-cover" /> : <Icon className="size-5" aria-hidden="true" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body-lg font-semibold text-ink">{f.title}</span>
              <span className="truncate text-caption text-ink-3">{f.sub}</span>
            </span>
            <span className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
              <IconButton aria-label={`Preview ${f.title}`} onClick={() => onPreview(f)}><Eye className="size-4" /></IconButton>
              <IconButton aria-label={`Move ${f.title} up`} disabled={i === 0} onClick={() => onMove(i, i - 1)}><ChevronUp className="size-4" /></IconButton>
              <IconButton aria-label={`Move ${f.title} down`} disabled={i === items.length - 1} onClick={() => onMove(i, i + 1)}><ChevronDown className="size-4" /></IconButton>
              {onRemove && <IconButton aria-label={`Remove ${f.title}`} onClick={() => onRemove(f)}><Trash2 className="size-4" /></IconButton>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The demo-call documents: what each one is for the AI. One of them can be the selling model, which scores the call. */
export function DemoDocs({ docs, sellingId, onSelling, onRemove, onPreview }: { docs: Source[]; sellingId?: string; onSelling: (id?: string) => void; onRemove?: (id: string) => void; onPreview?: (s: Source) => void }) {
  if (!docs.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {docs.map((d) => {
        const selling = sellingId === d.id;
        return (
          <li key={d.id} className="squircle group flex items-center gap-3 rounded-panel border border-hair-2 bg-card p-2.5 pr-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-info-bg text-info"><FileText className="size-4" aria-hidden="true" /></span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body font-semibold text-ink">{d.title}</span>
              <span className="text-caption text-ink-3">{selling ? "Selling model · sets how calls are scored" : "Characters, objections, never-say"}</span>
            </span>
            <button type="button" aria-pressed={selling} onClick={() => onSelling(selling ? undefined : d.id)}
              className={cn("shrink-0 rounded-chip border px-2.5 py-1 text-caption font-semibold transition-colors", selling ? "border-brand bg-tint text-brand-deep" : "border-hair-2 text-ink-3 hover:border-hair-3 hover:text-ink")}>
              {selling ? <><Check className="mr-1 inline size-3" aria-hidden="true" />Selling model</> : "Use as selling model"}
            </button>
            {onPreview && <IconButton aria-label={`Preview ${d.title}`} onClick={() => onPreview(d)}><Eye className="size-4" /></IconButton>}
            {onRemove && <IconButton aria-label={`Remove ${d.title}`} onClick={() => onRemove(d.id)}><Trash2 className="size-4" /></IconButton>}
          </li>
        );
      })}
    </ul>
  );
}

/** The product library's documents that suit this list, as one picker instead of a row of chips. */
export function Suggest({ label, items, onAdd }: { label: string; items: Source[]; onAdd: (s: Source) => void }) {
  return (
    <span className="relative inline-flex self-start">
      <Plus className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-brand-deep" aria-hidden="true" />
      <select aria-label={label} value="" onChange={(e) => { const x = items.find((i) => i.id === e.target.value); if (x) onAdd(x); }}
        className="h-8 cursor-pointer appearance-none rounded-control border border-hair-2 bg-card pl-7 pr-8 text-caption font-semibold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep">
        <option value="">{label} ({items.length})</option>
        {items.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-3" aria-hidden="true" />
    </span>
  );
}

/** A drop target that's also a file picker: one row, the same height wherever it's used. */
export function Dropzone({ label, kinds, onFiles }: { label: string; kinds: string; onFiles: (files: File[]) => void; big?: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <label onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
      className={cn("squircle flex cursor-pointer items-center gap-3 rounded-panel border border-dashed px-3 py-2.5 transition-colors hover:border-brand hover:bg-tint", over ? "border-brand bg-tint" : "border-hair-3")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><Upload className="size-4" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-col">
        <span className="text-body font-semibold text-ink-2">{label} <span className="font-normal text-ink-3">or drop them here</span></span>
        <span className="truncate text-caption text-ink-3">{kinds}</span>
      </span>
      <input type="file" className="sr-only" multiple onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </label>
  );
}
