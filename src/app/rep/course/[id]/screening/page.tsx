"use client";

import { Suspense } from "react";
import { Screening } from "@/features/rep/screening";

export default function Page() {
  return <Suspense><Screening /></Suspense>;
}
