"use client";

import { useApp, current, live } from "@/store/app-store";

export function useCourse(id: string) {
  const course = useApp((s) => s.courses.find((c) => c.id === id));
  if (!course) return null;
  const cur = current(course);
  const lv = live(course);
  const editable = cur.state === "draft" || cur.state === "changes" || cur.state === "ready";
  return { course, cur, lv, editable };
}
