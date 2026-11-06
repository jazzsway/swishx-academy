"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The floating dark pill that closes a canvas: a status line on the left, the
 * stage's primary CTA on the right. Three screens had it — the plan, script
 * and creative-plan canvases — with the same shape and three different sets of
 * hand-tuned pixels.
 *
 * It is `sticky mt-auto` rather than fixed on purpose: it belongs to the
 * scrolling canvas, so it rides the bottom of that region and never floats
 * over the inspector.
 *
 * The CTA nests in the pill: inner radius + padding + border = outer. That
 * only holds if the button is inset the same on every side it faces, so the
 * right padding matches the vertical padding when there is an action, and
 * the button's corner is set here rather than by each caller — the pill is
 * a squircle to match, because every <button> is one.
 */
export interface ActionBarProps {
  /** Leading icon. Callers supply it because the three sites use three. */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The primary CTA. */
  action?: ReactNode;
  /** Extra space above — for canvases whose content runs right up to it. */
  gutter?: boolean;
  className?: string;
}

export function ActionBar({ icon, title, description, action, gutter = true, className }: ActionBarProps) {
  return (
    <div
      className={cn(
        "sticky bottom-4 z-30 mt-auto flex w-full shrink-0 justify-center",
        // The rail is click-through; only the pill itself takes pointer events,
        // so the canvas stays scrollable under the bar's full width.
        "pointer-events-none",
        gutter && "pt-6 pb-2",
        className,
      )}
    >
      <div
        className={cn(
          "squircle pointer-events-auto flex max-w-full items-center justify-between gap-4 rounded-card border border-white/12 bg-ink py-2.5 pl-4 shadow-on-dark backdrop-blur-sm sm:gap-6 sm:pl-5",
          action ? "pr-2.5" : "pr-4 sm:pr-5"
        )}
      >
        <div className="flex min-w-0 items-center gap-2.5 pr-1">
          {icon}
          <div className="min-w-0">
            <div className="truncate text-body font-bold tracking-tight text-white">{title}</div>
            {description && <p className="truncate text-label text-white/70">{description}</p>}
          </div>
        </div>
        {action && (
          /* 24px pill − 10px inset − 1px border = 13px for the CTA. */
          <div className="flex shrink-0 items-center gap-2 [&_button]:[border-radius:calc(var(--radius-card)_-_11px)]">
            {action}
          </div>
        )}
      </div>
    </div>
  );
}
