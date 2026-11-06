"use client";

import { Suspense } from "react";
import { Assessment } from "@/features/rep/assessment";

export default function Page() {
  return <Suspense><Assessment /></Suspense>;
}
