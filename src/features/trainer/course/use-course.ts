"use client";

import { useApp, current, live } from "@/store/app-store";

export function useCourse(id: string) {
  const course = useApp((s) => s.courses.find((c) => c.id === id));
  if (!course) return null;
  const cur = current(course);
  const lv = live(course);
  /* v1: no MLR, so anything not yet published is a draft you can edit. */
  const editable = ["draft", "changes", "ready", "in_review", "approved"].includes(cur.state);
  return { course, cur, lv, editable };
}
