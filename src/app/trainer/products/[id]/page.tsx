"use client";

import { Suspense } from "react";
import { ProductDetail } from "@/features/trainer/product-detail";

export default function Page() {
  return <Suspense><ProductDetail /></Suspense>;
}
