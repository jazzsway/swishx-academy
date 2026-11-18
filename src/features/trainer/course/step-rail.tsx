"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Paperclip, PanelRight, PencilLine, X } from "lucide-react";
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
import { MaterialsDialog } from "./details";

/**
 * The top bar of a training built with the trainer's own material: its name and state, then the version
 * history and the actions. Its four stages run down the left; the agent sits on the right.
 */
export function DirectTopBar() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id)!;
  const startNewVersion = useApp((s) => s.startNewVersion);
  const open = useCopilot((s) => s.open);
  const toggle = useCopilot((s) => s.toggle);
  const updateCourse = useApp((s) => s.updateCourse);
  const pathname = usePathname();
  const askFiles = useSearchParams().get("files") === "1";
  const [leaving, setLeaving] = useState(false);
  const [files, setFiles] = useState(false);
  const { course, cur, lv, editable } = data;
  const base = `/trainer/courses/${id}`;
  /* "?files=1" (from the publish checks, or an old link to basic details) opens the files. */
  useEffect(() => { if (askFiles) { setFiles(true); router.replace(pathname, { scroll: false }); } }, [askFiles]); // eslint-disable-line react-hooks/exhaustive-deps
  const nFiles = course.modules.length + (course.roleplaySourceIds?.length ?? 0);
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-hair bg-card px-3 sm:px-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-control border border-tint-line bg-gradient-to-br from-tint to-white"><LogoMark size={17} className="text-brand" /></span>
      <span className="h-5 w-px shrink-0 bg-hair-2" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        {/* The name, edited in place: there's no separate details page. */}
        {editable
          ? <input aria-label="Training name" value={course.title} onChange={(e) => updateCourse(course.id, { title: e.target.value })} title="Rename the training" size={Math.max(12, Math.min(48, course.title.length + 1))}
              className="-mx-1 max-w-[46vw] truncate rounded-glyph bg-transparent px-1 text-body-lg font-extrabold leading-tight text-ink outline-none transition-colors hover:bg-subtle focus:bg-subtle focus:ring-1 focus:ring-brand/40" />
          : <Text as="h1" size="body-lg" weight="extrabold" truncate className="leading-tight">{course.title}</Text>}
        <span className="hidden items-center gap-1.5 truncate text-micro font-semibold text-ink-3 sm:flex">
          v{cur.version} <VersionChip state={cur.state} size="xs" />
          {lv && lv.version !== cur.version && <span>· v{lv.version} live</span>}
          <span>· {product(course.productId)?.brand ?? "Company"} · {courseMinutes(course)} min</span>
          <span className="hidden rounded-glyph bg-info-bg px-1.5 py-px text-info xl:inline">With my material</span>
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => setFiles(true)} title="The training's files: which reps see, and which are information only"
          className="flex h-9 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-2.5 text-caption font-semibold text-ink-2 transition-colors hover:border-hair-3 hover:text-ink">
          <Paperclip className="size-4" aria-hidden="true" />Files<span className="tabular-nums text-ink-4">{nFiles}</span>
        </button>
        <VersionHistoryButton course={course} />
        <button type="button" onClick={toggle} aria-pressed={open} title={open ? "Hide the agent (⌘\\)" : "Show the agent (⌘\\)"} aria-label="Toggle the agent panel"
          className={cn("grid size-9 place-items-center rounded-control border transition-colors", open ? "border-hair-2 bg-black/5 text-ink" : "border-tint-line bg-tint text-brand-deep hover:bg-tint/70")}>
          {open ? <PanelRight className="size-4" /> : <AgentIcon className="size-4" />}
        </button>
        {cur.state === "published" && <Button size="sm" variant="secondary" onClick={() => { startNewVersion(course.id); router.push(`${base}/roleplay`); }}><PencilLine className="size-4" aria-hidden="true" />Edit as v{cur.version + 1}</Button>}
        <NextStage />
        <span className="mx-0.5 h-5 w-px bg-hair-2" aria-hidden="true" />
        <button type="button" onClick={() => (cur.state === "published" ? router.push("/trainer/courses") : setLeaving(true))} aria-label="Close training" title="Close training"
          className="grid size-9 place-items-center rounded-control text-ink-3 transition-colors hover:bg-subtle hover:text-ink"><X className="size-4.5" /></button>
      </div>
      {files && <MaterialsDialog course={course} editable={editable} onClose={() => setFiles(false)} />}
      {leaving && <LeaveDialog course={course} hasLive={!!lv} draftVersion={cur.version} onCancel={() => setLeaving(false)} />}
    </header>
  );
}

/**
 * The top bar's main action: the next stage, so the trainer always knows what's next. The last stage,
 * publish and assign, has its own action at the bottom of its page.
 */
function NextStage() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const base = `/trainer/courses/${id}`;
  const step = stepOf(pathname, base);
  if (step === 4) return null;
  const next = STAGES[step as 1 | 2 | 3];
  return <Button size="sm" onClick={() => router.push(`${base}${next.path}`)}>Next: {next.label.toLowerCase()}<ArrowRight className="size-4" aria-hidden="true" /></Button>;
}

/**
 * Back and next, floating at the bottom middle of the page, the way the SwishX for Biz studios do it:
 * the same next step as the top bar, where the eye ends up after working down the page. Publish and
 * assign has its own bar, with back in it.
 */
export function StageFooter() {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const base = `/trainer/courses/${id}`;
  const step = stepOf(pathname, base);
  if (step === 4 || pathname.startsWith(`${base}/roleplay/test`)) return null;
  const next = STAGES[step as 1 | 2 | 3];
  const prev = step > 1 ? STAGES[step - 2] : null;
  return (
    <div className="pointer-events-none sticky bottom-0 z-20 flex justify-center px-4 pb-5 pt-8">
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-hair bg-card/95 p-1.5 shadow-float backdrop-blur">
        {prev && (
          <>
            <button type="button" onClick={() => router.push(`${base}${prev.path}`)} className="flex h-10 items-center gap-1.5 rounded-full px-4 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden="true" />Back<span className="hidden text-ink-4 sm:inline">· {prev.label}</span>
            </button>
            <span className="h-5 w-px bg-hair-2" aria-hidden="true" />
          </>
        )}
        <button type="button" onClick={() => router.push(`${base}${next.path}`)}
          className="flex h-10 items-center gap-1.5 rounded-full bg-brand px-5 text-body font-semibold text-white shadow-brand-lift transition-colors hover:bg-brand-deep">
          Next: {next.label.toLowerCase()}<ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * The four stages of building the training, down a slim rail on the far left: objectives, the
 * situations that test them, settings, then publishing and assigning. Each shows where it stands; yours is highlighted.
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
    1: `${obs} objective${obs === 1 ? "" : "s"}`,
    2: `${scs.length} situation${scs.length === 1 ? "" : "s"}`,
    3: `Pass ${course.settings.passRoleplay}% · ${course.settings.attempts} tries`,
    4: assigned ? "Assigned" : lv ? "Published" : "Not published yet",
  };
  const done: Record<number, boolean> = { 1: obs > 0, 2: scs.length > 0, 3: settingsSeen && scs.length > 0, 4: assigned };
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
