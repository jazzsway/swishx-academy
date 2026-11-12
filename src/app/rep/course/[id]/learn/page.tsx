"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { useApp } from "@/store/app-store";
import { BlockPlayer } from "@/features/rep/player";
import { ShortPlayer } from "@/features/rep/short-player";

/** Short-form courses play as cards; long-form as the module player. */
function Player() {
  const { id } = useParams<{ id: string }>();
  const short = useApp((s) => s.courses.find((c) => c.id === id)?.format === "short");
  return short ? <ShortPlayer /> : <BlockPlayer />;
}

export default function Page() {
  return <Suspense><Player /></Suspense>;
}
