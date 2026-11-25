"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, ShieldAlert, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { PracticeSession, RoleplayResult } from "@/data/types";
import { photoFor } from "./hero-visuals";
import { useApp } from "@/store/app-store";
import { objection } from "@/data/scenarios";
import { product, PRODUCTS } from "@/data/org";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Scorecard } from "@/features/roleplay/scorecard";

const mmss = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, "0")}`;

/**
 * A past call played back: a recording player and the transcript, in step. The recording is a stand-in
 * (the prototype keeps no audio): it plays through the call's timing at 2× and lights up who's speaking.
 * Tap a line to jump to it.
 */
export function SessionReplay({ r, who }: { r: RoleplayResult; who: string }) {
  const dur = Math.max(1, r.durationSec);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setT((x) => { const n = x + 0.5; if (n >= dur) { setPlaying(false); return dur; } return n; }), 250);
    return () => window.clearInterval(id);
  }, [playing, dur]);
  const cur = r.transcript.reduce((k, line, i) => (line.at <= t ? i : k), -1);
  useEffect(() => { if (playing && cur >= 0) list.current?.children[cur]?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [cur, playing]);
  const seek = (sec: number) => { setT(Math.max(0, Math.min(dur, sec))); };

  return (
    <div className="flex flex-col gap-3">
      {/* The recording (a stand-in, synced to the transcript). */}
      <div className="flex items-center gap-3 rounded-[20px] bg-ink px-3 py-2.5 text-white">
        <button type="button" onClick={() => { if (t >= dur) setT(0); setPlaying(!playing); }} aria-label={playing ? "Pause the recording" : "Play the recording"}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-ink transition-transform active:scale-95">
          {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4 translate-x-px" aria-hidden="true" />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <button type="button" aria-label="Seek" onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); seek(((e.clientX - b.left) / b.width) * dur); }}
            className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <span className="absolute inset-y-0 left-0 rounded-full bg-brand-2" style={{ width: `${(t / dur) * 100}%` }} />
          </button>
          <span className="flex justify-between text-[11px] font-semibold tabular-nums text-white/70"><span>{mmss(t)}</span><span>Recording · 2×</span><span>{mmss(dur)}</span></span>
        </div>
      </div>

      {/* No scroll box of its own: the page or sheet scrolls, and a box would clip the speaking line's ring. */}
      <ol ref={list} className="flex flex-col gap-2.5 px-0.5 pb-1" aria-label="Transcript">
        {r.transcript.map((line, i) => {
          const rep = line.speaker === "rep";
          const flag = rep ? r.flags.find((f) => f.quote === line.text) : undefined;
          const hit = rep ? r.criteria.filter((c) => c.met && c.quote && line.text.includes(c.quote)) : [];
          return (
            <li key={i} className={cn("flex flex-col gap-1", rep ? "items-end" : "items-start")}>
              <button type="button" onClick={() => seek(line.at)} className="px-1 text-[11px] font-bold text-ink-4 hover:text-ink-2">{rep ? "You" : who} · {mmss(line.at)}</button>
              <span className={cn("max-w-[88%] rounded-[18px] px-3 py-2 text-body leading-relaxed transition-colors",
                rep ? "rounded-br-[6px]" : "rounded-bl-[6px]",
                i === cur ? (rep ? "bg-cta text-white ring-2 ring-brand/50" : "bg-tint text-ink ring-2 ring-brand/40") : rep ? "bg-ink/85 text-white" : "bg-subtle text-ink",
                flag && "ring-2 ring-danger")}>{line.text}</span>
              {flag && <span className="flex max-w-[88%] items-start gap-1 px-1 text-caption font-semibold text-danger"><ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{flag.label}</span>}
              {hit.map((c) => <span key={c.id} className="flex items-center gap-1 px-1 text-caption font-semibold text-ok"><Check className="size-3.5" aria-hidden="true" />{c.label}</span>)}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * One past practice call as three tabs, the same wherever it opens (the Practice tab's call page, an
 * objective's past practice): the scorecard; the recording with its transcript; and the setup, starting
 * with who the call was with.
 */
export function PracticeCallTabs({ x }: { x: PracticeSession }) {
  const [tab, setTab] = useState<"score" | "transcript" | "setup">("score");
  const courses = useApp((s) => s.courses);
  const r = x.result!;
  const st = x.setup;
  const who = (st?.persona ?? x.title.split(" · ")[0]).replace(/,.*$/, "");
  const course = st?.courseId ? courses.find((c) => c.id === st.courseId) : undefined;
  const rows: [string, string][] = [
    ["Product", PRODUCTS.find((p) => p.id === st?.productId)?.brand ?? (course ? product(course.productId)?.brand ?? "—" : "—")],
    ["Call", st?.callType ?? "—"],
    ["Their mood", st?.traits.join(", ") || "—"],
    ["Pushed back on", (st?.objectionIds ?? []).map((o) => objection(o)?.label).filter(Boolean).join(", ") || "—"],
    ...(st?.situation ? [["Your situation", st.situation] as [string, string]] : []),
    ["Length", st?.minutes ? `${st.minutes} min set · ${mmss(r.durationSec)} taken` : mmss(r.durationSec)],
    ["Help", st?.assisted ? "Assisted: prompts while talking" : "Unassisted"],
  ];
  return (
    <div className="flex flex-col gap-4">
      <Segmented role="tablist" aria-label="Call" className="self-stretch">
        {([["score", "Scorecard"], ["transcript", "Transcript"], ["setup", "Setup"]] as const).map(([k, l]) => (
          <SegmentedButton key={k} active={tab === k} role="tab" aria-pressed={undefined} aria-selected={tab === k} onClick={() => setTab(k)} className="flex-1">{l}</SegmentedButton>
        ))}
      </Segmented>

      {tab === "score" && <Scorecard result={r} mode="practice" noTranscript />}

      {tab === "transcript" && (r.transcript.length ? <SessionReplay r={r} who={who} /> : <span className="text-body text-ink-3">Nothing was said on this call.</span>)}

      {tab === "setup" && (
        <div className="flex flex-col rounded-card bg-card px-4 shadow-hair">
          {/* Who it was with first: what helps most on the next call. */}
          <div className="flex items-center gap-3 border-b border-hair py-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoFor(who)} alt="" className="size-12 shrink-0 rounded-full object-cover" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body-lg font-bold text-ink">{who}</span>
              {st?.specialty && <span className="truncate text-caption text-ink-3">{st.specialty}</span>}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-hair">
            {rows.map(([k, v]) => <li key={k} className="flex gap-3 py-3"><span className="w-28 shrink-0 text-caption font-semibold text-ink-3">{k}</span><span className="min-w-0 flex-1 text-body text-ink">{v}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
