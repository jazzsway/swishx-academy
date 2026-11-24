"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useCourse } from "./use-course";
import { Text } from "@/components/ui/text";
import { STAGES } from "./training-chat-store";

/**
 * The top of each of the four stages, the same everywhere: its name, one short line on what it's for,
 * and the page's own actions on the right. The rail shows which stage; the top bar's button moves on.
 */
export function StageHeader({ n, sub, actions, title }: { n: number; sub: string; actions?: ReactNode; title?: string }) {
  /* A live version is read only: the how-to line is for building, so it goes. */
  const { id } = useParams<{ id: string }>();
  const building = !!useCourse(id)?.editable;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pb-2">
      <div className="flex min-w-0 flex-1 basis-[300px] flex-col gap-1.5">
        <Text as="h1" size="display" weight="extrabold" tracking="tight" className="leading-tight">{title ?? STAGES[n - 1].label}</Text>
        {building && <Text size="body-lg" tone="subtle" className="leading-snug">{sub}</Text>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
