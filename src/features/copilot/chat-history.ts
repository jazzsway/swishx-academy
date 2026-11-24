"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { nowIso } from "@/store/app-store";

/**
 * The rep's past conversations with SwishX, kept on this device. Each keeps what the rep asked (typed or
 * said); opening one asks again, so the answers come from today's approved content and today's progress.
 */
export interface SavedChat { id: string; userId: string; at: string; asks: { text: string; voice?: boolean }[] }

interface ChatHistory {
  chats: SavedChat[];
  /** Add a question to a chat, starting it if it's new. */
  ask: (userId: string, chatId: string, text: string, voice?: boolean) => void;
  remove: (id: string) => void;
}

/* A couple of Priya's earlier chats, so the history isn't empty in the demo. */
const SEED: SavedChat[] = [
  { id: "chat-seed-1", userId: "u-priya", at: "2026-11-05T18:10:00", asks: [{ text: "What's assigned to me on Psorivex?" }, { text: "When are my trainings due?" }] },
  { id: "chat-seed-2", userId: "u-priya", at: "2026-11-03T08:40:00", asks: [{ text: "Help me with the cost objection", voice: true }, { text: "Can I talk about use in teens?", voice: true }] },
];

export const useChatHistory = create<ChatHistory>()(persist((set) => ({
  chats: SEED,
  ask: (userId, chatId, text, voice) => set((s) => {
    const at = nowIso(); /* The demo clock, like everything else in the app. */
    const found = s.chats.find((c) => c.id === chatId);
    const chat: SavedChat = found ? { ...found, at, asks: [...found.asks, { text, voice }] } : { id: chatId, userId, at, asks: [{ text, voice }] };
    return { chats: [chat, ...s.chats.filter((c) => c.id !== chatId)].slice(0, 40) };
  }),
  remove: (id) => set((s) => ({ chats: s.chats.filter((c) => c.id !== id) })),
}), { name: "swishx-rep-chats", storage: createJSONStorage(() => localStorage) }));
