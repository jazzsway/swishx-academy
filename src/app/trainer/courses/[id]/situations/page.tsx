"use client";

import { Suspense } from "react";
import { SituationBoard } from "@/features/trainer/course/situation-board";

export default function Page() {
  return <Suspense><SituationBoard /></Suspense>;
}
