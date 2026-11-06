"use client";

import { Suspense } from "react";
import { NewCampaign } from "@/features/trainer/campaigns";

export default function Page() {
  return <Suspense><NewCampaign /></Suspense>;
}
