"use client";

import { forwardRef, type ReactNode } from "react";
import { ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Search, then pick one from a short list — the brand search when a project
 * starts, and the congress search on a poster. One look for one action: a
 * search box, a bounded list with a thumbnail, a name, a quiet line under it,
 * a status chip and "Select".
 */
export const PickSearch = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (value: string) => void; placeholder: string; autoFocus?: boolean; label?: string }
>(function PickSearch({ value, onChange, placeholder, autoFocus, label }, ref) {
  return (
    <div className="relative flex items-center">
      <Search className="absolute left-3.5 size-4 text-ink-4" />
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label ?? placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-control border border-hair-2 bg-card py-2.5 pl-10 pr-4 text-body-lg font-medium text-ink-2 shadow-2xs transition-all placeholder:text-ink-4 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
      />
    </div>
  );
});

export function PickList({ children }: { children: ReactNode }) {
  return (
    <div className="max-h-[220px] divide-y divide-hair overflow-y-auto rounded-panel border border-hair-2/90 bg-card shadow-2xs">
      {children}
    </div>
  );
}

export function PickRow({
  thumb,
  title,
  detail,
  chip,
  onSelect,
  disabled,
}: {
  thumb: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
  /** A status chip, e.g. "Verified". */
  chip?: ReactNode;
  onSelect: () => void;
  /** Listed but not pickable yet, e.g. waiting for verification. The detail line says why. */
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center justify-between px-3.5 py-2.5 text-left text-ink-2 transition-colors",
        disabled ? "cursor-not-allowed" : "cursor-pointer hover:bg-subtle"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {thumb}
        <div className="min-w-0">
          <div className="truncate text-body font-bold">{title}</div>
          {detail && <div className="truncate text-label italic text-ink-3">{detail}</div>}
        </div>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-2">
        {chip}
        {!disabled && (
          <span className="flex items-center gap-0.5 text-label font-bold text-brand transition-transform duration-150 group-hover:translate-x-0.5">
            Select <ChevronRight className="size-3" />
          </span>
        )}
      </div>
    </button>
  );
}

/** The chip a row carries: verified, waiting on something, or added in this workspace. */
export function PickChip({ tone, children }: { tone: "ok" | "warn" | "brand"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "rounded-chip border px-2 py-0.5 text-caption font-bold",
        tone === "ok" && "border-ok-line bg-ok-bg text-ok",
        tone === "warn" && "border-warn-line bg-warn-bg text-warn",
        tone === "brand" && "border-tint-line bg-tint text-brand-deep"
      )}
    >
      {children}
    </span>
  );
}

/** Inside the list when nothing matches. */
export function PickEmpty({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="px-4 py-6 text-center">
      <p className="text-body font-bold text-ink-2">{title}</p>
      {children && <div className="mt-0.5 text-label text-ink-4">{children}</div>}
    </div>
  );
}
