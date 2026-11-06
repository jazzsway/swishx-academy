"use client";

import { Suspense } from "react";
import { RepHome } from "@/features/rep/home";

export default function Page() {
  return <Suspense><RepHome /></Suspense>;
}
