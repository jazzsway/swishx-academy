"use client";

import { Suspense } from "react";
import { AssignCourse } from "@/features/trainer/course/assign";

export default function Page() {
  return <Suspense><AssignCourse /></Suspense>;
}
