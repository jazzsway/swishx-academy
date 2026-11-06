"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CirclePlay, FileText, Headphones, Presentation, ListChecks, Mic, Check } from "lucide-react";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import type { Block, Course, Module } from "@/data/types";
import { fmtTime } from "@/data/media";
import { Text } from "@/components/ui/text";
import { EmptyState } from "@/components/patterns/academy";
import { VideoPlayer } from "@/features/media/video-player";
import { modulesOf } from "./use-rep";

/** Small type summary for a module: what kind of learning is inside (watch, read, listen, practise). */
export function MediaSummary({ module }: { module: Module }) {
  const count = (t: Block["type"][]) => module.blocks.filter((b) => t.includes(b.type)).length;
  const items = [
    { n: count(["video"]), icon: CirclePlay, label: "video" },
    { n: count(["document"]), icon: FileText, label: "read" },
    { n: count(["visualaid"]), icon: Presentation, label: "walkthrough" },
    { n: count(["audio"]), icon: Headphones, label: "listen" },
    { n: count(["check", "flashcards"]), icon: ListChecks, label: "check" },
    { n: count(["scenario"]), icon: Mic, label: "roleplay" },
  ].filter((x) => x.n);
  return (
    <span className="flex flex-wrap items-center gap-2 text-micro text-ink-3">
      {items.map((x) => <span key={x.label} className="flex items-center gap-0.5" title={`${x.n} ${x.label}`}><x.icon className="size-3.5" aria-hidden="true" />{x.n > 1 ? x.n : ""}<span className="sr-only">{x.n} {x.label}</span></span>)}
    </span>
  );
}

export interface Clip { course: Course; module: Module; block: Block }

export function useClips(): Clip[] {
  const me = useMe();
  const s = useApp();
  const ids = s.progress.filter((p) => p.userId === me.id).map((p) => p.courseId);
  return s.courses.filter((c) => ids.includes(c.id))
    .flatMap((c) => modulesOf(c).flatMap((m) => m.blocks.filter((b) => b.type === "video" && b.video && b.video.durationSec <= 200).map((b) => ({ course: c, module: m, block: b }))));
}

export function ClipCard({ clip, wide }: { clip: Clip; wide?: boolean }) {
  const s = useApp();
  const me = useMe();
  const done = s.progress.find((p) => p.userId === me.id && p.courseId === clip.course.id)?.completedBlocks.includes(clip.block.id);
  const scene = clip.block.video!.scenes.find((x) => x.stat) ?? clip.block.video!.scenes[0];
  return (
    <Link href={`/rep/watch/${clip.course.id}/${clip.block.id}`} className={`group flex shrink-0 flex-col gap-2 ${wide ? "w-full" : "w-[220px]"}`}>
      <div className="squircle relative aspect-video overflow-hidden rounded-panel bg-ink p-3 text-white">
        <div className="absolute inset-0 opacity-45" style={{ background: "radial-gradient(circle at 25% 30%, var(--color-brand) 0, transparent 50%), radial-gradient(circle at 85% 80%, var(--color-brand-2) 0, transparent 45%)" }} />
        <div className="relative flex h-full flex-col justify-end gap-0.5">
          {scene.stat && <span className="text-title font-extrabold leading-none">{scene.stat}</span>}
          <span className="line-clamp-2 text-body font-bold leading-tight">{scene.headline}</span>
        </div>
        <CirclePlay className="absolute right-2.5 top-2.5 size-6 text-white/90 transition-transform group-hover:scale-110" aria-hidden="true" />
        <span className="absolute bottom-2 right-2 rounded-glyph bg-black/55 px-1.5 text-micro font-semibold">{fmtTime(clip.block.video!.durationSec)}</span>
        {done && <span className="absolute left-2 top-2 grid size-5 place-items-center rounded-full bg-ok text-white"><Check className="size-3" aria-hidden="true" /></span>}
      </div>
      <div className="flex flex-col">
        <Text size="body" weight="semibold" clamp={2} className="leading-snug">{clip.block.title}</Text>
        <Text size="micro" tone="subtle" truncate>{clip.course.title}</Text>
      </div>
    </Link>
  );
}

/** The Quick watch rail on the rep home: short clips from assigned courses, between calls. */
export function QuickWatchRail() {
  const clips = useClips();
  if (!clips.length) return null;
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between"><Text as="h2" size="subhead" weight="bold">Quick watch</Text><Text size="caption" tone="subtle">{clips.length} short videos</Text></div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {clips.map((c) => <ClipCard key={c.block.id} clip={c} />)}
      </div>
    </section>
  );
}

export function WatchClip() {
  const { courseId, blockId } = useParams<{ courseId: string; blockId: string }>();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const clips = useClips();
  const clip = clips.find((c) => c.block.id === blockId && c.course.id === courseId);
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === courseId);
  if (!clip) return <div className="p-4"><EmptyState title="Video not available" body="It may have expired or isn't in your courses." /></div>;
  const inPath = !!p?.path?.moduleIds.includes(clip.module.id);
  const done = p?.completedBlocks.includes(clip.block.id);
  const ver = clip.course.versions.find((v) => v.version === p?.version);
  const next = clips.filter((c) => c.block.id !== clip.block.id);
  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <button type="button" onClick={() => router.back()} className="self-start text-body font-semibold text-ink-3">← Back</button>
      <VideoPlayer key={clip.block.id} spec={clip.block.video!} title={clip.block.title} onWatched={(pct) => {
        if (pct >= 90 && p && !useApp.getState().progress.find((x) => x.id === p.id)!.completedBlocks.includes(clip.block.id) && inPath) { s.completeBlock(p.id, clip.block.id, clip.block.minutes); s.touchStreak(me.id); }
      }} />
      <div className="flex flex-col gap-1">
        <Text as="h1" size="display" weight="extrabold" className="leading-tight">{clip.block.title}</Text>
        <Text size="caption" tone="subtle">{clip.course.title} · {clip.module.title}{ver?.docNumber ? ` · ${ver.docNumber}` : ""}</Text>
        <Text size="body" tone={done ? "ok" : "muted"} weight={done ? "semibold" : undefined}>{done ? "Watched · counted in your course" : inPath ? "Watching 90% counts toward your path." : "Refresher. Not part of your current path."}</Text>
      </div>
      {next.length > 0 && (
        <section className="flex flex-col gap-3 pb-4">
          <Text size="subhead" weight="bold">Up next</Text>
          <div className="grid grid-cols-2 gap-3">{next.slice(0, 6).map((c) => <ClipCard key={c.block.id} clip={c} wide />)}</div>
        </section>
      )}
    </div>
  );
}
