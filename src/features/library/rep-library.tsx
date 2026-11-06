"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Search, ListVideo, ChartPie, FileText, Presentation, CirclePlay, BookOpen, Check, Lock, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import type { Block, Course, Material } from "@/data/types";
import { product } from "@/data/org";
import { fmtTime } from "@/data/media";
import { courseMinutes } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/patterns/academy";
import { BlockView, BLOCK_META } from "@/features/shared/block-view";
import { ClipCard, useClips } from "@/features/rep/watch";
import { COMPARATIVE_HINTS, KIND_LABEL, OFF_LABEL_HINTS, libraryCourses, libraryMaterials, materialBlocks, materialMinutes } from "./library-data";

const KIND_ICON = { playlist: ListVideo, graphic: ChartPie, reading: FileText, visualaid: Presentation, video: CirclePlay };
const FILTERS = [
  { id: "all", label: "All" }, { id: "course", label: "Courses" }, { id: "playlist", label: "Playlists" }, { id: "video", label: "Videos" },
  { id: "reading", label: "Reading" }, { id: "visualaid", label: "Visual aids" }, { id: "graphic", label: "Graphics" }, { id: "audio", label: "Audio" },
] as const;
type Filter = (typeof FILTERS)[number]["id"];

function CourseCard({ c }: { c: Course }) {
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === c.id);
  const explored = (s.explored[me.id] ?? []).filter((b) => c.modules.some((m) => m.blocks.some((x) => x.id === b))).length;
  const status = p?.state === "certified" ? "Certified" : p ? (p.assignType === "self" ? "Started" : "Assigned to you") : explored ? `Explored ${explored}` : null;
  return (
    <Link href={`/rep/course/${c.id}`} className="squircle flex flex-col gap-2 rounded-panel border border-hair bg-card p-4 transition-colors hover:bg-subtle">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-control bg-tint text-brand-deep"><BookOpen className="size-4.5" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="bold" truncate>{c.title}</Text><Text size="micro" tone="subtle">{product(c.productId)?.brand ?? "Company"} · {c.modules.length} modules · {courseMinutes(c)} min</Text></div>
        {status && <Chip size="xs" tone={p?.state === "certified" ? "ok" : "brand"}>{status}</Chip>}
      </div>
      <Text size="body" tone="muted" clamp={2}>{c.objective}</Text>
    </Link>
  );
}

function MaterialCard({ m }: { m: Material }) {
  const s = useApp();
  const Icon = KIND_ICON[m.kind];
  const n = m.items?.length;
  return (
    <Link href={`/rep/library/${m.id}`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-3.5 transition-colors hover:bg-subtle">
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-control", m.kind === "playlist" ? "bg-ink text-white" : "bg-tint text-brand-deep")}><Icon className="size-5" aria-hidden="true" /></span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="body-lg" weight="semibold" truncate>{m.title}</Text>
        <Text size="caption" tone="subtle" truncate>{KIND_LABEL[m.kind]}{n && m.kind === "playlist" ? ` · ${n} items` : ""} · {materialMinutes(s, m)} min{m.docNumber ? ` · ${m.docNumber}` : ""}</Text>
      </div>
      <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
    </Link>
  );
}

function Shelf({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between"><Text as="h2" size="subhead" weight="bold">{title}</Text>{count !== undefined && <Text size="caption" tone="subtle">{count}</Text>}</div>
      {children}
    </section>
  );
}

/** RL-1: everything approved and visible to this rep, browsable without starting anything for credit. */
export function LibraryHome() {
  const me = useMe();
  const s = useApp();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const courses = libraryCourses(s, me);
  const materials = libraryMaterials(s, me);
  const clips = useClips();
  const team = courses.filter((c) => c.productId || c.divisionId);

  /* Every approved block inside visible courses is findable by search too. */
  const blocks = useMemo(() => courses.flatMap((c) => c.modules.flatMap((m) => m.blocks.filter((b) => ["video", "document", "visualaid", "audio", "graphic"].includes(b.type)).map((b) => ({ c, m, b })))), [courses]);
  const term = submitted.trim().toLowerCase();
  const results = term ? {
    courses: courses.filter((c) => `${c.title} ${c.objective}`.toLowerCase().includes(term)),
    materials: materials.filter((m) => `${m.title} ${m.description}`.toLowerCase().includes(term)),
    blocks: blocks.filter(({ b, m }) => `${b.title} ${m.title} ${(b.video?.captions ?? []).map((x) => x.text).join(" ")}`.toLowerCase().includes(term)),
  } : null;
  const total = results ? results.courses.length + results.materials.length + results.blocks.length : 0;
  const offLabel = OFF_LABEL_HINTS.some((h) => term.includes(h));
  const comparative = !offLabel && COMPARATIVE_HINTS.some((h) => ` ${term}`.includes(h));

  useEffect(() => { if (term) s.recordSearch(term, total); }, [term]); // eslint-disable-line react-hooks/exhaustive-deps

  const show = (k: Filter) => filter === "all" || filter === k;
  const byKind = (k: Material["kind"]) => materials.filter((m) => m.kind === k);
  const blockOf = (t: Block["type"]) => blocks.filter(({ b }) => b.type === t);

  return (
    <div className="flex flex-col gap-5 px-4 pt-5">
      <div className="flex flex-col gap-1">
        <Text as="h1" size="hero" weight="extrabold" tracking="tight">Library</Text>
        <Text size="body" tone="subtle">Everything approved for your team. Explore anything; nothing here is graded.</Text>
      </div>
      <form onSubmit={(e) => { e.preventDefault(); setSubmitted(q); }} className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-ink-4" aria-hidden="true" />
        <label htmlFor="lib-search" className="sr-only">Search the Library</label>
        <input id="lib-search" value={q} onChange={(e) => { setQ(e.target.value); if (!e.target.value) setSubmitted(""); }} placeholder="Search videos, readings, courses…"
          className="squircle h-12 w-full rounded-control border border-hair-2 bg-card pl-10 pr-3 text-subhead outline-none focus:border-brand" />
      </form>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => <Chip key={f.id} size="lg" selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>)}
      </div>

      {results ? (
        total === 0 ? (
          <EmptyState title={`Nothing approved matches “${submitted}”`}
            body={offLabel ? "Questions about uses outside the approved indication go to Medical Information. Your manager can help you submit a request."
              : comparative ? "There are no head-to-head studies, so there's no approved comparison. Stick to Lumora's own data." : "Try a broader word, or ask your trainer. Searches with no results help them see what's missing."} />
        ) : (
          <div className="flex flex-col gap-4">
            <Text size="caption" tone="subtle">{total} result{total === 1 ? "" : "s"} for “{submitted}”</Text>
            {show("course") && results.courses.map((c) => <CourseCard key={c.id} c={c} />)}
            {results.materials.filter((m) => show(m.kind as Filter)).map((m) => <MaterialCard key={m.id} m={m} />)}
            {results.blocks.filter(({ b }) => show(b.type === "document" ? "reading" : (b.type as Filter))).map(({ c, m, b }) => <BlockRow key={b.id} c={c} m={m.title} b={b} />)}
          </div>
        )
      ) : (
        <>
          {show("course") && team.length > 0 && <Shelf title="For your team" count={team.length}><div className="flex flex-col gap-2.5">{team.map((c) => <CourseCard key={c.id} c={c} />)}</div></Shelf>}
          {show("playlist") && byKind("playlist").length > 0 && <Shelf title="Playlists" count={byKind("playlist").length}><div className="flex flex-col gap-2">{byKind("playlist").map((m) => <MaterialCard key={m.id} m={m} />)}</div></Shelf>}
          {show("video") && clips.length > 0 && (
            <Shelf title="Short videos" count={clips.length}>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{clips.map((c) => <ClipCard key={c.block.id} clip={c} />)}</div>
            </Shelf>
          )}
          {show("visualaid") && (byKind("visualaid").length + blockOf("visualaid").length) > 0 && (
            <Shelf title="Visual aids & detailers"><div className="flex flex-col gap-2">{byKind("visualaid").map((m) => <MaterialCard key={m.id} m={m} />)}</div></Shelf>
          )}
          {show("reading") && byKind("reading").length > 0 && <Shelf title="Reading room" count={byKind("reading").length}><div className="flex flex-col gap-2">{byKind("reading").map((m) => <MaterialCard key={m.id} m={m} />)}</div></Shelf>}
          {show("graphic") && byKind("graphic").length > 0 && <Shelf title="Graphics" count={byKind("graphic").length}><div className="grid grid-cols-2 gap-2.5">{byKind("graphic").map((m) => <GraphicTile key={m.id} m={m} />)}</div></Shelf>}
          {show("audio") && blockOf("audio").length > 0 && <Shelf title="Listen on the road" count={blockOf("audio").length}><div className="flex flex-col gap-2">{blockOf("audio").map(({ c, m, b }) => <BlockRow key={b.id} c={c} m={m.title} b={b} />)}</div></Shelf>}
          {show("course") && <Shelf title="All courses" count={courses.length}><div className="flex flex-col gap-2.5">{courses.filter((c) => !team.includes(c)).map((c) => <CourseCard key={c.id} c={c} />)}</div></Shelf>}
        </>
      )}
    </div>
  );
}

function GraphicTile({ m }: { m: Material }) {
  const g = m.block?.graphic;
  return (
    <Link href={`/rep/library/${m.id}`} className="squircle flex aspect-[4/5] flex-col justify-between gap-2 rounded-panel bg-gradient-to-br from-tint-2 to-tint-strong p-3.5">
      <ChartPie className="size-5 text-brand-deep" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        {g?.stats[0] && <span className="text-title font-extrabold leading-none text-ink">{g.stats[0].value}</span>}
        <Text size="body" weight="bold" clamp={2} className="leading-tight">{m.title}</Text>
        <Text size="micro" tone="subtle">{m.docNumber}</Text>
      </div>
    </Link>
  );
}

function BlockRow({ c, m, b }: { c: Course; m: string; b: Block }) {
  const Meta = BLOCK_META[b.type];
  const href = b.type === "video" ? `/rep/watch/${c.id}/${b.id}` : `/rep/course/${c.id}/learn?module=${c.modules.find((x) => x.blocks.some((y) => y.id === b.id))?.id}&explore=1`;
  return (
    <Link href={href} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-3.5 hover:bg-subtle">
      <span className="grid size-10 shrink-0 place-items-center rounded-control bg-subtle text-ink-2"><Meta.icon className="size-4.5" aria-hidden="true" /></span>
      <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold" truncate>{b.title}</Text><Text size="caption" tone="subtle" truncate>{Meta.label} · {b.video ? fmtTime(b.video.durationSec) : `${b.minutes} min`} · {c.title} · {m}</Text></div>
      <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
    </Link>
  );
}

/** A Library item: a graphic, reading or walkthrough on its own, or a playlist of approved blocks. */
export function MaterialView() {
  const { id } = useParams<{ id: string }>();
  const me = useMe();
  const s = useApp();
  const m = libraryMaterials(s, me).find((x) => x.id === id);
  const [i, setI] = useState(0);
  const recordView = s.recordView;
  useEffect(() => { if (m) recordView(m.id); }, [m?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m) return <div className="p-4"><EmptyState title="Not in your Library" body="It may have expired, or it isn't for your team." /></div>;
  const items = materialBlocks(s, m);
  const cur = items[Math.min(i, items.length - 1)];
  const explored = s.explored[me.id] ?? [];
  const mark = (blockId: string) => s.markExplored(me.id, blockId);

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <Link href="/rep/library" className="self-start text-body font-semibold text-ink-3">← Library</Link>
      <div className="flex flex-col gap-1">
        <Text size="caption" weight="bold" tone="brand-deep">{KIND_LABEL[m.kind]}{m.docNumber ? ` · ${m.docNumber}` : ""}</Text>
        <Text as="h1" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">{m.title}</Text>
        <Text size="body-lg" tone="muted">{m.description}</Text>
      </div>
      {cur && (
        <div key={cur.block.id} className="rise-in flex flex-col gap-3">
          {m.kind === "playlist" && <Text size="caption" tone="subtle">{i + 1} of {items.length} · {cur.block.title}</Text>}
          <BlockView block={cur.block} sourceIds={cur.course?.sourceIds ?? (cur.block.graphic?.sourceId ? [cur.block.graphic.sourceId] : cur.block.document ? [cur.block.document.sourceId] : [])}
            interactive size="lg" siblings={cur.module?.blocks} onComplete={() => mark(cur.block.id)} />
          {(cur.block.type === "graphic" || cur.block.type === "lesson") && !explored.includes(cur.block.id) && (
            <Button variant="soft" onClick={() => mark(cur.block.id)}><Check className="size-4" aria-hidden="true" />Mark as seen</Button>
          )}
        </div>
      )}
      {m.kind === "playlist" && (
        <section className="flex flex-col gap-2">
          <Text size="subhead" weight="bold">In this playlist</Text>
          <ol className="flex flex-col gap-1.5">
            {items.map((x, k) => {
              const Meta = BLOCK_META[x.block.type];
              const done = explored.includes(x.block.id);
              return (
                <li key={x.block.id}>
                  <button type="button" onClick={() => setI(k)} className={cn("squircle flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left", k === i ? "bg-tint" : "hover:bg-subtle")}>
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", done ? "bg-ok text-white" : k === i ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>
                      {done ? <Check className="size-4" aria-hidden="true" /> : <Meta.icon className="size-4" aria-hidden="true" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body-lg font-semibold">{x.block.title}</span><span className="text-caption text-ink-3">{Meta.label} · {x.block.video ? fmtTime(x.block.video.durationSec) : `${x.block.minutes} min`}</span></span>
                  </button>
                </li>
              );
            })}
          </ol>
          {i < items.length - 1 && <Button size="lg" onClick={() => setI(i + 1)}>Next: {items[i + 1].block.title}</Button>}
        </section>
      )}
      <Text size="caption" tone="subtle" className="text-center"><Lock className="mr-1 inline size-3" aria-hidden="true" />Approved for internal training · view only</Text>
    </div>
  );
}

