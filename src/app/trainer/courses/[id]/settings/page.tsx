"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { CourseSettingsTab } from "@/features/trainer/course/settings";
import { TrainingSettings } from "@/features/trainer/course/training-settings";
import { useCourse } from "@/features/trainer/course/use-course";

/* A training with the trainer's own material has its own, shorter settings: stage 3 of its four. */
function Settings() {
  const { id } = useParams<{ id: string }>();
  return useCourse(id)?.course.origin === "direct" ? <TrainingSettings /> : <CourseSettingsTab />;
}

export default function Page() {
  return <Suspense><Settings /></Suspense>;
}
