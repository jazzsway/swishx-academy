"use client";

import { useEffect, useRef, useState } from "react";
import { CircleHelp, ExternalLink } from "lucide-react";
import type { VideoSpec } from "@/data/types";
import { Text } from "@/components/ui/text";
import { ChapterList, ChapterQuestion, useChapterChecks } from "./chapter-checks";

/* The bits of the YouTube IFrame API this player uses. */
interface YTPlayer { playVideo(): void; pauseVideo(): void; seekTo(s: number, allowAhead: boolean): void; getCurrentTime(): number; getPlayerState(): number; destroy(): void }
declare global { interface Window { YT?: { Player: new (el: HTMLElement, o: object) => YTPlayer }; onYouTubeIframeAPIReady?: () => void } }

let api: Promise<void> | null = null;
function loadApi() {
  api ??= new Promise<void>((resolve) => {
    if (window.YT?.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(); };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  });
  return api;
}

/**
 * A public YouTube video, embedded. Tracks how much was actually watched (seeking ahead doesn't count)
 * and pauses at the end of each chapter that has a question.
 */
export function YouTubePlayer({ spec, title, interactive, onComplete }: { spec: VideoSpec; title: string; interactive?: boolean; onComplete?: () => void }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const last = useRef(0);
  const watched = useRef(new Set<number>());
  const fired = useRef(false);
  const [t, setT] = useState(0);
  const [pct, setPct] = useState(0);
  const checks = useChapterChecks(spec, !!interactive);
  const checksRef = useRef(checks);
  checksRef.current = checks;
  const dur = spec.durationSec;

  useEffect(() => {
    let alive = true;
    void loadApi().then(() => {
      if (!alive || !host.current || !window.YT) return;
      player.current = new window.YT.Player(host.current, {
        videoId: spec.youtubeId, width: "100%", height: "100%",
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
      });
    });
    return () => { alive = false; player.current?.destroy(); player.current = null; };
  }, [spec.youtubeId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const p = player.current;
      if (!p?.getCurrentTime || p.getPlayerState() !== 1) return;
      const now = p.getCurrentTime();
      /* Coverage, not position: only small forward steps count as watching. */
      if (now > last.current && now - last.current < 2) for (let s = Math.floor(last.current); s < Math.ceil(now); s++) watched.current.add(s);
      if (checksRef.current.crossed(last.current, now)) p.pauseVideo();
      last.current = now;
      setT(now);
      setPct(Math.round((watched.current.size / dur) * 100));
    }, 400);
    return () => window.clearInterval(id);
  }, [dur]);

  useEffect(() => {
    if (!fired.current && pct >= 90 && checks.allPassed) { fired.current = true; onComplete?.(); }
  }, [pct, checks.allPassed, onComplete]);

  const seek = (at: number) => { player.current?.seekTo(at, true); last.current = at; player.current?.playVideo(); };
  const current = spec.chapters.findLastIndex((c) => c.at <= t);

  return (
    <div className="flex flex-col gap-3">
      <div className="squircle relative aspect-video overflow-hidden rounded-panel bg-ink">
        <div ref={host} className="absolute inset-0" title={title} />
        {checks.pending !== null && (
          <div className="absolute inset-0 grid place-items-center bg-ink/70 backdrop-blur-sm">
            <span className="flex items-center gap-2 rounded-chip bg-white/95 px-3 py-1.5 text-body font-semibold text-ink"><CircleHelp className="size-4 text-brand" aria-hidden="true" />Answer below to keep watching</span>
          </div>
        )}
      </div>
      {interactive && <ChapterQuestion spec={spec} checks={checks} onResume={() => player.current?.playVideo()} onRewatch={seek} />}
      <div className="flex items-center justify-between gap-2">
        <Text size="caption" tone="subtle" className="flex items-center gap-1"><ExternalLink className="size-3" aria-hidden="true" />{spec.credit}</Text>
        {interactive && <Text size="caption" tone="subtle" tabular>{Math.min(pct, 100)}% watched{checks.due.length ? ` · ${checks.passed.length} of ${checks.due.length} questions` : ""}</Text>}
      </div>
      <ChapterList spec={spec} current={current} checks={interactive ? checks : undefined} onSeek={seek} />
    </div>
  );
}
