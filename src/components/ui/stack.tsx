import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Flex layout with a fixed gap scale. Exists so spacing between siblings is
 * a gap on the container rather than margins on children, which is what
 * silently collapses and doubles.
 */

type Gap = 0 | 0.5 | 1 | 1.5 | 2 | 2.5 | 3 | 4 | 5 | 6;
type Align = "start" | "center" | "end" | "stretch" | "baseline";
type Justify = "start" | "center" | "end" | "between" | "around";

const gaps: Record<Gap, string> = {
  0: "gap-0", 0.5: "gap-0.5", 1: "gap-1", 1.5: "gap-1.5", 2: "gap-2",
  2.5: "gap-2.5", 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6",
};
const aligns: Record<Align, string> = {
  start: "items-start", center: "items-center", end: "items-end",
  stretch: "items-stretch", baseline: "items-baseline",
};
const justifies: Record<Justify, string> = {
  start: "justify-start", center: "justify-center", end: "justify-end",
  between: "justify-between", around: "justify-around",
};

interface FlexProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  gap?: Gap;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  grow?: boolean;
}

function flex(direction: "row" | "col") {
  return forwardRef<HTMLElement, FlexProps>(function Flex(
    { as: Tag = "div", gap = 2, align, justify, wrap, grow, className, ...props },
    ref,
  ) {
    return (
      <Tag
        ref={ref}
        className={cn(
          "flex",
          direction === "col" ? "flex-col" : "flex-row",
          gaps[gap],
          align && aligns[align],
          justify && justifies[justify],
          wrap && "flex-wrap",
          grow && "flex-1 min-w-0",
          className,
        )}
        {...props}
      />
    );
  });
}

/** Vertical. Defaults to align:stretch, like a column of blocks. */
export const Stack = flex("col");
/** Horizontal. Pair with align="center" for a control row. */
export const Row = flex("row");
