"use client";

import { Suspense } from "react";
import { CourseEditor } from "@/features/trainer/course/editor";

export default function Page() {
  return <Suspense><CourseEditor /></Suspense>;
}
