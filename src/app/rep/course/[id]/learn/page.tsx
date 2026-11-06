"use client";

import { Suspense } from "react";
import { BlockPlayer } from "@/features/rep/player";

export default function Page() {
  return <Suspense><BlockPlayer /></Suspense>;
}
