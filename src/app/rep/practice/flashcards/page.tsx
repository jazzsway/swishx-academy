"use client";

import { Suspense } from "react";
import { Flashcards } from "@/features/rep/practice";

export default function Page() {
  return <Suspense><Flashcards /></Suspense>;
}
