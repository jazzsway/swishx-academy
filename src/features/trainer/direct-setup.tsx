"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ArrowUp, Eye, EyeOff, Paperclip, Plus, Upload, X } from "lucide-react";
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
import { FOR_ROLEPLAY, THUMB, kindOf, useUpload } from "./direct-course";
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
  const add = (list: Source[]) => setFiles((fs) => [...fs, ...list.filter((x) => !fs.some((f) => f.id === x.id)).map((x) => ({ id: x.id, visible: visibleByDefault(x) }))]);
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

  /* Like starting a chat: one prompt box, the files attached inside it, and the send arrow last. */
  return (
      <div className="flex h-dvh flex-col bg-canvas">
        {header}
        <main className="min-h-0 flex-1 overflow-y-auto bg-subtle/60" {...drop}>
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-5 pb-16 pt-[9vh]">
            <div className="flex flex-col items-center gap-2 pb-2 text-center">
              <span className="grid size-12 place-items-center rounded-panel border border-tint-line bg-gradient-to-br from-tint to-white shadow-hair"><AgentIcon className="size-6 text-brand" aria-hidden="true" /></span>
              <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">What should reps be able to do?</Text>
              <Text size="body-lg" tone="subtle">Describe the training and attach your material. SwishX drafts the objectives and the calls from both.</Text>
            </div>

            <section className={cn("flex flex-col rounded-[26px] border bg-card shadow-soft transition-[border-color,box-shadow] focus-within:border-brand/50 focus-within:shadow-float", over ? "border-brand ring-2 ring-brand/20" : "border-hair")}>
              {/* The material, attached to the prompt: what reps see is picked on each file. */}
              {items.length > 0 && (
                <div className="flex flex-col gap-2 px-4 pt-4">
                  <ul className="flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:thin]" aria-label="Your material">
                    {items.map((f) => <FileCard key={f.id} s={f.src} visible={f.visible} onToggle={() => setFiles(files.map((x) => (x.id === f.id ? { ...x, visible: !x.visible } : x)))}
                      onPreview={() => setPreview(f.src)} onRemove={() => setFiles(files.filter((x) => x.id !== f.id))} />)}
                    <li className="shrink-0">
                      <label className="flex h-full w-[92px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-panel border border-dashed border-hair-3 text-caption font-semibold text-ink-3 transition-colors hover:border-brand hover:bg-tint/60 hover:text-brand-deep">
                        <Plus className="size-4.5" aria-hidden="true" />Add
                        <input type="file" multiple className="sr-only" onChange={pick} />
                      </label>
                    </li>
                  </ul>
                  <Text size="caption" tone="subtle" className="px-0.5">Reps see {seen} as lessons, in this order. {items.length - seen ? `${items.length - seen} ${items.length - seen === 1 ? "is" : "are"} information only: SwishX uses ${items.length - seen === 1 ? "it" : "them"}, reps don't see ${items.length - seen === 1 ? "it" : "them"}.` : "Switch one to Info only to keep it from reps."}</Text>
                </div>
              )}
              <label htmlFor="brief" className="sr-only">What should reps learn and be able to do?</label>
              <textarea id="brief" rows={5} value={brief} onChange={(e) => setBrief(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) start(); }}
                placeholder="e.g. Reps can present the new trial results exactly as approved, keep fair balance, and handle doctors who are happy with what they prescribe."
                className={cn("w-full resize-none bg-transparent px-6 pb-3 text-subhead leading-relaxed text-ink outline-none placeholder:text-ink-4", items.length ? "min-h-[120px] pt-3" : "min-h-[150px] pt-6")} />
              <div className="flex items-center gap-2 rounded-b-[26px] border-t border-hair bg-canvas/95 px-3.5 py-2.5">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-chip px-2.5 py-1.5 text-body font-medium text-ink-3 transition-colors hover:bg-tint hover:text-brand">
                  <Paperclip className="size-4" aria-hidden="true" />{items.length ? `${items.length} file${items.length === 1 ? "" : "s"}` : "Attach material"}
                  <input type="file" multiple className="sr-only" onChange={pick} />
                </label>
                <span className="ml-auto hidden text-caption text-ink-4 sm:block">{ready ? "⌘↵ to continue" : ""}</span>
                <button type="button" onClick={start} disabled={!ready} aria-label="Continue" title={ready ? "Continue (⌘↵)" : "Describe the training to continue"}
                  className="grid size-9 place-items-center rounded-control bg-brand text-white shadow-sm transition-all hover:scale-105 hover:bg-brand-deep active:scale-95 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100">
                  <ArrowUp className="size-4.5 stroke-[2.6]" aria-hidden="true" />
                </button>
              </div>
            </section>
            {items.length === 0 && (
              <Text size="caption" tone="subtle" className="-mt-2 flex items-center justify-center gap-1.5 text-center">
                <Upload className="size-3.5 shrink-0" aria-hidden="true" />Attach decks, PDFs, videos or reference documents, or drop them anywhere. You choose which ones reps see.
              </Text>
            )}

            {/* Ideas to start from. */}
            <div className="flex flex-col gap-2 pt-2">
              <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider" className="px-1">Or start from one of these</Text>
              {SAMPLES.map(([label, t]) => {
                const on = brief === t;
                return (
                  <button key={label} type="button" onClick={() => setBrief(t)}
                    className={cn("group flex items-center gap-3 rounded-panel border px-3.5 py-2.5 text-left transition-all", on ? "border-brand bg-tint/70 ring-2 ring-brand/15" : "border-hair bg-card hover:border-brand")}>
                    <span className="shrink-0 rounded-chip border border-tint-line bg-tint px-2 py-0.5 text-caption font-extrabold text-brand-deep">{label}</span>
                    <span className="line-clamp-1 min-w-0 flex-1 text-body text-ink-2">&ldquo;{t}&rdquo;</span>
                    <span className="flex shrink-0 items-center gap-1 text-caption font-bold text-brand opacity-80 group-hover:opacity-100"><span className="hidden sm:inline">{on ? "In the box" : "Use it"}</span><ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span>
                  </button>
                );
              })}
            </div>
          </div>
        </main>
        {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
      </div>
    );
}

/** An attached file, inside the prompt: a preview, its name, and whether reps see it. */
function FileCard({ s, visible, onToggle, onPreview, onRemove }: { s: Source; visible: boolean; onToggle: () => void; onPreview: () => void; onRemove: () => void }) {
  const k = kindOf(s);
  const Icon = FORMAT_ICON[k];
  const url = s.uploaded ? fileUrl(s.id) : undefined;
  return (
    <li className="squircle group relative flex w-[168px] shrink-0 flex-col overflow-hidden rounded-panel border border-hair bg-card transition-shadow hover:shadow-hair">
      <button type="button" onClick={onPreview} className="flex flex-col text-left" title={`Preview ${s.title}`}>
        <span className={cn("grid h-[76px] place-items-center overflow-hidden transition-opacity", THUMB[k], !visible && "opacity-45 grayscale")}>
          {url && k === "image" ? <img src={url} alt="" className="size-full object-cover" />
            : url && k === "video" ? <video src={url} muted preload="metadata" className="size-full object-cover" />
            : <Icon className="size-6 opacity-80" aria-hidden="true" />}
        </span>
        <span className="flex flex-col px-2.5 pb-1.5 pt-2">
          <span className="truncate text-caption font-semibold text-ink">{s.title}</span>
          <span className="text-micro text-ink-3">{FORMAT_LABEL[k]}{s.pages ? ` · ${s.pages} pages` : ""}</span>
        </span>
      </button>
      {/* Whether reps see it, chosen right here: a lesson, or information only. */}
      <button type="button" role="switch" aria-checked={visible} onClick={onToggle} title={visible ? "Reps see it as a lesson. Click to make it information only." : "Information only. Click to show it to reps."}
        className={cn("mx-2 mb-2 mt-auto flex items-center gap-1.5 rounded-control px-2 py-1 text-micro font-bold transition-colors", visible ? "bg-ok-bg text-ok hover:bg-ok-bg/70" : "bg-subtle text-ink-3 hover:bg-hair")}>
        {visible ? <Eye className="size-3.5" aria-hidden="true" /> : <EyeOff className="size-3.5" aria-hidden="true" />}{visible ? "Reps see it" : "Info only"}
        <span className={cn("relative ml-auto h-3.5 w-6 rounded-full transition-colors", visible ? "bg-ok" : "bg-hair-3")}><span className={cn("absolute top-0.5 size-2.5 rounded-full bg-white transition-all", visible ? "left-[12px]" : "left-0.5")} /></span>
      </button>
      <button type="button" aria-label={`Remove ${s.title}`} onClick={onRemove} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-card/90 text-ink-3 opacity-0 shadow-hair transition-opacity hover:text-ink group-hover:opacity-100 focus:opacity-100"><X className="size-3.5" /></button>
    </li>
  );
}
