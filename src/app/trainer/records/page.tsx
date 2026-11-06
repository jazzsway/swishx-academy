"use client";

import { Suspense } from "react";
import { Records } from "@/features/trainer/records";

export default function Page() {
  return <Suspense><Records /></Suspense>;
}
