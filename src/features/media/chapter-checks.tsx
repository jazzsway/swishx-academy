"use client";

import { useRef, useState } from "react";
import { Check, CircleHelp, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VideoSpec } from "@/data/types";
import { fmtTime } from "@/data/media";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

/**
 * In-video questions: when a chapter with a question ends, the video pauses until the rep answers.
 * A wrong answer shows why, then lets them rewatch the chapter or try again.
 */
export function useChapterChecks(spec: VideoSpec, enabled: boolean) {
  const [passed, setPassed] = useState<number[]>([]);
  const [pending, setPending] = useState<number | null>(null);
  const passedRef = useRef<number[]>([]);
  const pendingRef = useRef<number | null>(null);
  const ends = spec.chapters.map((_, i) => spec.chapters[i + 1]?.at ?? spec.durationSec);
  const due = spec.chapters.flatMap((c, i) => (c.check ? [i] : []));

  /** Call as playback moves from `from` to `to`. True when the video must pause for a question. */
  function crossed(from: number, to: number) {
    if (!enabled || pendingRef.current !== null) return false;
    const i = due.find((k) => !passedRef.current.includes(k) && from < ends[k] - 0.6 && to >= ends[k] - 0.6);
    if (i === undefined) return false;
    pendingRef.current = i;
    setPending(i);
    return true;
  }
  function pass() {
    if (pendingRef.current === null) return;
    passedRef.current = [...passedRef.current, pendingRef.current];
    setPassed(passedRef.current);
    pendingRef.current = null;
    setPending(null);
  }
  function dismiss() { pendingRef.current = null; setPending(null); }

  return { pending, passed, due, ends, crossed, pass, dismiss, allPassed: due.every((k) => passed.includes(k)) };
}

export type ChapterChecks = ReturnType<typeof useChapterChecks>;

/** The question card shown under the paused video. */
export function ChapterQuestion({ spec, checks, onResume, onRewatch }: { spec: VideoSpec; checks: ChapterChecks; onResume: () => void; onRewatch: (at: number) => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  if (checks.pending === null) return null;
  const ch = spec.chapters[checks.pending];
  const q = ch.check!;
  const right = picked === q.answer;
  return (
    <div className="rise-in squircle flex flex-col gap-3 rounded-panel border border-brand/30 bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-caption font-bold text-brand-deep">
        <CircleHelp className="size-4" aria-hidden="true" />Chapter {checks.pending + 1} done · {ch.title}
      </div>
      <Text size="subhead" weight="bold" className="leading-snug">{q.question}</Text>
      <div className="flex flex-col gap-2">
        {q.options.map((o, i) => {
          const state = picked === null ? "idle" : i === q.answer && right ? "right" : picked === i ? "wrong" : "idle";
          return (
            <button key={i} type="button" disabled={right} onClick={() => setPicked(i)}
              className={cn("squircle flex items-center gap-3 rounded-control border px-4 py-3 text-left text-body-lg transition-colors",
                state === "idle" && "border-hair-2 bg-card hover:border-brand hover:bg-tint",
                state === "right" && "border-ok bg-ok-bg font-semibold text-ok",
                state === "wrong" && "border-danger bg-danger-bg text-danger")}>
              <span className="flex-1">{o}</span>
              {state === "right" && <Check className="size-4.5" aria-hidden="true" />}
              {state === "wrong" && <X className="size-4.5" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <div className={cn("squircle rounded-panel px-4 py-3", right ? "bg-ok-bg" : "bg-warn-bg")}>
          <Text size="body" tone="muted"><strong className={right ? "text-ok" : "text-warn"}>{right ? "Correct. " : "Not quite. "}</strong>{right ? q.rationale : "Have another look at this chapter, or try again."}</Text>
        </div>
      )}
      {right ? (
        <Button size="lg" fullWidth onClick={() => { checks.pass(); setPicked(null); onResume(); }}>Keep watching</Button>
      ) : picked !== null && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => { checks.dismiss(); setPicked(null); onRewatch(ch.at); }}><RotateCcw className="size-4" aria-hidden="true" />Rewatch</Button>
          <Button variant="secondary" onClick={() => setPicked(null)}>Try again</Button>
        </div>
      )}
    </div>
  );
}

/** Chapters with their times, and a tick once a chapter's question is answered. */
export function ChapterList({ spec, current, checks, onSeek }: { spec: VideoSpec; current?: number; checks?: ChapterChecks; onSeek: (at: number) => void }) {
  return (
    <ol className="flex flex-col divide-y divide-hair overflow-hidden rounded-panel border border-hair bg-card">
      {spec.chapters.map((c, i) => {
        const on = current === i;
        const done = checks?.passed.includes(i);
        return (
          <li key={c.at}>
            <button type="button" onClick={() => onSeek(c.at)} className={cn("flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors", on ? "bg-tint" : "hover:bg-subtle")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-micro font-bold", on ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>{i + 1}</span>
              <span className={cn("min-w-0 flex-1 truncate text-body", on ? "font-semibold text-brand-deep" : "text-ink-2")}>{c.title}</span>
              {c.check && (
                <span className={cn("flex shrink-0 items-center gap-1 rounded-chip px-2 py-0.5 text-micro font-bold", done ? "bg-ok-bg text-ok" : "bg-subtle text-ink-3")}>
                  {done ? <Check className="size-3" aria-hidden="true" /> : <CircleHelp className="size-3" aria-hidden="true" />}{done ? "Answered" : "Question"}
                </span>
              )}
              <span className="w-10 shrink-0 text-right text-caption tabular-nums text-ink-3">{fmtTime(c.at)}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
