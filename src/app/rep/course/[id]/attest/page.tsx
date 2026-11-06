"use client";

import { Suspense } from "react";
import { Attestation } from "@/features/rep/assessment";

export default function Page() {
  return <Suspense><Attestation /></Suspense>;
}
