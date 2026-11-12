"use client";

import { useState } from "react";
import { BookOpen, Layers, CirclePlay, FileText, Presentation, ChartPie, ListChecks, Phone, Award, Maximize2, Globe, Lock, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Block, ShortTemplate } from "@/data/types";
import { LUMORA_LAUNCH_MODULES } from "@/data/courses/lumora-launch";
import { TEMPLATES, TEMPLATE_IDS } from "@/lib/short-form";
import { Text } from "@/components/ui/text";
import { Modal } from "@/components/ui/modal";
import { BlockView } from "@/features/shared/block-view";
import { SampleDeck } from "@/features/shortform/card-deck";

export type Form = "long" | "short";

/* Real Lumora launch material, one of each kind, for the long-form sample. */
const firstOf = (type: Block["type"], when: (b: Block) => boolean = () => true) =>
  LUMORA_LAUNCH_MODULES.flatMap((m) => m.blocks).find((b) => b.type === type && when(b))!;
const LONG_SAMPLES = [
  { label: "Video", icon: CirclePlay, hint: "With questions along the way", block: firstOf("video", (b) => b.video?.origin !== "youtube" && !!b.video?.chapters.some((c) => c.check)) },
  { label: "PDF", icon: FileText, hint: "Read page by page", block: firstOf("document") },
  { label: "Deck", icon: Presentation, hint: "Walk the visual aid", block: firstOf("visualaid") },
  { label: "Infographic", icon: ChartPie, hint: "At a glance", block: firstOf("graphic") },
];

const LONG_HAS = [
  { icon: CirclePlay, label: "Videos" }, { icon: FileText, label: "PDFs" }, { icon: Presentation, label: "Decks" },
  { icon: ListChecks, label: "Checks" }, { icon: Phone, label: "AI call" }, { icon: Award, label: "Certificate" },
];

/** Long or short form, each with what's in it and samples to open. */
export function ContentTypePicker({ value, onChange, template }: { value: Form; onChange: (f: Form) => void; template: ShortTemplate }) {
  const [preview, setPreview] = useState<{ form: Form; at: number } | null>(null);
  const t = TEMPLATES[template];
  const option = (f: Form, children: React.ReactNode) => (
    <div role="radio" aria-checked={value === f} tabIndex={0} onClick={() => onChange(f)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(f); } }}
      className={cn("squircle flex cursor-pointer flex-col gap-3 rounded-panel border p-4 text-left transition-colors focus-ring", value === f ? "border-brand bg-tint/60 ring-1 ring-brand" : "border-hair-2 bg-card hover:bg-subtle")}>
      {children}
    </div>
  );
  const head = (icon: React.ReactNode, label: string, length: string, on: boolean) => (
    <div className="flex items-center gap-2.5">
      <span className={cn("grid size-9 place-items-center rounded-control", on ? "bg-brand text-white" : "bg-subtle text-ink-2")}>{icon}</span>
      <span className="flex flex-col"><span className="text-body-lg font-bold text-ink">{label}</span><span className="text-caption text-ink-3">{length}</span></span>
      <span className={cn("ml-auto grid size-5 place-items-center rounded-full border", on ? "border-brand bg-brand text-white" : "border-hair-3")}>{on && <Check className="size-3" aria-hidden="true" />}</span>
    </div>
  );
  return (
    <div className="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Type of content">
      {option("long", <>
        {head(<BookOpen className="size-4.5" aria-hidden="true" />, "Long form", "Modules · 30 min to 2 h", value === "long")}
        <Text size="body" tone="muted">Full modules of videos, PDFs and decks, quick checks, a final assessment and an AI roleplay call.</Text>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {LONG_HAS.map(({ icon: I, label }) => <span key={label} className="flex items-center gap-1 text-caption font-semibold text-ink-3"><I className="size-3.5" aria-hidden="true" />{label}</span>)}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {LONG_SAMPLES.map((s, i) => (
            <button key={s.label} type="button" onClick={(e) => { e.stopPropagation(); setPreview({ form: "long", at: i }); }} aria-label={`Preview a ${s.label.toLowerCase()} sample`}
              className="group squircle relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-control bg-ink p-2 text-left text-white transition-transform hover:-translate-y-0.5">
              <span className="pointer-events-none absolute inset-0 opacity-60" style={{ background: `radial-gradient(circle at ${20 + i * 25}% 0%, var(--color-brand) 0, transparent 60%)` }} />
              <s.icon className="relative size-4" aria-hidden="true" />
              <span className="relative text-micro font-bold leading-tight">{s.label}</span>
              <Maximize2 className="absolute right-1.5 top-1.5 size-3 opacity-0 transition-opacity group-hover:opacity-80" aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); setPreview({ form: "long", at: 0 }); }} className="self-start text-body font-semibold text-brand-deep hover:underline">See a full sample as a rep</button>
      </>)}
      {option("short", <>
        {head(<Layers className="size-4.5" aria-hidden="true" />, "Short form", "Swipeable cards · a few minutes a module", value === "short")}
        <Text size="body" tone="muted">The same approved content, broken into one-idea cards reps swipe through, with a quick check after each module.</Text>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {[{ icon: Layers, label: "Cards" }, { icon: Sparkles, label: "Templates" }, { icon: ListChecks, label: "Quick checks" }].map(({ icon: I, label }) => <span key={label} className="flex items-center gap-1 text-caption font-semibold text-ink-3"><I className="size-3.5" aria-hidden="true" />{label}</span>)}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[{ title: t.sample.title, body: t.label, cover: true }, ...t.sample.cards.slice(0, 3).map((c) => ({ title: c.title, body: c.body, cover: false }))].map((c, i) => (
            <button key={i} type="button" onClick={(e) => { e.stopPropagation(); setPreview({ form: "short", at: i }); }} aria-label={`Preview sample card ${i + 1}`}
              className={cn("group squircle relative flex aspect-[3/4] flex-col gap-0.5 overflow-hidden rounded-control border p-1.5 text-left transition-transform hover:-translate-y-0.5", c.cover ? "border-transparent bg-ink text-white" : "border-hair-2 bg-card")}>
              {c.cover && <span className="pointer-events-none absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 90% 0%, ${t.accent} 0, transparent 65%)` }} />}
              <span className={cn("relative line-clamp-2 text-micro font-bold leading-tight", c.cover ? "mt-auto" : "text-ink")}>{c.title ?? TEMPLATES[template].eyebrow.point}</span>
              {!c.cover && <span className="line-clamp-4 text-[9px] leading-tight text-ink-3">{c.body}</span>}
              <Maximize2 className="absolute right-1 top-1 size-3 opacity-0 transition-opacity group-hover:opacity-80" aria-hidden="true" />
            </button>
          ))}
        </div>
        <button type="button" onClick={(e) => { e.stopPropagation(); setPreview({ form: "short", at: 0 }); }} className="self-start text-body font-semibold text-brand-deep hover:underline">Swipe through a sample</button>
      </>)}
      {preview && <SamplePreview form={preview.form} at={preview.at} template={template} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** Short form only: the card template SwishX writes to. */
export function TemplatePicker({ value, onChange }: { value: ShortTemplate; onChange: (t: ShortTemplate) => void }) {
  const [preview, setPreview] = useState<ShortTemplate | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <Text size="label" weight="semibold" tone="muted">Card template</Text>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label="Card template">
        {TEMPLATE_IDS.map((id) => {
          const t = TEMPLATES[id];
          const on = value === id;
          return (
            <div key={id} role="radio" aria-checked={on} tabIndex={0} onClick={() => onChange(id)} onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onChange(id); } }}
              className={cn("squircle flex cursor-pointer gap-3 rounded-panel border p-3 text-left transition-colors focus-ring", on ? "border-brand bg-tint/60 ring-1 ring-brand" : "border-hair-2 bg-card hover:bg-subtle")}>
              <span className="relative h-14 w-10 shrink-0 overflow-hidden rounded-[8px] bg-ink" aria-hidden="true">
                <span className="absolute inset-0 opacity-90" style={{ background: `radial-gradient(circle at 80% 10%, ${t.accent} 0, transparent 70%)` }} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-bold text-ink">{t.label}</span>
                <span className="text-caption leading-snug text-ink-3">{t.hint}</span>
                <button type="button" onClick={(e) => { e.stopPropagation(); setPreview(id); }} className="self-start pt-0.5 text-caption font-semibold text-brand-deep hover:underline">Preview</button>
              </span>
            </div>
          );
        })}
      </div>
      <Text size="caption" tone="subtle">SwishX fills the template from your title, objective and materials. You can change it later.</Text>
      {preview && <SamplePreview form="short" at={0} template={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** What a rep would see, in a phone-sized frame. */
export function SamplePreview({ form, at, template, onClose }: { form: Form; at: number; template: ShortTemplate; onClose: () => void }) {
  const [tab, setTab] = useState(at);
  return (
    <Modal open onClose={onClose} size="md" title={form === "short" ? `Short form · ${TEMPLATES[template].label}` : "Long form · Lumora launch readiness"}
      description={form === "short" ? "Sample cards. Swipe, use the arrows, or answer the question." : "Real material from a published course, as reps see it."}>
      <div className="mx-auto flex h-[min(600px,66vh)] w-full max-w-[380px] flex-col overflow-hidden rounded-[32px] border-[6px] border-ink bg-canvas">
        {form === "short" ? (
          <div className="flex h-full flex-col p-4"><SampleDeck template={template} startAt={at} /></div>
        ) : (
          <>
            <div className="flex gap-1 border-b border-hair bg-card p-2" role="tablist" aria-label="Sample material">
              {LONG_SAMPLES.map((s, i) => (
                <button key={s.label} type="button" role="tab" aria-selected={tab === i} onClick={() => setTab(i)}
                  className={cn("flex flex-1 flex-col items-center gap-0.5 rounded-control px-1 py-1.5 text-micro font-bold transition-colors", tab === i ? "bg-tint text-brand-deep" : "text-ink-3 hover:bg-subtle")}>
                  <s.icon className="size-4" aria-hidden="true" />{s.label}
                </button>
              ))}
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className="flex flex-col">
                <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{LONG_SAMPLES[tab].hint}</Text>
                <Text size="title" weight="bold">{LONG_SAMPLES[tab].block.title}</Text>
              </div>
              <BlockView key={tab} block={LONG_SAMPLES[tab].block} sourceIds={["src-lum-pi", "src-lum-va", "src-lum-p3", "src-lum-obj", "src-lum-payer", "src-ad-guide"]} interactive />
              <Text size="caption" tone="subtle" className="border-t border-hair pt-3">After the material: a module check, then a final assessment and an AI roleplay call for certification.</Text>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Public: in the Library for the chosen teams. Private: only people you assign. */
export function VisibilityPicker({ value, onChange, teams }: { value: "public" | "private"; onChange: (v: "public" | "private") => void; teams: string }) {
  const opts = [
    { v: "public" as const, icon: Globe, label: "Public", hint: `Shows in the Library for ${teams}. Anyone there can take it.` },
    { v: "private" as const, icon: Lock, label: "Private", hint: "Not in the Library. Only people you assign see it." },
  ];
  return (
    <div className="flex flex-col gap-2">
      <Text size="label" weight="semibold" tone="muted">Who can find it?</Text>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Who can find it">
        {opts.map((o) => (
          <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)}
            className={cn("squircle flex gap-3 rounded-panel border p-3.5 text-left transition-colors", value === o.v ? "border-brand bg-tint/60 ring-1 ring-brand" : "border-hair-2 bg-card hover:bg-subtle")}>
            <o.icon className={cn("mt-0.5 size-4.5 shrink-0", value === o.v ? "text-brand-deep" : "text-ink-3")} aria-hidden="true" />
            <span className="flex flex-col gap-0.5"><span className="text-body-lg font-semibold text-ink">{o.label}</span><span className="text-caption text-ink-3">{o.hint}</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}
