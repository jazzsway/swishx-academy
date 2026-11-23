"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Portal } from "@/components/ui/portal";
import { Text } from "@/components/ui/text";

/**
 * The rep app's iOS sheet. On a phone it rises from the bottom with a grabber
 * (drag it down, tap outside or press Escape to close). On a wide screen (iPad)
 * it becomes a centred form sheet. It lives in #rep-overlay (see Portal), which
 * is an `@container`, so "wide" means the device's width, not the desktop's.
 */
export function Sheet({ open, onClose, title, description, footer, children, className, bodyClassName, label }: {
  open: boolean; onClose: () => void; title?: ReactNode; description?: ReactNode;
  footer?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string;
  /** Accessible name when the title isn't plain text. */
  label?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(0);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    panel.current?.focus();
    return () => { document.removeEventListener("keydown", key); prev?.focus?.(); };
  }, [open, onClose]);

  if (!open) return null;

  /* Drag the grabber down; past 100px it closes. A tap on it does nothing. */
  function down(e: React.PointerEvent) {
    const y0 = e.clientY;
    const move = (ev: PointerEvent) => setDrag(Math.max(0, ev.clientY - y0));
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setDrag(0);
      if (ev.clientY - y0 > 100) onClose();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <Portal>
      <div className="modal-backdrop pointer-events-auto absolute inset-0 z-[80] flex items-end justify-center bg-ink/40 @min-[600px]:items-center @min-[600px]:p-8"
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div ref={panel} role="dialog" aria-modal="true" aria-label={label ?? (typeof title === "string" ? title : undefined)} tabIndex={-1}
          style={{ transform: drag ? `translateY(${drag}px)` : undefined, transition: drag ? "none" : undefined }}
          className={cn("sheet-up flex max-h-[92%] w-full flex-col overflow-hidden rounded-t-[32px] bg-card shadow-modal outline-none transition-transform duration-200",
            "@min-[600px]:max-w-[560px] @min-[600px]:rounded-[32px]", className)}>
          <div onPointerDown={down} className="flex shrink-0 cursor-grab touch-none flex-col items-center pt-2.5 active:cursor-grabbing @min-[600px]:hidden">
            <span className="h-[5px] w-10 rounded-full bg-ink/20" aria-hidden="true" />
          </div>
          {(title || description) && (
            <div className="flex shrink-0 items-start gap-3 px-5 pb-2 pt-3">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                {title && <Text as="h2" size="title" weight="extrabold" tracking="tight">{title}</Text>}
                {description && <Text size="body" tone="subtle">{description}</Text>}
              </div>
              <button type="button" onClick={onClose} aria-label="Close"
                className="focus-ring grid size-9 shrink-0 place-items-center rounded-full bg-subtle text-ink-2 transition-colors hover:text-ink">
                <svg viewBox="0 0 14 14" className="size-3" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" fill="none" /></svg>
              </button>
            </div>
          )}
          <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2", bodyClassName)}>{children}</div>
          {footer && <div className="flex shrink-0 flex-col gap-2 border-t border-hair px-5 pb-6 pt-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
}
