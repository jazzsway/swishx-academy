"use client";

import { create } from "zustand";

/** UI state for the right-hand copilot. Not persisted: it's chrome, not data. */
interface CopilotUi {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  /** A page can take over the panel with its own copilot (the course editor does). */
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
  overrides: number;
  claim: () => () => void;
  /** Text a page puts in the composer for the trainer to finish, e.g. guidance for an open question. */
  draft: string;
  setDraft: (v: string) => void;
}

export const useCopilot = create<CopilotUi>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  slot: null,
  setSlot: (slot) => set({ slot }),
  overrides: 0,
  claim: () => {
    set((s) => ({ overrides: s.overrides + 1 }));
    return () => set((s) => ({ overrides: s.overrides - 1 }));
  },
  draft: "",
  setDraft: (draft) => set({ draft }),
}));
