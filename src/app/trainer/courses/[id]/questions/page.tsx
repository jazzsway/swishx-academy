"use client";

import { Suspense } from "react";
import { QuestionBank } from "@/features/trainer/course/questions";

export default function Page() {
  return <Suspense><QuestionBank /></Suspense>;
}
