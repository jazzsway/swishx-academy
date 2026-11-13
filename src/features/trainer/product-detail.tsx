"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, ChevronLeft, ChevronRight, Eye, FileText, Film, LayoutGrid, Library, ListChecks, Plus, Search } from "lucide-react";
import { useApp, current, live } from "@/store/app-store";
import { counts, daysFromToday, pct } from "@/store/selectors";
import { competency, DIVISIONS, isApproved, product as productOf, SOURCES, source } from "@/data/org";
import type { Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { DetailHeader, type DetailTab } from "@/components/patterns/detail-header";
import { Meter, VersionChip, EmptyState } from "@/components/patterns/academy";
import { BLOCK_META } from "@/features/shared/block-view";
import { KIND_LABEL } from "@/features/library/library-data";
import { ApprovalChip, FORMAT_ICON, SourcePreview, sourceMeta } from "./source-preview";
import { productClaims, type ClaimCategory } from "./product-claims";
import { NewCourseModal } from "./course-start";

type Tab = "overview" | "claims" | "sources" | "courses" | "media";

const CATEGORIES: ClaimCategory[] = ["Indication", "Efficacy", "Safety", "Dosing", "Mechanism", "Access", "Disease", "Conversation", "Other"];

function Stat({ value, label }: { value: number | string; label: string }) {
  return <div className="flex flex-col items-end"><span className="text-subhead font-extrabold tabular-nums text-ink">{value}</span><span className="text-caption text-ink-3">{label}</span></div>;
}

function Section({ title, sub, actions, children }: { title: string; sub: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-title font-extrabold tracking-tight text-ink">{title}</h2><p className="text-body text-ink-3">{sub}</p></div>
        {actions}
      </div>
      {children}
    </div>
  );
}

const MEDIA_TYPES = ["video", "document", "visualaid", "audio", "graphic"] as const;

/**
 * A product, as the training team sees it: the approved label and team readiness,
 * its claims and whether courses teach them, the sources behind them, the courses
 * built on it, and the media around it. Modelled on SwishX for Business's product detail.
 */
export function ProductDetail() {
  const [creating, setCreating] = useState(false);
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const s = useApp();
  const p = productOf(id);
  const [tab, setTab] = useState<Tab>("overview");
  const [preview, setPreview] = useState<Source | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<ClaimCategory | "all">("all");
  const [gapsOnly, setGapsOnly] = useState(false);
  /* Moving to another product starts on its label. */
  useEffect(() => { setTab("overview"); setQ(""); setCat("all"); setGapsOnly(false); }, [id]);

  const courses = s.courses.filter((c) => c.productId === id);
  const sources = [...SOURCES, ...s.uploads].filter((x) => x.productId === id);
  const materials = [] as typeof s.materials; // v1-hidden: Library items, s.materials.filter((m) => m.productId === id)

  /* Claims: the product's own approved documents, and whether courses teach and test them. */
  const claims = useMemo(() => productClaims(courses, sources.filter(isApproved)), [courses, sources]);
  const taughtCount = claims.filter((c) => c.taughtIn.length).length;

  const media = courses.flatMap((c) => (live(c) ?? current(c)).modules.flatMap((m) => m.blocks.filter((b) => (MEDIA_TYPES as readonly string[]).includes(b.type)).map((b) => ({ c, m, b }))));
  const ps = s.progress.filter((x) => courses.some((c) => c.id === x.courseId));
  const k = counts(ps);

  if (!p) return <EmptyState title="Product not found" />;

  const term = q.trim().toLowerCase();
  const shownClaims = claims.filter((c) => (cat === "all" || c.category === cat) && (!gapsOnly || !c.taughtIn.length) && (!term || c.text.toLowerCase().includes(term) || (c.heading ?? "").toLowerCase().includes(term)));
  const cats = CATEGORIES.filter((x) => claims.some((c) => c.category === x));

  /* Readiness on this product: latest score per competency across its courses. */
  const latest = ps.map((x) => x.attempts.at(-1)?.competencyScores ?? x.screening?.scores).filter(Boolean) as Record<string, number>[];
  const weakest = [...new Set(latest.flatMap((x) => Object.keys(x)))]
    .map((cid) => { const v = latest.map((x) => x[cid]).filter((n) => n !== undefined); return { cid, avg: Math.round(v.reduce((a, n) => a + n, 0) / v.length) }; })
    .sort((a, b) => a.avg - b.avg).slice(0, 3);

  const TABS: DetailTab<Tab>[] = [
    { key: "overview", label: "Overview", icon: LayoutGrid },
    { key: "claims", label: "Scientific claims", icon: ListChecks, count: claims.length },
    { key: "sources", label: "Sources", icon: FileText, count: sources.length },
    { key: "courses", label: "Courses", icon: BookOpen, count: courses.length },
    { key: "media", label: "Media", icon: Film, count: media.length + materials.length },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/trainer/settings/products" className="flex items-center gap-1 self-start text-body font-semibold text-ink-3 hover:text-ink"><ChevronLeft className="size-4" aria-hidden="true" />Products</Link>

      <DetailHeader tabs={TABS} active={tab} onSelect={setTab}>
        <div className="flex flex-wrap items-center gap-4">
          <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-control text-body-lg font-black text-white" style={{ background: p.gradient }}>
            <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(155deg,rgba(255,255,255,.34),transparent 45%)" }} />
            {p.brand.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-title font-extrabold tracking-tight text-ink">{p.brand}</h1>
              <Chip size="xs" tone={p.status === "Awaiting approval" ? "warn" : p.status === "Launch" ? "brand" : "ok"}>{p.status}</Chip>
            </div>
            <span className="text-body text-ink-3"><em>{p.generic}</em> · {DIVISIONS.find((d) => d.id === p.divisionId)?.name} · {p.form}</span>
          </div>
          <div className="flex items-center gap-5">
            <Stat value={courses.length} label="Courses" />
            <Stat value={claims.length ? `${taughtCount}/${claims.length}` : "—"} label="Scientific claims taught" />
            <Stat value={ps.length ? `${pct(k.certified, k.total)}%` : "—"} label="Reps certified" />
          </div>
        </div>
      </DetailHeader>

      {tab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Section title="Approved label" sub="Every course on this product is checked against this wording. Anything outside it is flagged as off-label.">
            {p.indications.length === 0 && (
              <div className="squircle rounded-panel border border-warn-line bg-warn-bg px-4 py-3"><Text weight="semibold" tone="warn">No approved label yet. Product courses can&apos;t be built until it&apos;s approved.</Text></div>
            )}
            {p.indications.map((i) => (
              <div key={i.short} className="squircle flex flex-col gap-1.5 rounded-panel border border-hair bg-card p-4 shadow-hair">
                <span className="flex flex-wrap items-center gap-2">
                  <Text size="subhead" weight="bold">{i.short}</Text>
                  {i.isNew && <Chip size="xs" tone="brand">Newly approved</Chip>}
                  {i.therapyAreas.map((t) => <Chip key={t} size="xs">{t}</Chip>)}
                </span>
                <Text size="body-lg" className="leading-relaxed">{i.full}</Text>
                {i.variants?.length ? <Text size="caption" tone="subtle">Only for: {i.variants.join(", ")}</Text> : null}
              </div>
            ))}
            <div className="flex flex-col gap-2">
              <Text size="label" weight="semibold" tone="muted">Presentations</Text>
              <div className="flex flex-wrap gap-1.5">{p.variants.map((v) => <Chip key={v} size="md">{v}</Chip>)}</div>
            </div>
            {source(p.piSourceId) && (
              <button type="button" onClick={() => setPreview(source(p.piSourceId)!)} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card p-4 text-left shadow-hair hover:shadow-soft">
                <span className="grid size-9 place-items-center rounded-control bg-tint text-brand-deep"><FileText className="size-4" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">{source(p.piSourceId)!.title}</Text><Text size="caption" tone="subtle">{sourceMeta(source(p.piSourceId)!)}</Text></span>
                <Eye className="size-4 text-ink-3" aria-hidden="true" />
              </button>
            )}
          </Section>
          <div className="flex flex-col gap-4">
            <div className="squircle flex flex-col gap-3 rounded-panel border border-hair bg-card p-4 shadow-hair">
              <Text size="subhead" weight="bold">Team readiness</Text>
              {ps.length ? (
                <>
                  <div className="flex items-baseline gap-2"><Text size="hero" weight="extrabold" tabular>{pct(k.certified, k.total)}%</Text><Text size="body" tone="subtle">certified · {k.certified} of {k.total}</Text></div>
                  <Meter value={pct(k.certified, k.total)} height={6} tone="ok" label="Certified" />
                  {k.overdue > 0 && <Text size="caption" weight="semibold" tone="danger">{k.overdue} overdue</Text>}
                  {weakest.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-hair pt-3">
                      <Text size="caption" weight="bold" tone="subtle">Weakest on this product</Text>
                      {weakest.map((w) => <div key={w.cid} className="flex justify-between text-body"><span>{competency(w.cid)?.name}</span><strong className="tabular-nums">{w.avg}</strong></div>)}
                    </div>
                  )}
                </>
              ) : <Text size="body" tone="subtle">Nobody is assigned a course on {p.brand} yet.</Text>}
            </div>
            <button type="button" onClick={() => setTab("claims")} className="squircle flex flex-col gap-2 rounded-panel border border-hair bg-card p-4 text-left shadow-hair hover:shadow-soft">
              <Text size="subhead" weight="bold">Scientific claims coverage</Text>
              {claims.length ? (
                <>
                  <Text size="body" tone="muted">{taughtCount} of {claims.length} approved claims are taught in a course.</Text>
                  <Meter value={pct(taughtCount, claims.length)} height={6} tone={taughtCount === claims.length ? "ok" : "brand"} label="Scientific claims taught" />
                  {claims.length > taughtCount && <Text size="caption" weight="semibold" tone="warn">{claims.length - taughtCount} not in any course yet</Text>}
                </>
              ) : <Text size="body" tone="subtle">No approved scientific claims on file yet.</Text>}
            </button>
          </div>
        </div>
      )}

      {tab === "sources" && (
        <Section title="Sources" sub="The documents SwishX may cite when it writes about this product, including anything you've uploaded. Scientific claims come from these.">
          {sources.length === 0 ? <EmptyState title="No sources yet" body="Upload the Prescribing Information when you create the first course." /> : (
            <div className="flex flex-col gap-2">
              {sources.map((x) => {
                const Icon = x.uploaded ? FORMAT_ICON[x.uploaded.format] : FileText;
                const used = courses.filter((c) => c.sourceIds.includes(x.id)).length;
                return (
                  <button key={x.id} type="button" onClick={() => setPreview(x)} className="squircle flex flex-wrap items-center gap-3.5 rounded-panel border border-hair bg-card p-3.5 text-left shadow-hair transition-all hover:shadow-soft">
                    <span className="grid size-9 place-items-center rounded-control bg-subtle text-ink-3"><Icon className="size-4" aria-hidden="true" /></span>
                    <span className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold">{x.title}</Text><Text size="caption" tone="subtle">{sourceMeta(x)} · cited by {used} course{used === 1 ? "" : "s"}</Text></span>
                    <ApprovalChip s={x} />
                    <span className="inline-flex items-center gap-1 text-body font-bold text-brand">Preview <ChevronRight className="size-4" aria-hidden="true" /></span>
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {tab === "claims" && (
        <Section title="Scientific claims" sub={`Every statement in ${p.brand}'s product documents, and whether your courses teach and test it.`}>
          {claims.length === 0 ? <EmptyState title="No approved scientific claims on file" body="They come from the product's approved documents. Add them under Sources." /> : (
            <>
              <div className="squircle flex flex-wrap items-center gap-x-6 gap-y-2 rounded-panel border border-hair bg-card px-4 py-3 shadow-hair">
                <Text size="body-lg"><strong className="tabular-nums">{taughtCount}</strong> of {claims.length} taught</Text>
                <Text size="body-lg" tone={claims.length > taughtCount ? "warn" : "subtle"}><strong className="tabular-nums">{claims.length - taughtCount}</strong> not in any course</Text>
                <Text size="body-lg" tone="subtle"><strong className="tabular-nums text-ink">{claims.filter((c) => c.tested).length}</strong> tested by questions</Text>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-full max-w-[300px]"><Field iconLeft={<Search className="size-4" />} placeholder="Search scientific claims" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search claims" /></div>
                <Chip size="md" selected={cat === "all"} onClick={() => setCat("all")}>All</Chip>
                {cats.map((x) => <Chip key={x} size="md" selected={cat === x} onClick={() => setCat(x)}>{x}</Chip>)}
                <Chip size="md" tone={gapsOnly ? "warn" : "default"} selected={gapsOnly} onClick={() => setGapsOnly(!gapsOnly)}>Not taught</Chip>
              </div>
              <div className="flex flex-col gap-2">
                {shownClaims.length === 0 && <Text tone="subtle">No scientific claims match.</Text>}
                {shownClaims.map((c) => {
                  const src = source(c.sourceId);
                  return (
                    <div key={c.key} className={`squircle flex flex-col gap-2 rounded-panel border bg-card p-4 shadow-hair ${c.taughtIn.length ? "border-hair" : "border-warn-line"}`}>
                      <span className="flex flex-wrap items-center gap-2">
                        <Chip size="xs" tone="brand">{c.category}</Chip>
                        {c.heading && <Text size="caption" tone="subtle">{c.heading}</Text>}
                      </span>
                      <Text size="body-lg" className="leading-relaxed">{c.text}</Text>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hair pt-2 text-caption">
                        <button type="button" onClick={() => src && setPreview(src)} className="font-semibold text-brand-deep hover:underline">{src?.title}, p. {c.page}{src?.docNumber ? ` · ${src.docNumber}` : ""}</button>
                        {c.taughtIn.length
                          ? <span className="text-ink-3">Taught in {c.taughtIn.join("; ")}</span>
                          : <span className="font-semibold text-warn">Not taught in any course</span>}
                        <span className="ml-auto text-ink-3">{c.tested ? `Tested by ${c.tested} question${c.tested > 1 ? "s" : ""}` : "No questions yet"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Section>
      )}

      {tab === "courses" && (
        <Section title="Courses" sub="What your team is learning about this product, and how far they've got."
          actions={<><Button onClick={() => setCreating(true)}><Plus className="size-4" aria-hidden="true" />New course</Button><NewCourseModal open={creating} onClose={() => setCreating(false)} productId={p.id} /></>}>
          {courses.length === 0 ? <EmptyState title="No courses yet" body={`Build the first ${p.brand} course from its Prescribing Information.`} /> : (
            <div className="flex flex-col gap-2">
              {courses.map((c) => {
                const cp = s.progress.filter((x) => x.courseId === c.id);
                const ck = counts(cp);
                const lv = live(c);
                const ready = pct(ck.certified, ck.total);
                return (
                  <Link key={c.id} href={`/trainer/courses/${c.id}`} className="squircle flex flex-wrap items-center gap-4 rounded-panel border border-hair bg-card p-4 shadow-hair transition-all hover:shadow-soft">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2"><Text size="body-lg" weight="bold">{c.title}</Text><VersionChip state={current(c).state} expiring={!!lv?.expiresAt && daysFromToday(lv.expiresAt) <= 30} /></span>
                      <Text size="caption" tone="subtle">{c.type === "personalised" ? "Personalised" : "Same for everyone"} · v{current(c).version}{lv ? " · live" : ""}</Text>
                    </span>
                    <span className="flex w-[200px] shrink-0 flex-col gap-1">
                      {ck.total ? (
                        <>
                          <span className="flex justify-between text-caption text-ink-3"><span>{ck.certified} of {ck.total} certified</span><strong className="text-ink tabular-nums">{ready}%</strong></span>
                          <Meter value={ready} height={6} tone={ready >= 80 ? "ok" : "brand"} label={`${ready}% certified`} />
                          {ck.overdue > 0 && <span className="text-caption font-semibold text-danger">{ck.overdue} overdue</span>}
                        </>
                      ) : <Text size="caption" tone="subtle">Not assigned yet</Text>}
                    </span>
                    <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {tab === "media" && (
        <Section title="Media & materials" sub="Videos and other media used in courses about this product. Everything here comes from approved content.">
          {media.length + materials.length === 0 ? <EmptyState title="Nothing yet" body="Media you add to courses for this product shows up here." /> : (
            <div className="grid gap-3 sm:grid-cols-2">
              {materials.map((m) => (
                <Link key={m.id} href="/trainer/library" className="squircle flex items-start gap-3 rounded-panel border border-hair bg-card p-4 shadow-hair hover:shadow-soft">
                  <span className="grid size-9 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><Library className="size-4" aria-hidden="true" /></span>
                  <span className="flex min-w-0 flex-col gap-0.5"><Text size="body-lg" weight="semibold">{m.title}</Text><Text size="caption" tone="subtle">{KIND_LABEL[m.kind]} in the Library{m.docNumber ? ` · ${m.docNumber}` : ""}</Text></span>
                </Link>
              ))}
              {media.map(({ c, m, b }) => {
                const Icon = BLOCK_META[b.type].icon;
                return (
                  <Link key={b.id} href={`/trainer/courses/${c.id}?module=${m.id}`} className="squircle flex items-start gap-3 rounded-panel border border-hair bg-card p-4 shadow-hair hover:shadow-soft">
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-subtle text-ink-3"><Icon className="size-4" aria-hidden="true" /></span>
                    <span className="flex min-w-0 flex-col gap-0.5"><Text size="body-lg" weight="semibold">{b.title}</Text><Text size="caption" tone="subtle">{BLOCK_META[b.type].label} · {b.minutes} min · {c.title}</Text></span>
                  </Link>
                );
              })}
            </div>
          )}
        </Section>
      )}

      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
