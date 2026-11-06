"use client";

import { Suspense } from "react";
import { CourseSettingsTab } from "@/features/trainer/course/settings";

export default function Page() {
  return <Suspense><CourseSettingsTab /></Suspense>;
}
