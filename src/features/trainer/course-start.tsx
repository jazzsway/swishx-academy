"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, Film, Mic, Presentation, Quote, Sparkles } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { Text } from "@/components/ui/text";
import { Modal } from "@/components/ui/modal";
import { NewCourseWizard } from "./new-course";
import { useEffect } from "react";

/**
 * New course starts with one question: build it straight from the trainer's own files,
 * or have SwishX write it. /trainer/courses/new?path=direct | swishx skips the question.
 */
export function NewCourseStart() {
  const search = useSearchParams();
  const path = search.get("path");
  if (path === "swishx") return <NewCourseWizard />;
  if (path === "direct") return <RedirectToSetup product={search.get("product") ?? undefined} />;
  return <PathChooser />;
}

/* With your own material, setup is its own full-screen project with the agent; SwishX's path keeps its wizard. */
const pathHref = (id: string, productId?: string) => (id === "direct" ? `/trainer/courses/start${productId ? `?product=${productId}` : ""}` : `/trainer/courses/new?path=${id}${productId ? `&product=${productId}` : ""}`);

function RedirectToSetup({ product }: { product?: string }) {
  const router = useRouter();
  useEffect(() => { router.replace(pathHref("direct", product)); }, [router, product]);
  return null;
}

const PATHS = [
  { id: "direct", label: "Training with my material", pitch: "Upload your files as lessons. Reps see them exactly as they are.", meta: "One page · about 2 minutes" },
  { id: "swishx", label: "Training with SwishX material", pitch: "Describe the goal. SwishX writes cited lessons and questions from your sources.", meta: "4 steps · about 5 minutes" },
] as const;

/** "Create course" anywhere opens this: pick how to build it, then the wizard for that path. */
export function NewCourseModal({ open, onClose, productId }: { open: boolean; onClose: () => void; productId?: string }) {
  const router = useRouter();
  return (
    <Modal open={open} onClose={onClose} size="xl" title="How do you want to build it?" description="Both come with AI roleplay scenarios. You can't switch later.">
      <PathCards onPick={(id) => { onClose(); router.push(pathHref(id, productId)); }} />
    </Modal>
  );
}

/** A direct link to /trainer/courses/new without a path: the same choice, as a page. */
function PathChooser() {
  const router = useRouter();
  const product = useSearchParams().get("product");
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-7">
      <Link href="/trainer/courses" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Trainings</Link>
      <div className="flex flex-col gap-1.5">
        <Text size="caption" weight="bold" tone="brand-deep" uppercase tracking="wider">New training</Text>
        <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">How do you want to build it?</Text>
        <Text size="body-lg" tone="subtle">Both come with AI roleplay scenarios. You can&apos;t switch later.</Text>
      </div>
      <PathCards onPick={(id) => router.push(pathHref(id, product ?? undefined))} />
    </div>
  );
}

function PathCards({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PATHS.map((p) => {
        const direct = p.id === "direct";
        return (
          <button key={p.id} type="button" onClick={() => onPick(p.id)}
            className="squircle group flex flex-col overflow-hidden rounded-card border border-hair bg-card text-left shadow-hair transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-soft focus-ring">
            <div className={cn("relative h-[160px] overflow-hidden border-b border-hair", direct ? "bg-subtle" : "bg-ink")}>
              {direct ? <DirectArt /> : <SwishxArt />}
            </div>
            <div className="flex flex-1 items-start justify-between gap-4 p-5">
              <div className="flex min-w-0 flex-col gap-1">
                <Text as="h2" size="title" weight="extrabold">{p.label}</Text>
                <Text size="body" tone="muted">{p.pitch}</Text>
                <Text size="caption" weight="semibold" tone="subtle" className="mt-2">{p.meta}</Text>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-ink-2 transition-colors group-hover:bg-brand group-hover:text-white"><ArrowRight className="size-4" aria-hidden="true" /></span>
            </div>
          </button>
        );
      })}
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
        <span className="text-micro font-bold uppercase tracking-wider text-ink-4">Training</span>
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
