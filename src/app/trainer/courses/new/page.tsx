"use client";

import { Suspense } from "react";
import { NewCourseWizard } from "@/features/trainer/new-course";

export default function Page() {
  return <Suspense><NewCourseWizard /></Suspense>;
}
