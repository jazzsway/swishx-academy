"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RoleplayResult } from "@/data/types";
import { Text } from "@/components/ui/text";

const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, "0")}`;

/**
 * A call to look back on: a player that reads it back aloud, two voices taking turns, with where each
 * criterion was met (green) or a flag was raised (red) marked along the way, and the transcript below
 * it, line by line, with what each line earned. Tap a line to play from there.
 */
export function CallPlayback({ result, who }: { result: RoleplayResult; who: string }) {
  const turns = result.transcript;
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const token = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);
  const total = Math.max(result.durationSec, (turns.at(-1)?.at ?? 0) + 4, 1);
  const short = who.replace(/,.*$/, "");

  useEffect(() => () => { token.current++; window.speechSynthesis?.cancel(); }, []);
  useEffect(() => { if (cur >= 0) listRef.current?.querySelector(`[data-turn="${cur}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [cur]);

  function stop() { token.current++; window.speechSynthesis?.cancel(); setPlaying(false); }
  function play(from: number) {
    stop();
    const t = ++token.current;
    setPlaying(true);
    const voices = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en")) : [];
    const step = (i: number) => {
      if (t !== token.current) return;
      if (i >= turns.length) { setPlaying(false); setCur(-1); return; }
      setCur(i);
      const turn = turns[i];
      const next = () => step(i + 1);
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(turn.text);
        u.rate = rate;
        u.pitch = turn.speaker === "hcp" ? 0.85 : 1.15;
        const v = voices[turn.speaker === "hcp" ? 0 : Math.min(1, voices.length - 1)];
        if (v) u.voice = v;
        u.onend = next;
        u.onerror = next;
        window.speechSynthesis.speak(u);
      } else setTimeout(next, Math.max(1200, (turn.text.length * 55) / rate));
    };
    step(from);
  }

  const at = cur >= 0 ? turns[cur].at : 0;
  const earned = (text: string) => result.criteria.filter((c) => c.met && c.quote === text);
  const flagged = (text: string) => result.flags.filter((f) => text.includes(f.quote));

  return (
    <div className="flex flex-col gap-3">
      {/* The player. */}
      <div className="squircle flex flex-col gap-3 rounded-card bg-ink p-4 text-white">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => (playing ? stop() : play(cur >= 0 ? cur : 0))} aria-label={playing ? "Pause" : "Play the call"}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand shadow-brand-lift transition-transform active:scale-95">
            {playing ? <Pause className="size-5" /> : <Play className="ml-0.5 size-5" />}
          </button>
          <div className="flex min-w-0 flex-1 flex-col">
            <Text size="body" weight="bold" tone="inverse" truncate>Your call with {short}</Text>
            <Text size="caption" tone="inverse" className="opacity-60">{mmss(at)} / {mmss(total)} · {turns.filter((x) => x.speaker === "rep").length} turns{result.typed ? " · typed" : ""}</Text>
          </div>
          <button type="button" onClick={() => setRate(rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1)} aria-label="Playback speed"
            className="h-8 shrink-0 rounded-control bg-white/10 px-2.5 text-caption font-bold tabular-nums hover:bg-white/20">{rate}×</button>
        </div>
        <div className="relative h-6" aria-hidden="true">
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${(at / total) * 100}%` }} />
          </div>
          {turns.map((x, i) => (
            <button key={i} type="button" tabIndex={-1} onClick={() => play(i)} title={mmss(x.at)} className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/25 hover:bg-white/60" style={{ left: `${(x.at / total) * 100}%` }} />
          ))}
          {result.criteria.filter((c) => c.met && c.at !== undefined).map((c) => <span key={c.id} className="absolute top-0 size-2 -translate-x-1/2 rounded-full bg-ok ring-2 ring-ink" style={{ left: `${(c.at! / total) * 100}%` }} />)}
          {result.flags.map((f, i) => <span key={i} className="absolute bottom-0 size-2 -translate-x-1/2 rounded-full bg-danger ring-2 ring-ink" style={{ left: `${(f.at / total) * 100}%` }} />)}
        </div>
        <div className="flex items-center gap-3 text-micro text-white/50">
          <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-ok" />Criterion met</span>
          {result.flags.length > 0 && <span className="flex items-center gap-1"><span className="size-2 rounded-full bg-danger" />Flag</span>}
          <span className="ml-auto">Read back in generated voices</span>
        </div>
      </div>

      {/* The transcript, line by line. */}
      <ol ref={listRef} className="flex flex-col gap-2">
        {turns.map((x, i) => {
          const rep = x.speaker === "rep";
          const on = i === cur;
          const ok = rep ? earned(x.text) : [];
          const bad = rep ? flagged(x.text) : [];
          return (
            <li key={i} data-turn={i} className={cn("flex flex-col gap-1", rep ? "items-end" : "items-start")}>
              <span className="flex items-center gap-1.5 px-1 text-micro font-semibold text-ink-4">{rep ? "You" : short} · {mmss(x.at)}</span>
              <button type="button" onClick={() => play(i)} title="Play from here"
                className={cn("max-w-[88%] rounded-panel px-3.5 py-2.5 text-left text-body leading-relaxed transition-all",
                  rep ? "rounded-br-sm bg-tint text-ink" : "rounded-bl-sm border border-hair bg-card text-ink-2",
                  on && "ring-2 ring-brand ring-offset-2 ring-offset-canvas", bad.length > 0 && "bg-danger-bg/60")}>
                {x.text}
              </button>
              {(ok.length > 0 || bad.length > 0) && (
                <span className="flex max-w-[88%] flex-wrap justify-end gap-1">
                  {ok.map((c) => <span key={c.id} className="flex items-center gap-1 rounded-chip bg-ok-bg px-2 py-0.5 text-micro font-bold text-ok"><Check className="size-3" aria-hidden="true" />{c.label}</span>)}
                  {bad.map((f, k) => <span key={k} className="flex items-center gap-1 rounded-chip bg-danger-bg px-2 py-0.5 text-micro font-bold text-danger"><TriangleAlert className="size-3" aria-hidden="true" />{f.label}</span>)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
