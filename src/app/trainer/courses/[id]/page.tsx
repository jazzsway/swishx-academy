"use client";

import { Suspense, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CourseEditor } from "@/features/trainer/course/editor";
import { DirectOverview } from "@/features/trainer/course/direct-overview";
import { useCourse } from "@/features/trainer/course/use-course";
import { useDirectMode } from "@/features/trainer/course/step-rail";

/*
 * A training with the trainer's own material opens on its overview once it's live (or as a preview of
 * a draft). A draft opens on its first stage. A lesson (?module=) still opens in the editor.
 */
function Home() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const module = useSearchParams().get("module");
  const direct = useCourse(id)?.course.origin === "direct";
  const mode = useDirectMode(id);
  const building = direct && !module && mode === "edit";
  useEffect(() => { if (building) router.replace(`/trainer/courses/${id}/roleplay`); }, [building, id, router]);
  if (building) return null;
  return direct && !module ? <DirectOverview /> : <CourseEditor />;
}

export default function Page() {
  return <Suspense><Home /></Suspense>;
}
