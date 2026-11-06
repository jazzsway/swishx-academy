"use client";

import { Suspense } from "react";
import { RepOnboarding } from "@/features/rep/onboarding";

export default function Page() {
  return <Suspense><RepOnboarding /></Suspense>;
}
