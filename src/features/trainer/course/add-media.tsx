"use client";

import { useState } from "react";
import { CirclePlay, FileText, Presentation, Headphones, Upload, Check } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import type { Block, Course, Module } from "@/data/types";
import { DOC_PAGES, VA_PAGES } from "@/data/media";
import { source } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { audioBlock, documentBlock, videoFromModule, visualAidBlock } from "./media-builders";

type Kind = "upload" | "ai" | "document" | "visualaid";

/** CC-10: add media to a module. Everything added goes into the MLR package with the rest of the version. */
export function AddMediaRow({ course, module, onAdd }: { course: Course; module: Module; onAdd: (b: Block, note: string) => void }) {
  const [kind, setKind] = useState<Kind | null>(null);
  const docSources = course.sourceIds.filter((id) => DOC_PAGES[id]);
  const vaSources = course.sourceIds.filter((id) => VA_PAGES[id]);
  const audio = audioBlock(module);
  const items = [
    { k: "upload" as const, icon: Upload, label: "Upload video", show: true },
    { k: "ai" as const, icon: AgentIcon, label: "Generate a short video", show: true },
    { k: "document" as const, icon: FileText, label: "Assign PDF pages", show: docSources.length > 0 },
    { k: "visualaid" as const, icon: Presentation, label: "Visual-aid walkthrough", show: vaSources.length > 0 },
  ].filter((x) => x.show);

  return (
    <div className="squircle flex flex-col gap-3 rounded-card border border-dashed border-hair-3 p-4">
      <Text size="caption" weight="bold" tone="subtle">ADD TO THIS MODULE</Text>
      <div className="flex flex-wrap gap-2">
        {items.map((x) => (
          <Button key={x.k} variant="secondary" size="sm" onClick={() => setKind(x.k)}><x.icon className="size-4" aria-hidden="true" />{x.label}</Button>
        ))}
        {audio && <Button variant="secondary" size="sm" onClick={() => onAdd(audio, "Audio version added · reads the approved text")}><Headphones className="size-4" aria-hidden="true" />Audio version</Button>}
      </div>
      {kind === "upload" && <UploadVideo module={module} onClose={() => setKind(null)} onAdd={onAdd} />}
      {kind === "ai" && <AiVideo module={module} onClose={() => setKind(null)} onAdd={onAdd} />}
      {kind === "document" && <PickPages title="Assign PDF pages" sources={docSources} pagesOf={(id) => Object.keys(DOC_PAGES[id]).map(Number)} withCallout
        onClose={() => setKind(null)} onPick={(src, pages, callout) => onAdd(documentBlock(module, src, pages, callout), `${pages.length} page${pages.length > 1 ? "s" : ""} assigned`)} />}
      {kind === "visualaid" && <PickPages title="Visual-aid walkthrough" sources={vaSources} pagesOf={(id) => Object.keys(VA_PAGES[id]).map(Number)}
        onClose={() => setKind(null)} onPick={(src, pages) => onAdd(visualAidBlock(module, src, pages), "Walkthrough added · check what to say on each page")} />}
    </div>
  );
}

function Steps({ steps, at }: { steps: string[]; at: number }) {
  return (
    <ol className="flex flex-col gap-2">
      {steps.map((st, i) => (
        <li key={st} className={cn("flex items-center gap-3 rounded-control px-3 py-2", i < at ? "bg-ok-bg" : i === at ? "shimmer bg-tint" : "bg-subtle")}>
          <span className={cn("grid size-6 place-items-center rounded-full text-micro font-bold", i < at ? "bg-ok text-white" : "bg-black/10 text-ink-3")}>{i < at ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}</span>
          <Text size="body-lg" weight={i === at ? "semibold" : undefined}>{st}</Text>
        </li>
      ))}
    </ol>
  );
}

function useSteps(n: number, onDone: () => void) {
  const [at, setAt] = useState(-1);
  const start = () => {
    let i = 0;
    setAt(0);
    const tick = () => { i++; setAt(i); if (i < n) window.setTimeout(tick, 800); else window.setTimeout(onDone, 500); };
    window.setTimeout(tick, 800);
  };
  return { at, start };
}

function UploadVideo({ module, onClose, onAdd }: { module: Module; onClose: () => void; onAdd: (b: Block, note: string) => void }) {
  const [file, setFile] = useState("");
  const steps = ["Upload", "Transcribe", "Split into chapters", "Draft captions"];
  const { at, start } = useSteps(steps.length, () => { onAdd(videoFromModule(module, "upload", file), "Video added · check the drafted transcript"); onClose(); });
  return (
    <Modal open onClose={onClose} title="Upload a video" description="MP4 or MOV. SwishX transcribes it, splits it into chapters and drafts captions. The video itself must already be approved, or it goes into this course's MLR package."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!file || at >= 0} onClick={start}>Upload &amp; process</Button></>}>
      <div className="flex flex-col gap-3">
        <label className="squircle flex cursor-pointer items-center gap-3 rounded-panel border border-dashed border-hair-3 px-4 py-5 hover:bg-subtle">
          <CirclePlay className="size-5 text-brand-deep" aria-hidden="true" />
          <Text size="body-lg" weight="semibold" tone={file ? "default" : "muted"}>{file || "Choose a video file"}</Text>
          <input type="file" accept="video/*" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
        </label>
        {!file && <button type="button" className="self-start text-body font-semibold text-brand-deep hover:underline" onClick={() => setFile("brand-team-briefing.mp4")}>Use a sample file</button>}
        {at >= 0 && <Steps steps={steps} at={at} />}
      </div>
    </Modal>
  );
}

function AiVideo({ module, onClose, onAdd }: { module: Module; onClose: () => void; onAdd: (b: Block, note: string) => void }) {
  const steps = ["Write the script from cited sentences", "Storyboard scenes", "Render with voiceover", "Add captions & chapters"];
  const { at, start } = useSteps(steps.length, () => { onAdd(videoFromModule(module, "ai"), "AI video added · goes to MLR as new content"); onClose(); });
  return (
    <Modal open onClose={onClose} title="Generate a short video" description={`A 1–3 minute explainer for “${module.title}”, made with the SwishX video engine. The script uses only this module's cited sentences.`}
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={at >= 0} onClick={start}><AgentIcon className="size-4" aria-hidden="true" />Generate</Button></>}>
      <div className="flex flex-col gap-3">
        <div className="squircle rounded-panel border border-warn-line bg-warn-bg px-4 py-3"><Text size="body" tone="warn" weight="semibold">AI-generated video is new content. It's flagged in checks and goes to MLR as part of this version.</Text></div>
        {at >= 0 && <Steps steps={steps} at={at} />}
      </div>
    </Modal>
  );
}

function PickPages({ title, sources, pagesOf, withCallout, onPick, onClose }: {
  title: string; sources: string[]; pagesOf: (id: string) => number[]; withCallout?: boolean;
  onPick: (src: string, pages: number[], callout: string) => void; onClose: () => void;
}) {
  const [src, setSrc] = useState(sources[0]);
  const [pages, setPages] = useState<number[]>([]);
  const [callout, setCallout] = useState("");
  return (
    <Modal open onClose={onClose} title={title} description="Reps read the approved pages in-app, view-only. Completion needs every page opened."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!pages.length} onClick={() => { onPick(src, [...pages].sort((a, b) => a - b), callout); onClose(); }}>Add {pages.length || ""} page{pages.length === 1 ? "" : "s"}</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">{sources.map((id) => <Chip key={id} size="lg" selected={src === id} onClick={() => { setSrc(id); setPages([]); }}>{source(id)?.title}</Chip>)}</div>
        <div className="flex flex-col gap-2">
          <Text size="label" weight="semibold" tone="muted">Pages</Text>
          <div className="flex flex-wrap gap-2">{pagesOf(src).map((p) => <Chip key={p} size="lg" selected={pages.includes(p)} onClick={() => setPages(pages.includes(p) ? pages.filter((x) => x !== p) : [...pages, p])}>p. {p}</Chip>)}</div>
        </div>
        {withCallout && <Field label="Trainer note on the first page (optional)" value={callout} onChange={(e) => setCallout(e.target.value)} placeholder="e.g. Know 5.2 word for word." />}
      </div>
    </Modal>
  );
}
