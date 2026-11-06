"use client";

import { Suspense } from "react";
import { ManagerTeam } from "@/features/manager/manager";

export default function Page() {
  return <Suspense><ManagerTeam /></Suspense>;
}
