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
 * kept as the trainer moves between objectives, situations, settings and assigning, and carried over from setup.
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
  /** The page's "Add objective" or "Add a situation": the chat asks for it, and takes the next message as it. */
  asked: { kind: "objective" | "situation"; n: number } | null;
  /** The chat's "Generate example situations": the objectives page runs it, with its timer. */
  generating: number;
  generate: () => void;
  ask: (kind: "objective" | "situation") => void;
  clearAsk: () => void;
  /** The publish overlay: what "Next: assign" opens while the version is still a draft. */
  publishOpen: boolean;
  setPublishOpen: (v: boolean) => void;
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
  asked: null,
  generating: 0,
  generate: () => set((s) => ({ generating: s.generating + 1 })),
  ask: (kind) => set((s) => ({ asked: { kind, n: (s.asked?.n ?? 0) + 1 } })),
  clearAsk: () => set({ asked: null }),
  publishOpen: false,
  setPublishOpen: (publishOpen) => set({ publishOpen }),
}), {
  name: "academy-training-chat",
  storage: createJSONStorage(() => sessionStorage),
  /* Only the conversations; an undo can't outlive the page it was made on. */
  partialize: (s) => ({ threads: Object.fromEntries(Object.entries(s.threads).map(([k, ts]) => [k, ts.map(({ undo: _u, ...t }) => t)])) }),
}));

/** The four stages of building a training with the trainer's own material, and where each lives. */
export const STAGES = [
  { n: 1, label: "Objectives", short: "Objectives", path: "/roleplay" },
  { n: 2, label: "Situations", short: "Situations", path: "/situations" },
  { n: 3, label: "Settings", short: "Settings", path: "/settings" },
  { n: 4, label: "Assign", short: "Assign", path: "/assign" },
] as const;

/** Which stage a page belongs to. */
export function stepOf(pathname: string, base: string): 1 | 2 | 3 | 4 {
  if (pathname.startsWith(`${base}/situations`) || pathname.startsWith(`${base}/roleplay/test`)) return 2;
  if (pathname.startsWith(`${base}/settings`)) return 3;
  if (pathname.startsWith(`${base}/assign`) || pathname.startsWith(`${base}/people`) || pathname.startsWith(`${base}/review`)) return 4;
  return 1;
}

/** Opens the agent and asks for a new objective or situation: what the page's "Add" buttons do. */
export function askFor(kind: "objective" | "situation") {
  useCopilot.getState().setOpen(true);
  useTrainingChat.getState().ask(kind);
}

let seq = 0;
export const turnId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
