"use client";

import { Suspense } from "react";
import { LibraryHome } from "@/features/library/rep-library";

export default function Page() {
  return <Suspense><LibraryHome /></Suspense>;
}
