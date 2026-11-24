"use client";

import { Suspense } from "react";
import { TestStage } from "@/features/trainer/course/test-stage";

export default function Page() {
  return <Suspense><TestStage /></Suspense>;
}
