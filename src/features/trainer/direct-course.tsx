"use client";

import { useApp } from "@/store/app-store";
import type { Source } from "@/data/types";
import { formatOf, rememberFile } from "./source-preview";

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
