"use client";

import { Suspense } from "react";
import { ReviewAndVersions } from "@/features/trainer/course/review";

export default function Page() {
  return <Suspense><ReviewAndVersions /></Suspense>;
}
