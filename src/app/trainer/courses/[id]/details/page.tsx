"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/* Basic details is no longer a stage: the name is edited in the top bar and the files in its Files dialog. */
export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/trainer/courses/${id}/roleplay?files=1`); }, [id, router]);
  return null;
}
