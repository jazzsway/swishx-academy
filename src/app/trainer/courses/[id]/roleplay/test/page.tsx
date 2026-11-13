"use client";

import { Suspense } from "react";
import { TestCall } from "@/features/trainer/test-call";

/* The test call runs inside the course workspace, on the canvas, so the trainer never leaves the course. */
export default function Page() {
  return <Suspense><TestCall embedded /></Suspense>;
}
