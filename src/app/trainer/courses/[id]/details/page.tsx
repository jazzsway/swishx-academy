"use client";

import { Suspense } from "react";
import { TrainingDetails } from "@/features/trainer/course/details";

export default function Page() {
  return <Suspense><TrainingDetails /></Suspense>;
}
