"use client";

import { Suspense } from "react";
import { QuestionBank } from "@/features/trainer/course/questions";
import { RoleplaySetup } from "@/features/trainer/course/roleplay";

export default function Page() {
  return (
    <Suspense>
      <div className="flex flex-col gap-8">
        <QuestionBank />
        <RoleplaySetup />
      </div>
    </Suspense>
  );
}
