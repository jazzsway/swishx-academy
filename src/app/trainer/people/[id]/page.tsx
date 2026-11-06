"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { RepDetail } from "@/features/shared/rep-detail";

function Inner() {
  const { id } = useParams<{ id: string }>();
  return <RepDetail userId={id} viewer="trainer" />;
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
