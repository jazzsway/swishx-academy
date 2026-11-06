"use client";

import { Suspense } from "react";
import { CampaignList } from "@/features/trainer/campaigns";

export default function Page() {
  return <Suspense><CampaignList /></Suspense>;
}
