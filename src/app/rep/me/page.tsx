"use client";

import { Suspense } from "react";
import { RepMe } from "@/features/rep/me";

export default function Page() {
  return <Suspense><RepMe /></Suspense>;
}
