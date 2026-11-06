"use client";

import { Suspense } from "react";
import { MlrPackage } from "@/features/trainer/course/package";

export default function Page() {
  return <Suspense><MlrPackage /></Suspense>;
}
