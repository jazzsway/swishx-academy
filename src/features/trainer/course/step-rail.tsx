"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, PanelRight, PencilLine, Rocket, X } from "lucide-react";
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
import { STAGES, stepOf, useTrainingChat } from "./training-chat-store";
import { PublishDialog } from "./publish-dialog";

/**
 * The top bar of a training built with the trainer's own material: its name and state, then the version
 * history and the actions. Its three steps run down the left; the agent sits on the right.
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
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <VersionHistoryButton course={course} />
        <button type="button" onClick={toggle} aria-pressed={open} title={open ? "Hide the agent (⌘\\)" : "Show the agent (⌘\\)"} aria-label="Toggle the agent panel"
          className={cn("grid size-9 place-items-center rounded-control border transition-colors", open ? "border-hair-2 bg-black/5 text-ink" : "border-tint-line bg-tint text-brand-deep hover:bg-tint/70")}>
          {open ? <PanelRight className="size-4" /> : <AgentIcon className="size-4" />}
        </button>
        {cur.state === "published" && <Button size="sm" variant="secondary" onClick={() => { startNewVersion(course.id); router.push(`${base}/details`); }}><PencilLine className="size-4" aria-hidden="true" />Edit as v{cur.version + 1}</Button>}
        <NextStage />
        <span className="mx-0.5 h-5 w-px bg-hair-2" aria-hidden="true" />
        <button type="button" onClick={() => (cur.state === "published" ? router.push("/trainer/courses") : setLeaving(true))} aria-label="Close training" title="Close training"
          className="grid size-9 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-ink"><X className="size-4.5" /></button>
      </div>
      {course.origin === "direct" && <PublishDialog course={course} />}
      {leaving && <LeaveDialog course={course} hasLive={!!lv} draftVersion={cur.version} onCancel={() => setLeaving(false)} />}
    </header>
  );
}

/**
 * The top bar's main action: the next stage, so the trainer always knows what's next. Assigning needs a
 * published version, so while it's a draft the last step is publishing, in an overlay, not a page.
 */
function NextStage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const data = useCourse(id)!;
  const setPublishOpen = useTrainingChat((s) => s.setPublishOpen);
  const { cur } = data;
  const base = `/trainer/courses/${id}`;
  const step = stepOf(pathname, base);
  const draft = cur.state !== "published";
  if (step < 3) {
    const next = STAGES[step as 1 | 2];
    return <Button size="sm" onClick={() => router.push(`${base}${next.path}`)}>Next: {next.label.toLowerCase()}<ArrowRight className="size-4" aria-hidden="true" /></Button>;
  }
  if (step === 3 && !draft) return <Button size="sm" onClick={() => router.push(`${base}/assign`)}>Next: assign<ArrowRight className="size-4" aria-hidden="true" /></Button>;
  if (!draft) return null;
  return (
    <Button size="sm" onClick={() => setPublishOpen(true)}>
      <Rocket className="size-4" aria-hidden="true" />{step === 3 ? "Next: publish & assign" : `Publish v${cur.version}`}
    </Button>
  );
}

/**
 * The four stages of building the training, down a slim rail on the far left: basic details, objectives
 * and situations, settings, then saving and assigning. Each shows where it stands; yours is highlighted.
 */
export function StepperRail({ course }: { course: Course }) {
  const pathname = usePathname();
  const base = `/trainer/courses/${course.id}`;
  const custom = useApp((s) => s.scenarios);
  const assigned = useApp((s) => s.progress.some((p) => p.courseId === course.id));
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = stepOf(pathname, base);
  const obs = course.objectives?.length ?? 0;
  const lv = useCourse(course.id)?.lv;
  /* Settings have defaults from the start, so they count as done once the trainer has been there. */
  const settingsSeen = useTrainingChat((s) => !!s.threads[course.id]?.some((t) => t.id === `stage-${course.id}-3`)) || step > 3;
  const sub: Record<number, string> = {
    1: `${course.modules.length} lesson${course.modules.length === 1 ? "" : "s"}`,
    2: `${obs} objective${obs === 1 ? "" : "s"} · ${scs.length} situation${scs.length === 1 ? "" : "s"}`,
    3: `Pass ${course.settings.passRoleplay}% · ${course.settings.attempts} tries`,
    4: assigned ? "Assigned" : lv ? "Published" : "Not published yet",
  };
  const done: Record<number, boolean> = { 1: course.modules.length > 0, 2: scs.length > 0, 3: settingsSeen && scs.length > 0, 4: assigned };
  const steps = STAGES.map((st) => ({ n: st.n, href: `${base}${st.path}`, label: st.label, short: st.short, sub: sub[st.n], done: done[st.n] }));
  return (
    <nav aria-label="Build your training" className="hidden w-[84px] shrink-0 flex-col border-r border-hair bg-canvas px-1.5 py-4 md:flex xl:w-[208px] xl:px-3">
      <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="hidden px-2 pb-3 xl:block">Build your training</Text>
      <ol className="flex flex-col">
        {steps.map((st, i) => {
          const on = step === st.n;
          const last = i === steps.length - 1;
          return (
            <li key={st.n} className="relative">
              {!last && <span className={cn("absolute bottom-0 left-1/2 top-[60px] w-px xl:left-[21px] xl:top-9", st.done ? "bg-ok/50" : "bg-hair-2")} aria-hidden="true" />}
              <Link href={st.href} aria-current={on ? "step" : undefined} title={`${st.label} · ${st.sub}`}
                className={cn("squircle relative flex flex-col items-center gap-1 rounded-panel px-1 pb-5 pt-2 transition-colors xl:flex-row xl:items-start xl:gap-3 xl:px-2", on ? "bg-tint" : "hover:bg-subtle", last && "pb-2")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-caption font-bold", on ? "bg-brand text-white shadow-brand-lift" : st.done ? "bg-ok text-white" : "border border-hair-3 bg-card text-ink-3")}>
                  {st.done && !on ? <Check className="size-3.5" aria-hidden="true" /> : st.n}
                </span>
                <span className={cn("text-center text-micro font-semibold leading-tight xl:hidden", on ? "text-ink" : "text-ink-3")}>{st.short}</span>
                <span className="hidden min-w-0 flex-col pt-0.5 xl:flex">
                  <span className={cn("text-body font-semibold leading-snug", on ? "text-ink" : "text-ink-2")}>{st.label}</span>
                  <span className="text-caption text-ink-3">{st.sub}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
