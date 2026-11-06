"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { bandOf, BAND_LABEL, type Band } from "@/lib/learning";
import type { ProgressState, VersionState } from "@/data/types";

/* Academy-specific patterns, built only from the ported primitives and tokens. */

export function Card({ title, eyebrow, actions, children, className, padded = true, tone = "card" }: {
  title?: ReactNode; eyebrow?: ReactNode; actions?: ReactNode; children?: ReactNode; className?: string; padded?: boolean;
  tone?: "card" | "ink" | "tint" | "subtle";
}) {
  return (
    <section
      className={cn(
        "squircle flex min-w-0 flex-col gap-4 rounded-card border",
        tone === "card" && "border-hair bg-card",
        tone === "ink" && "border-transparent bg-ink text-white",
        tone === "tint" && "border-tint-line bg-tint",
        tone === "subtle" && "border-hair bg-subtle",
        padded && "p-5 sm:p-6",
        className,
      )}
    >
      {(title || actions || eyebrow) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {eyebrow && <Text size="caption" weight="semibold" tone={tone === "ink" ? "inverse" : "brand-deep"} className={tone === "ink" ? "text-brand-light" : undefined}>{eyebrow}</Text>}
            {title && <Text as="h2" size="title" weight="bold" tone={tone === "ink" ? "inverse" : "default"}>{title}</Text>}
          </div>
          {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, unit, sub, tone = "default", size = "md" }: {
  label: ReactNode; value: ReactNode; unit?: ReactNode; sub?: ReactNode; tone?: "default" | "ok" | "warn" | "danger" | "inverse"; size?: "md" | "lg";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Text size="caption" tone={tone === "inverse" ? "inverse" : "subtle"} className={tone === "inverse" ? "opacity-70" : undefined}>{label}</Text>
      <div className="flex items-baseline gap-1.5">
        <Text size={size === "lg" ? "hero-lg" : "display-lg"} weight="extrabold" tracking="tight" tabular
          tone={tone === "ok" ? "ok" : tone === "warn" ? "warn" : tone === "danger" ? "danger" : tone === "inverse" ? "inverse" : "default"} className="leading-none">
          {value}
        </Text>
        {unit && <Text size="body-lg" tone={tone === "inverse" ? "inverse" : "subtle"}>{unit}</Text>}
      </div>
      {sub && <Text size="caption" tone={tone === "inverse" ? "inverse" : "muted"} className={tone === "inverse" ? "opacity-70" : undefined}>{sub}</Text>}
    </div>
  );
}

export function Meter({ value, tone = "brand", className, height = 8, label }: {
  value: number; tone?: "brand" | "ok" | "warn" | "danger" | "ink" | "brand-2"; className?: string; height?: number; label?: string;
}) {
  const fill = { brand: "bg-brand", ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", ink: "bg-ink", "brand-2": "bg-brand-2" }[tone];
  return (
    <div role="meter" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label}
      className={cn("w-full overflow-hidden rounded-full bg-black/[0.07]", className)} style={{ height }}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-entrance", fill)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 44, stroke = 5, tone = "brand", children, label }: {
  value: number; size?: number; stroke?: number; tone?: "brand" | "ok" | "ink" | "white"; children?: ReactNode; label?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const color = { brand: "var(--color-brand)", ok: "var(--color-ok)", ink: "var(--color-ink)", white: "#fff" }[tone];
  const track = tone === "white" ? "rgba(255,255,255,.15)" : "rgba(10,13,20,.08)";
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${value}%`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(circ * Math.max(0, Math.min(100, value))) / 100} ${circ}`} className="transition-[stroke-dasharray] duration-700" />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

const BAND_TONE: Record<Band, "danger" | "warn" | "ok" | "brand"> = { not_yet: "danger", developing: "warn", proficient: "ok", expert: "ok" };

export function BandChip({ score, size = "sm" }: { score: number; size?: "xs" | "sm" | "md" }) {
  const b = bandOf(score);
  return <Chip tone={BAND_TONE[b]} size={size}>{BAND_LABEL[b]}</Chip>;
}

export const bandCellClass = (score: number | null) => {
  if (score === null) return "bg-subtle text-ink-4";
  const b = bandOf(score);
  return b === "not_yet" ? "bg-danger-bg text-danger-deep" : b === "developing" ? "bg-warn-bg text-warn" : b === "proficient" ? "bg-ok-bg text-ok" : "bg-ok text-white";
};

const VERSION_TONE: Record<VersionState, { label: string; tone: "default" | "brand" | "ok" | "warn" | "danger" }> = {
  draft: { label: "Draft", tone: "default" },
  ready: { label: "Ready for review", tone: "brand" },
  in_review: { label: "In MLR review", tone: "warn" },
  changes: { label: "Changes requested", tone: "danger" },
  approved: { label: "Approved", tone: "ok" },
  published: { label: "Published", tone: "ok" },
  expired: { label: "Expired", tone: "danger" },
  withdrawn: { label: "Withdrawn", tone: "danger" },
  superseded: { label: "Superseded", tone: "default" },
};

export function VersionChip({ state, expiring, size = "sm" }: { state: VersionState; expiring?: boolean; size?: "xs" | "sm" | "md" }) {
  if (expiring && state === "published") return <Chip tone="warn" size={size}>Expiring soon</Chip>;
  const v = VERSION_TONE[state];
  return <Chip tone={v.tone} size={size}>{v.label}</Chip>;
}

const PROGRESS_TONE: Record<ProgressState, "default" | "brand" | "ok" | "warn" | "danger"> = {
  not_started: "default", screening: "brand", learning: "brand", assessment: "brand", remediation: "warn",
  awaiting_verify: "warn", needs_coaching: "warn", certified: "ok",
};

export function ProgressChip({ state, overdue, size = "sm", label }: { state: ProgressState; overdue?: boolean; size?: "xs" | "sm" | "md"; label?: string }) {
  if (overdue) return <Chip tone="danger" size={size}>Overdue</Chip>;
  return <Chip tone={PROGRESS_TONE[state]} size={size}>{label ?? state.replace(/_/g, " ").replace(/^./, (x) => x.toUpperCase())}</Chip>;
}

export function Avatar({ initials, size = 36, tone = "tint" }: { initials: string; size?: number; tone?: "tint" | "ink" | "subtle" }) {
  return (
    <div
      aria-hidden="true"
      className={cn("grid shrink-0 place-items-center rounded-full font-bold",
        tone === "tint" && "bg-tint-strong text-brand-deep", tone === "ink" && "bg-ink text-white", tone === "subtle" && "bg-subtle text-ink-2")}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)) }}
    >
      {initials}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-hair-2 px-6 py-12 text-center">
      {icon && <div className="grid size-12 place-items-center rounded-full bg-tint text-brand-deep">{icon}</div>}
      <Text size="subhead" weight="bold">{title}</Text>
      {body && <Text as="p" size="body-lg" tone="subtle" className="max-w-[48ch]">{body}</Text>}
      {action}
    </div>
  );
}

export function Sparkline({ values, width = 200, height = 56, color = "var(--color-brand)", label }: { values: number[]; width?: number; height?: number; color?: string; label: string }) {
  const max = Math.max(100, ...values);
  const step = width / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(height - 6 - (v / max) * (height - 12)).toFixed(1)}`).join(" ");
  const last = pts.split(" ").at(-1)!.split(",");
  return (
    <svg width={width} height={height} viewBox={`-4 0 ${width + 8} ${height}`} role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r={4.5} fill={color} />
    </svg>
  );
}

export function KeyValue({ items }: { items: { k: ReactNode; v: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5">
      {items.map((it, i) => (
        <div key={i} className="contents">
          <dt className="text-body text-ink-3">{it.k}</dt>
          <dd className="m-0 text-body font-semibold text-ink">{it.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Dot({ tone }: { tone: "ok" | "warn" | "danger" | "brand" | "faint" | "brand-2" }) {
  const c = { ok: "bg-ok", warn: "bg-warn", danger: "bg-danger", brand: "bg-brand", faint: "bg-ink-4", "brand-2": "bg-brand-2" }[tone];
  return <span aria-hidden="true" className={cn("inline-block size-2 shrink-0 rounded-full", c)} />;
}

export function FictionalNote({ className }: { className?: string }) {
  return (
    <Text as="p" size="micro" tone="faint" className={cn("text-center", className)}>
      Prototype · Corvana Therapeutics, Lumora, Cardexa and all people are fictional.
    </Text>
  );
}

export function Citation({ n, title, page }: { n: number; title: string; page: number }) {
  return (
    <sup className="group relative ml-0.5 cursor-help align-super text-micro font-bold text-brand-deep" tabIndex={0}>
      [{n}]
      <span role="tooltip" className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden w-max max-w-[260px] -translate-x-1/2 rounded-chip bg-ink px-2.5 py-1.5 text-caption font-medium text-white shadow-float group-hover:block group-focus:block">
        {title}, p. {page}
      </span>
    </sup>
  );
}
