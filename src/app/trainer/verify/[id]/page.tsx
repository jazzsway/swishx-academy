"use client";

import { useParams } from "next/navigation";
import { VerifyReview } from "@/features/shared/verify";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <VerifyReview progressId={id} viewer="trainer" />;
}
