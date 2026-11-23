"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// v1-hidden: the materials browser (playlists, short videos, reading room). import { LibraryHome } from "@/features/library/rep-library";

/** The Library lives on the Trainings tab now, under what's assigned. Old links land there. */
export default function Page() {
  const router = useRouter();
  useEffect(() => { router.replace("/rep/learn#library"); }, [router]);
  return null;
}
