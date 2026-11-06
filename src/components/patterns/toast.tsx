"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { Portal } from "@/components/ui/portal";
import { cn } from "@/lib/cn";

/**
 * The one confirmation, from the top.
 *
 * Written twice and drifted: one studio put a plain dark pill at the bottom
 * with no transition at all, the other put a different pill five pixels
 * higher with an enter animation and no exit. Both sat at the foot of the
 * screen, under the action bar, furthest from the thing you just pressed.
 *
 * It comes down from the top and goes back the way it came. A toast that
 * appears and vanishes leaves you unsure whether you saw it; the two seconds
 * of travel are what make it register as an answer to what you did.
 */
const ENTER_MS = 260;

/** Something was taken in, or something was taken back out. */
export type ToastTone = "done" | "undone";

export function useToast(duration = 2600) {
  const [message, setMessage] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);
  const clearTimer = useRef<number | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(
    () => () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);
    },
    []
  );

  const [tone, setTone] = useState<ToastTone>("done");

  const showToast = useCallback(
    (text: string, nextTone: ToastTone = "done") => {
      setTone(nextTone);
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
      if (clearTimer.current) window.clearTimeout(clearTimer.current);

      setMessage(text);
      /* Already on screen: swap the words and restart the clock. Animating
         out and back in for a second confirmation reads as a glitch. */
      if (!openRef.current) {
        setOpen(false);
        /* Two frames: one to mount in the closed state, one to flip it, or
           the browser has nothing to transition from. */
        requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
      }

      hideTimer.current = window.setTimeout(() => {
        setOpen(false);
        clearTimer.current = window.setTimeout(() => setMessage(null), ENTER_MS);
      }, duration);
    },
    [duration]
  );

  return { message, open, tone, showToast };
}

export function Toast({
  message,
  open,
  tone = "done",
}: {
  message: string | null;
  open: boolean;
  tone?: ToastTone;
}) {
  if (!message) return null;

  /* A tick on "removed from the chat" says the opposite of what happened.
     The mark reports the act, not the fact that the act succeeded. */
  const Icon = tone === "undone" ? XCircle : CheckCircle2;

  return (
    <Portal>
      <div
        role="status"
        aria-live="polite"
        /* Clear of the header rather than over it: a confirmation that covers
           the title bar is a confirmation that hides where you are. */
        className={cn(
          "pointer-events-none fixed inset-x-0 top-16 z-[10000] flex justify-center px-4",
          "transition-all ease-entrance",
          open ? "translate-y-0 opacity-100" : "-translate-y-4 opacity-0"
        )}
        style={{ transitionDuration: `${ENTER_MS}ms` }}
      >
        <span className="pointer-events-auto inline-flex max-w-[min(90vw,520px)] items-center gap-2 rounded-control border border-white/15 bg-ink px-4 py-2 text-body font-bold text-white shadow-float">
          <Icon className={cn("size-4 shrink-0", tone === "undone" ? "text-white/60" : "text-ok-on-dark")} />
          <span className="truncate">{message}</span>
        </span>
      </div>
    </Portal>
  );
}
