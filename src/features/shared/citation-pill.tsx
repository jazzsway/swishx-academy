"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Eye, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import { source } from "@/data/org";

export interface Cite { sourceId: string; page: number; quote: string }

/**
 * A line's sources, the way the SwishX for Biz studios show them: a small badge at the end of the line
 * with how many there are. Clicking it opens a card with the file, the page and the words it rests on,
 * paging through the sources, and the source itself one click away.
 */
export function CitationPill({ cites, onView }: { cites: Cite[]; onView: (sourceId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  /* In a portal against the viewport, so a scrolling column doesn't clip it; flipped above when there's no room below. */
  const place = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = 300;
    const height = cardRef.current?.offsetHeight ?? 160;
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const below = rect.bottom + 6;
    setCoords({ left, top: below + height > window.innerHeight - 12 ? Math.max(12, rect.top - height - 6) : below });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || cardRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, place]);

  if (!cites.length) return null;
  const cur = cites[Math.min(index, cites.length - 1)];
  const title = source(cur.sourceId)?.title ?? "Your file";

  return (
    <>
      <button ref={anchorRef} type="button" aria-expanded={open} aria-label={`${cites.length} source${cites.length > 1 ? "s" : ""} for this`}
        onClick={(e) => { e.stopPropagation(); if (open) { setOpen(false); return; } place(); setOpen(true); }}
        className={cn("mx-1 inline-flex translate-y-[-1px] items-center gap-0.5 rounded-full px-1.5 py-0.5 align-middle text-micro font-bold leading-none transition-colors",
          open ? "bg-brand text-white" : "bg-ink text-white hover:bg-brand")}>
        <FileText className="size-2.5" aria-hidden="true" />{cites.length}
      </button>
      {open && createPortal(
        <div ref={cardRef} onClick={(e) => e.stopPropagation()} style={{ left: coords?.left ?? -9999, top: coords?.top ?? -9999 }}
          className="fixed z-[9999] w-[300px] rounded-panel border border-hair-2 bg-card p-3 shadow-float">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} aria-label="Previous source"
                className="grid size-6 place-items-center rounded-glyph text-ink-3 transition-colors hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-25"><ChevronLeft className="size-3.5" /></button>
              <button type="button" onClick={() => setIndex((i) => Math.min(cites.length - 1, i + 1))} disabled={index >= cites.length - 1} aria-label="Next source"
                className="grid size-6 place-items-center rounded-glyph text-ink-3 transition-colors hover:bg-subtle hover:text-ink disabled:pointer-events-none disabled:opacity-25"><ChevronRight className="size-3.5" /></button>
            </div>
            <span className="text-caption font-bold tabular-nums text-ink-4">{Math.min(index, cites.length - 1) + 1}/{cites.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="size-4 shrink-0 text-info" aria-hidden="true" />
            <span className="truncate text-caption font-bold text-ink">{title}</span>
            <span className="shrink-0 text-caption text-ink-4">· p. {cur.page}</span>
          </div>
          <p className="mt-1.5 text-body italic leading-snug text-ink-2">“{cur.quote}”</p>
          <button type="button" onClick={() => { setOpen(false); onView(cur.sourceId); }}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-glyph border border-hair-2 bg-subtle px-2 py-1.5 text-caption font-bold text-ink-2 transition-colors hover:border-brand hover:bg-tint hover:text-brand-deep">
            <Eye className="size-3.5" aria-hidden="true" />View source
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
