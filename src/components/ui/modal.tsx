"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Panel } from "@/components/ui/panel";
import { Surface } from "@/components/ui/surface";
import { IconButton } from "@/components/ui/button";
import { Portal } from "@/components/ui/portal";

/**
 * One dialog shell for the 13 that were hand-built.
 *
 * It owns the things each copy had to remember and mostly didn't: Escape to
 * close, a click-outside target, body scroll lock, initial focus, a focus
 * trap, and aria-modal wiring.
 *
 * The scroll boundary itself lives in <Panel>, which this composes — the
 * same contract the inspectors and (later) the mobile sheet use, so the
 * popover-clipping class of bug is solved in one place rather than three.
 */

type ModalSize = "sm" | "md" | "lg" | "xl";

const sizes: Record<ModalSize, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[620px]",
  lg: "max-w-[820px]",
  xl: "max-w-[1040px]",
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  /** Pinned below the scrolling body. */
  footer?: ReactNode;
  /** Hide the corner close button when the footer owns dismissal. */
  hideClose?: boolean;
  className?: string;
  children: ReactNode;
}

/* Open dialogs, newest last: Escape and the focus trap belong to the top one,
   so closing a preview opened over a form doesn't close the form too. */
const openStack: symbol[] = [];

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  open, onClose, title, description, size = "md",
  footer, hideClose, className, children,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const token = useRef(Symbol("modal"));

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (openStack[openStack.length - 1] !== token.current) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    const self = token.current;
    openStack.push(self);
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      openStack.splice(openStack.indexOf(self), 1);
      previous?.focus();
    };
  }, [open, onKeyDown]);

  if (!open) return null;

  return (
    <Portal>
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 grid place-items-center bg-ink/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Surface
        ref={panelRef as React.Ref<HTMLElement>}
        radius="card"
        elevation="modal"
        className={cn("flex max-h-[88vh] w-full flex-col overflow-hidden", sizes[size], className)}
      >
        <Panel
          title={title}
          description={description}
          footer={footer}
          actions={!hideClose && (
            <IconButton aria-label="Close" onClick={onClose} className="-mr-1 -mt-1">
              <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            </IconButton>
          )}
          className="min-h-0 flex-1"
        >
          {children}
        </Panel>
      </Surface>
    </div>
    </Portal>
  );
}
