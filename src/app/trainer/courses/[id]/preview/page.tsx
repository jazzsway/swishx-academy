"use client";

import { Suspense } from "react";
import { PreviewAsRep } from "@/features/trainer/course/preview";

export default function Page() {
  return <Suspense><PreviewAsRep /></Suspense>;
}
