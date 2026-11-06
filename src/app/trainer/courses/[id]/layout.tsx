import type { ReactNode } from "react";
import { CourseFrame } from "@/features/trainer/course/course-frame";

export default function Layout({ children }: { children: ReactNode }) {
  return <CourseFrame>{children}</CourseFrame>;
}
