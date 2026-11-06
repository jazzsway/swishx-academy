import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Centred content wrapper on a fixed width scale.
 *
 * For new work. Existing max-w-[Npx] values were left alone on purpose:
 * there are 47 of them across 25 values, but unlike font sizes those are
 * mostly deliberate per context rather than drift, and snapping them would
 * move layout by 40-100px.
 */
type Width = "narrow" | "measure" | "wide" | "page";

const widths: Record<Width, string> = {
  narrow: "max-w-(--container-narrow)",
  measure: "max-w-(--container-measure)",
  wide: "max-w-(--container-wide)",
  page: "max-w-(--container-page)",
};

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  width?: Width;
  /** Horizontal page gutter. */
  gutter?: boolean;
}

export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  { as: Tag = "div", width = "wide", gutter = true, className, ...props },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn("mx-auto w-full", widths[width], gutter && "px-4 sm:px-6", className)}
      {...props}
    />
  );
});
