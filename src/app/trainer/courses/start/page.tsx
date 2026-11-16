"use client";

import { Suspense } from "react";
import { DirectSetup } from "@/features/trainer/direct-setup";

export default function Page() {
  return <Suspense><DirectSetup /></Suspense>;
}
