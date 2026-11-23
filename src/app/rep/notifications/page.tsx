"use client";

import { Suspense } from "react";
import { RepNotifications } from "@/features/rep/notifications";

export default function Page() {
  return <Suspense><RepNotifications /></Suspense>;
}
