"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Mic } from "lucide-react";
import { cn } from "@/lib/cn";
import { Text } from "@/components/ui/text";

/*
 * The visuals for the rep's two big cards (Practice's start card and Home's up next): a voice that moves,
 * a ring that draws itself, and the journey as steps. All decorative motion stops for reduced motion.
 */

/** A voice, as bars that rise and fall out of step. */
export function VoiceWave({ bars = 12, className, barClass = "bg-white" }: { bars?: number; className?: string; barClass?: string }) {
  return (
    <span className={cn("voice-wave flex items-center justify-center gap-[3px]", className)} aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={cn("w-[3px] rounded-full", barClass)}
          style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i * 110) % 900}ms`, animationDuration: `${900 + ((i * 53) % 500)}ms` }} />
      ))}
    </span>
  );
}

/** How far through, as a ring that draws itself in. */
export function ProgressRing({ pct, size = 68, stroke = 6, children }: { pct: number; size?: number; stroke?: number; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const full = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${pct}% done`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="white" strokeWidth={stroke} strokeLinecap="round" className="ring-draw"
          strokeDasharray={full} strokeDashoffset={full * (1 - Math.max(0, Math.min(100, pct)) / 100)} style={{ ["--ring-full" as string]: full }} />
      </svg>
      <span className="absolute inset-0 grid place-items-center">{children}</span>
    </span>
  );
}

export type JourneyStep = { label: string; state: "done" | "now" | "todo"; sub?: string };

/** The training's steps, left to right: done ones ticked, the one you're on glowing, the rest waiting. */
export function JourneySteps({ steps }: { steps: JourneyStep[] }) {
  return (
    <ol className="flex items-start" aria-label="Where you are">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          {i > 0 && <span className={cn("absolute right-1/2 top-[9px] h-[2px] w-full -translate-x-[11px]", s.state === "todo" ? "bg-white/15" : "bg-white/70")} aria-hidden="true" />}
          <span className={cn("relative z-10 grid size-5 place-items-center rounded-full",
            s.state === "done" ? "bg-white text-ink" : s.state === "now" ? "now-glow border-2 border-white bg-brand" : "border-2 border-white/25 bg-ink")}>
            {s.state === "done" && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
          </span>
          <span className={cn("max-w-full truncate px-0.5 text-[11px] font-bold leading-tight", s.state === "todo" ? "text-white/45" : "text-white")}>{s.label}</span>
          {s.sub && <span className="-mt-1 text-[10px] font-semibold text-white/55">{s.sub}</span>}
        </li>
      ))}
    </ol>
  );
}

/* Placeholder portraits for the fictional people reps talk to, steady per name. */
const MEN = /\b(Marcus|Owen|Daniel|Tom|Luis|Sam|Jon|Mark|Rivera|Daniel)\b/;
export function photoFor(name: string): string {
  const n = [...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 9973, 7);
  return `https://randomuser.me/api/portraits/${MEN.test(name) ? "men" : "women"}/${(n % 70) + 10}.jpg`;
}

/* Calls the Practice card plays out, one at a time: who you're on with, what they say, your answer, and what the coach notices. */
const SCENES: { name: string; role: string; photo: string; hcp: string; rep: string; win: string }[] = [
  { name: "Dr. Rivera", role: "Dermatologist", photo: "https://randomuser.me/api/portraits/men/32.jpg", hcp: "My patients' plans fight every biologic.", rep: "That's fair. The support program handles the benefits check for you.", win: "Acknowledged the concern first" },
  { name: "Nurse Obi", role: "Dermatology nurse", photo: "https://randomuser.me/api/portraits/women/65.jpg", hcp: "What do I tell a patient who missed a dose?", rep: "Let me give you exactly what the label says.", win: "Stayed on the approved label" },
  { name: "Dr. Chen", role: "Dermatologist", photo: "https://randomuser.me/api/portraits/women/44.jpg", hcp: "Is it safe for long-term use?", rep: "Here's what the studies showed, side effects included.", win: "Kept fair balance" },
  { name: "Dana Whitfield", role: "Practice manager", photo: "https://randomuser.me/api/portraits/women/26.jpg", hcp: "Every new biologic means more prior auths.", rep: "I can't promise coverage, but the Hub preps the paperwork.", win: "Didn't promise coverage" },
];
/* The beats of one exchange: they talk (two beats), you answer (two beats), the coach ticks it, a pause. */
const BEATS = 6;

/** One side of the call: their picture, ringing while they talk, a voice wave under it. */
function Caller({ talking, name, sub, children }: { talking: boolean; name: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
      <span className="relative grid size-[84px] place-items-center">
        {talking && <span className="pulse-ring absolute inset-0 rounded-full bg-brand-light/50" />}
        <span className={cn("relative size-[84px] overflow-hidden rounded-full ring-[3px] transition-[box-shadow,transform] duration-300", talking ? "scale-105 ring-brand-light" : "ring-white/15")}>{children}</span>
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-body font-bold">{name}</span>
        <span className="truncate text-caption text-white/55">{sub}</span>
      </span>
      <span className="grid h-5 place-items-center">
        {talking ? <VoiceWave bars={9} className="h-5 w-14" barClass="bg-brand-light" /> : <span className="text-micro font-bold text-white/35">Listening</span>}
      </span>
    </div>
  );
}

/**
 * Practice's start card: a voice call in progress. The person you're on with and you, side by side; whoever
 * is talking rings and shows their voice, with live captions under, and the coach ticks what went well.
 * Then the next person. Reduced motion shows one exchange, still.
 */
export function PracticeHero({ initials }: { initials: string }) {
  const [tick, setTick] = useState(0);
  const [still, setStill] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setStill(true); return; }
    const id = window.setInterval(() => setTick((x) => x + 1), 1300);
    return () => window.clearInterval(id);
  }, []);
  const n = Math.floor(tick / BEATS) % SCENES.length;
  const scene = SCENES[n];
  const beat = still ? 4 : tick % BEATS;
  const theyTalk = beat <= 1, youTalk = beat === 2 || beat === 3;
  const secs = 14 + beat * 4 + n * 3;

  return (
    <Link href="/rep/practice/prep" className="squircle group relative overflow-hidden rounded-card bg-ink p-5 text-white shadow-float">
      <div className="drift pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand/45 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        {/* The call widget. */}
        <div className="flex flex-col gap-4 rounded-[28px] bg-white/[0.07] p-4 ring-1 ring-white/10" aria-hidden="true">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-caption font-bold text-white/80">
              <span className="relative grid size-2 place-items-center"><span className="pulse-ring absolute inset-0 rounded-full bg-danger" /><span className="size-2 rounded-full bg-danger" /></span>
              Practice call
            </span>
            <span className="text-caption font-bold tabular-nums text-white/60">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
          </div>

          <div key={scene.name} className="bubble-in flex items-start gap-2">
            <Caller talking={theyTalk} name={scene.name} sub={scene.role}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={scene.photo} alt="" className="size-full object-cover" />
            </Caller>
            <Caller talking={youTalk} name="You" sub="Rep">
              <span className="grid size-full place-items-center bg-white text-display font-extrabold text-ink">{initials}</span>
            </Caller>
          </div>

          {/* Live captions: what's being said right now, then what the coach noticed. */}
          <div className="flex min-h-[64px] flex-col justify-center gap-1.5 rounded-[18px] bg-black/20 px-3.5 py-2.5">
            {beat <= 3
              ? <span key={`${tick - beat}-${youTalk}`} className="bubble-in text-body font-semibold leading-snug"><span className="text-white/50">{youTalk ? "You" : scene.name.split(" ").slice(0, 2).join(" ")}: </span>“{youTalk ? scene.rep : scene.hcp}”</span>
              : <span key={`w${tick - beat}`} className="bubble-in flex items-center gap-2 text-body font-bold text-white"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-sage"><Check className="size-3.5" strokeWidth={3} /></span>{scene.win}</span>}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Text size="display" weight="extrabold" tone="inverse" tracking="tight" className="leading-tight">Rehearse the real call</Text>
          <Text size="body" tone="inverse" className="opacity-75">Talk it out loud with someone who pushes back. A coach shows what you did well. Nothing is graded.</Text>
        </div>

        <span className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-subhead font-bold text-ink transition-transform group-active:scale-[0.98]">
          <Mic className="size-4" aria-hidden="true" />Set up the call
        </span>
      </div>
    </Link>
  );
}
