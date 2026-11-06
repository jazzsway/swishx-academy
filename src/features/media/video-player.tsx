"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Captions, Volume2, VolumeX, RotateCcw, Sparkles, Scissors } from "lucide-react";
import { cn } from "@/lib/cn";
import type { VideoSpec } from "@/data/types";
import { fmtTime } from "@/data/media";
import { Text } from "@/components/ui/text";

/**
 * A simulated video: the timeline, chapters and captions are real; the picture is drawn
 * from the script's scenes. Narration reads the approved captions aloud (text-to-speech).
 * Reports the furthest point watched so completion can require 90%.
 */
export function VideoPlayer({ spec, title, onWatched, compact }: {
  spec: VideoSpec; title: string; onWatched?: (pct: number) => void; compact?: boolean;
}) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cc, setCc] = useState(true);
  const [narrate, setNarrate] = useState(!compact);
  const [showTranscript, setShowTranscript] = useState(false);
  const maxT = useRef(0);
  const watched = useRef(new Set<number>());
  const lastCaption = useRef(-1);
  const dur = spec.durationSec;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setT((x) => {
        const n = Math.min(dur, x + 0.25 * speed);
        /* Coverage, not position: seeking ahead doesn't count as watching. */
        for (let sec = Math.floor(x); sec < Math.ceil(n); sec++) watched.current.add(sec);
        if (n > maxT.current) maxT.current = n;
        onWatched?.(Math.round((watched.current.size / dur) * 100));
        if (n >= dur) setPlaying(false);
        return n;
      });
    }, 250);
    return () => window.clearInterval(id);
  }, [playing, speed, dur, onWatched]);

  const capIdx = spec.captions.findLastIndex((c) => c.at <= t);
  const caption = spec.captions[capIdx];
  const scene = [...spec.scenes].reverse().find((sc) => sc.at <= t) ?? spec.scenes[0];
  const chapter = [...spec.chapters].reverse().find((c) => c.at <= t);

  useEffect(() => {
    if (!playing || !narrate || capIdx === lastCaption.current || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    lastCaption.current = capIdx;
    if (!caption) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(caption.text);
    u.rate = Math.min(2, speed * 1.02);
    window.speechSynthesis.speak(u);
  }, [capIdx, playing, narrate, caption, speed]);
  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { if (!playing && typeof window !== "undefined") window.speechSynthesis?.cancel(); }, [playing]);

  const seek = (s: number) => { setT(s); lastCaption.current = -1; };

  return (
    <div className="flex flex-col gap-3">
      <div className="squircle relative aspect-video overflow-hidden rounded-panel bg-ink text-white">
        <div className="absolute inset-0 opacity-40" style={{ background: "radial-gradient(circle at 25% 35%, var(--color-brand) 0, transparent 45%), radial-gradient(circle at 80% 75%, var(--color-brand-2) 0, transparent 40%)" }} />
        <button type="button" onClick={() => { if (t >= dur) seek(0); setPlaying(!playing); }} aria-label={playing ? "Pause video" : "Play video"}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
          <span key={scene.at} className="rise-in flex flex-col items-center gap-2">
            {scene.stat && <span className={cn("font-extrabold tracking-tight text-white", compact ? "text-hero" : "text-[44px] leading-none sm:text-[56px]")}>{scene.stat}</span>}
            <span className={cn("font-bold leading-tight", compact ? "text-title" : "text-display sm:text-display-lg")}>{scene.headline}</span>
            {scene.sub && <span className="text-body-lg text-white/70">{scene.sub}</span>}
          </span>
          {!playing && <span className="mt-2 grid size-14 place-items-center rounded-full bg-white/95 text-ink shadow-float">{t >= dur ? <RotateCcw className="size-6" /> : <Play className="ml-1 size-6" />}</span>}
        </button>
        <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
          {spec.origin === "ai" && <span className="flex items-center gap-1 rounded-glyph bg-black/50 px-2 py-0.5 text-micro font-semibold"><Sparkles className="size-3" aria-hidden="true" />AI-generated</span>}
          {spec.origin === "clip" && <span className="flex items-center gap-1 rounded-glyph bg-black/50 px-2 py-0.5 text-micro font-semibold"><Scissors className="size-3" aria-hidden="true" />Clip</span>}
          {chapter && <span className="rounded-glyph bg-black/50 px-2 py-0.5 text-micro font-semibold">{chapter.title}</span>}
        </div>
        {cc && caption && t > 0 && <div className="pointer-events-none absolute inset-x-4 bottom-12 text-center"><span className="rounded-chip bg-black/70 px-2.5 py-1 text-body leading-relaxed">{caption.text}</span></div>}
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6">
          <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)} className="grid size-8 place-items-center rounded-full hover:bg-white/15">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
          <div className="relative h-1.5 flex-1 cursor-pointer rounded-full bg-white/25" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={dur} aria-valuenow={Math.round(t)} tabIndex={0}
            onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek(Math.round(((e.clientX - r.left) / r.width) * dur)); }}
            onKeyDown={(e) => { if (e.key === "ArrowRight") seek(Math.min(dur, t + 10)); if (e.key === "ArrowLeft") seek(Math.max(0, t - 10)); }}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-white/40" style={{ width: `${(maxT.current / dur) * 100}%` }} />
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${(t / dur) * 100}%` }} />
            {spec.chapters.slice(1).map((c) => <span key={c.at} className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-white/80" style={{ left: `${(c.at / dur) * 100}%` }} />)}
          </div>
          <span className="w-[76px] text-right text-micro font-semibold tabular-nums">{fmtTime(t)} / {fmtTime(dur)}</span>
          <button type="button" aria-label={cc ? "Hide captions" : "Show captions"} onClick={() => setCc(!cc)} className={cn("grid size-8 place-items-center rounded-full hover:bg-white/15", !cc && "opacity-50")}><Captions className="size-4" /></button>
          <button type="button" aria-label={narrate ? "Mute narration" : "Narrate"} onClick={() => setNarrate(!narrate)} className={cn("grid size-8 place-items-center rounded-full hover:bg-white/15", !narrate && "opacity-50")}>{narrate ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}</button>
          <button type="button" aria-label="Playback speed" onClick={() => setSpeed(speed >= 2 ? 1 : speed + 0.5)} className="rounded-glyph px-1.5 text-micro font-bold hover:bg-white/15">{speed}×</button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {spec.chapters.map((c, i) => (
          <button key={c.at} type="button" onClick={() => { seek(c.at); setPlaying(true); }}
            className={cn("rounded-chip border px-2.5 py-1 text-caption font-semibold transition-colors", chapter?.at === c.at ? "border-brand bg-tint text-brand-deep" : "border-hair-2 bg-card text-ink-2 hover:bg-subtle")}>
            {i + 1}. {c.title} <span className="font-normal text-ink-3">{fmtTime(c.at)}</span>
          </button>
        ))}
      </div>
      {spec.clipOf && <Text size="caption" tone="subtle">Clip of “{spec.clipOf.title}” · {fmtTime(spec.clipOf.from)}–{fmtTime(spec.clipOf.to)}</Text>}
      <button type="button" onClick={() => setShowTranscript(!showTranscript)} className="self-start text-body font-semibold text-ink-2 underline-offset-2 hover:underline">{showTranscript ? "Hide transcript" : "Show transcript"}</button>
      {showTranscript && (
        <ol className="flex flex-col gap-1.5" aria-label={`${title} transcript`}>
          {spec.captions.map((c, i) => (
            <li key={c.at}>
              <button type="button" onClick={() => seek(c.at)} className={cn("flex w-full gap-3 rounded-control px-2 py-1 text-left", i === capIdx && "bg-tint")}>
                <span className="w-10 shrink-0 text-caption font-semibold tabular-nums text-ink-3">{fmtTime(c.at)}</span>
                <span className="text-body text-ink-2">{c.text}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
