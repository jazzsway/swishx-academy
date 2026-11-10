"use client";

import { Suspense } from "react";
// v1-hidden: the MLR flow. import { ReviewAndVersions } from "@/features/trainer/course/review";
import { PublishAndVersions } from "@/features/trainer/course/publish";

export default function Page() {
  return <Suspense><PublishAndVersions /></Suspense>;
}
