"use client";

import { Suspense } from "react";
import { PracticeSessionView } from "@/features/rep/practice";

export default function Page() {
  return <Suspense><PracticeSessionView /></Suspense>;
}
