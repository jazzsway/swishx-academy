"use client";

import { useMemo, useState } from "react";
import { ListVideo, FileText, ChevronUp, ChevronDown, X, Lock, SearchX, Eye, Search, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, live } from "@/store/app-store";
import type { Block, LibraryVisibility, Material, Source } from "@/data/types";
import { DIVISIONS, isApproved, product, SOURCES } from "@/data/org";
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
import { BLOCK_META, BlockView } from "@/features/shared/block-view";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { SourcePreview, sourceMeta } from "./source-preview";
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

const VIS_OPTIONS: LibraryVisibility[] = ["audience", "everyone", "assigned"];
const PIECE_TYPES: { id: string; label: string; types: Block["type"][] }[] = [
  { id: "video", label: "Videos", types: ["video"] },
  { id: "reading", label: "Readings", types: ["document", "visualaid", "graphic"] },
  { id: "audio", label: "Audio", types: ["audio"] },
  { id: "lesson", label: "Lessons", types: ["lesson", "keypoints"] },
];

/** Playlists only order approved blocks from published courses, so nothing new goes to MLR. */
function PlaylistBuilder({ onClose, onDone }: { onClose: () => void; onDone: (title: string) => void }) {
  const s = useApp();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [q, setQ] = useState("");
  const [prod, setProd] = useState<string>("all");
  const [kind, setKind] = useState<string>("all");
  const [peek, setPeek] = useState<{ b: Block; sourceIds: string[] } | null>(null);
  const [picked, setPicked] = useState<{ courseId: string; blockId: string }[]>([]);
  const pool = s.courses.filter((c) => live(c)).flatMap((c) => live(c)!.modules.flatMap((m) => m.blocks
    .filter((b) => PIECE_TYPES.some((t) => t.types.includes(b.type)))
    .map((b) => ({ c, m, b }))));
  const prods = [...new Set(pool.map((x) => x.c.productId ?? "company"))];
  const term = q.trim().toLowerCase();
  const shown = pool.filter(({ c, m, b }) => (prod === "all" || (c.productId ?? "company") === prod)
    && (kind === "all" || PIECE_TYPES.find((t) => t.id === kind)!.types.includes(b.type))
    && (!term || `${b.title} ${m.title} ${c.title}`.toLowerCase().includes(term)));
  const toggle = (courseId: string, b: Block) => setPicked(picked.some((x) => x.blockId === b.id) ? picked.filter((x) => x.blockId !== b.id) : [...picked, { courseId, blockId: b.id }]);
  const move = (i: number, d: number) => { const n = [...picked]; [n[i], n[i + d]] = [n[i + d], n[i]]; setPicked(n); };
  const products = new Set(picked.map((x) => s.courses.find((c) => c.id === x.courseId)?.productId));
  const minutes = picked.reduce((a, x) => a + (resolveBlock(s, x.courseId, x.blockId)?.block.minutes ?? 0), 0);

  return (
    <Modal open onClose={onClose} title="New playlist" description="Pick approved pieces from published courses and put them in order. Playlists don't add new content, so they don't need their own MLR review." size="xl"
      footer={<><Text size="body" tone="subtle" className="mr-auto">{picked.length} pieces · {minutes} min</Text><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!title.trim() || picked.length < 2} onClick={() => {
        s.addMaterial({ kind: "playlist", title: title.trim(), description: desc.trim() || `${picked.length} approved pieces`, productId: products.size === 1 ? [...products][0] : undefined, visibility: "audience", items: picked } as Omit<Material, "id" | "createdAt" | "ownerId">);
        onDone(title.trim()); onClose();
      }}>Publish playlist</Button></>}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <Field iconLeft={<Search className="size-4" />} placeholder="Search pieces, modules or courses" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search pieces" />
          <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" selected={prod === "all"} onClick={() => setProd("all")}>All products</Chip>
            {prods.map((id) => <Chip key={id} size="sm" selected={prod === id} onClick={() => setProd(id)}>{id === "company" ? "Company" : product(id)?.brand}</Chip>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip size="sm" selected={kind === "all"} onClick={() => setKind("all")}>All types</Chip>
            {PIECE_TYPES.map((t) => <Chip key={t.id} size="sm" selected={kind === t.id} onClick={() => setKind(t.id)}>{t.label}</Chip>)}
          </div>
          <div className="flex max-h-[42vh] flex-col gap-1 overflow-y-auto rounded-panel border border-hair p-1.5">
            {shown.length === 0 && <Text size="body" tone="subtle" className="px-2 py-6 text-center">Nothing matches.</Text>}
            {shown.map(({ c, m, b }) => {
              const Meta = BLOCK_META[b.type];
              const on = picked.some((x) => x.blockId === b.id);
              return (
                <div key={b.id} className={cn("flex items-center gap-2 rounded-control px-2.5 py-2", on ? "bg-tint" : "hover:bg-subtle")}>
                  <button type="button" aria-pressed={on} onClick={() => toggle(c.id, b)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full", on ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>{on ? <Check className="size-3.5" aria-hidden="true" /> : <Meta.icon className="size-3.5" aria-hidden="true" />}</span>
                    <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-semibold">{b.title}</span><span className="truncate text-micro text-ink-3">{Meta.label} · {b.minutes} min · {c.title} · {m.title}</span></span>
                  </button>
                  <IconButton aria-label={`Preview ${b.title}`} size={7} onClick={() => setPeek({ b, sourceIds: c.sourceIds })}><Eye className="size-4" /></IconButton>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <Field label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dosing in 5 minutes" />
          <Field label="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What reps get out of it" />
          <Text size="label" weight="semibold" tone="muted">Order</Text>
          {picked.length === 0 && <div className="squircle rounded-panel border border-dashed border-hair-2 px-4 py-6 text-center"><Text tone="subtle" size="body">Pick at least two pieces on the left. They play in this order.</Text></div>}
          <ol className="flex flex-col gap-1.5">
            {picked.map((x, i) => {
              const r = resolveBlock(s, x.courseId, x.blockId);
              if (!r) return null;
              const Meta = BLOCK_META[r.block.type];
              return (
                <li key={x.blockId} className="squircle flex items-center gap-2.5 rounded-control border border-hair bg-card px-3 py-2">
                  <span className="w-5 text-caption font-bold text-ink-3">{i + 1}</span>
                  <Meta.icon className="size-4 text-brand-deep" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-semibold">{r.block.title}</span><span className="text-micro text-ink-3">{r.block.minutes} min</span></span>
                  <IconButton aria-label="Move up" size={7} disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp className="size-4" /></IconButton>
                  <IconButton aria-label="Move down" size={7} disabled={i === picked.length - 1} onClick={() => move(i, 1)}><ChevronDown className="size-4" /></IconButton>
                  <IconButton aria-label="Remove" size={7} tone="danger" onClick={() => setPicked(picked.filter((y) => y.blockId !== x.blockId))}><X className="size-4" /></IconButton>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {peek && (
        <Modal open onClose={() => setPeek(null)} title={peek.b.title} description={`${BLOCK_META[peek.b.type].label} · ${peek.b.minutes} min · approved content`} size="lg">
          <BlockView block={peek.b} sourceIds={peek.sourceIds} />
        </Modal>
      )}
    </Modal>
  );
}

/** A reading is an approved document (or chosen pages of it) on the Library shelf, view-only. */
function PublishReading({ onClose, onDone }: { onClose: () => void; onDone: (title: string) => void }) {
  const s = useApp();
  const docs = [...SOURCES, ...s.uploads].filter(isApproved);
  const groups = [...new Set(docs.map((d) => d.productId ?? "company"))];
  const [prod, setProd] = useState(groups.includes("p-lumora") ? "p-lumora" : groups[0]);
  const inGroup = docs.filter((d) => (d.productId ?? "company") === prod);
  const [docId, setDocId] = useState<string | undefined>(undefined);
  const doc = docs.find((d) => d.id === docId);
  const [title, setTitle] = useState("");
  const [whole, setWhole] = useState(true);
  const [pages, setPages] = useState<number[]>([]);
  const [visibility, setVisibility] = useState<LibraryVisibility>("audience");
  const [preview, setPreview] = useState<Source | null>(null);
  const chosen = whole ? Array.from({ length: doc?.pages ?? 0 }, (_, i) => i + 1) : [...pages].sort((a, b) => a - b);
  const pick = (d: Source) => { setDocId(d.id); setTitle(d.title); setWhole(true); setPages([]); };

  return (
    <Modal open onClose={onClose} size="lg" title="Publish a reading" description="Put an approved document, or a few pages of it, on the Library shelf. Reps read it in-app, view-only, with the doc number on every page."
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!doc || !chosen.length || !title.trim()} onClick={() => {
        if (!doc) return;
        s.addMaterial({ kind: "reading", title: title.trim(), description: whole ? `${doc.title}, all ${doc.pages} pages` : `${chosen.length} page${chosen.length > 1 ? "s" : ""} of ${doc.title}`, productId: doc.productId, visibility, docNumber: doc.docNumber,
          block: { id: `rd-${Date.now().toString(36)}`, type: "document", title: title.trim(), minutes: Math.max(1, chosen.length), competencies: [], document: { sourceId: doc.id, pages: chosen, callouts: [] } } });
        onDone(title.trim()); onClose();
      }}>Publish reading</Button></>}>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Text size="label" weight="semibold" tone="muted">1 · Product</Text>
          <div className="flex flex-wrap gap-1.5">{groups.map((g) => <Chip key={g} size="md" selected={prod === g} onClick={() => { setProd(g); setDocId(undefined); }}>{g === "company" ? "Company documents" : product(g)?.brand}</Chip>)}</div>
        </div>
        <div className="flex flex-col gap-2">
          <Text size="label" weight="semibold" tone="muted">2 · Approved document</Text>
          <div className="flex flex-col gap-1.5">
            {inGroup.map((d) => {
              const on = d.id === docId;
              return (
                <div key={d.id} className={cn("squircle flex items-center gap-3 rounded-panel border px-3 py-2.5", on ? "border-brand bg-tint" : "border-hair-2 bg-card")}>
                  <button type="button" role="radio" aria-checked={on} onClick={() => pick(d)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-control", on ? "bg-brand text-white" : "bg-subtle text-ink-3")}>{on ? <Check className="size-4" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}</span>
                    <span className="flex min-w-0 flex-col"><span className="truncate text-body-lg font-semibold">{d.title}</span><span className="text-caption text-ink-3">{sourceMeta(d)}</span></span>
                  </button>
                  <IconButton aria-label={`Preview ${d.title}`} onClick={() => setPreview(d)}><Eye className="size-4" /></IconButton>
                </div>
              );
            })}
          </div>
        </div>
        {doc && (
          <>
            <div className="flex flex-col gap-2">
              <Text size="label" weight="semibold" tone="muted">3 · What reps can read</Text>
              <Segmented aria-label="Pages" className="self-start">
                <SegmentedButton active={whole} onClick={() => setWhole(true)}>Whole document · {doc.pages} pages</SegmentedButton>
                <SegmentedButton active={!whole} onClick={() => setWhole(false)}>Selected pages</SegmentedButton>
              </Segmented>
              {!whole && (
                <>
                  <Text size="caption" tone="subtle">Pick the pages reps need, e.g. the dosing pages as a quick reference. {pages.length ? `${pages.length} picked.` : "None picked yet."}</Text>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: doc.pages }, (_, i) => i + 1).map((n) => (
                      <Chip key={n} size="md" selected={pages.includes(n)} title={DOC_PAGES[doc.id]?.[n]?.title} onClick={() => setPages(pages.includes(n) ? pages.filter((x) => x !== n) : [...pages, n])}>p. {n}</Chip>
                    ))}
                  </div>
                </>
              )}
            </div>
            <Field label="4 · Title in the Library" value={title} onChange={(e) => setTitle(e.target.value)} />
            <div className="flex flex-col gap-2">
              <Text size="label" weight="semibold" tone="muted">5 · Who sees it</Text>
              <Segmented aria-label="Visibility" className="self-start">
                {VIS_OPTIONS.map((v) => <SegmentedButton key={v} active={visibility === v} onClick={() => setVisibility(v)}>{VIS_LABEL[v]}</SegmentedButton>)}
              </Segmented>
            </div>
          </>
        )}
      </div>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </Modal>
  );
}
