"use client";

import { Suspense } from "react";
import { CoursePeople } from "@/features/trainer/course/people";

export default function Page() {
  return <Suspense><CoursePeople /></Suspense>;
}
