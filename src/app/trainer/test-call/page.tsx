"use client";

import { Suspense } from "react";
import { TestCall } from "@/features/trainer/test-call";

export default function Page() {
  return <Suspense><TestCall /></Suspense>;
}
