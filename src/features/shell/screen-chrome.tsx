"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Text, type TextSize } from "@/components/ui/text";

/**
 * iOS-style screen chrome for the rep app.
 *
 * - ScreenTop: a full-screen page's own top bar (close or back on the left)
 *   with a large title under it. Once the large title scrolls up under the
 *   bar, a small copy of it fades into the bar, as iOS navigation bars do.
 * - BottomBar: the page's main action, stuck to the bottom of the screen, so
 *   it stays in reach while scrolling and sits just above the keyboard.
 * - useOffscreen: whether an element has scrolled up under the top bar. The
 *   shell uses it for pages that sit under its own header.
 */

/** Height of the top bars (the shell header and ScreenTop): h-16. */
export const TOP_BAR = 64;

/** True once `el` has scrolled up past the top bar. Works whether the page scrolls (phone) or #rep-scroll does (desktop device mock).
 *  `shellHeader`: the bar is the shell's header, which sits above #rep-scroll (not over it) when #rep-scroll is the scroller. */
export function useOffscreen(el: HTMLElement | null, { shellHeader = false } = {}) {
  const [off, setOff] = useState(false);
  useEffect(() => {
    setOff(false);
    if (!el) return;
    const sc = document.getElementById("rep-scroll");
    const inner = !!sc && getComputedStyle(sc).overflowY !== "visible";
    const offset = inner && shellHeader ? 0 : TOP_BAR;
    /* Swaps once the large title is fully under the bar. Rects are in screen pixels, so the bar height is scaled by the device mock's zoom. */
    const check = () => {
      const r = el.getBoundingClientRect();
      const zoom = el.offsetHeight ? r.height / el.offsetHeight : 1;
      const top = inner ? sc!.getBoundingClientRect().top : 0;
      setOff(r.bottom < top + offset * zoom);
    };
    check();
    const scroller: HTMLElement | Window = inner ? sc! : window;
    scroller.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => { scroller.removeEventListener("scroll", check); window.removeEventListener("resize", check); };
  }, [el, shellHeader]);
  return off;
}

/* Bleed: the bars span the page's full width, so they cancel its side padding. Written out for Tailwind's scanner. */
const BLEED = { 4: "-mx-4 px-4", 5: "-mx-5 px-5", 6: "-mx-6 px-6" } as const;

export function ScreenTop({ leading, eyebrow, trailing, title, size = "hero", sub, inset = 5 }: {
  leading?: ReactNode; eyebrow?: ReactNode; trailing?: ReactNode;
  title: string; size?: TextSize; sub?: ReactNode; inset?: keyof typeof BLEED;
}) {
  const [h1, setH1] = useState<HTMLElement | null>(null);
  const off = useOffscreen(h1);
  return (
    <>
      {/* -mt-5 lifts it into the page's top padding (pt-5), so it sits flush at the top when stuck. */}
      <div className={cn("sticky top-0 z-30 -mt-5 -mb-2 flex h-16 shrink-0 items-center gap-3 transition-[background-color,box-shadow] duration-200", BLEED[inset],
        off ? "bg-canvas/90 shadow-[0_1px_0_var(--color-hair-2)] backdrop-blur-xl" : "bg-canvas/0")}>
        {leading}
        <div className="relative h-full min-w-0 flex-1">
          {eyebrow && <span className={cn("absolute inset-0 flex items-center transition-opacity duration-200", off && "pointer-events-none opacity-0")}>{eyebrow}</span>}
          <span aria-hidden={!off} className={cn("absolute inset-0 flex items-center transition-all duration-200", off ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1.5 opacity-0")}>
            <span className="truncate text-subhead font-extrabold tracking-tight text-ink">{title}</span>
          </span>
        </div>
        {trailing}
      </div>
      <Text ref={setH1} as="h1" size={size} weight="extrabold" tracking="tight" className="leading-tight">{title}</Text>
      {sub}
    </>
  );
}

/** The page's main action(s), stuck to the bottom. Put it last in a `flex flex-col` page; mt-auto keeps it at the bottom when the page is short. */
export function BottomBar({ children, inset = 5, className }: { children: ReactNode; inset?: keyof typeof BLEED; className?: string }) {
  return (
    <div className={cn("sticky bottom-0 z-20 mt-auto flex flex-col gap-2 bg-gradient-to-t from-canvas from-75% to-canvas/0 pb-[max(env(safe-area-inset-bottom),28px)] pt-5", BLEED[inset], className)}>
      {children}
    </div>
  );
}
