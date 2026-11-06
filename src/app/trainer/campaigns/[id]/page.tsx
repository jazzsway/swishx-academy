"use client";

import { Suspense } from "react";
import { CampaignDetail } from "@/features/trainer/campaigns";

export default function Page() {
  return <Suspense><CampaignDetail /></Suspense>;
}
