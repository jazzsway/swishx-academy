"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Check, Mic, Pill, Stethoscope, Syringe, type LucideIcon } from "lucide-react";
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

/* Who you might rehearse with, cycling on the Practice card. */
const CAST: { name: string; role: string; icon: LucideIcon; tint: string; line: string }[] = [
  { name: "Dr. Rivera", role: "Dermatologist", icon: Stethoscope, tint: "bg-peach", line: "My patients' plans fight every biologic." },
  { name: "Nurse Obi", role: "Dermatology nurse", icon: Syringe, tint: "bg-sage", line: "What do I tell a patient who missed a dose?" },
  { name: "Mei Lin", role: "Pharmacist", icon: Pill, tint: "bg-lilac", line: "How does the first fill actually work?" },
  { name: "Dana", role: "Practice manager", icon: Briefcase, tint: "bg-sun", line: "Every new biologic means more prior auths." },
];

/**
 * Practice's start card: a call in progress, drawn. You on one side, the person you'll rehearse with on
 * the other (a doctor, nurse, pharmacist, practice manager in turn), a live voice between you and what
 * they're saying, then how it works in three steps and the way in.
 */
export function PracticeHero({ initials }: { initials: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % CAST.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  const who = CAST[i];
  const I = who.icon;
  return (
    <Link href="/rep/practice/prep" className="squircle group relative overflow-hidden rounded-card bg-ink p-5 text-white shadow-float">
      <div className="drift pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand/50 blur-3xl" />
      <div className="drift pointer-events-none absolute -bottom-28 -left-16 size-56 rounded-full bg-brand-2/30 blur-3xl" style={{ animationDelay: "-5s" }} />
      <div className="relative flex flex-col gap-5">
        <span className="flex items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1 text-caption font-bold text-white/85">
          <span className="relative grid size-2 place-items-center"><span className="pulse-ring absolute inset-0 rounded-full bg-brand-light" /><span className="size-2 rounded-full bg-brand-light" /></span>
          Live practice with AI
        </span>

        {/* The call: you, the voice between you, and who you're talking to. */}
        <div className="flex items-center gap-3">
          <span className="relative grid size-14 shrink-0 place-items-center">
            <span className="pulse-ring absolute inset-0 rounded-full bg-white/25" />
            <span className="relative grid size-14 place-items-center rounded-full bg-white text-title font-extrabold text-ink">{initials}</span>
          </span>
          <VoiceWave bars={16} className="h-11 flex-1" barClass="bg-white/80" />
          <span key={i} className={cn("bubble-in relative grid size-14 shrink-0 place-items-center rounded-full text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,.6)]", who.tint)}>
            <I className="size-6" aria-hidden="true" />
          </span>
        </div>
        <div key={`l${i}`} className="bubble-in -mt-2 self-end max-w-[88%] rounded-[20px] rounded-tr-[6px] bg-white/12 px-3.5 py-2.5 backdrop-blur-sm">
          <span className="block text-[11px] font-bold text-white/60">{who.name} · {who.role}</span>
          <span className="text-body font-semibold text-white">“{who.line}”</span>
        </div>

        <div className="flex flex-col gap-1">
          <Text size="display" weight="extrabold" tone="inverse" tracking="tight" className="leading-tight">Rehearse the real call</Text>
          <Text size="body" tone="inverse" className="opacity-75">Talk it through out loud with someone who pushes back. Nothing is graded.</Text>
        </div>

        <ol className="grid grid-cols-3 gap-2">
          {["Pick who", "Talk it out", "See your score"].map((s, k) => (
            <li key={s} className="flex flex-col gap-1.5 rounded-[18px] bg-white/8 px-2.5 py-2.5">
              <span className="grid size-6 place-items-center rounded-full bg-white/15 text-[11px] font-extrabold">{k + 1}</span>
              <span className="text-caption font-bold leading-tight text-white/90">{s}</span>
            </li>
          ))}
        </ol>

        <span className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-subhead font-bold text-ink transition-transform group-active:scale-[0.98]">
          <Mic className="size-4" aria-hidden="true" />Set up the call
        </span>
      </div>
    </Link>
  );
}
