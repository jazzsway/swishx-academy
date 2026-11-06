"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A segmented tab row. The first tab component in the repo — nothing rendered
 * `role="tablist"` before this.
 *
 * Segmented rather than underlined on purpose: these are different THINGS
 * (settings sections, library kinds), not different views of one list. An
 * underline says "same list, filtered"; a segment says "somewhere else".
 *
 * Concentric by construction: an 18px shell with a 4px gutter around 14px tabs,
 * which is the radius scale's own step. Do not change one without the other.
 *
 * Scrolls rather than wraps. Ten tabs do not fit at 1280px, and wrapping to a
 * second row makes the row's height depend on the viewport.
 */
export interface TabNavItem {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Renders as a Link when set, a button otherwise. */
  href?: string;
  badge?: number | string;
}

export interface TabNavProps {
  items: TabNavItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  ariaLabel: string;
  className?: string;
}

export function TabNav({ items, activeId, onSelect, ariaLabel, className }: TabNavProps) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 overflow-x-auto rounded-panel border border-hair bg-subtle p-1",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const inner = (
          <>
            {item.icon}
            <span className="text-body font-semibold">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={cn(
                  "rounded-glyph px-1.5 text-micro font-bold tabular-nums",
                  active ? "bg-brand/15 text-brand-deep" : "bg-black/[0.06] text-ink-3",
                )}
              >
                {item.badge}
              </span>
            )}
          </>
        );
        const shared = cn(
          "flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-control px-3 py-2 transition-colors",
          active ? "bg-tint text-brand" : "text-ink-3 hover:bg-card hover:text-ink",
        );

        return item.href ? (
          <Link
            key={item.id}
            href={item.href}
            role="tab"
            aria-selected={active}
            className={shared}
          >
            {inner}
          </Link>
        ) : (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect?.(item.id)}
            className={shared}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
