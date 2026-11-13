"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, FileText, Film, Lock, Mic, Presentation, Quote, Sparkles } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { Text } from "@/components/ui/text";
import { NewCourseWizard } from "./new-course";
import { DirectCourseWizard } from "./direct-course";

/**
 * New course starts with one question: build it straight from the trainer's own files,
 * or have SwishX write it. /trainer/courses/new?path=direct | swishx skips the question.
 */
export function NewCourseStart() {
  const search = useSearchParams();
  const path = search.get("path") ?? (search.get("product") ? "swishx" : null);
  if (path === "swishx") return <NewCourseWizard />;
  if (path === "direct") return <DirectCourseWizard />;
  return <PathChooser />;
}

const PATHS = [
  {
    id: "direct", label: "Direct from my materials", time: "Ready in about 2 minutes",
    pitch: "Upload what you already have. Reps see each file exactly as it is. SwishX writes nothing and adds no questions.",
    steps: ["Basics", "Materials", "Create"],
    facts: [
      { k: "Reps see", v: "Your files, unchanged" },
      { k: "Questions", v: "None added" },
      { k: "AI roleplay", v: "Built from your documents" },
    ],
  },
  {
    id: "swishx", label: "Create with SwishX", time: "Drafted in about 5 minutes",
    pitch: "Describe the goal. SwishX drafts an outline and writes cited lessons, questions and a roleplay from your sources.",
    steps: ["Goal", "Materials", "Outline", "Generate"],
    facts: [
      { k: "Reps see", v: "Lessons plus your files" },
      { k: "Questions", v: "Written and cited" },
      { k: "Format", v: "Long or short form" },
    ],
  },
] as const;

function PathChooser() {
  const router = useRouter();
  const go = (id: string) => router.push(`/trainer/courses/new?path=${id}`);
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-7">
      <Link href="/trainer/courses" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Courses</Link>
      <div className="flex flex-col gap-1.5">
        <Text size="caption" weight="bold" tone="brand-deep" uppercase tracking="wider">New course</Text>
        <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">How do you want to build it?</Text>
        <Text size="body-lg" tone="subtle">You can add AI roleplay either way. You can&apos;t switch once it&apos;s created.</Text>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {PATHS.map((p) => {
          const direct = p.id === "direct";
          return (
            <button key={p.id} type="button" onClick={() => go(p.id)}
              className="squircle group flex flex-col overflow-hidden rounded-card border border-hair bg-card text-left shadow-hair transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-soft focus-ring">
              <div className={cn("relative h-[190px] overflow-hidden border-b border-hair", direct ? "bg-subtle" : "bg-ink")}>
                {direct ? <DirectArt /> : <SwishxArt />}
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div className="flex flex-col gap-1.5">
                  <span className="flex items-center justify-between gap-3">
                    <Text as="h2" size="title" weight="extrabold">{p.label}</Text>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-ink-2 transition-colors group-hover:bg-brand group-hover:text-white"><ArrowRight className="size-4" aria-hidden="true" /></span>
                  </span>
                  <Text size="body" tone="muted">{p.pitch}</Text>
                </div>
                <dl className="grid grid-cols-3 gap-2 border-y border-hair py-3">
                  {p.facts.map((f) => (
                    <div key={f.k} className="flex min-w-0 flex-col gap-0.5">
                      <dt className="text-micro font-bold uppercase tracking-wider text-ink-4">{f.k}</dt>
                      <dd className="text-body font-semibold leading-snug text-ink-2">{f.v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                  <ol className="flex flex-wrap items-center gap-1.5" aria-label="Steps">
                    {p.steps.map((st, i) => (
                      <li key={st} className="flex items-center gap-1.5">
                        <span className="grid size-5 place-items-center rounded-full bg-black/[0.06] text-micro font-bold text-ink-3">{i === p.steps.length - 1 && direct ? <Check className="size-3" aria-hidden="true" /> : i + 1}</span>
                        <span className="text-caption font-semibold text-ink-2">{st}</span>
                        {i < p.steps.length - 1 && <span className="h-px w-3 bg-hair-3" />}
                      </li>
                    ))}
                  </ol>
                  <span className="text-caption font-semibold text-ink-3">{p.time}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <Text size="caption" tone="subtle" className="flex items-center gap-1.5"><Lock className="size-3.5" aria-hidden="true" />Either way, nothing reaches reps until you publish and assign it.</Text>
    </div>
  );
}

/** Your files, unchanged, each one becoming a module in your order. */
function DirectArt() {
  const files = [
    { icon: Film, label: "MoA explainer.mp4", tone: "bg-ink text-white" },
    { icon: Presentation, label: "Efficacy deck.pptx", tone: "bg-tint text-brand-deep" },
    { icon: FileText, label: "Dosing guide.pdf", tone: "bg-card text-ink-3 border border-hair-2" },
  ];
  return (
    <div className="absolute inset-0 flex items-center justify-center gap-5 px-6">
      <div className="flex w-[46%] flex-col gap-2">
        {files.map((f, i) => (
          <div key={f.label} className="squircle flex items-center gap-2 rounded-control border border-hair bg-card px-2.5 py-2 shadow-hair transition-transform duration-300 group-hover:translate-x-1" style={{ transitionDelay: `${i * 50}ms` }}>
            <span className={cn("grid size-7 shrink-0 place-items-center rounded-glyph", f.tone)}><f.icon className="size-3.5" aria-hidden="true" /></span>
            <span className="truncate text-caption font-semibold text-ink-2">{f.label}</span>
          </div>
        ))}
      </div>
      <ArrowRight className="size-5 shrink-0 text-ink-4" aria-hidden="true" />
      <div className="squircle flex w-[38%] flex-col gap-1.5 rounded-panel border border-hair bg-card p-2.5 shadow-soft">
        <span className="text-micro font-bold uppercase tracking-wider text-ink-4">Course</span>
        {[1, 2, 3].map((n) => (
          <span key={n} className="flex items-center gap-1.5">
            <span className="grid size-5 shrink-0 place-items-center rounded-glyph bg-brand text-micro font-bold text-white">{n}</span>
            <span className="h-1.5 flex-1 rounded-full bg-black/[0.08]" />
          </span>
        ))}
        <span className="mt-1 flex items-center gap-1 text-micro font-semibold text-ok"><Mic className="size-3" aria-hidden="true" />+ AI roleplay</span>
      </div>
    </div>
  );
}

/** SwishX writes: an outline, cited lines, generated questions. */
function SwishxArt() {
  return (
    <div className="absolute inset-0">
      <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 85% 0%, var(--color-brand) 0, transparent 55%), radial-gradient(circle at 0% 110%, var(--color-brand-2) 0, transparent 50%)" }} />
      <div className="relative flex h-full items-center justify-center gap-4 px-6">
        <div className="squircle flex w-[52%] flex-col gap-2 rounded-panel bg-white/[0.08] p-3 text-white backdrop-blur-sm">
          <span className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider text-white/70"><AgentIcon className="size-3" aria-hidden="true" />Drafting outline</span>
          {[88, 72, 80].map((w, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className="h-1.5 rounded-full bg-white/50 transition-all duration-500 group-hover:bg-white/80" style={{ width: `${w}%` }} />
              <span className="grid h-3.5 shrink-0 place-items-center rounded-[3px] bg-brand px-1 text-[8px] font-bold text-white">{i + 1}</span>
            </span>
          ))}
        </div>
        <div className="flex w-[34%] flex-col gap-2">
          <span className="squircle flex items-center gap-1.5 rounded-control bg-white px-2.5 py-2 text-caption font-semibold text-ink shadow-float"><Quote className="size-3.5 text-brand" aria-hidden="true" />Cited to p.4</span>
          <span className="squircle flex items-center gap-1.5 rounded-control bg-white/90 px-2.5 py-2 text-caption font-semibold text-ink-2 shadow-float transition-transform duration-300 group-hover:-translate-y-0.5"><Sparkles className="size-3.5 text-brand" aria-hidden="true" />12 questions</span>
        </div>
      </div>
    </div>
  );
}
