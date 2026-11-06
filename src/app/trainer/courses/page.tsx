"use client";

import { Suspense } from "react";
import { CourseCatalogue } from "@/features/trainer/courses";

export default function Page() {
  return <Suspense><CourseCatalogue /></Suspense>;
}
