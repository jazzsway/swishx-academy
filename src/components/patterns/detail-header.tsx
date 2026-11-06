"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DetailTab<K extends string> {
  key: K;
  label: string;
  icon: LucideIcon;
  count?: number;
}

/**
 * What a thing is, and the ways of looking at it, as one card: the identity
 * block, a rule, and the tab strip along the bottom edge. Ported from
 * SwishX for Business's product detail.
 */
export function DetailHeader<K extends string>({ children, tabs, active, onSelect }: {
  children: React.ReactNode;
  tabs: DetailTab<K>[];
  active: K;
  onSelect: (key: K) => void;
}) {
  return (
    <div className="overflow-hidden rounded-panel border border-hair bg-card shadow-hair">
      <div className="p-4 sm:p-5">{children}</div>
      <div className="flex overflow-x-auto border-t border-hair bg-canvas [scrollbar-width:none]" role="tablist">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <button key={tab.key} type="button" role="tab" aria-selected={on} onClick={() => onSelect(tab.key)}
              className={cn("relative flex flex-1 cursor-pointer items-center justify-center gap-2 px-3.5 py-3 text-body-lg font-bold transition-colors",
                on ? "bg-card text-brand-deep" : "text-ink-3 hover:bg-card/60 hover:text-ink")}>
              <tab.icon size={15} className="shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={cn("rounded-chip px-1.5 py-0.5 text-micro font-extrabold tabular-nums", on ? "bg-tint text-brand-deep" : "bg-subtle text-ink-4")}>{tab.count}</span>
              )}
              {on && <span aria-hidden className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "linear-gradient(90deg,var(--color-brand),var(--color-brand-deep))" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
