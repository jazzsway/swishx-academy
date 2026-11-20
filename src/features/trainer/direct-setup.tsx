"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Plus, Upload, X } from "lucide-react";
import { AgentIcon, LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { DIVISIONS, SOURCES, product } from "@/data/org";
import type { Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { FORMAT_ICON, FORMAT_LABEL, SourcePreview, fileUrl } from "./source-preview";
import { directModules } from "./materials";
import { FOR_ROLEPLAY, kindOf, useUpload } from "./direct-course";
import { useTrainingChat } from "./course/training-chat-store";
import { draftObjectives } from "@/lib/objectives";

/* Sample briefs; picking one fills in the box. */
const SAMPLES: [string, string][] = [
  ["New trial data", "Reps can present the new trial results exactly as approved, keep fair balance, and handle doctors who are happy with what they prescribe."],
  ["Nurse questions", "Reps answer nurses' dosing and side-effect questions on-label, and report any adverse event they hear about."],
  ["Access & support", "Reps explain the support program to practice managers and patients without promising coverage."],
];

/** Reference material, like objection lists or a selling model, starts as information only; everything else reps see. */
const visibleByDefault = (s: Source) => !(FOR_ROLEPLAY.has(s.type) || /objection|selling|sales model|payer|handler|framework|script|faq|call guide/i.test(s.title));

/** A short name from the brief: its first clause, without "reps can…". */
function nameFrom(brief: string, brand?: string) {
  const first = brief.split(/[.!?\n]/)[0].replace(/^\s*(train |teach |help )?reps?\s+(to\s+|can\s+|should\s+|will\s+)?(be able to\s+)?/i, "").trim();
  const phrase = first.split(/,|;|\s+(?:on the|without|so that|then)\s+/i)[0];
  const words = phrase.split(/\s+/).slice(0, 9).join(" ").replace(/[,;:]$/, "");
  const name = words ? words.charAt(0).toUpperCase() + words.slice(1) : "New training";
  return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand}: ${name}` : name;
}

/**
 * A new training with the trainer's own material starts like a studio project: the brief and the
 * material, with which files reps see chosen as they're added. Continue creates it as a draft with its
 * objectives already drawn up, and opens them: objectives, situations, settings, then publish and assign.
 */
export function DirectSetup() {
  const router = useRouter();
  const productId = product(useSearchParams().get("product") ?? undefined)?.id;
  const prod = product(productId);
  const s = useApp();
  const me = useMe();
  const upload = useUpload(productId);
  const [brief, setBrief] = useState("");
  const [files, setFiles] = useState<{ id: string; visible: boolean }[]>([]);
  const [preview, setPreview] = useState<Source | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [over, setOver] = useState(false);

  const all = [...SOURCES, ...s.uploads];
  const items = files.map((f) => ({ ...f, src: all.find((x) => x.id === f.id) })).filter((f): f is { id: string; visible: boolean; src: Source } => !!f.src);
  /* Into a zone, files go where they were dropped; anywhere else, by what they look like. */
  const add = (list: Source[], visible?: boolean) => setFiles((fs) => [...fs, ...list.filter((x) => !fs.some((f) => f.id === x.id)).map((x) => ({ id: x.id, visible: visible ?? visibleByDefault(x) }))]);
  const touched = !!(brief || files.length);

  /** The brief and the files become a draft training with its objectives drafted; the chat picks up from there. */
  function start() {
    if (!brief.trim()) return;
    const title = nameFrom(brief, prod?.brand);
    const shown = items.filter((f) => f.visible), info = items.filter((f) => !f.visible);
    const teams = prod ? [prod.divisionId] : [];
    const teamNames = teams.length ? teams.map((t) => DIVISIONS.find((d) => d.id === t)?.name).join(" + ") : "everyone";
    const mods = directModules(shown.map((f) => f.src), `d${Date.now().toString(36).slice(-4)}`);
    const id = s.createCourse({
      title, productId, format: "long", type: "linear", origin: "direct", roleplaySourceIds: info.map((f) => f.id),
      objective: brief.trim(), audience: `Field reps · ${teamNames}`, writtenFor: "reps", teams, sourceIds: items.map((f) => f.id),
      competencyIds: [...new Set(mods.map((m) => m.competency))], scope: { variants: [], indications: [], therapyAreas: [] },
      visibility: "assigned", screening: true,
    });
    const obs = draftObjectives({ brief: brief.trim(), productId, materials: items.map((f) => f.src) });
    s.updateCourse(id, { brief: brief.trim(), objectives: [] });
    s.setModules(id, mods);
    useTrainingChat.getState().push(id,
      { id: "s-brief", from: "you", text: brief.trim() + (items.length ? `\n📎 ${items.length} file${items.length === 1 ? "" : "s"}` : "") },
      /* The agent drafts in front of the trainer, in the editor's chat; the objectives land when it's done. */
      { id: "s-set", from: "ai", text: "", at: 0,
        steps: [`Reading your brief`, ...(items.length ? [`Reading ${items.length} file${items.length === 1 ? "" : "s"}${items.length > 1 ? `: ${items.slice(0, 2).map((f) => f.src.title).join(", ")}${items.length > 2 ? "…" : ""}` : ""}`] : []), `Drafting objectives, each tied to where it comes from`],
        pending: { objectives: obs, text: `I named it “${title}” and drafted ${obs.length} objectives from your brief${items.length ? " and files" : ""}, ${me.first}: ${obs.map((o, i) => `${i + 1}. ${o.title}`).join("; ")}. Each shows where it comes from. Tell me what to add, change or remove, or open one to sharpen it. Say “next” and I'll write the situations that test them.${shown.length || info.length ? ` Reps see ${shown.length} file${shown.length === 1 ? "" : "s"}; ${info.length} ${info.length === 1 ? "is" : "are"} information only. Change that under Files.` : ""}` } });
    router.push(`/trainer/courses/${id}/roleplay`);
  }

  const header = (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-card px-3 sm:px-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-control border border-tint-line bg-gradient-to-br from-tint to-white"><LogoMark size={17} className="text-brand" /></span>
      <span className="h-5 w-px shrink-0 bg-hair-2" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <Text as="h1" size="body-lg" weight="extrabold" truncate className="leading-tight text-ink-3">New training</Text>
        <span className="flex items-center gap-1.5 text-micro font-semibold text-ink-3">{prod?.brand ?? "Company"}<span className="rounded-glyph bg-info-bg px-1.5 py-px text-info">With my material</span></span>
      </div>
      <div className="relative ml-auto">
        <button type="button" aria-label="Close" title="Close" onClick={() => (touched ? setLeaving(true) : router.push("/trainer/courses"))}
          className="grid size-9 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-ink"><X className="size-4.5" /></button>
        {leaving && (
          <div className="select-pop absolute right-0 top-full z-20 mt-2 flex w-[280px] flex-col gap-3 rounded-panel border border-hair bg-card p-4 shadow-modal">
            <Text size="body" weight="semibold">Leave without creating it?</Text>
            <Text size="caption" tone="subtle">Nothing is saved until you continue.</Text>
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => router.push("/trainer/courses")}>Leave</Button><Button size="sm" onClick={() => setLeaving(false)}>Keep going</Button></div>
          </div>
        )}
      </div>
    </header>
  );

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { add(upload(Array.from(e.target.files ?? []), "f")); e.target.value = ""; };
  const drop = {
    onDragOver: (e: React.DragEvent) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } },
    onDragLeave: () => setOver(false),
    onDrop: (e: React.DragEvent) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setOver(false); add(upload(Array.from(e.dataTransfer.files), "f")); },
  };
  const ready = !!brief.trim();
  const seen = items.filter((f) => f.visible).length;

  /* Two separate things, in order: the prompt (what the training is), then the material (what it's built
     from), each file marked for reps or as context. The way on comes after both. */
  return (
      <div className="flex h-dvh flex-col bg-canvas">
        {header}
        <main className="min-h-0 flex-1 overflow-y-auto bg-subtle/60" {...drop}>
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3.5 px-5 pb-10 pt-[5vh]">
            <div className="flex flex-col items-center gap-1.5 pb-2 text-center">
              <span className="grid size-10 place-items-center rounded-panel border border-tint-line bg-gradient-to-br from-tint to-white shadow-hair"><AgentIcon className="size-5 text-brand" aria-hidden="true" /></span>
              <Text as="h1" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">What should reps be able to do?</Text>
              <Text size="body-lg" tone="subtle">Describe the training, add your material, and SwishX drafts the objectives and the calls.</Text>
            </div>

            {/* 1 · The prompt. */}
            <section className="flex flex-col rounded-[26px] border border-hair bg-card shadow-soft transition-[border-color,box-shadow] focus-within:border-brand/50 focus-within:shadow-float">
              <label htmlFor="brief" className="flex items-center gap-2 px-6 pt-5 text-caption font-bold uppercase tracking-wider text-ink-3"><span className="grid size-5 place-items-center rounded-full bg-brand text-micro font-extrabold text-white">1</span>The training</label>
              <textarea id="brief" rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start(); }}
                placeholder="e.g. Reps can present the new trial results exactly as approved, keep fair balance, and handle doctors who are happy with what they prescribe."
                className="min-h-[112px] w-full resize-none bg-transparent px-6 pb-3 pt-2 text-subhead leading-relaxed text-ink outline-none placeholder:text-ink-4" />
              <div className="flex flex-wrap items-center gap-1.5 border-t border-hair px-5 py-2.5">
                <Text size="caption" tone="subtle" className="mr-0.5">Try</Text>
                {SAMPLES.map(([label, t]) => (
                  <button key={label} type="button" onClick={() => setBrief(t)} title={t}
                    className={cn("rounded-chip border px-2.5 py-1 text-caption font-semibold transition-colors", brief === t ? "border-brand bg-tint text-brand-deep" : "border-hair-2 bg-card text-ink-2 hover:border-brand hover:text-brand-deep")}>{label}</button>
                ))}
              </div>
            </section>

            {/* 2 · The material: one place to add it; each file is shown to reps or kept as context. */}
            <section className={cn("squircle flex flex-col gap-3 rounded-card border bg-card p-4 transition-colors", over ? "border-brand ring-2 ring-brand/20" : "border-hair")} aria-labelledby="material-h">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span id="material-h" className="flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-ink-3"><span className="grid size-5 place-items-center rounded-full bg-ink-3 text-micro font-extrabold text-white">2</span>Your material</span>
                <span className="text-caption text-ink-4">Optional · you can add it later</span>
                {items.length > 0 && (
                  <label className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 py-1.5 text-caption font-bold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep">
                    <Plus className="size-3.5" aria-hidden="true" />Add files
                    <input type="file" multiple className="sr-only" onChange={pick} />
                  </label>
                )}
              </div>
              {items.length === 0 ? (
                <label className={cn("squircle flex cursor-pointer items-center gap-3 rounded-panel border border-dashed px-3.5 py-2.5 transition-colors hover:border-brand hover:bg-tint/50", over ? "border-brand bg-tint" : "border-hair-3")}>
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint text-brand-deep"><Upload className="size-4" aria-hidden="true" /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body font-semibold text-ink-2">Drop files here, or <span className="text-brand-deep">browse</span></span>
                    <span className="text-caption text-ink-3">Decks, PDFs, videos, objection handlers. You pick which ones reps see.</span>
                  </span>
                  <input type="file" multiple className="sr-only" onChange={pick} />
                </label>
              ) : (
                <>
                  <ul className="flex flex-col gap-2">
                    {items.map((f) => <FileRow key={f.id} s={f.src} visible={f.visible} onPreview={() => setPreview(f.src)}
                      onSet={(v) => setFiles(files.map((x) => (x.id === f.id ? { ...x, visible: v } : x)))} onRemove={() => setFiles(files.filter((x) => x.id !== f.id))} />)}
                  </ul>
                  <Text size="caption" tone="subtle">Reps see {seen} as lessons, in this order. {items.length - seen ? `${items.length - seen} ${items.length - seen === 1 ? "is" : "are"} context only: SwishX reads ${items.length - seen === 1 ? "it" : "them"} to write the objectives and calls; reps don't see ${items.length - seen === 1 ? "it" : "them"}.` : ""}</Text>
                </>
              )}
            </section>

            {/* The way on, after both. */}
            <div className="flex items-center justify-end gap-3">
              <Text size="caption" tone="subtle" className="hidden sm:block">{ready ? "⌘↵" : "Describe the training to continue"}</Text>
              <Button size="lg" disabled={!ready} onClick={start}>Create the training<ArrowRight className="size-4" aria-hidden="true" /></Button>
            </div>

          </div>
        </main>
        {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
      </div>
    );
}

/* A file's type, at a glance, when there's no picture of it to show. */
const TINT: Record<string, string> = { pdf: "bg-danger-bg text-danger", slides: "bg-tint text-brand-deep", doc: "bg-info-bg text-info", video: "bg-ink text-white", audio: "bg-ok-bg text-ok", image: "bg-info-bg text-info", data: "bg-ok-bg text-ok", other: "bg-subtle text-ink-3" };

/** An attached file: the picture or video itself when there is one, its type otherwise; its name and size; whether reps see it; and remove. */
function FileRow({ s, visible, onPreview, onSet, onRemove }: { s: Source; visible: boolean; onPreview: () => void; onSet: (visible: boolean) => void; onRemove: () => void }) {
  const k = kindOf(s);
  const Icon = FORMAT_ICON[k];
  const url = s.uploaded ? fileUrl(s.id) : undefined;
  return (
    <li className="group flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-hair bg-card p-2 pr-2.5 transition-colors hover:border-hair-3">
      <button type="button" onClick={onPreview} title={`Preview ${s.title}`} className="flex min-w-0 flex-1 basis-[220px] items-center gap-3 text-left">
        <span className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-control", TINT[k] ?? TINT.other)}>
          {url && k === "image" ? <img src={url} alt="" className="size-full object-cover" />
            : url && k === "video" ? <video src={url} muted preload="metadata" className="size-full object-cover" />
            : <Icon className="size-5" aria-hidden="true" />}
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body font-semibold text-ink group-hover:text-brand-deep">{s.title}</span>
          <span className="text-caption text-ink-3">{FORMAT_LABEL[k]}{s.pages ? ` · ${s.pages} pages` : ""}</span>
        </span>
      </button>
      <span className="flex shrink-0 items-center gap-1.5">
        <span role="radiogroup" aria-label={`Who sees ${s.title}`} className="inline-flex rounded-control border border-hair-2 bg-subtle p-0.5">
          {[{ v: true, label: "Show to reps", icon: Eye }, { v: false, label: "Context only", icon: EyeOff }].map((o) => (
            <button key={o.label} type="button" role="radio" aria-checked={visible === o.v} onClick={() => onSet(o.v)}
              title={o.v ? "Reps study it as a lesson" : "SwishX reads it; reps don't see it"}
              className={cn("flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-caption font-bold transition-colors",
                visible === o.v ? (o.v ? "bg-card text-ok shadow-hair" : "bg-card text-info shadow-hair") : "text-ink-4 hover:text-ink-2")}>
              <o.icon className="size-3.5" aria-hidden="true" />{o.label}
            </button>
          ))}
        </span>
        <button type="button" onClick={onRemove} aria-label={`Remove ${s.title}`} title="Remove" className="grid size-8 place-items-center rounded-control text-ink-4 transition-colors hover:bg-subtle hover:text-danger"><X className="size-4" /></button>
      </span>
    </li>
  );
}
