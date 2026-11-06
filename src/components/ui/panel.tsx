import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Text } from "@/components/ui/text";

/**
 * A bounded region: pinned header, ONE scrolling body, pinned footer.
 *
 * This is the scroll contract, extracted so it is defined once. It matters
 * concretely — the popover-clipping bugs that took several passes to fix came
 * from absolutely-positioned menus inside a scrolling panel body. With the
 * body as the only scroll container and the header and footer outside it,
 * that class of bug is structurally impossible rather than repeatedly fixed.
 *
 * Everything that needs the contract composes this rather than re-deriving it:
 *   Modal    Panel inside an overlay
 *   Sheet    Panel on an edge          (mobile tier, later)
 *   the studio / directions inspectors — Panel inside a column
 *
 * It owns no positioning, no backdrop and no behaviour. Those belong to
 * whatever places it.
 */
export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Rendered in the pinned header, before any actions. */
  title?: string;
  description?: string;
  /** Replaces the default title block entirely. */
  header?: ReactNode;
  /** Pinned to the right of the header. */
  actions?: ReactNode;
  /** Pinned below the scrolling body. */
  footer?: ReactNode;
  /** Padding on the scrolling body. */
  bodyClassName?: string;
  /** Drop the header/footer rules — for a panel already inside a bordered box. */
  dividers?: boolean;
}

export const Panel = forwardRef<HTMLDivElement, PanelProps>(function Panel(
  { title, description, header, actions, footer, bodyClassName, dividers = true,
    className, children, ...props },
  ref,
) {
  const hasHeader = Boolean(header || title || actions);

  return (
    // min-h-0 is what actually lets the body scroll instead of the whole panel
    // growing — without it a flex child refuses to shrink below its content.
    <div ref={ref} className={cn("flex min-h-0 flex-col overflow-hidden", className)} {...props}>
      {hasHeader && (
        <div className={cn(
          "flex shrink-0 items-start gap-3 px-5 py-4",
          dividers && "border-b border-hair",
        )}>
          {header ?? (
            <div className="min-w-0 flex-1">
              {title && <Text as="h2" size="subhead" weight="bold">{title}</Text>}
              {description && (
                <Text as="p" size="body" tone="subtle" className="mt-0.5">{description}</Text>
              )}
            </div>
          )}
          {actions}
        </div>
      )}

      <div className={cn("min-h-0 flex-1 overflow-y-auto", bodyClassName ?? "px-5 py-4")}>
        {children}
      </div>

      {footer && (
        <div className={cn(
          "flex shrink-0 items-center justify-end gap-2 px-5 py-3.5",
          dividers && "border-t border-hair",
        )}>
          {footer}
        </div>
      )}
    </div>
  );
});
