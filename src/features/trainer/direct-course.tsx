"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Eye, FileText, GripVertical, Trash2, Upload } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import type { Source } from "@/data/types";
import { FORMAT_ICON, fileUrl, formatOf, rememberFile } from "./source-preview";
import { IconButton } from "@/components/ui/button";

/* Documents that tell the AI how calls go; anything else is material reps see. */
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

/** The lessons, in order: drag or use the arrows to reorder, the eye to preview. */
export function LessonList<T extends { id: string; title: string; sub: string; src?: Source }>({ items, onMove, onPreview, onRemove, dense }: {
  items: T[]; onMove: (from: number, to: number) => void; onPreview: (x: T) => void; onRemove?: (x: T) => void;
  /** Narrow columns: a small icon instead of the thumbnail, and drag only. */
  dense?: boolean;
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
            className={cn("squircle group relative flex items-center rounded-panel border bg-card transition-all", dense ? "gap-2.5 p-1.5 pr-1" : "gap-3 p-2.5 pr-2",
              drag?.from === i ? "opacity-40" : "border-hair-2 hover:border-hair-3 hover:shadow-hair", over && (drag!.from > i ? "before:absolute before:inset-x-3 before:-top-1 before:h-0.5 before:rounded-full before:bg-brand" : "after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-brand"))}>
            <GripVertical className="size-4 shrink-0 cursor-grab text-ink-4 active:cursor-grabbing" aria-hidden="true" />
            <span className={cn("grid shrink-0 place-items-center rounded-glyph bg-black/[0.06] font-bold text-ink-2", dense ? "size-6 text-micro" : "size-7 text-caption")}>{i + 1}</span>
            <span className={cn("relative grid shrink-0 place-items-center overflow-hidden rounded-control", dense ? "size-8" : "size-11", THUMB[k])}>
              {url && k === "image" ? <img src={url} alt="" className="size-full object-cover" /> : url && k === "video" ? <video src={url} muted preload="metadata" className="size-full object-cover" /> : <Icon className="size-5" aria-hidden="true" />}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate font-semibold text-ink", dense ? "text-body" : "text-body-lg")}>{f.title}</span>
              <span className="truncate text-caption text-ink-3">{f.sub}</span>
            </span>
            <span className="flex shrink-0 items-center opacity-70 transition-opacity group-hover:opacity-100">
              <IconButton aria-label={`Preview ${f.title}`} onClick={() => onPreview(f)}><Eye className="size-4" /></IconButton>
              {!dense && <IconButton aria-label={`Move ${f.title} up`} disabled={i === 0} onClick={() => onMove(i, i - 1)}><ChevronUp className="size-4" /></IconButton>}
              {!dense && <IconButton aria-label={`Move ${f.title} down`} disabled={i === items.length - 1} onClick={() => onMove(i, i + 1)}><ChevronDown className="size-4" /></IconButton>}
              {onRemove && <IconButton aria-label={`Remove ${f.title}`} onClick={() => onRemove(f)}><Trash2 className="size-4" /></IconButton>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The demo-call documents: sources only the AI reads to build the scenarios. */
export function DemoDocs({ docs, onRemove, onPreview }: { docs: Source[]; onRemove?: (id: string) => void; onPreview?: (s: Source) => void }) {
  if (!docs.length) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {docs.map((d) => (
        <li key={d.id} className="squircle group flex items-center gap-3 rounded-panel border border-hair-2 bg-card p-2.5 pr-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-control bg-info-bg text-info"><FileText className="size-4" aria-hidden="true" /></span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-body font-semibold text-ink">{d.title}</span>
            <span className="text-caption text-ink-3">{d.uploaded ? "Your document" : d.type}</span>
          </span>
          {onPreview && <IconButton aria-label={`Preview ${d.title}`} onClick={() => onPreview(d)}><Eye className="size-4" /></IconButton>}
          {onRemove && <IconButton aria-label={`Remove ${d.title}`} onClick={() => onRemove(d.id)}><Trash2 className="size-4" /></IconButton>}
        </li>
      ))}
    </ul>
  );
}

/** A drop target that's also a file picker: one row, the same height wherever it's used. */
export function Dropzone({ label, kinds, onFiles, slim }: { label: string; kinds: string; onFiles: (files: File[]) => void; big?: boolean; slim?: boolean }) {
  const [over, setOver] = useState(false);
  return (
    <label onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setOver(false); onFiles(Array.from(e.dataTransfer.files)); }}
      title={slim ? kinds : undefined}
      className={cn("squircle flex cursor-pointer items-center rounded-panel border border-dashed transition-colors hover:border-brand hover:bg-tint", slim ? "h-8 min-w-0 flex-1 gap-2 rounded-control px-2.5" : "gap-3 px-3 py-2.5", over ? "border-brand bg-tint" : "border-hair-3")}>
      <span className={cn("grid shrink-0 place-items-center text-brand-deep", slim ? "" : "size-9 rounded-control bg-tint")}><Upload className={slim ? "size-3.5" : "size-4"} aria-hidden="true" /></span>
      {slim ? <span className="truncate text-caption font-semibold text-ink-2">{label} <span className="font-normal text-ink-3">or drop here</span></span> : <span className="flex min-w-0 flex-col">
        <span className="text-body font-semibold text-ink-2">{label} <span className="font-normal text-ink-3">or drop them here</span></span>
        <span className="truncate text-caption text-ink-3">{kinds}</span>
      </span>}
      <input type="file" className="sr-only" multiple onChange={(e) => { onFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
    </label>
  );
}
