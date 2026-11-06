"use client";

import { Suspense } from "react";
import { QuickQuiz } from "@/features/rep/practice";

export default function Page() {
  return <Suspense><QuickQuiz /></Suspense>;
}
