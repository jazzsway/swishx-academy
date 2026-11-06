import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/**
 * The variants and shapes here were derived from what the app already does:
 * 296 raw <button> elements clustered into 39 signatures, of which the top ten
 * cover 80%. `soft` and the `shape` prop exist because the audit found 28 tint
 * buttons and a roughly even split between pill and rounded — both of which
 * had no way to be expressed before.
 *
 * `shape` defaults to control: the pill shape was retired so that button
 * corners match the rest of the radius scale rather than being a fifth value.
 */

type ButtonVariant = "primary" | "secondary" | "soft" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg" | "icon";
type ButtonShape = "control" | "chip";

const variants: Record<ButtonVariant, string> = {
  primary: "border-transparent bg-brand text-white hover:bg-brand-deep shadow-hair",
  secondary: "border-hair-2 bg-card text-ink hover:bg-subtle",
  soft: "border-tint-line bg-tint text-brand-deep hover:bg-tint-strong",
  ghost: "border-transparent bg-transparent text-ink-3 hover:bg-black/5 hover:text-ink",
  danger: "border-transparent bg-danger text-white hover:bg-danger-deep",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-body",
  md: "h-10 px-4 text-body-lg",
  lg: "h-12 px-5 text-body-lg",
  icon: "size-9 p-0",
};

const shapes: Record<ButtonShape, string> = {
  control: "rounded-control squircle",
  chip: "rounded-chip squircle",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  shape?: ButtonShape;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", shape = "control", fullWidth, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "focus-ring inline-flex shrink-0 items-center justify-center gap-2 border font-semibold transition-colors disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        shapes[shape],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    />
  );
});

/**
 * The circular icon button used throughout the chrome — 17 near-identical
 * hand-rolled copies of `grid size-N place-items-center rounded-full
 * text-ink-3 hover:bg-black/5 hover:text-ink` before this existed.
 *
 * Media-overlay icon buttons (`bg-black/55 text-white`) are a different
 * thing and deliberately not folded in here.
 */
type IconButtonSize = 6 | 7 | 8 | 9;

const iconSizes: Record<IconButtonSize, string> = {
  6: "size-6",
  7: "size-7",
  8: "size-8",
  9: "size-9",
};

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required — an icon-only control needs an accessible name. */
  "aria-label": string;
  size?: IconButtonSize;
  tone?: "default" | "brand" | "danger";
}

const iconTones = {
  default: "text-ink-3 hover:bg-black/5 hover:text-ink",
  brand: "text-brand hover:bg-tint",
  danger: "text-danger hover:bg-danger-bg",
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, size = 8, tone = "default", type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "focus-ring grid shrink-0 place-items-center rounded-full transition-colors disabled:pointer-events-none disabled:opacity-40",
        iconSizes[size],
        iconTones[tone],
        className,
      )}
      {...props}
    />
  );
});
