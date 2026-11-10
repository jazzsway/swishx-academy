"use client";

import { Suspense } from "react";
import { RepProfile } from "@/features/rep/me";

export default function Page() {
  return <Suspense><RepProfile /></Suspense>;
}
