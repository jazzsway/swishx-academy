"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/** Roleplay now lives inside the Assessment tab. */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/trainer/courses/${id}/questions#roleplay`); }, [id, router]);
  return null;
}
