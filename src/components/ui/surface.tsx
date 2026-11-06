import { forwardRef, type ElementType, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * Any panel, card, tile or well.
 *
 * Owns the four decisions that were previously re-made at every call site:
 * fill, border, radius and elevation. `bg-card` should not appear in
 * feature code — pass `tone` instead, so the surface colour is changeable
 * from one place.
 *
 * Per DESIGN.md §8 the shape grammar is continuous corners, so `squircle`
 * defaults on for the control/panel/card radii.
 */

export type SurfaceTone = "card" | "canvas" | "subtle" | "tint" | "ok" | "warn" | "danger" | "transparent";
export type SurfaceElevation = "none" | "hair" | "soft" | "float" | "modal";
export type SurfaceRadius = "none" | "chip" | "control" | "panel" | "card" | "pill";
export type SurfacePadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

const tones: Record<SurfaceTone, string> = {
  card: "bg-card",
  canvas: "bg-canvas",
  subtle: "bg-subtle",
  tint: "bg-tint",
  ok: "bg-ok-bg",
  warn: "bg-warn-bg",
  danger: "bg-danger-bg",
  transparent: "bg-transparent",
};

const borders: Record<SurfaceTone, string> = {
  card: "border-hair",
  canvas: "border-hair",
  subtle: "border-hair",
  tint: "border-tint-line",
  ok: "border-ok-line",
  warn: "border-warn-line",
  danger: "border-danger",
  transparent: "border-hair",
};

const elevations: Record<SurfaceElevation, string> = {
  none: "",
  hair: "shadow-hair",
  soft: "shadow-soft",
  float: "shadow-float",
  modal: "shadow-modal",
};

const radii: Record<SurfaceRadius, string> = {
  none: "",
  chip: "rounded-chip",
  control: "rounded-control",
  panel: "rounded-panel",
  card: "rounded-card",
  pill: "rounded-full",
};

const paddings: Record<SurfacePadding, string> = {
  none: "",
  xs: "p-2",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
  xl: "p-6",
};

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  tone?: SurfaceTone;
  elevation?: SurfaceElevation;
  radius?: SurfaceRadius;
  padding?: SurfacePadding;
  /** Hairline border. `strong` uses the heavier rule. */
  border?: boolean | "strong";
  /** Continuous corners. On by default for control/panel/card. */
  squircle?: boolean;
}

export const Surface = forwardRef<HTMLElement, SurfaceProps>(function Surface(
  {
    as: Tag = "div",
    tone = "card",
    elevation = "none",
    radius = "panel",
    padding = "none",
    border = true,
    squircle,
    className,
    ...props
  },
  ref,
) {
  const roundedShape = radius === "control" || radius === "panel" || radius === "card";

  return (
    <Tag
      ref={ref}
      className={cn(
        tones[tone],
        border && "border",
        border === "strong" ? "border-hair-2" : border && borders[tone],
        radii[radius],
        (squircle ?? roundedShape) && "squircle",
        elevations[elevation],
        paddings[padding],
        className,
      )}
      {...props}
    />
  );
});
