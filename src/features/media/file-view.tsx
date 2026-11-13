"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ExternalLink, Lock, Pause, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FileSpec } from "@/data/types";
import { fmtTime } from "@/data/media";
import { source } from "@/data/org";
import { FORMAT_ICON, FORMAT_LABEL, fileUrl } from "@/features/trainer/source-preview";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

/** How long a file runs, or how many pages it has, when the file itself can't say. */
export const fileLength = (f: FileSpec) => ({
  sec: f.durationSec ?? (f.format === "video" ? 360 : f.format === "audio" ? 300 : 0),
  pages: f.pages || (f.format === "slides" ? 8 : f.format === "pdf" || f.format === "doc" ? 4 : 1),
});

/**
 * A file the trainer uploaded, shown to the rep exactly as it is: nothing added, nothing rewritten.
 * Plays or opens the real file while this tab has it; otherwise a faithful stand-in with the same controls.
 * Calls onComplete once it has been seen: 90% watched or heard, or every page turned.
 */
export function FileView({ spec, onComplete, compact }: { spec: FileSpec; onComplete?: () => void; compact?: boolean }) {
  const url = fileUrl(spec.sourceId);
  const [seen, setSeen] = useState(false);
  const fired = useRef(false);
  const done = () => { setSeen(true); if (!fired.current) { fired.current = true; onComplete?.(); } };
  const Icon = FORMAT_ICON[spec.format];
  const title = source(spec.sourceId)?.title ?? spec.fileName;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-caption text-ink-3">
        <Icon className="size-4 shrink-0 text-brand" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-semibold text-ink-2" title={spec.fileName}>{spec.fileName}</span>
        {seen
          ? <span className="flex shrink-0 items-center gap-1 font-semibold text-ok"><Check className="size-3.5" aria-hidden="true" />Seen</span>
          : <span className="flex shrink-0 items-center gap-1"><Lock className="size-3" aria-hidden="true" />As uploaded · view only</span>}
      </div>
      {spec.format === "video" || spec.format === "audio"
        ? <Playback spec={spec} url={url} title={title} onDone={done} />
        : spec.format === "image"
          ? <ImageFile url={url} title={title} onDone={done} />
          : spec.format === "pdf" && url
            ? <PdfFile url={url} title={title} onDone={done} compact={compact} />
            : <PagedFile spec={spec} url={url} title={title} onDone={done} />}
    </div>
  );
}

function Playback({ spec, url, title, onDone }: { spec: FileSpec; url?: string; title: string; onDone: () => void }) {
  const video = spec.format === "video";
  const ref = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  /* Without the file in this tab, a stand-in that runs at 20x so a demo doesn't wait six minutes. */
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const dur = fileLength(spec).sec;
  useEffect(() => {
    if (url || !playing) return;
    const id = window.setInterval(() => setT((x) => { const n = Math.min(dur, x + 5); if (n >= dur) setPlaying(false); return n; }), 250);
    return () => window.clearInterval(id);
  }, [url, playing, dur]);
  useEffect(() => { if (!url && t / dur >= 0.9) onDone(); }, [t, dur, url, onDone]);
  const onTime = () => { const el = ref.current; if (el && el.duration && el.currentTime / el.duration >= 0.9) onDone(); };

  if (url)
    return video
      ? <video ref={ref} src={url} controls playsInline onTimeUpdate={onTime} onEnded={onDone} className="squircle aspect-video w-full rounded-panel bg-ink object-contain" />
      : (
        <div className="squircle flex flex-col gap-3 rounded-panel border border-hair bg-card p-4">
          <Text size="body-lg" weight="semibold">{title}</Text>
          <audio ref={ref} src={url} controls onTimeUpdate={onTime} onEnded={onDone} className="w-full" />
        </div>
      );

  const pct = Math.round((t / dur) * 100);
  return (
    <div className={cn("squircle relative flex flex-col overflow-hidden rounded-panel", video ? "bg-ink text-white" : "border border-hair bg-card")}>
      <div className={cn("relative flex flex-col items-center justify-center gap-3 px-6 text-center", video ? "aspect-video" : "py-8")}>
        {video && <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 80% 10%, var(--color-brand) 0, transparent 50%), radial-gradient(circle at 10% 100%, var(--color-brand-2) 0, transparent 45%)" }} />}
        {!video && (
          <div className="flex h-12 items-end gap-1" aria-hidden="true">
            {Array.from({ length: 28 }, (_, i) => <span key={i} className={cn("w-1.5 rounded-full transition-colors", i / 28 < t / dur ? "bg-brand" : "bg-black/10")} style={{ height: `${20 + ((i * 37) % 80)}%` }} />)}
          </div>
        )}
        <button type="button" onClick={() => { if (t >= dur) setT(0); setPlaying(!playing); }} aria-label={playing ? "Pause" : "Play"}
          className={cn("relative grid size-16 place-items-center rounded-full shadow-float transition-transform hover:scale-105", video ? "bg-white text-ink" : "bg-brand text-white")}>
          {playing ? <Pause className="size-6" aria-hidden="true" /> : <Play className="size-6 translate-x-0.5" aria-hidden="true" />}
        </button>
        <Text size="body-lg" weight="bold" tone={video ? "inverse" : "default"} className="relative">{title}</Text>
      </div>
      <div className={cn("flex items-center gap-3 px-4 py-3", video ? "bg-black/30" : "border-t border-hair")}>
        <span className={cn("text-caption font-semibold tabular-nums", video ? "text-white/80" : "text-ink-3")}>{fmtTime(t)}</span>
        <div className={cn("relative h-1.5 flex-1 overflow-hidden rounded-full", video ? "bg-white/20" : "bg-black/[0.07]")}>
          <div className="absolute inset-y-0 left-0 rounded-full bg-brand transition-[width] duration-200" style={{ width: `${pct}%` }} />
        </div>
        <span className={cn("text-caption font-semibold tabular-nums", video ? "text-white/80" : "text-ink-3")}>{fmtTime(dur)}</span>
      </div>
    </div>
  );
}

function ImageFile({ url, title, onDone }: { url?: string; title: string; onDone: () => void }) {
  useEffect(() => { const id = window.setTimeout(onDone, 1500); return () => window.clearTimeout(id); }, [onDone]);
  return url
    ? <img src={url} alt={title} className="squircle max-h-[70vh] w-full rounded-panel border border-hair bg-card object-contain" />
    : <div className="squircle grid aspect-[4/3] place-items-center rounded-panel border border-hair bg-subtle"><Text tone="subtle">{title}</Text></div>;
}

/** A PDF in the browser's own viewer. Reps confirm they've read it. */
function PdfFile({ url, title, onDone, compact }: { url: string; title: string; onDone: () => void; compact?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <iframe src={`${url}#toolbar=0&navpanes=0`} title={title} className={cn("squircle w-full rounded-panel border border-hair-2 bg-white", compact ? "h-[360px]" : "h-[68vh] min-h-[420px]")} />
      <div className="flex items-center justify-between gap-3">
        <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-body font-semibold text-brand-deep hover:underline"><ExternalLink className="size-4" aria-hidden="true" />Open full screen</a>
        <Button size="sm" variant={ok ? "secondary" : "primary"} onClick={() => { setOk(true); onDone(); }}>{ok ? <><Check className="size-4" aria-hidden="true" />Read</> : "I've read it"}</Button>
      </div>
    </div>
  );
}

/** Slides and documents a browser can't draw: page by page, done when every page has been turned. */
function PagedFile({ spec, url, title, onDone }: { spec: FileSpec; url?: string; title: string; onDone: () => void }) {
  const n = fileLength(spec).pages;
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState<number[]>([0]);
  useEffect(() => { if (seen.length >= n) onDone(); }, [seen, n, onDone]);
  const go = (k: number) => { setI(k); setSeen((s) => (s.includes(k) ? s : [...s, k])); };
  const slides = spec.format === "slides";
  return (
    <div className="flex flex-col gap-3">
      <div key={i} className={cn("rise-in squircle relative mx-auto flex w-full flex-col overflow-hidden rounded-control border border-hair-2 bg-white shadow-soft", slides ? "aspect-video" : "min-h-[380px] max-w-[620px]")}>
        {slides ? (
          i === 0 ? (
            <div className="flex flex-1 flex-col justify-end gap-2 bg-ink p-8 text-white" style={{ background: "linear-gradient(135deg, var(--color-ink) 55%, var(--color-brand-deep))" }}>
              <span className="text-micro font-bold uppercase tracking-wider text-white/60">{FORMAT_LABEL[spec.format]}</span>
              <span className="text-display font-extrabold leading-tight tracking-tight">{title}</span>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 p-7">
              <span className="h-3 w-2/5 rounded-full bg-black/15" />
              <div className="grid flex-1 grid-cols-[1fr_0.8fr] gap-5">
                <div className="flex flex-col gap-2.5">{[92, 78, 85, 60].map((w, k) => <span key={k} className="h-2 rounded-full bg-black/[0.07]" style={{ width: `${w}%` }} />)}</div>
                <div className="rounded-control bg-subtle" />
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-1 flex-col gap-3 p-6">
            <div className="flex items-center justify-between border-b border-hair pb-2 text-micro font-semibold uppercase tracking-wider text-ink-4"><span className="truncate">{title}</span><span className="shrink-0">Page {i + 1}</span></div>
            {i === 0 && <span className="text-title font-bold">{title}</span>}
            {[95, 88, 92, 70, 0, 90, 84, 93, 60].map((w, k) => <span key={k} className={cn("rounded-full bg-black/[0.07]", w ? "h-2" : "h-3 bg-transparent")} style={{ width: `${w}%` }} />)}
          </div>
        )}
        <span className="absolute bottom-2 right-3 text-micro font-semibold text-ink-4">{i + 1} / {n}</span>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => go(i - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button>
        <Text size="caption" tone="subtle" tabular>{seen.length} of {n} {slides ? "slides" : "pages"} seen</Text>
        <Button variant="secondary" size="sm" disabled={i === n - 1} onClick={() => go(i + 1)}>Next<ChevronRight className="size-4" aria-hidden="true" /></Button>
      </div>
      {url && <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 self-start text-body font-semibold text-brand-deep hover:underline"><ExternalLink className="size-4" aria-hidden="true" />Open the original file</a>}
    </div>
  );
}
