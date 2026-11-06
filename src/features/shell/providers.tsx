"use client";

import { useEffect, type ReactNode } from "react";
import { useApp } from "@/store/app-store";
import { BrandMark } from "./brand";

/** Rehydrates the persisted demo state before any screen renders, so nothing flashes seed data. */
export function Providers({ children }: { children: ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  useEffect(() => {
    /* Dev-only handle for debugging the demo state from the console. */
    if (process.env.NODE_ENV !== "production") (window as unknown as { __academy: typeof useApp }).__academy = useApp;
    void Promise.resolve(useApp.persist.rehydrate()).then(() => useApp.getState().setHydrated());
  }, []);
  if (!hydrated) {
    return (
      <div className="grid min-h-dvh place-items-center bg-canvas">
        <div className="animate-pulse"><BrandMark size={40} /></div>
      </div>
    );
  }
  return <>{children}</>;
}
