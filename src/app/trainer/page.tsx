"use client";

import { Suspense } from "react";
import { TrainerHome } from "@/features/trainer/home";

export default function Page() {
  return <Suspense><TrainerHome /></Suspense>;
}
