"use client";

import { useMemo, useState } from "react";
import { ListVideo, FileText, ChevronUp, ChevronDown, X, Lock, SearchX, Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live } from "@/store/app-store";
import type { Block, LibraryVisibility, Material } from "@/data/types";
import { DIVISIONS, product, source } from "@/data/org";
import { DOC_PAGES } from "@/data/media";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PageHeading } from "@/components/patterns/page-heading";
import { DataTable } from "@/components/patterns/data-table";
import { Card, Meter, Stat } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { BLOCK_META } from "@/features/shared/block-view";
import { COMPARATIVE_HINTS, KIND_LABEL, OFF_LABEL_HINTS, resolveBlock } from "@/features/library/library-data";

interface Row { id: string; title: string; kind: string; audience: string; visibility: LibraryVisibility; views: number; doc?: string; isCourse: boolean }

const VIS_LABEL: Record<LibraryVisibility, string> = { assigned: "Assigned only", audience: "Matching audience", everyone: "Everyone" };

/** RL-6/RL-7: what's in the rep Library, who sees it, and what reps look for. Aggregates only. */
export function TrainerLibrary() {
  const s = useApp();
  const { message, open, showToast } = useToast();
  const [builder, setBuilder] = useState(false);
  const [reading, setReading] = useState(false);

  const rows: Row[] = useMemo(() => [
    ...s.courses.filter((c) => live(c)).map((c) => ({
      id: c.id, title: c.title, kind: "Course", isCourse: true, visibility: c.visibility, views: s.libraryViews[c.id] ?? 0, doc: live(c)?.docNumber,
      audience: product(c.productId)?.brand ? `${product(c.productId)!.brand} · ${DIVISIONS.find((d) => d.id === product(c.productId)!.divisionId)?.name}` : c.divisionId ? DIVISIONS.find((d) => d.id === c.divisionId)!.name : "All divisions",
    })),
    ...s.materials.map((m) => ({
      id: m.id, title: m.title, kind: KIND_LABEL[m.kind], isCourse: false, visibility: m.visibility, views: s.libraryViews[m.id] ?? 0, doc: m.docNumber,
      audience: product(m.productId) ? `${product(m.productId)!.brand} · ${DIVISIONS.find((d) => d.id === product(m.productId)!.divisionId)?.name}` : "All divisions",
    })),
  ], [s.courses, s.materials, s.libraryViews]);

  const top = [...rows].sort((a, b) => b.views - a.views).slice(0, 6);
  const maxViews = Math.max(1, ...top.map((r) => r.views));
  const empty = s.searches.filter((x) => x.results === 0).sort((a, b) => b.count - a.count);
  const totalViews = rows.reduce((a, r) => a + r.views, 0);
  const explorers = Object.values(s.explored).filter((v) => v.length).length;

  function setVisibility(r: Row, v: LibraryVisibility) {
    if (r.isCourse) s.updateCourse(r.id, { visibility: v });
    else s.setMaterialVisibility(r.id, v);
    showToast(`${r.title} · ${VIS_LABEL[v]}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Library" description="What reps can browse and explore without starting anything for credit. Only published, in-date, approved pieces appear."
        actions={<><Button variant="secondary" onClick={() => setReading(true)}><FileText className="size-4" aria-hidden="true" />Publish a reading</Button><Button onClick={() => setBuilder(true)}><ListVideo className="size-4" aria-hidden="true" />New playlist</Button></>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card padded><Stat label="In the Library" value={rows.filter((r) => r.visibility !== "assigned").length} sub={`${rows.filter((r) => r.visibility === "assigned").length} kept assigned-only`} /></Card>
        <Card padded><Stat label="Views, last 30 days" value={totalViews.toLocaleString()} sub={`${explorers || "No"} rep${explorers === 1 ? "" : "s"} exploring this week`} /></Card>
        <Card padded><Stat label="Searches with no results" value={empty.reduce((a, x) => a + x.count, 0)} tone="warn" sub={`${empty.length} different terms`} /></Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Most viewed" actions={<span className="flex items-center gap-1 text-caption text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Counts only, never per rep</span>}>
          <div className="flex flex-col gap-3">
            {top.map((r) => (
              <div key={r.id} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3 text-body"><span className="truncate">{r.title} <span className="text-ink-3">· {r.kind}</span></span><strong className="tabular-nums">{r.views}</strong></div>
                <Meter value={(r.views / maxViews) * 100} tone="brand-2" label={`${r.title} ${r.views} views`} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Searches that found nothing" eyebrow="Content gaps">
          {empty.length === 0 ? <Text tone="subtle">Every search found something.</Text> : (
            <ul className="flex flex-col">
              {empty.map((x) => {
                const off = OFF_LABEL_HINTS.some((h) => x.q.includes(h));
                const cmp = !off && COMPARATIVE_HINTS.some((h) => ` ${x.q}`.includes(h));
                return (
                  <li key={x.q} className="flex items-start gap-3 border-b border-hair py-3 last:border-0">
                    <SearchX className={cn("mt-0.5 size-4.5 shrink-0", off || cmp ? "text-danger" : "text-warn")} aria-hidden="true" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <Text size="body-lg" weight="semibold">“{x.q}” <span className="font-normal text-ink-3">· {x.count} searches</span></Text>
                      <Text size="caption" tone="subtle">{off ? "Looks like interest in an unapproved use. Remind reps how to submit a Medical Information request; don't create content." : cmp ? "Looks like interest in comparisons. There are no head-to-head data, so remind reps not to compare; don't create content." : "No approved content covers this. A candidate for your next course or reading."}</Text>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card title="In the Library">
        <DataTable<Row>
          rows={rows}
          rowKey={(r) => r.id}
          columns={[
            { key: "t", header: "Item", cell: (r) => <div className="flex flex-col"><span className="font-semibold text-ink">{r.title}</span><span className="text-caption text-ink-3">{r.kind}{r.doc ? ` · ${r.doc}` : ""}</span></div> },
            { key: "a", header: "Audience", secondary: true, cell: (r) => r.audience },
            { key: "v", header: "Visibility", cell: (r) => (
              <select aria-label={`Visibility for ${r.title}`} value={r.visibility} onChange={(e) => setVisibility(r, e.target.value as LibraryVisibility)}
                className={cn("h-9 rounded-chip border px-2 text-body font-semibold", r.visibility === "assigned" ? "border-hair-2 bg-subtle text-ink-3" : "border-tint-line bg-tint text-brand-deep")}>
                {Object.entries(VIS_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            ) },
            { key: "w", header: "Views", numeric: true, cell: (r) => <span className="flex items-center justify-end gap-1"><Eye className="size-3.5 text-ink-4" aria-hidden="true" />{r.views}</span> },
          ]}
        />
      </Card>

      {builder && <PlaylistBuilder onClose={() => setBuilder(false)} onDone={(t) => showToast(`Playlist “${t}” is in the Library`)} />}
      {reading && <PublishReading onClose={() => setReading(false)} onDone={(t) => showToast(`“${t}” is in the Reading room`)} />}
      <Toast message={message} open={open} />
    </div>
  );
}

/** Playlists only order approved blocks from published courses, so nothing new goes to MLR. */
function PlaylistBuilder({ onClose, onDone }: { onClose: () => void; onDone: (title: string) => void }) {
  const s = useApp();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [picked, setPicked] = useState<{ courseId: string; blockId: string }[]>([]);
  const pool = s.courses.filter((c) => live(c)).flatMap((c) => live(c)!.modules.flatMap((m) => m.blocks
    .filter((b) => ["video", "document", "visualaid", "audio", "graphic", "lesson", "keypoints"].includes(b.type))
    .map((b) => ({ c, m, b }))));
  const toggle = (courseId: string, b: Block) => setPicked(picked.some((x) => x.blockId === b.id) ? picked.filter((x) => x.blockId !== b.id) : [...picked, { courseId, blockId: b.id }]);
  const move = (i: number, d: number) => { const n = [...picked]; [n[i], n[i + d]] = [n[i + d], n[i]]; setPicked(n); };
  const products = new Set(picked.map((x) => s.courses.find((c) => c.id === x.courseId)?.productId));

  return (
    <Modal open onClose={onClose} title="New playlist" description="Pick approved pieces from published courses and put them in order. Playlists don't add new content, so they don't need their own MLR review." size="xl"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!title.trim() || picked.length < 2} onClick={() => {
        s.addMaterial({ kind: "playlist", title: title.trim(), description: desc.trim() || `${picked.length} approved pieces`, productId: products.size === 1 ? [...products][0] : undefined, visibility: "audience", items: picked } as Omit<Material, "id" | "createdAt" | "ownerId">);
        onDone(title.trim()); onClose();
      }}>Publish playlist ({picked.length})</Button></>}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dosing in 5 minutes" />
          <Field label="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Text size="label" weight="semibold" tone="muted">Approved pieces</Text>
          <div className="flex max-h-[44vh] flex-col gap-1 overflow-y-auto rounded-panel border border-hair p-1.5">
            {pool.map(({ c, m, b }) => {
              const Meta = BLOCK_META[b.type];
              const on = picked.some((x) => x.blockId === b.id);
              return (
                <button key={b.id} type="button" aria-pressed={on} onClick={() => toggle(c.id, b)}
                  className={cn("flex items-center gap-3 rounded-control px-2.5 py-2 text-left", on ? "bg-tint" : "hover:bg-subtle")}>
                  <Meta.icon className={cn("size-4 shrink-0", on ? "text-brand-deep" : "text-ink-3")} aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-semibold">{b.title}</span><span className="truncate text-micro text-ink-3">{c.title} · {m.title} · {b.minutes} min</span></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Text size="label" weight="semibold" tone="muted">Order · {picked.reduce((a, x) => a + (resolveBlock(s, x.courseId, x.blockId)?.block.minutes ?? 0), 0)} min</Text>
          {picked.length === 0 && <Text tone="subtle" size="body">Pick at least two pieces.</Text>}
          <ol className="flex flex-col gap-1.5">
            {picked.map((x, i) => {
              const r = resolveBlock(s, x.courseId, x.blockId);
              if (!r) return null;
              const Meta = BLOCK_META[r.block.type];
              return (
                <li key={x.blockId} className="squircle flex items-center gap-2.5 rounded-control border border-hair bg-card px-3 py-2">
                  <span className="w-5 text-caption font-bold text-ink-3">{i + 1}</span>
                  <Meta.icon className="size-4 text-brand-deep" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-body font-semibold">{r.block.title}</span>
                  <IconButton aria-label="Move up" size={7} disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp className="size-4" /></IconButton>
                  <IconButton aria-label="Move down" size={7} disabled={i === picked.length - 1} onClick={() => move(i, 1)}><ChevronDown className="size-4" /></IconButton>
                  <IconButton aria-label="Remove" size={7} tone="danger" onClick={() => setPicked(picked.filter((y) => y.blockId !== x.blockId))}><X className="size-4" /></IconButton>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </Modal>
  );
}

function PublishReading({ onClose, onDone }: { onClose: () => void; onDone: (title: string) => void }) {
  const s = useApp();
  const sources = Object.keys(DOC_PAGES);
  const [src, setSrc] = useState(sources[0]);
  const [pages, setPages] = useState<number[]>(Object.keys(DOC_PAGES[sources[0]]).map(Number));
  const [title, setTitle] = useState(source(sources[0])?.title ?? "");
  const all = Object.keys(DOC_PAGES[src]).map(Number);
  return (
    <Modal open onClose={onClose} title="Publish a reading" description="Approved documents only. Reps read them in-app, view-only, with the doc number on every page."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!pages.length || !title.trim()} onClick={() => {
        const doc = source(src);
        s.addMaterial({ kind: "reading", title: title.trim(), description: `${pages.length} pages of ${doc?.title}`, productId: doc?.productId, visibility: "audience", docNumber: doc?.docNumber,
          block: { id: `rd-${Date.now().toString(36)}`, type: "document", title: title.trim(), minutes: pages.length, competencies: [], document: { sourceId: src, pages: [...pages].sort((a, b) => a - b), callouts: [] } } });
        onDone(title.trim()); onClose();
      }}>Publish</Button></>}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">{sources.map((id) => <Chip key={id} size="lg" selected={src === id} onClick={() => { setSrc(id); setPages(Object.keys(DOC_PAGES[id]).map(Number)); setTitle(source(id)?.title ?? ""); }}>{source(id)?.title}</Chip>)}</div>
        <Field label="Title in the Library" value={title} onChange={(e) => setTitle(e.target.value)} />
        <div className="flex flex-col gap-2"><Text size="label" weight="semibold" tone="muted">Pages</Text>
          <div className="flex flex-wrap gap-2">{all.map((p) => <Chip key={p} size="lg" selected={pages.includes(p)} onClick={() => setPages(pages.includes(p) ? pages.filter((x) => x !== p) : [...pages, p])}>p. {p}</Chip>)}</div>
        </div>
      </div>
    </Modal>
  );
}
