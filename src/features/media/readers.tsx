"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Lock, MessageSquareQuote, Check, X, Pause, Play, Headphones, Users, LineChart, ShieldAlert, Building2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { AudioSpec, Block, DocumentSpec, VisualAidSpec } from "@/data/types";
import { DOC_PAGES, VA_PAGES, fmtTime } from "@/data/media";
import { source } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";

/* Approved PDFs are read in-app, view-only (PRD: internal training material stays internal). */
export function DocumentViewer({ spec, onAllViewed, compact }: { spec: DocumentSpec; onAllViewed?: () => void; compact?: boolean }) {
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState<number[]>([spec.pages[0]]);
  const src = source(spec.sourceId);
  const page = spec.pages[i];
  const content = DOC_PAGES[spec.sourceId]?.[page];
  const callout = spec.callouts.find((c) => c.page === page);
  const fired = useRef(false);

  useEffect(() => {
    if (!fired.current && spec.pages.every((p) => seen.includes(p))) { fired.current = true; onAllViewed?.(); }
  }, [seen, spec.pages, onAllViewed]);
  const go = (n: number) => { setI(n); setSeen((s) => (s.includes(spec.pages[n]) ? s : [...s, spec.pages[n]])); };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-caption text-ink-3">
        <span className="truncate font-semibold text-ink-2">{src?.title}</span>
        <span className="flex shrink-0 items-center gap-1"><Lock className="size-3" aria-hidden="true" />View only</span>
      </div>
      <div className={cn("squircle relative mx-auto flex w-full flex-col gap-3 rounded-control border border-hair-2 bg-white p-5 shadow-soft", compact ? "max-w-[520px]" : "aspect-[8.5/11] max-w-[560px] sm:p-8")}>
        <div className="flex items-center justify-between border-b border-hair pb-2 text-micro font-semibold uppercase tracking-wider text-ink-4">
          <span>{src?.title}</span><span>Page {page}</span>
        </div>
        {content ? (
          <>
            <Text size="title" weight="bold">{content.title}</Text>
            {content.sections.map((sec, k) => (
              <div key={k} className="flex flex-col gap-1">
                {sec.h && <Text size="body" weight="bold">{sec.h}</Text>}
                <Text size="body" tone="muted" className="leading-relaxed">{sec.p}</Text>
              </div>
            ))}
          </>
        ) : <Text tone="subtle">Page {page}</Text>}
        <div className="mt-auto border-t border-hair pt-2 text-center font-mono text-micro text-ink-4">For internal training use only</div>
      </div>
      {callout && (
        <div className="squircle flex items-start gap-2.5 rounded-panel border border-tint-line bg-tint px-4 py-3">
          <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-brand-deep" aria-hidden="true" />
          <Text size="body-lg"><strong className="text-brand-deep">Trainer note. </strong>{callout.text}</Text>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => go(i - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button>
        <div className="flex gap-1.5" aria-label={`Page ${i + 1} of ${spec.pages.length}`}>
          {spec.pages.map((p, k) => <span key={p} className={cn("size-2 rounded-full", k === i ? "bg-brand" : seen.includes(p) ? "bg-ink-4" : "bg-black/10")} />)}
        </div>
        <Button variant="secondary" size="sm" disabled={i === spec.pages.length - 1} onClick={() => go(i + 1)}>Next page<ChevronRight className="size-4" aria-hidden="true" /></Button>
      </div>
      <Text size="caption" tone="subtle" className="text-center">Pages {spec.pages.join(", ")} assigned · {seen.length} of {spec.pages.length} read</Text>
    </div>
  );
}

const VA_ICON = { patient: Users, chart: LineChart, safety: ShieldAlert, access: Building2 };

export function VisualAidWalkthrough({ spec, onDone }: { spec: VisualAidSpec; onDone?: () => void }) {
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState<number[]>([0]);
  const fired = useRef(false);
  const step = spec.pages[i];
  const page = VA_PAGES[spec.sourceId]?.[step.page];
  const Icon = page ? VA_ICON[page.visual] : Users;
  useEffect(() => { if (!fired.current && seen.length === spec.pages.length) { fired.current = true; onDone?.(); } }, [seen, spec.pages.length, onDone]);
  const go = (n: number) => { setI(n); setSeen((s) => (s.includes(n) ? s : [...s, n])); };

  return (
    <div className="flex flex-col gap-3">
      <div className="squircle relative aspect-[16/10] overflow-hidden rounded-panel border border-hair bg-gradient-to-br from-tint-2 to-tint-strong p-5 sm:p-7">
        <div className="flex h-full flex-col justify-between">
          <div className="flex items-center justify-between text-micro font-bold uppercase tracking-wider text-brand-deep"><span>Lumora</span><span>Visual aid · page {step.page}</span></div>
          <div className="flex items-end justify-between gap-4">
            <div className="flex max-w-[70%] flex-col gap-1.5">
              {page?.stat && <span className="text-[40px] font-extrabold leading-none tracking-tight text-ink">{page.stat}</span>}
              <span className="text-display font-extrabold leading-tight text-ink">{page?.headline}</span>
              <span className="text-body text-ink-2">{page?.sub}</span>
            </div>
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-white/70 text-brand-deep"><Icon className="size-8" aria-hidden="true" /></span>
          </div>
          {/* v1-hidden: doc number. <span className="font-mono text-micro text-ink-3">{source(spec.sourceId)?.docNumber}</span> */}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="squircle flex gap-2.5 rounded-panel bg-ok-bg px-4 py-3"><Check className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" /><Text size="body-lg"><strong className="text-ok">Say. </strong>{step.say}</Text></div>
        {step.avoid && <div className="squircle flex gap-2.5 rounded-panel bg-danger-bg px-4 py-3"><X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" /><Text size="body-lg"><strong className="text-danger">Avoid. </strong>{step.avoid}</Text></div>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button variant="secondary" size="sm" disabled={i === 0} onClick={() => go(i - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button>
        <Text size="caption" tone="subtle">Page {i + 1} of {spec.pages.length}</Text>
        <Button variant="secondary" size="sm" disabled={i === spec.pages.length - 1} onClick={() => go(i + 1)}>Next page<ChevronRight className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>
  );
}

/** Reads the approved text aloud. Same words, no new content. Built for the car: big controls. */
export function AudioPlayer({ spec, siblings, onDone }: { spec: AudioSpec; siblings: Block[]; onDone?: () => void }) {
  const lines = siblings.filter((b) => spec.fromBlockIds.includes(b.id)).flatMap((b) => [...(b.paragraphs ?? []), ...(b.points ?? [])].map((p) => p.text));
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [speed, setSpeed] = useState(1);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;
  const playingRef = useRef(false);

  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  function speakFrom(n: number) {
    if (n >= lines.length) { setPlaying(false); playingRef.current = false; setDone(true); setIdx(lines.length - 1); onDone?.(); return; }
    setIdx(n);
    if (!supported) return;
    const u = new SpeechSynthesisUtterance(lines[n]);
    u.rate = speed;
    u.onend = () => { if (playingRef.current) speakFrom(n + 1); };
    window.speechSynthesis.speak(u);
  }

  function toggle() {
    if (playing) { window.speechSynthesis?.cancel(); setPlaying(false); playingRef.current = false; return; }
    setPlaying(true); playingRef.current = true;
    window.speechSynthesis?.cancel();
    speakFrom(idx < 0 || done ? 0 : idx);
    if (done) setDone(false);
  }

  const pct = lines.length ? Math.round(((done ? lines.length : Math.max(0, idx)) / lines.length) * 100) : 0;
  return (
    <div className="squircle flex flex-col gap-4 rounded-panel bg-ink p-5 text-white">
      <div className="flex items-center gap-3">
        <Headphones className="size-5 text-brand-light" aria-hidden="true" />
        <Text size="body-lg" weight="bold" tone="inverse">Listen · {fmtTime(spec.durationSec)}</Text>
        <span className="ml-auto rounded-glyph bg-white/10 px-2 py-0.5 text-micro font-semibold text-white/75">Approved text, read aloud</span>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="grid size-16 shrink-0 place-items-center rounded-full bg-brand shadow-brand-lift transition-transform active:scale-95">
          {playing ? <Pause className="size-7" /> : <Play className="ml-1 size-7" />}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand-2 transition-[width]" style={{ width: `${pct}%` }} /></div>
          <Text size="body" tone="inverse" className="line-clamp-2 opacity-80">{idx >= 0 ? lines[idx] : lines[0]}</Text>
        </div>
        <button type="button" aria-label="Speed" onClick={() => setSpeed(speed >= 1.5 ? 1 : speed + 0.25)} className="rounded-glyph bg-white/10 px-2 py-1 text-caption font-bold">{speed}×</button>
      </div>
      {playing && <div className="bar-dance flex h-6 items-center justify-center gap-1" aria-hidden="true">{[0, 1, 2, 3, 4].map((k) => <span key={k} className="h-full w-1.5 rounded-full bg-brand-2" />)}</div>}
      {done && <Text size="body" weight="semibold" className="text-ok-on-dark">Listened. Nice use of drive time.</Text>}
      {!supported && <Button variant="secondary" onClick={() => { setDone(true); onDone?.(); }}>This browser can't read aloud. Mark as read</Button>}
    </div>
  );
}

/** An approved one-page infographic. */
export function GraphicView({ spec, docNumber }: { spec: import("@/data/types").GraphicSpec; docNumber?: string }) {
  return (
    <div className="squircle flex flex-col gap-4 overflow-hidden rounded-panel border border-hair bg-gradient-to-br from-card to-tint-2 p-5 sm:p-6">
      <div className="flex items-center justify-between text-micro font-bold uppercase tracking-wider text-brand-deep">
        <span>At a glance</span>{(docNumber || spec.sourceId) && <span className="font-mono normal-case tracking-normal text-ink-3">{docNumber ?? source(spec.sourceId!)?.docNumber}</span>}
      </div>
      <Text size="display" weight="extrabold" className="leading-tight">{spec.headline}</Text>
      {spec.stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {spec.stats.map((st) => (
            <div key={st.label} className="squircle flex flex-col gap-1 rounded-control bg-ink p-3 text-white">
              <span className="text-display font-extrabold leading-none tracking-tight">{st.value}</span>
              <span className="text-caption text-white/70">{st.label}</span>
            </div>
          ))}
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {spec.points.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden="true" /><Text size="body-lg" tone="muted">{p}</Text></li>)}
      </ul>
      {spec.footnote && <Text size="caption" tone="subtle" className="border-t border-hair pt-2">{spec.footnote}</Text>}
    </div>
  );
}
