"use client";

import { Suspense } from "react";
import { ManagerHome } from "@/features/manager/manager";

export default function Page() {
  return <Suspense><ManagerHome /></Suspense>;
}
