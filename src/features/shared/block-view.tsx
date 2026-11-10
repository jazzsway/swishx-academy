"use client";

import { useState } from "react";
import { Check, CirclePlay, Layers, ListChecks, BookOpenText, Mic, X, FileText, Presentation, Headphones, ChartPie } from "lucide-react";
import { VideoPlayer } from "@/features/media/video-player";
import { AudioPlayer, DocumentViewer, GraphicView, VisualAidWalkthrough } from "@/features/media/readers";
import { cn } from "@/lib/cn";
import type { Block, Citation as Cite, Para } from "@/data/types";
import { scenario } from "@/data/scenarios";
import { source } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Citation } from "@/components/patterns/academy";

export const BLOCK_META: Record<Block["type"], { label: string; icon: typeof Check }> = {
  lesson: { label: "Lesson", icon: BookOpenText },
  keypoints: { label: "Key points", icon: ListChecks },
  flashcards: { label: "Flashcards", icon: Layers },
  check: { label: "Knowledge check", icon: Check },
  video: { label: "Video", icon: CirclePlay },
  document: { label: "Read", icon: FileText },
  visualaid: { label: "Visual aid walkthrough", icon: Presentation },
  audio: { label: "Listen", icon: Headphones },
  graphic: { label: "Graphic", icon: ChartPie },
  scenario: { label: "Roleplay", icon: Mic },
};

export function citeNumber(sourceIds: string[], c?: Cite) {
  if (!c) return 0;
  const i = sourceIds.indexOf(c.sourceId);
  return i >= 0 ? i + 1 : sourceIds.length + 1;
}

function ParaText({ p, sourceIds, flag }: { p: Para; sourceIds: string[]; flag?: boolean }) {
  const missing = !p.cite || p.missing;
  return (
    <>
      {flag && missing ? <mark className="cite-missing">{p.text}</mark> : p.text}
      {p.cite && !p.missing && <Citation n={citeNumber(sourceIds, p.cite)} title={source(p.cite.sourceId)?.title ?? "Source"} page={p.cite.page} />}
      {flag && missing && <span className="ml-1.5 rounded-glyph bg-danger-bg px-1.5 py-0.5 text-micro font-bold text-danger">No source</span>}
    </>
  );
}

/** Renders one block. `interactive` makes checks and flashcards work (rep player); `flag` marks uncited text (editor). */
export function BlockView({ block, sourceIds, interactive, flag, onCheckAnswered, onComplete, siblings, size = "md" }: {
  block: Block; sourceIds: string[]; interactive?: boolean; flag?: boolean; onCheckAnswered?: (correct: boolean) => void;
  /** Media blocks call this when their completion rule is met (video 90% watched, every page read, audio finished). */
  onComplete?: () => void; siblings?: Block[]; size?: "md" | "lg";
}) {
  const body = size === "lg" ? "subhead" : "body-lg";
  if (block.type === "lesson")
    return (
      <div className="flex flex-col gap-3">
        {block.paragraphs?.map((p, i) => (
          <Text as="p" key={i} size={body} tone="muted" className="leading-relaxed"><ParaText p={p} sourceIds={sourceIds} flag={flag} /></Text>
        ))}
      </div>
    );
  if (block.type === "keypoints")
    return (
      <ul className="flex flex-col gap-2.5">
        {block.points?.map((p, i) => (
          <li key={i} className="flex gap-3">
            <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-tint text-micro font-bold text-brand-deep">{i + 1}</span>
            <Text size={body} tone="muted" className="leading-relaxed"><ParaText p={p} sourceIds={sourceIds} flag={flag} /></Text>
          </li>
        ))}
      </ul>
    );
  if (block.type === "flashcards") return <Flashcards block={block} sourceIds={sourceIds} interactive={interactive} />;
  if (block.type === "check") return <KnowledgeCheck block={block} sourceIds={sourceIds} interactive={interactive} onAnswered={onCheckAnswered} size={size} />;
  if (block.type === "video" && block.video)
    return <VideoPlayer spec={block.video} title={block.title} compact={!interactive} onWatched={(pct) => { if (pct >= 90) onComplete?.(); }} />;
  if (block.type === "document" && block.document) return <DocumentViewer spec={block.document} compact={!interactive} onAllViewed={onComplete} />;
  if (block.type === "visualaid" && block.visualaid) return <VisualAidWalkthrough spec={block.visualaid} onDone={onComplete} />;
  if (block.type === "graphic" && block.graphic) return <GraphicView spec={block.graphic} />;
  if (block.type === "audio" && block.audio) return <AudioPlayer spec={block.audio} siblings={siblings ?? []} onDone={onComplete} />;
  if (block.type === "scenario") {
    const sc = block.scenarioId ? scenario(block.scenarioId) : undefined;
    return (
      <div className="squircle flex items-start gap-4 rounded-panel border border-tint-line bg-tint p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white"><Mic className="size-5" aria-hidden="true" /></span>
        <div className="flex flex-col gap-1">
          <Text size="body-lg" weight="bold">{sc?.persona.name} · {sc?.persona.specialty}</Text>
          <Text size="body" tone="muted">{sc?.persona.setting}. {sc?.objective}</Text>
          <Text size="caption" tone="subtle">Rehearse it any time in Practice. Practice is private.</Text>
        </div>
      </div>
    );
  }
  return null;
}

function Flashcards({ block, sourceIds, interactive }: { block: Block; sourceIds: string[]; interactive?: boolean }) {
  const [flipped, setFlipped] = useState<number[]>([]);
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {block.cards?.map((c, i) => {
        const on = flipped.includes(i);
        return (
          <button key={i} type="button" disabled={!interactive}
            onClick={() => setFlipped(on ? flipped.filter((x) => x !== i) : [...flipped, i])}
            className={cn("squircle flex min-h-[110px] flex-col justify-between gap-2 rounded-panel border p-4 text-left transition-all",
              on ? "border-ink bg-ink text-white" : "border-hair-2 bg-card hover:border-tint-line", !interactive && "cursor-default")}>
            <span className={cn("text-body-lg font-semibold leading-snug", on ? "text-white" : "text-ink")}>{on || !interactive ? (on ? c.back : c.front) : c.front}</span>
            {!interactive && <span className="text-body text-ink-3">{c.back}{c.cite && <Citation n={citeNumber(sourceIds, c.cite)} title={source(c.cite.sourceId)?.title ?? ""} page={c.cite.page} />}</span>}
            {interactive && <span className={cn("text-micro font-bold uppercase tracking-wider", on ? "text-white/60" : "text-ink-4")}>{on ? "Tap to flip back" : "Tap to reveal"}</span>}
          </button>
        );
      })}
    </div>
  );
}

function KnowledgeCheck({ block, sourceIds, interactive, onAnswered, size }: { block: Block; sourceIds: string[]; interactive?: boolean; onAnswered?: (ok: boolean) => void; size: "md" | "lg" }) {
  const [picked, setPicked] = useState<number | null>(null);
  const ch = block.check!;
  const done = picked !== null;
  return (
    <div className="flex flex-col gap-3">
      <Text size={size === "lg" ? "title" : "subhead"} weight="bold" className="leading-snug">{ch.question}</Text>
      <div className="flex flex-col gap-2">
        {ch.options.map((o, i) => {
          const correct = i === ch.answer;
          const state = !done && interactive ? "idle" : !interactive ? (correct ? "key" : "idle") : correct ? "right" : picked === i ? "wrong" : "idle";
          return (
            <button key={i} type="button" disabled={!interactive || done} onClick={() => { setPicked(i); onAnswered?.(i === ch.answer); }}
              className={cn("squircle flex items-center gap-3 rounded-control border px-4 py-3 text-left text-body-lg transition-colors",
                state === "idle" && "border-hair-2 bg-card",
                state === "idle" && interactive && !done && "hover:border-brand hover:bg-tint",
                (state === "right" || state === "key") && "border-ok bg-ok-bg font-semibold text-ok",
                state === "wrong" && "border-danger bg-danger-bg text-danger")}>
              <span className="flex-1">{o}</span>
              {(state === "right" || state === "key") && <Check className="size-4.5" aria-hidden="true" />}
              {state === "wrong" && <X className="size-4.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {(done || !interactive) && (
        <div className={cn("squircle rounded-panel px-4 py-3", !interactive || picked === ch.answer ? "bg-ok-bg" : "bg-warn-bg")}>
          <Text size="body" tone="muted">
            {interactive && <strong className={picked === ch.answer ? "text-ok" : "text-warn"}>{picked === ch.answer ? "Correct. " : "Not quite. "}</strong>}
            {ch.rationale}
            {ch.cite && <Citation n={citeNumber(sourceIds, ch.cite)} title={source(ch.cite.sourceId)?.title ?? ""} page={ch.cite.page} />}
          </Text>
        </div>
      )}
    </div>
  );
}

export function SourceList({ sourceIds }: { sourceIds: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {sourceIds.map((id, i) => {
        const s = source(id);
        return (
          <li key={id} className="flex gap-2 text-caption text-ink-3">
            <span className="font-bold text-brand-deep">[{i + 1}]</span>
            <span>{s?.title ?? id}{/* v1-hidden: doc number. {s?.docNumber ? ` · ${s.docNumber}` : ""} */}{/* v1-hidden: {s && !isApproved(s) && <strong className="font-semibold text-warn"> · needs MLR approval</strong>} */}</span>
          </li>
        );
      })}
    </ol>
  );
}
