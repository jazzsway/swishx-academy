import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A detail screen's main action, pinned to the bottom where the tab bar would be.
 * Put it last on the page; the page above scrolls under it.
 */
export function BottomActions({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("sticky bottom-0 z-20 -mx-4 mt-auto flex flex-col gap-2 border-t border-hair bg-canvas/90 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur-xl", className)}>
      {children}
    </div>
  );
}
