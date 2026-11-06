"use client";

import { Suspense } from "react";
import { RepCourse } from "@/features/rep/course";

export default function Page() {
  return <Suspense><RepCourse /></Suspense>;
}
