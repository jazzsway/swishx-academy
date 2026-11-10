"use client";

import { useState, type ReactNode } from "react";
import { PencilLine } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import type { Product } from "@/data/types";
import { DIVISIONS } from "@/data/org";
import { useApp } from "@/store/app-store";
import { ALL_THERAPY_AREAS, PRODUCTS, indicationsFor, therapyAreasFor } from "@/data/products";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { ChipMultiSelect } from "@/components/patterns/chip-multi-select";
import { PickChip, PickEmpty, PickList, PickRow, PickSearch } from "@/components/patterns/pick-list";

/* The product step from SwishX for Business's Start project, for a course:
   search the portfolio, pick one, then narrow variants → indications → therapy areas,
   each row All / several / one. Empty arrays mean All. */

export interface ProductScope {
  mode: "product" | "area" | "company";
  productId?: string;
  variants: string[];
  indications: string[];
  therapyAreas: string[];
}

const ALL = "__all__";

/** From All a click narrows to that one; narrowed clicks add or remove; ticking every one, or none, is All again. */
function toggle(options: string[], picked: string[], id: string) {
  if (id === ALL) return [];
  const next = picked.includes(id) ? picked.filter((p) => p !== id) : [...picked, id];
  return next.length === options.length ? [] : next;
}
const shown = (options: string[], picked: string[]) => (picked.length === 0 ? [ALL, ...options] : picked);

function Thumb({ p, size = 40 }: { p: Product; size?: number }) {
  return (
    <div className="relative grid shrink-0 place-items-center overflow-hidden rounded-chip font-black text-white" style={{ width: size, height: size, background: p.gradient, fontSize: size * 0.32 }}>
      <span aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(155deg,rgba(255,255,255,.34),transparent 45%)" }} />
      <span className="relative">{p.brand.slice(0, 2).toUpperCase()}</span>
    </div>
  );
}

function Row({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-1.5 px-3.5 py-3 sm:grid-cols-[120px_minmax(0,1fr)] sm:gap-3">
      <div className="flex flex-col items-start gap-0.5 sm:pt-1"><span className="text-label font-bold text-ink-2">{label}</span>{note}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Auto({ children }: { children: ReactNode }) {
  return <div className="flex items-start gap-2 pt-0.5 text-body text-ink-2 sm:pt-1"><AgentIcon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" /><span>{children}</span></div>;
}

export function ProductPicker({ value, onChange }: { value: ProductScope; onChange: (v: ProductScope) => void }) {
  const [q, setQ] = useState("");
  const [areaQ, setAreaQ] = useState("");
  const p = PRODUCTS.find((x) => x.id === value.productId);
  /* Real shortcuts: products that already have courses in this Academy. */
  const courses = useApp((s) => s.courses);
  const withCourses = PRODUCTS.filter((x) => courses.some((c) => c.productId === x.id));
  const term = q.trim().toLowerCase();
  const results = term ? PRODUCTS.filter((x) => `${x.brand} ${x.generic} ${x.therapyAreas.join(" ")} ${x.indications.map((i) => i.short).join(" ")}`.toLowerCase().includes(term)) : [];

  const set = (patch: Partial<ProductScope>) => onChange({ ...value, ...patch });
  const pick = (x: Product) => { onChange({ mode: "product", productId: x.id, variants: [], indications: [], therapyAreas: [] }); setQ(""); };

  return (
    <div className="flex flex-col gap-3">
      <Segmented aria-label="What is this course about">
        <SegmentedButton active={value.mode === "product"} onClick={() => set({ mode: "product" })}>A product</SegmentedButton>
        <SegmentedButton active={value.mode === "area"} onClick={() => onChange({ mode: "area", variants: [], indications: [], therapyAreas: value.mode === "area" ? value.therapyAreas : [] })}>A therapy area</SegmentedButton>
        <SegmentedButton active={value.mode === "company"} onClick={() => onChange({ mode: "company", variants: [], indications: [], therapyAreas: [] })}>Company training</SegmentedButton>
      </Segmented>

      {value.mode === "company" && <Text size="body" tone="subtle">Policy, compliance or selling-skills training that isn't about one product. Content still cites approved sources.</Text>}

      {value.mode === "area" && (
        <div className="flex flex-col gap-2.5">
          <PickSearch value={areaQ} onChange={setAreaQ} placeholder="Search therapy areas (e.g. Dermatology, Oncology, Cardiology)…" />
          <ChipMultiSelect size="md" options={ALL_THERAPY_AREAS.filter((a) => a.toLowerCase().includes(areaQ.trim().toLowerCase())).map((a) => ({ id: a, label: a }))}
            selected={value.therapyAreas} onToggle={(a) => set({ therapyAreas: value.therapyAreas.includes(a) ? value.therapyAreas.filter((x) => x !== a) : [...value.therapyAreas, a] })} />
          <Text size="caption" tone="subtle">{value.therapyAreas.length ? `${value.therapyAreas.length} therapy area${value.therapyAreas.length > 1 ? "s" : ""}: disease-state training with no product claims.` : "Pick one or more. Disease-state courses make no product claims."}</Text>
        </div>
      )}

      {value.mode === "product" && !p && (
        <div className="flex flex-col gap-2.5">
          <PickSearch value={q} onChange={setQ} placeholder="Search brand name or molecule (e.g. Lumora, Onkavia, Respiza)…" autoFocus />
          {!term ? (
            <div className="rounded-panel border border-dashed border-hair-2 bg-card px-4 py-5 text-center">
              <p className="text-body font-bold text-ink-2">Start typing to find a product</p>
              <p className="mt-0.5 text-label text-ink-4">Search {PRODUCTS.length} products by brand, molecule, indication or therapy area.</p>
              {withCourses.length > 0 && (
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <span className="self-center text-caption text-ink-3">Has courses:</span>
                  {withCourses.map((x) => <Chip key={x.id} size="md" onClick={() => pick(x)}>{x.brand}</Chip>)}
                </div>
              )}
            </div>
          ) : (
            <PickList>
              {results.map((x) => {
                const blocked = x.status === "Awaiting approval";
                return (
                  <PickRow key={x.id} onSelect={() => pick(x)} disabled={blocked} thumb={<Thumb p={x} />}
                    title={x.brand}
                    detail={blocked ? "No approved label yet, so it can't ground training" : `${x.generic} · ${x.therapyAreas.join(", ")}`}
                    chip={blocked ? <PickChip tone="warn">Awaiting approval</PickChip> : x.status === "Launch" ? <PickChip tone="brand">Launch</PickChip> : <PickChip tone="ok">Approved label</PickChip>} />
                );
              })}
              {results.length === 0 && <PickEmpty title={<>No product matching &quot;{q}&quot;</>}>Products come from the admin&apos;s product list, each with its approved label.</PickEmpty>}
            </PickList>
          )}
        </div>
      )}

      {value.mode === "product" && p && <SelectedProduct p={p} value={value} set={set} onChange={() => onChange({ mode: "product", variants: [], indications: [], therapyAreas: [] })} />}
    </div>
  );
}

function SelectedProduct({ p, value, set, onChange }: { p: Product; value: ProductScope; set: (v: Partial<ProductScope>) => void; onChange: () => void }) {
  const offered = indicationsFor(p, value.variants);
  const picked = offered.filter((i) => value.indications.includes(i.short));
  const areas = therapyAreasFor(p, value.indications, value.variants);
  const division = DIVISIONS.find((d) => d.id === p.divisionId)?.name;

  return (
    <div className="overflow-hidden rounded-panel border border-brand/30 bg-card shadow-hair ring-2 ring-brand/10">
      <div className="group flex items-stretch gap-3.5 p-3">
        <Thumb p={p} size={72} />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate text-subhead font-extrabold text-ink">{p.brand}</span>
            <span className="rounded-chip border border-ok-line bg-ok-bg px-2 py-0.5 text-caption font-bold text-ok">Approved label</span>
            {p.status === "Launch" && <span className="rounded-chip border border-tint-line bg-tint px-2 py-0.5 text-caption font-bold text-brand-deep">Launch</span>}
          </div>
          <span className="truncate text-body italic text-ink-3">{p.generic}</span>
          <span className="truncate text-caption text-ink-3">{p.form} · {division}</span>
        </div>
        <button type="button" onClick={onChange} className="flex h-fit shrink-0 items-center gap-1 text-label font-bold text-brand hover:underline"><PencilLine className="size-3" aria-hidden="true" />Change</button>
      </div>
      <div className="divide-y divide-hair border-t border-tint-line">
        {p.variants.length > 1 ? (
          <Row label="Variants" note={value.variants.length > 0 ? <button type="button" onClick={() => set({ variants: [], indications: [], therapyAreas: [] })} className="text-caption font-semibold text-ink-4 hover:text-ink-2">Reset to all</button> : undefined}>
            <ChipMultiSelect size="sm" options={[{ id: ALL, label: "All variants" }, ...p.variants.map((v) => ({ id: v, label: v }))]}
              selected={shown(p.variants, value.variants)} onToggle={(id) => set({ variants: toggle(p.variants, value.variants, id), indications: [], therapyAreas: [] })} />
          </Row>
        ) : <Row label="Variant"><Auto>{p.variants[0]} is the only presentation.</Auto></Row>}

        <Row label="Indication" note={<span className="text-caption text-ink-4">The content stays within this wording</span>}>
          {offered.length > 1 ? (
            <ChipMultiSelect size="sm" options={[{ id: ALL, label: `All ${offered.length} indications` }, ...offered.map((i) => ({ id: i.short, label: i.isNew ? `${i.short} · Newly approved` : i.short }))]}
              selected={shown(offered.map((i) => i.short), value.indications)} onToggle={(id) => set({ indications: toggle(offered.map((i) => i.short), value.indications, id), therapyAreas: [] })} />
          ) : <Auto>The only indication{value.variants.length ? " for these variants" : ""}: {offered[0]?.short}</Auto>}
          <div className="mt-2 rounded-control border border-hair bg-subtle px-3 py-2.5">
            {picked.length === 0 && offered.length > 1 ? (
              <>
                <span className="text-micro font-extrabold uppercase tracking-wide text-ink-4">Covers all {offered.length}</span>
                <p className="mt-1 text-body text-ink-3">{offered.map((i) => i.short).join(" · ")}. The course can draw on any of them.</p>
              </>
            ) : (
              <>
                <span className="text-micro font-extrabold uppercase tracking-wide text-ink-4">Approved wording</span>
                <div className="mt-1 flex flex-col gap-2">
                  {(picked.length ? picked : offered).map((i) => (
                    <div key={i.short}>
                      {(picked.length || offered.length) > 1 && <span className="block text-label font-bold text-ink">{i.short}</span>}
                      <p className="text-body leading-relaxed text-ink">{i.full}</p>
                      <span className="text-caption text-ink-3">{i.therapyAreas.join(" · ")}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Row>

        <Row label="Therapy area" note={<span className="text-caption text-ink-4">Follows the indications</span>}>
          {areas.length > 1 ? (
            <ChipMultiSelect size="sm" options={[{ id: ALL, label: "All areas" }, ...areas.map((a) => ({ id: a, label: a }))]}
              selected={shown(areas, value.therapyAreas)} onToggle={(id) => set({ therapyAreas: toggle(areas, value.therapyAreas, id) })} />
          ) : <Auto>{areas[0]}</Auto>}
        </Row>
      </div>
    </div>
  );
}
