"use client";

import { cn } from "@/lib/cn";

/**
 * A row of mutually exclusive options, as one control.
 *
 * Written four times across the libraries and wrong in three of them, in the
 * same way each time: a nested radius has to be the outer radius minus the
 * gap, or the inner curve fights the outer one. Product Library had 10 inside
 * 14 with a 3px gap; Characters had 6 inside 14 with 2. Both read as a chip
 * that does not fit its slot.
 *
 * The other half of the mismatch was invisible in the numbers: globals.css
 * gives every `button` a squircle corner, so a squircle chip sat inside a
 * plainly-rounded shell no matter what the radii said. The shell is a
 * squircle too here.
 *
 * The rule is inner radius + padding + border = outer radius. The 1px
 * border counts: leaving it out put an 11px chip in a 10px slot.
 *
 * One constant, one place: change PAD or the radius and every segmented
 * control in the app stays nested.
 */
const PAD = 3;
const BORDER = 1;

export function Segmented({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("squircle flex shrink-0 gap-0.5 border border-hair-2 bg-subtle", className)}
      style={{
        borderRadius: "var(--radius-control)",
        padding: PAD,
        ...rest.style,
      }}
    >
      {children}
    </div>
  );
}

export function SegmentedButton({
  active,
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      className={cn(
        "flex cursor-pointer items-center justify-center gap-1.5 px-3 py-1.5 text-label font-bold transition-colors",
        active ? "bg-card text-brand-deep shadow-2xs" : "text-ink-3 hover:text-ink",
        className
      )}
      style={{
        borderRadius: `calc(var(--radius-control) - ${PAD + BORDER}px)`,
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}
