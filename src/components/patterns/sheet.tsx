"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/panel";
import { Portal } from "@/components/ui/portal";

/**
 * An edge-anchored panel over a scrim — what the right inspector becomes when
 * there is no room to dock it, and what a filter or detail view becomes on a
 * phone.
 *
 * It is <Panel> in a fixed position, not a new scroll container: pinned header,
 * one scrolling body, pinned footer, decided once. The only things Sheet adds
 * are the scrim, the edge, and the dismissal rules.
 */
export type SheetSide = "right" | "left" | "bottom";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: SheetSide;
  title?: string;
  description?: string;
  header?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  /** Width for side sheets, height for a bottom sheet. */
  size?: number | string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

const EDGE: Record<SheetSide, string> = {
  right: "inset-y-0 right-0 border-l",
  left: "inset-y-0 left-0 border-r",
  bottom: "inset-x-0 bottom-0 border-t rounded-t-panel",
};

const ENTER: Record<SheetSide, string> = {
  right: "slide-in-from-right",
  left: "slide-in-from-left",
  bottom: "slide-in-from-bottom",
};

export function Sheet({
  open, onClose, side = "right", title, description, header, actions, footer,
  size, className, bodyClassName, children,
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizing = side === "bottom"
    ? { maxHeight: size ?? "85vh" }
    : { width: size ?? 410, maxWidth: "100vw" };

  return (
    <Portal>
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink/50 backdrop-blur-sm animate-in fade-in duration-200"
      />
      <Panel
        title={title}
        description={description}
        header={header}
        actions={actions}
        footer={footer}
        bodyClassName={bodyClassName}
        style={sizing}
        className={cn(
          "absolute max-h-full border-hair bg-card shadow-float",
          "animate-in duration-300 ease-swish",
          EDGE[side], ENTER[side], className,
        )}
      >
        {children}
      </Panel>
    </div>
    </Portal>
  );
}
