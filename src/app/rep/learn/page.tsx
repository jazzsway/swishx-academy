"use client";

import { Suspense } from "react";
import { RepLearn } from "@/features/rep/course";

export default function Page() {
  return <Suspense><RepLearn /></Suspense>;
}
