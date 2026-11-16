"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useCopilot } from "@/features/copilot/copilot-store";
import type { CallFocus } from "@/lib/roleplay-draft";
import type { Change } from "./chat";

/** One message in a training's chat. A divider marks where the trainer moved to another step. */
export interface TrainingTurn {
  id: string;
  from: "ai" | "you" | "divider";
  text: string;
  /** Lesson changes that wait for the trainer's OK. */
  changes?: Change[];
  status?: "pending" | "accepted" | "rejected";
  /** Puts back what this message changed. */
  undo?: () => void;
  undone?: boolean;
  /** The part of a scenario the message was about. */
  focus?: string;
  /** Drafting, in steps the trainer can watch. */
  steps?: string[];
  at?: number;
  /** A place to go next: the scenario just drafted, or the publish page. */
  link?: { href: string; label: string };
}

/**
 * The agent's chat for a training built with the trainer's own material: one thread per training,
 * kept as the trainer moves between details, scenarios and assigning, and carried over from setup.
 * Kept for the browser session, so a reload doesn't lose it; undo only lasts until then.
 */
interface TrainingChat {
  threads: Record<string, TrainingTurn[]>;
  push: (courseId: string, ...turns: TrainingTurn[]) => void;
  patch: (courseId: string, id: string, p: Partial<TrainingTurn>) => void;
  /** A part of the open scenario, sent to the chat from the page. */
  focus: { scId: string; focus: CallFocus; label: string } | null;
  setFocus: (f: TrainingChat["focus"]) => void;
  /** What the last edit changed, so the page can show it. */
  flash: { keys: string[]; n: number };
  setFlash: (keys: string[]) => void;
  /** A scenario the chat just added, so the list can show it. */
  added: string | null;
  setAdded: (id: string | null) => void;
  /** The page's "Add scenario" button: the chat asks for the scenario. */
  asks: number;
  ask: () => void;
}

export const useTrainingChat = create<TrainingChat>()(persist((set) => ({
  threads: {},
  push: (courseId, ...turns) => set((s) => ({ threads: { ...s.threads, [courseId]: [...(s.threads[courseId] ?? []), ...turns] } })),
  patch: (courseId, id, p) => set((s) => ({ threads: { ...s.threads, [courseId]: (s.threads[courseId] ?? []).map((t) => (t.id === id ? { ...t, ...p } : t)) } })),
  focus: null,
  setFocus: (focus) => set({ focus }),
  flash: { keys: [], n: 0 },
  setFlash: (keys) => set((s) => ({ flash: { keys, n: s.flash.n + 1 } })),
  added: null,
  setAdded: (added) => set({ added }),
  asks: 0,
  ask: () => set((s) => ({ asks: s.asks + 1 })),
}), {
  name: "academy-training-chat",
  storage: createJSONStorage(() => sessionStorage),
  /* Only the conversations; an undo can't outlive the page it was made on. */
  partialize: (s) => ({ threads: Object.fromEntries(Object.entries(s.threads).map(([k, ts]) => [k, ts.map(({ undo: _u, ...t }) => t)])) }),
}));

/** Which of the three steps a page belongs to. */
export function stepOf(pathname: string, base: string): 1 | 2 | 3 {
  if (pathname.startsWith(`${base}/roleplay`)) return 2;
  if (pathname.startsWith(`${base}/assign`) || pathname.startsWith(`${base}/people`) || pathname.startsWith(`${base}/settings`)) return 3;
  return 1;
}

/** Opens the agent and asks for a new scenario: what the page's "Add scenario" buttons do. */
export function askForScenario() {
  useCopilot.getState().setOpen(true);
  useTrainingChat.getState().ask();
}

let seq = 0;
export const turnId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
