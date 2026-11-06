"use client";

import { Suspense } from "react";
import { RoleplaySetup } from "@/features/trainer/course/roleplay";

export default function Page() {
  return <Suspense><RoleplaySetup /></Suspense>;
}
