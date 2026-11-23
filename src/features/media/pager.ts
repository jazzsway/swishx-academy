"use client";

import { useEffect } from "react";
import { create } from "zustand";

/**
 * Page controls a reader (PDF, deck, slides) hands to its host. The lesson player's sticky footer
 * hosts them, so turning a page is always one thumb away instead of below the page and thumbnails.
 * Readers with no host keep their own Previous / Next row.
 */
export interface Pager { page: number; total: number; seen: number; unit: "page" | "slide"; prev: () => void; next: () => void }

interface PagerState { pager: Pager | null; hosts: number; set: (p: Pager | null) => void; host: () => () => void }

export const usePager = create<PagerState>((set) => ({
  pager: null,
  hosts: 0,
  set: (pager) => set({ pager }),
  host: () => {
    set((s) => ({ hosts: s.hosts + 1 }));
    return () => set((s) => ({ hosts: s.hosts - 1, pager: null }));
  },
}));

/** A reader publishes its controls; returns true when a host is showing them (so it can hide its own). */
export function usePublishPager(p: Pager) {
  const hosted = usePager((s) => s.hosts > 0);
  const setPager = usePager((s) => s.set);
  useEffect(() => { setPager(p); }, [p.page, p.total, p.seen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setPager(null), [setPager]);
  return hosted;
}

/** Next page to read: the next one you haven't seen, else simply the next. */
export function nextUnseen(i: number, total: number, seen: (k: number) => boolean) {
  for (let k = i + 1; k < total; k++) if (!seen(k)) return k;
  for (let k = 0; k < i; k++) if (!seen(k)) return k;
  return Math.min(i + 1, total - 1);
}
