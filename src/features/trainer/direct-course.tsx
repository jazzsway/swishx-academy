"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Eye, GripVertical, Lock, Mic, Plus, Trash2, Upload, Waypoints } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { DIVISIONS, SOURCES, product } from "@/data/org";
import type { Source } from "@/data/types";
import { draftScenario } from "@/lib/roleplay-draft";
import { FORMAT_ICON, SourcePreview, fileUrl, formatOf, rememberFile } from "./source-preview";
import { directKind, directModules } from "./materials";
import { VisibilityPicker } from "./content-type";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/patterns/academy";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";

const STEPS = ["Basics", "Materials", "Create"];
/* Library documents that suit each side: what reps read, and what tells the AI how calls go. */
const FOR_REPS = new Set(["Visual aid", "Prescribing Information", "Clinical summary", "Policy"]);
const FOR_ROLEPLAY = new Set(["Objection handler", "Payer guide", "Selling model"]);

const THUMB: Record<string, string> = {
  video: "bg-ink text-white", audio: "bg-ok-bg text-ok", image: "bg-info-bg text-info", slides: "bg-tint text-brand-deep", pdf: "bg-subtle text-ink-3", doc: "bg-info-bg text-info", data: "bg-subtle text-ink-3", other: "bg-subtle text-ink-3",
};
const kindOf = (s: Source) => s.uploaded?.format ?? (s.type === "Visual aid" ? "slides" : "pdf");
const lengthOf = (s: Source) => {
  const f = s.uploaded?.format;
  if (f === "video" || f === "audio") return "plays as uploaded";
  if (f === "image") return "full screen";
  return s.pages ? `${s.pages} pages` : "as uploaded";
};

/**
 * Direct course: the trainer's own files, unchanged, one module each, plus the documents the AI
 * reads to draft the course's roleplay. SwishX writes no content and adds no questions.
 */
export function DirectCourseWizard() {
  const router = useRouter();
  /* Started from a product page, the course is about that product: it sets the roleplay doctor's specialty. */
  const productId = product(useSearchParams().get("product") ?? undefined)?.id;
  const s = useApp();
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const prod = product(productId);
  const teams = prod ? [prod.divisionId] : [];
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [repIds, setRepIds] = useState<string[]>([]);
  const [rpIds, setRpIds] = useState<string[]>([]);
  const [sellingId, setSellingId] = useState<string>();
  const [preview, setPreview] = useState<Source | null>(null);
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const [built, setBuilt] = useState(-1);

  const all = [...SOURCES, ...s.uploads];
  const byId = (id: string) => all.find((x) => x.id === id)!;
  const repFiles = repIds.map(byId).filter(Boolean);
  const rpDocs = rpIds.map(byId).filter(Boolean);
  const library = SOURCES.filter((x) => !productId || !x.productId || x.productId === productId);
  const repSuggest = library.filter((x) => FOR_REPS.has(x.type) && !repIds.includes(x.id) && (!!productId || !x.productId));
  const rpSuggest = library.filter((x) => FOR_ROLEPLAY.has(x.type) && !rpIds.includes(x.id) && (!!productId || !x.productId));
  const minutes = directModules(repFiles, "x").reduce((a, m) => a + m.minutes, 0);

  function upload(files: File[], side: "rep" | "rp") {
    const added: Source[] = files.map((f, i) => {
      const id = `up-${Date.now().toString(36)}-${side}${i}`;
      rememberFile(id, f);
      return { id, title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " "), type: "Uploaded file", pages: 0, productId, uploaded: { fileName: f.name, format: formatOf(f.name), at: new Date().toISOString() } };
    });
    s.addUploads(added);
    if (side === "rep") setRepIds([...repIds, ...added.map((a) => a.id)]);
    else {
      setRpIds([...rpIds, ...added.map((a) => a.id)]);
      /* A file called "selling model" (or similar) is taken as the selling model, once. */
      const sm = added.find((a) => /selling|sales model|framework|call model/i.test(a.title));
      if (sm && !sellingId) setSellingId(sm.id);
    }
  }
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
    setStep(2);
    const teamNames = teams.length ? teams.map((t) => DIVISIONS.find((d) => d.id === t)?.name).join(" + ") : "everyone";
    const mods = directModules(repFiles, `d${Date.now().toString(36).slice(-4)}`);
    const id = s.createCourse({
      title: title.trim(), productId, format: "long", type: "linear", origin: "direct", roleplaySourceIds: rpIds,
      objective: `Reps go through ${repFiles.length} of your own files, as they are, then practise the call.`,
      audience: `Field reps · ${teamNames}`, writtenFor: "reps", teams, sourceIds: [...repIds, ...rpIds],
      competencyIds: [...new Set(mods.map((m) => m.competency))],
      scope: { variants: [], indications: [], therapyAreas: [] },
      visibility: visibility === "public" ? "audience" : "assigned",
    });
    let i = 0;
    setBuilt(0);
    const tick = () => {
      i++;
      setBuilt(i);
      if (i <= repFiles.length) window.setTimeout(tick, 420);
      else window.setTimeout(() => {
        useApp.getState().setModules(id, mods);
        /* Every course starts with a roleplay: from the roleplay documents, or from the course's own files. */
        const sc = draftScenario({ courseId: id, productId, sources: rpDocs.length ? rpDocs : repFiles, sellingModelId: sellingId });
        useApp.getState().saveScenario(sc, { practice: true, final: true });
        router.push(`/trainer/courses/${id}?fresh=1`);
      }, 1500);
    };
    window.setTimeout(tick, 500);
  }

  const canNext = [title.trim().length > 3, repFiles.length > 0][step];

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-6 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" disabled={step === 2} onClick={() => (step === 0 ? router.push("/trainer/courses") : setStep(step - 1))}>
          <ArrowLeft className="size-4" aria-hidden="true" />Back
        </Button>
        <span className="hidden text-caption font-bold uppercase tracking-wider text-ink-3 sm:inline">Direct from your materials</span>
        <ol className="ml-auto flex items-center gap-1.5" aria-label="Steps">
          {STEPS.map((label, n) => (
            <li key={label} className="flex items-center gap-1.5">
              <span className={cn("grid size-6 place-items-center rounded-full text-micro font-bold", n < step ? "bg-ok text-white" : n === step ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>
                {n < step ? <Check className="size-3.5" aria-hidden="true" /> : n + 1}
              </span>
              <span className={cn("hidden text-caption font-semibold sm:inline", n === step ? "text-ink" : "text-ink-3")}>{label}</span>
              {n < STEPS.length - 1 && <span className="mx-1 hidden h-px w-5 bg-hair-2 sm:block" />}
            </li>
          ))}
        </ol>
      </div>

      {step === 0 && (
        <Card className="mx-auto w-full max-w-[860px]">
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Name your course</Text>
            <Text tone="subtle" size="body-lg">{prod ? `A ${prod.brand} course. ` : ""}Reps will see your files exactly as you upload them. Nothing is rewritten.</Text>
          </div>
          <Field label="Course title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Lumora field kit" autoFocus />
          <VisibilityPicker value={visibility} onChange={setVisibility} teams={prod ? `${prod.brand}'s field team` : "everyone"} />
        </Card>
      )}

      {step === 1 && (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <Text as="h2" size="title" weight="bold">Reps see these{repFiles.length ? <span className="font-semibold text-ink-3"> · {repFiles.length}</span> : null}</Text>
                <Text size="body" tone="subtle">Each file becomes one module, in this order. Drag to reorder.</Text>
              </div>
              {repFiles.length > 0 && <Chip size="md" tone="ok">No questions added</Chip>}
            </div>
            {repFiles.length > 0 && (
              <ol className="flex flex-col gap-1.5" aria-label="Modules, in order">
                {repFiles.map((f, i) => {
                  const k = kindOf(f);
                  const Icon = FORMAT_ICON[k];
                  const url = f.uploaded ? fileUrl(f.id) : undefined;
                  const over = drag && drag.over === i && drag.from !== i;
                  return (
                    <li key={f.id} draggable onDragStart={() => setDrag({ from: i, over: i })} onDragOver={(e) => { e.preventDefault(); if (drag) setDrag({ ...drag, over: i }); }}
                      onDrop={(e) => { e.preventDefault(); if (drag) move(drag.from, i); setDrag(null); }} onDragEnd={() => setDrag(null)}
                      className={cn("squircle group relative flex items-center gap-3 rounded-panel border bg-card p-2.5 pr-2 transition-all",
                        drag?.from === i ? "opacity-40" : "border-hair-2 hover:border-hair-3 hover:shadow-hair", over && (drag!.from > i ? "before:absolute before:inset-x-3 before:-top-1 before:h-0.5 before:rounded-full before:bg-brand" : "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-brand"))}>
                      <GripVertical className="size-4 shrink-0 cursor-grab text-ink-4 active:cursor-grabbing" aria-hidden="true" />
                      <span className="grid size-7 shrink-0 place-items-center rounded-glyph bg-black/[0.06] text-caption font-bold text-ink-2">{i + 1}</span>
                      <span className={cn("relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-control", THUMB[k])}>
                        {url && k === "image" ? <img src={url} alt="" className="size-full object-cover" /> : url && k === "video" ? <video src={url} muted preload="metadata" className="size-full object-cover" /> : <Icon className="size-5" aria-hidden="true" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-lg font-semibold text-ink">{f.title}</span>
                        <span className="truncate text-caption text-ink-3">Module {i + 1} · {directKind(f)} · {lengthOf(f)}</span>
                      </span>
                      <span className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
                        <IconButton aria-label={`Preview ${f.title}`} onClick={() => setPreview(f)}><Eye className="size-4" /></IconButton>
                        <IconButton aria-label={`Move ${f.title} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ChevronUp className="size-4" /></IconButton>
                        <IconButton aria-label={`Move ${f.title} down`} disabled={i === repFiles.length - 1} onClick={() => move(i, i + 1)}><ChevronDown className="size-4" /></IconButton>
                        <IconButton aria-label={`Remove ${f.title}`} onClick={() => drop(f.id, "rep")}><Trash2 className="size-4" /></IconButton>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}
            <Dropzone big={!repFiles.length} label={repFiles.length ? "Add more files" : "Drop the files reps should see"} kinds="Video, audio, PDF, slides or images" onFiles={(f) => upload(f, "rep")} />
            {repSuggest.length > 0 && <Suggest label={`From ${prod ? `${prod.brand}'s` : "your"} product library`} items={repSuggest} onAdd={(x) => setRepIds([...repIds, x.id])} />}
          </Card>

          <div className="flex flex-col gap-4 lg:sticky lg:top-[84px]">
            <Card>
              <div className="flex flex-col gap-0.5">
                <Text as="h2" size="title" weight="bold">Roleplay sources{rpDocs.length ? <span className="font-semibold text-ink-3"> · {rpDocs.length}</span> : null}</Text>
                <Text size="body" tone="subtle" className="flex items-start gap-1.5"><Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Only the AI reads these. Reps never see them.</Text>
              </div>
              {rpDocs.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {rpDocs.map((d) => {
                    const Icon = FORMAT_ICON[kindOf(d)];
                    const selling = sellingId === d.id;
                    return (
                      <li key={d.id} className="squircle flex flex-col gap-2.5 rounded-panel border border-hair-2 bg-card p-3">
                        <div className="flex items-center gap-2.5">
                          <span className={cn("grid size-9 shrink-0 place-items-center rounded-control", selling ? "bg-brand text-white" : "bg-info-bg text-info")}><Icon className="size-4" aria-hidden="true" /></span>
                          <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-semibold text-ink">{d.title}</span><span className="text-caption text-ink-3">{selling ? "Sets how calls are scored" : "Doctor, objections, never-say"}</span></span>
                          <IconButton aria-label={`Remove ${d.title}`} onClick={() => drop(d.id, "rp")}><Trash2 className="size-4" /></IconButton>
                        </div>
                        <Segmented aria-label={`What ${d.title} is`}>
                          <SegmentedButton active={!selling} onClick={() => selling && setSellingId(undefined)}>Call scenarios</SegmentedButton>
                          <SegmentedButton active={selling} onClick={() => setSellingId(d.id)}>Selling model</SegmentedButton>
                        </Segmented>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Dropzone label="Add your roleplay documents" kinds="Call scenarios, objection lists, your selling model" onFiles={(f) => upload(f, "rp")} />
              {rpSuggest.length > 0 && <Suggest label="From the product library" items={rpSuggest} onAdd={(x) => { setRpIds([...rpIds, x.id]); if (x.type === "Selling model" && !sellingId) setSellingId(x.id); }} />}
              <div className="squircle flex items-center gap-3 rounded-panel border border-dashed border-hair-2 px-3 py-2.5 opacity-70">
                <span className="grid size-9 shrink-0 place-items-center rounded-control bg-subtle text-ink-3"><Waypoints className="size-4" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-1 flex-col"><span className="text-body font-semibold text-ink-2">Doctors from Veeva CRM call data</span><span className="text-caption text-ink-3">Comes with the Veeva integration</span></span>
                <Chip size="xs">Soon</Chip>
              </div>
            </Card>
            <div className="squircle flex gap-3 rounded-panel border border-tint-line bg-tint/60 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white"><Mic className="size-4" aria-hidden="true" /></span>
              <Text size="body" tone="muted">
                <strong className="text-ink">The course comes with a roleplay.</strong> SwishX drafts the first call from {rpDocs.length ? `these ${rpDocs.length === 1 ? "document" : `${rpDocs.length} documents`}` : "your files"}{sellingId ? ", scored on your selling model" : ""}. You shape it in the course by chatting with the agent.
              </Text>
            </div>
          </div>
          {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
        </div>
      )}

      {step === 2 && (
        <Card className="mx-auto w-full max-w-[760px]">
          <div className="flex flex-col gap-1">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">Building {title}</Text>
            <Text tone="subtle" size="body-lg">Your files go in exactly as they are, one module each. Nothing is rewritten and no questions are added.</Text>
          </div>
          <ol className="flex flex-col gap-2">
            {repFiles.map((f, i) => {
              const Icon = FORMAT_ICON[kindOf(f)];
              const done = i < built;
              return (
                <li key={f.id} className={cn("squircle flex items-center gap-3 rounded-panel border p-3 transition-colors duration-300", done ? "border-ok-line bg-ok-bg" : i === built ? "shimmer border-tint-line bg-tint" : "border-hair bg-card")}>
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", done ? "bg-ok text-white" : "bg-black/[0.06] text-ink-3")}>{done ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-3.5" aria-hidden="true" />}</span>
                  <Text size="body-lg" weight="semibold" className="min-w-0 flex-1 truncate">Module {i + 1} · {f.title}</Text>
                  <Text size="caption" tone="subtle">{done ? "Placed as is" : i === built ? "Placing…" : "Queued"}</Text>
                </li>
              );
            })}
            <li className={cn("squircle flex items-center gap-3 rounded-panel border p-3", built > repFiles.length ? "shimmer border-tint-line bg-tint" : "border-hair bg-card")}>
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-white"><AgentIcon className="size-3.5" aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col">
                <Text size="body-lg" weight="semibold">Drafting the roleplay</Text>
                <Text size="caption" tone="subtle">Doctor, opening, objections, {sellingId ? "rubric from your selling model" : "rubric"}, never-say list</Text>
              </span>
              <Text size="caption" tone="subtle">{built > repFiles.length ? "Reading…" : "Next"}</Text>
            </li>
          </ol>
        </Card>
      )}

      {step < 2 && (
        <div className="sticky bottom-4 z-10 flex justify-end">
          <div className="flex items-center gap-3 rounded-control bg-ink px-4 py-2.5 text-white shadow-float">
            <Text size="body" tone="inverse" className="hidden opacity-75 sm:inline">
              {step === 0 ? "Next: add your files" : repFiles.length ? `${repFiles.length} module${repFiles.length === 1 ? "" : "s"} · about ${minutes} min · roleplay from ${rpDocs.length || "your"} ${rpDocs.length === 1 ? "document" : rpDocs.length ? "documents" : "files"}` : "Add at least one file"}
            </Text>
            <Button disabled={!canNext} onClick={() => (step === 1 ? create() : setStep(1))}>
              {step === 1 ? <>Create course<ArrowRight className="size-4" aria-hidden="true" /></> : <>Continue<ArrowRight className="size-4" aria-hidden="true" /></>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Suggest({ label, items, onAdd }: { label: string; items: Source[]; onAdd: (s: Source) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Text size="caption" weight="bold" tone="subtle">{label}</Text>
      <div className="flex flex-wrap gap-1.5">
        {items.map((x) => (
          <button key={x.id} type="button" onClick={() => onAdd(x)} className="flex items-center gap-1.5 rounded-chip border border-dashed border-hair-3 px-2.5 py-1.5 text-caption font-semibold text-ink-2 transition-colors hover:border-brand hover:bg-tint hover:text-brand-deep">
            <Plus className="size-3.5" aria-hidden="true" />{x.title}
          </button>
        ))}
      </div>
    </div>
  );
}

function Dropzone({ label, kinds, onFiles, big }: { label: string; kinds: string; onFiles: (files: File[]) => void; big?: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <label onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
      className={cn("squircle flex cursor-pointer flex-col items-center justify-center gap-1 rounded-panel border border-dashed p-4 text-center transition-colors hover:border-brand hover:bg-tint", big ? "min-h-[200px]" : "min-h-[84px]", over ? "border-brand bg-tint" : "border-hair-3")}>
      <span className={cn("grid place-items-center rounded-full bg-tint text-brand-deep", big ? "mb-1 size-12" : "size-8")}><Upload className={big ? "size-5" : "size-4"} aria-hidden="true" /></span>
      <span className="text-body font-semibold text-ink-2">{label}</span>
      <span className="text-caption text-ink-3">{kinds}</span>
      <input type="file" className="sr-only" multiple onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </label>
  );
}
