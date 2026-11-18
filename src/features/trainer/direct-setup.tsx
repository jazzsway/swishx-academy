"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Plus, Upload, X } from "lucide-react";
import { AgentIcon, LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { DIVISIONS, SOURCES, product } from "@/data/org";
import type { Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { FORMAT_ICON, FORMAT_LABEL, SourcePreview, fileUrl } from "./source-preview";
import { directModules } from "./materials";
import { FOR_ROLEPLAY, THUMB, kindOf, useUpload } from "./direct-course";
import { useTrainingChat } from "./course/training-chat-store";

/* Sample briefs; picking one fills in the box. */
const SAMPLES: [string, string][] = [
  ["New trial data", "Reps can present the new trial results exactly as approved, keep fair balance, and handle doctors who are happy with what they prescribe."],
  ["Nurse questions", "Reps answer nurses' dosing and side-effect questions on-label, and report any adverse event they hear about."],
  ["Access & support", "Reps explain the support program to practice managers and patients without promising coverage."],
];

/** Reference material, like objection lists or a selling model, starts as information only; everything else reps see. */
const visibleByDefault = (s: Source) => !(FOR_ROLEPLAY.has(s.type) || /objection|selling|sales model|payer|handler|framework|script|faq|call guide/i.test(s.title));

/** A short name from the brief: its first clause, without "reps can…". */
function nameFrom(brief: string, brand?: string) {
  const first = brief.split(/[.!?\n]/)[0].replace(/^\s*(train |teach |help )?reps?\s+(to\s+|can\s+|should\s+|will\s+)?(be able to\s+)?/i, "").trim();
  const phrase = first.split(/,|;|\s+(?:on the|without|so that|then)\s+/i)[0];
  const words = phrase.split(/\s+/).slice(0, 9).join(" ").replace(/[,;:]$/, "");
  const name = words ? words.charAt(0).toUpperCase() + words.slice(1) : "New training";
  return brand && !name.toLowerCase().includes(brand.toLowerCase()) ? `${brand}: ${name}` : name;
}

/**
 * A new training with the trainer's own material starts like a studio project: the brief and the
 * material, as two parts. Continue creates it as a draft and opens the editor, where the agent walks
 * through its four stages: basic details, objectives and situations, settings, then save and assign.
 */
export function DirectSetup() {
  const router = useRouter();
  const productId = product(useSearchParams().get("product") ?? undefined)?.id;
  const prod = product(productId);
  const s = useApp();
  const me = useMe();
  const upload = useUpload(productId);
  const [brief, setBrief] = useState("");
  const [files, setFiles] = useState<{ id: string; visible: boolean }[]>([]);
  const [preview, setPreview] = useState<Source | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [over, setOver] = useState(false);

  const all = [...SOURCES, ...s.uploads];
  const items = files.map((f) => ({ ...f, src: all.find((x) => x.id === f.id) })).filter((f): f is { id: string; visible: boolean; src: Source } => !!f.src);
  const add = (list: Source[]) => setFiles((fs) => [...fs, ...list.filter((x) => !fs.some((f) => f.id === x.id)).map((x) => ({ id: x.id, visible: visibleByDefault(x) }))]);
  const touched = !!(brief || files.length);

  /** The brief and the files become a draft training; the chat then walks through its four stages, starting with the basics. */
  function start() {
    if (!brief.trim()) return;
    const title = nameFrom(brief, prod?.brand);
    const shown = items.filter((f) => f.visible), info = items.filter((f) => !f.visible);
    const teams = prod ? [prod.divisionId] : [];
    const teamNames = teams.length ? teams.map((t) => DIVISIONS.find((d) => d.id === t)?.name).join(" + ") : "everyone";
    const mods = directModules(shown.map((f) => f.src), `d${Date.now().toString(36).slice(-4)}`);
    const id = s.createCourse({
      title, productId, format: "long", type: "linear", origin: "direct", roleplaySourceIds: info.map((f) => f.id),
      objective: brief.trim(), audience: `Field reps · ${teamNames}`, writtenFor: "reps", teams, sourceIds: items.map((f) => f.id),
      competencyIds: [...new Set(mods.map((m) => m.competency))], scope: { variants: [], indications: [], therapyAreas: [] },
      visibility: "assigned", screening: true,
    });
    s.updateCourse(id, { brief: brief.trim(), objectives: [] });
    s.setModules(id, mods);
    const list = (xs: typeof items) => xs.map((x) => `“${x.src.title}”`).join(", ");
    useTrainingChat.getState().push(id,
      { id: "s-brief", from: "you", text: brief.trim() + (items.length ? `\n📎 ${items.length} file${items.length === 1 ? "" : "s"}` : "") },
      { id: "s-set", from: "ai", text: `Let's build it in four stages, ${me.first}: basic details, objectives and situations, settings, then save and assign. First the basics: I named it “${title}”.${shown.length ? ` Reps will see ${list(shown)}.` : " Add the files reps should see."}${info.length ? ` ${list(info)} ${info.length === 1 ? "is" : "are"} information only: I use ${info.length === 1 ? "it" : "them"}, reps don't.` : ""} Check them on the left, then say “next”.` });
    router.push(`/trainer/courses/${id}/details`);
  }

  const header = (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-card px-3 sm:px-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-control border border-tint-line bg-gradient-to-br from-tint to-white"><LogoMark size={17} className="text-brand" /></span>
      <span className="h-5 w-px shrink-0 bg-hair-2" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <Text as="h1" size="body-lg" weight="extrabold" truncate className="leading-tight text-ink-3">New training</Text>
        <span className="flex items-center gap-1.5 text-micro font-semibold text-ink-3">{prod?.brand ?? "Company"}<span className="rounded-glyph bg-info-bg px-1.5 py-px text-info">With my material</span></span>
      </div>
      <div className="relative ml-auto">
        <button type="button" aria-label="Close" title="Close" onClick={() => (touched ? setLeaving(true) : router.push("/trainer/courses"))}
          className="grid size-9 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-ink"><X className="size-4.5" /></button>
        {leaving && (
          <div className="select-pop absolute right-0 top-full z-20 mt-2 flex w-[280px] flex-col gap-3 rounded-panel border border-hair bg-card p-4 shadow-modal">
            <Text size="body" weight="semibold">Leave without creating it?</Text>
            <Text size="caption" tone="subtle">Nothing is saved until you continue.</Text>
            <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => router.push("/trainer/courses")}>Leave</Button><Button size="sm" onClick={() => setLeaving(false)}>Keep going</Button></div>
          </div>
        )}
      </div>
    </header>
  );

  const picker = (label: string) => (
    <label className="flex cursor-pointer items-center gap-1.5 self-start text-body font-semibold text-brand-deep hover:underline">
      <Plus className="size-4" aria-hidden="true" />{label}
      <input type="file" multiple className="sr-only" onChange={(e) => { add(upload(Array.from(e.target.files ?? []), "f")); e.target.value = ""; }} />
    </label>
  );

  /* Describe it, and add the material: two clear parts. */
  return (
      <div className="flex h-dvh flex-col bg-canvas">
        {header}
        <main className="min-h-0 flex-1 overflow-y-auto bg-subtle/60">
          <div className="mx-auto flex w-full max-w-[760px] flex-col gap-6 px-5 pb-16 pt-[10vh]">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Text as="h1" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">Describe the training you want to build</Text>
              <Text size="body" tone="subtle">Tell SwishX what reps should learn, and add the material it should use.</Text>
            </div>

            {/* One composer: the brief, the material, and the way on. Drop files anywhere on it. */}
            <section className={cn("squircle flex flex-col overflow-hidden rounded-card border bg-card shadow-soft transition-colors", over ? "border-brand ring-2 ring-brand/20" : "border-hair")}
              onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setOver(true); } }} onDragLeave={() => setOver(false)}
              onDrop={(e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setOver(false); add(upload(Array.from(e.dataTransfer.files), "f")); }}>
              <div className="flex flex-col gap-2 px-5 pt-5">
                <label htmlFor="brief" className="flex items-center gap-2 text-body font-bold text-ink"><AgentIcon className="size-4 text-brand" aria-hidden="true" />What should reps learn and be able to do?</label>
                <textarea id="brief" rows={3} value={brief} onChange={(e) => setBrief(e.target.value)} autoFocus
                  placeholder="e.g. Reps can present the new trial results exactly as approved, keep fair balance, and handle doctors who are happy with what they prescribe."
                  className="w-full resize-none bg-transparent py-1 text-body-lg leading-relaxed text-ink outline-none placeholder:text-ink-4" />
              </div>

              <div className="flex flex-col gap-2.5 px-5 pb-4 pt-1">
                <div className="flex items-center gap-2">
                  <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider" className="flex-1">Your material{items.length ? ` · ${items.length}` : ""}</Text>
                  {items.length > 0 && picker("Add more")}
                </div>
                {items.length === 0 ? (
                  <label className={cn("squircle flex cursor-pointer items-center gap-3 rounded-panel border border-dashed px-3.5 py-2.5 transition-colors hover:border-brand hover:bg-tint/60", over ? "border-brand bg-tint" : "border-hair-3")}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-tint text-brand-deep"><Upload className="size-4" aria-hidden="true" /></span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-semibold text-ink-2">Add your files, or drop them here</span>
                      <span className="truncate text-caption text-ink-3">Decks, PDFs, videos, reference documents. You choose what reps see next.</span>
                    </span>
                    <span className="hidden shrink-0 rounded-control border border-hair-2 bg-card px-3 py-1.5 text-caption font-bold text-ink-2 sm:block">Browse</span>
                    <input type="file" multiple className="sr-only" onChange={(e) => { add(upload(Array.from(e.target.files ?? []), "f")); e.target.value = ""; }} />
                  </label>
                ) : (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                    {items.map((f) => <FileCard key={f.id} s={f.src} onPreview={() => setPreview(f.src)} onRemove={() => setFiles(files.filter((x) => x.id !== f.id))} />)}
                  </ul>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-hair bg-subtle/50 px-5 py-3">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  <Text size="caption" tone="subtle" className="mr-0.5">Try</Text>
                  {SAMPLES.map(([label, t]) => (
                    <button key={label} type="button" onClick={() => setBrief(t)} className={cn("rounded-chip border px-2.5 py-1 text-caption font-semibold transition-colors", brief === t ? "border-brand bg-tint text-brand-deep" : "border-hair-2 bg-card text-ink-2 hover:border-brand hover:text-brand-deep")}>{label}</button>
                  ))}
                </div>
                <Button disabled={!brief.trim()} onClick={start} title={brief.trim() ? undefined : "Describe the training to continue"}>Continue<ArrowRight className="size-4" aria-hidden="true" /></Button>
              </div>
            </section>
            {!brief.trim() && <Text size="caption" tone="subtle" className="-mt-3 text-center">Describe the training to continue. Files are optional; you can add them later.</Text>}
          </div>
        </main>
        {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
      </div>
    );
}

/** An uploaded file, as a preview: the picture or video itself, or its type. */
function FileCard({ s, onPreview, onRemove }: { s: Source; onPreview: () => void; onRemove: () => void }) {
  const k = kindOf(s);
  const Icon = FORMAT_ICON[k];
  const url = s.uploaded ? fileUrl(s.id) : undefined;
  return (
    <li className="squircle group relative flex flex-col overflow-hidden rounded-panel border border-hair bg-card transition-shadow hover:shadow-hair">
      <button type="button" onClick={onPreview} className="flex flex-col text-left">
        <span className={cn("grid aspect-[4/3] place-items-center overflow-hidden", THUMB[k])}>
          {url && k === "image" ? <img src={url} alt="" className="size-full object-cover" />
            : url && k === "video" ? <video src={url} muted preload="metadata" className="size-full object-cover" />
            : <Icon className="size-8 opacity-80" aria-hidden="true" />}
        </span>
        <span className="flex flex-col gap-0.5 p-2.5">
          <span className="line-clamp-2 text-caption font-semibold leading-snug text-ink">{s.title}</span>
          <span className="text-micro text-ink-3">{FORMAT_LABEL[k]}{s.pages ? ` · ${s.pages} pages` : ""}</span>
        </span>
      </button>
      <button type="button" aria-label={`Remove ${s.title}`} onClick={onRemove} className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-card/90 text-ink-3 opacity-0 shadow-hair transition-opacity hover:text-ink group-hover:opacity-100 focus:opacity-100"><X className="size-3.5" /></button>
    </li>
  );
}
