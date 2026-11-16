"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Check, Eye, PanelLeft, PencilLine, X } from "lucide-react";
import { AgentIcon, LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { product } from "@/data/org";
import type { Course } from "@/data/types";
import { courseMinutes } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { VersionChip } from "@/components/patterns/academy";
import { useCopilot } from "@/features/copilot/copilot-store";
import { useCourse } from "./use-course";
import { LeaveDialog } from "./course-frame";
import { VersionHistoryButton } from "./version-history";
import { stepOf } from "./training-chat-store";

/**
 * The top bar of a training built with the trainer's own material: its name and state, its three steps
 * in the middle, then the version history and the actions. The agent sits on the left, below it.
 */
export function DirectTopBar() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id)!;
  const startNewVersion = useApp((s) => s.startNewVersion);
  const open = useCopilot((s) => s.open);
  const toggle = useCopilot((s) => s.toggle);
  const [leaving, setLeaving] = useState(false);
  const { course, cur, lv } = data;
  const base = `/trainer/courses/${id}`;
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-card px-3 sm:px-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-control border border-tint-line bg-gradient-to-br from-tint to-white"><LogoMark size={17} className="text-brand" /></span>
      <span className="h-5 w-px shrink-0 bg-hair-2" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <Text as="h1" size="body-lg" weight="extrabold" truncate className="leading-tight">{course.title}</Text>
        <span className="hidden items-center gap-1.5 truncate text-micro font-semibold text-ink-3 sm:flex">
          v{cur.version} <VersionChip state={cur.state} size="xs" />
          {lv && lv.version !== cur.version && <span>· v{lv.version} live</span>}
          <span>· {product(course.productId)?.brand ?? "Company"} · {courseMinutes(course)} min</span>
          <span className="hidden rounded-glyph bg-info-bg px-1.5 py-px text-info xl:inline">With my material</span>
        </span>
      </div>
      <Stepper course={course} />
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <VersionHistoryButton course={course} />
        <button type="button" onClick={toggle} aria-pressed={open} title={open ? "Hide the agent (⌘\\)" : "Show the agent (⌘\\)"} aria-label="Toggle the agent panel"
          className={cn("grid size-9 place-items-center rounded-control border transition-colors", open ? "border-hair-2 bg-black/5 text-ink" : "border-tint-line bg-tint text-brand-deep hover:bg-tint/70")}>
          {open ? <PanelLeft className="size-4" /> : <AgentIcon className="size-4" />}
        </button>
        {cur.state === "published"
          ? <Button size="sm" variant="secondary" onClick={() => { startNewVersion(course.id); router.push(`${base}/details`); }}><PencilLine className="size-4" aria-hidden="true" />Edit as v{cur.version + 1}</Button>
          : <Button size="sm" variant="secondary" onClick={() => router.push(`${base}/preview`)}><Eye className="size-4" aria-hidden="true" />Preview as rep</Button>}
        <Button size="sm" onClick={() => router.push(cur.state === "published" ? `${base}/assign` : `${base}/review`)}>{cur.state === "published" ? "Assign" : "Publish"}</Button>
        <span className="mx-0.5 h-5 w-px bg-hair-2" aria-hidden="true" />
        <button type="button" onClick={() => (cur.state === "published" ? router.push("/trainer/courses") : setLeaving(true))} aria-label="Close training" title="Close training"
          className="grid size-9 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-ink"><X className="size-4.5" /></button>
      </div>
      {leaving && <LeaveDialog course={course} hasLive={!!lv} draftVersion={cur.version} onCancel={() => setLeaving(false)} />}
    </header>
  );
}

/**
 * The trainer's three steps, in the top bar: details and materials, the scenarios, and assigning.
 * Each shows a check once it's done; the one you're on is underlined.
 */
function Stepper({ course }: { course: Course }) {
  const pathname = usePathname();
  const base = `/trainer/courses/${course.id}`;
  const custom = useApp((s) => s.scenarios);
  const assigned = useApp((s) => s.progress.some((p) => p.courseId === course.id));
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = stepOf(pathname, base);
  const steps = [
    { n: 1, href: `${base}/details`, label: "Details & materials", sub: `${course.modules.length} lesson${course.modules.length === 1 ? "" : "s"}`, done: course.modules.length > 0 },
    { n: 2, href: `${base}/roleplay`, label: "Scenarios", sub: `${scs.length} in one call`, done: scs.length > 0 },
    { n: 3, href: `${base}/assign`, label: "Assign to people", sub: assigned ? "Assigned" : "After publishing", done: assigned },
  ] as const;
  return (
    <nav aria-label="Build your training" className="mx-auto hidden h-full items-stretch lg:flex">
      {steps.map((st, i) => {
        const on = step === st.n;
        return (
          <span key={st.n} className="flex items-center">
            {i > 0 && <span className={cn("h-px w-3 xl:w-5", steps[i - 1].done ? "bg-brand/40" : "bg-hair-2")} aria-hidden="true" />}
            <Link href={st.href} aria-current={on ? "step" : undefined} className="relative flex h-full items-center gap-2 whitespace-nowrap px-2">
              <span className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold", on ? "bg-brand text-white" : st.done ? "bg-ok text-white" : "border border-hair-3 text-ink-3")}>
                {st.done && !on ? <Check className="size-3" aria-hidden="true" /> : st.n}
              </span>
              <span className="flex flex-col leading-tight">
                <span className={cn("text-body font-semibold", on ? "text-ink" : "text-ink-3 hover:text-ink")}>{st.label}</span>
                <span className="hidden text-micro text-ink-4 2xl:block">{st.sub}</span>
              </span>
              {on && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" aria-hidden="true" />}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
