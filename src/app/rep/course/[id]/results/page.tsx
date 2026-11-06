"use client";

import { Suspense } from "react";
import { ScreeningResults } from "@/features/rep/screening";

export default function Page() {
  return <Suspense><ScreeningResults /></Suspense>;
}
