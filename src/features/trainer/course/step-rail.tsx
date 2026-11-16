"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Eye, FileText, Lock, PanelRight, PencilLine, Plus, ShieldCheck, X } from "lucide-react";
import { AgentIcon, LogoMark } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { product, source } from "@/data/org";
import type { Course } from "@/data/types";
import { courseMinutes } from "@/lib/learning";
import { screeningOf } from "@/lib/scenario-set";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { VersionChip } from "@/components/patterns/academy";
import { useCopilot } from "@/features/copilot/copilot-store";
import { BLOCK_META } from "@/features/shared/block-view";
import { SourcePreview } from "../source-preview";
import { useCourse } from "./use-course";
import { LeaveDialog } from "./course-frame";
import { VersionHistoryButton } from "./version-history";

/** Which of the three steps a page belongs to. */
export function stepOf(pathname: string, base: string): 1 | 2 | 3 {
  if (pathname.startsWith(`${base}/roleplay`)) return 2;
  if (pathname.startsWith(`${base}/assign`) || pathname.startsWith(`${base}/people`) || pathname.startsWith(`${base}/settings`)) return 3;
  return 1;
}

/**
 * The top bar of a training built with the trainer's own material: its name and state, the version
 * history, and the actions. The three steps live down the left, so there are no tabs up here.
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
          <span className="rounded-glyph bg-info-bg px-1.5 py-px text-info">With my material</span>
        </span>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <VersionHistoryButton course={course} />
        <button type="button" onClick={toggle} aria-pressed={open} title={open ? "Hide the agent (⌘\\)" : "Show the agent (⌘\\)"} aria-label="Toggle the agent panel"
          className={cn("grid size-9 place-items-center rounded-control border transition-colors", open ? "border-hair-2 bg-black/5 text-ink" : "border-tint-line bg-tint text-brand-deep hover:bg-tint/70")}>
          {open ? <PanelRight className="size-4" /> : <AgentIcon className="size-4" />}
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
 * The trainer's three steps, down the left: details and materials (with the lessons and the demo-call
 * documents, to preview), the scenarios, and assigning. Each step shows where it stands.
 */
export function StepRail({ course }: { course: Course }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const base = `/trainer/courses/${course.id}`;
  const custom = useApp((s) => s.scenarios);
  const assigned = useApp((s) => s.progress.filter((p) => p.courseId === course.id).length);
  const lv = useCourse(course.id)?.lv;
  const [preview, setPreview] = useState<string | null>(null);
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  const step = stepOf(pathname, base);
  const moduleId = pathname === base ? search.get("module") ?? course.modules[0]?.id : undefined;
  const demo = (course.roleplaySourceIds ?? []).map((x) => source(x)).filter((x): x is NonNullable<typeof x> => !!x);
  const screen = screeningOf(course, scs);
  const st = course.settings;

  const Step = ({ n, href, label, sub, done, children }: { n: 1 | 2 | 3; href: string; label: string; sub: string; done: boolean; children?: ReactNode }) => {
    const on = step === n;
    return (
      <li className="relative flex flex-col">
        {n < 3 && <span className={cn("absolute bottom-0 left-[21px] top-10 w-px", done ? "bg-brand/40" : "bg-hair-2")} aria-hidden="true" />}
        <Link href={href} aria-current={on ? "step" : undefined} className={cn("squircle relative flex items-start gap-3 rounded-panel px-2.5 py-2.5 transition-colors", on ? "bg-tint" : "hover:bg-subtle")}>
          <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-micro font-bold", on ? "bg-brand text-white" : done ? "bg-ok text-white" : "border border-hair-3 bg-card text-ink-3")}>
            {done && !on ? <Check className="size-3.5" aria-hidden="true" /> : n}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={cn("text-body font-bold leading-snug", on ? "text-ink" : "text-ink-2")}>{label}</span>
            <span className="truncate text-caption text-ink-3">{sub}</span>
          </span>
        </Link>
        {children && <div className="relative flex flex-col gap-0.5 pb-2 pl-9 pr-1 pt-1">{children}</div>}
      </li>
    );
  };
  const Group = ({ label }: { label: string }) => <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="block px-2 pb-0.5 pt-2">{label}</Text>;

  return (
    <nav aria-label="Build your training" className="hidden w-[272px] shrink-0 flex-col overflow-y-auto border-r border-hair bg-canvas px-2.5 pb-4 pt-3 [scrollbar-width:thin] md:flex">
      <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="block px-2.5 pb-2">Build your training</Text>
      <ol className="flex flex-col gap-1">
        <Step n={1} href={`${base}/details`} label="Details & materials" done={course.modules.length > 0}
          sub={`${course.modules.length} lesson${course.modules.length === 1 ? "" : "s"} · ${demo.length} for the demo call`}>
          <Group label="Lessons" />
          {course.modules.map((m, i) => {
            const on = m.id === moduleId;
            const b = m.blocks.find((x) => x.type !== "check");
            const Icon = b ? BLOCK_META[b.type].icon : FileText;
            return (
              <Link key={m.id} href={`${base}?module=${m.id}`} aria-current={on ? "page" : undefined}
                className={cn("flex items-center gap-2 rounded-control px-2 py-1.5 transition-colors", on ? "bg-card shadow-hair" : "hover:bg-subtle")}>
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-glyph text-[10px] font-bold", on ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>{i + 1}</span>
                <span className={cn("min-w-0 flex-1 truncate text-caption font-semibold", on ? "text-ink" : "text-ink-2")}>{m.title}</span>
                <Icon className="size-3.5 shrink-0 text-ink-4" aria-hidden="true" />
              </Link>
            );
          })}
          {demo.length > 0 && <Group label="Demo call · AI only" />}
          {demo.map((d) => (
            <button key={d.id} type="button" onClick={() => setPreview(d.id)} title="Preview"
              className="flex items-center gap-2 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-subtle">
              <Lock className="size-3.5 shrink-0 text-info" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-caption font-semibold text-ink-2">{d.title}</span>
              <Eye className="size-3.5 shrink-0 text-ink-4" aria-hidden="true" />
            </button>
          ))}
          <Link href={`${base}/details`} className="flex items-center gap-2 rounded-control px-2 py-1.5 text-caption font-semibold text-brand-deep transition-colors hover:bg-tint">
            <Plus className="size-3.5" aria-hidden="true" />Add material
          </Link>
        </Step>
        <Step n={2} href={`${base}/roleplay`} label="Scenarios" done={scs.length > 0}
          sub={scs.length ? `${scs.length} scenario${scs.length === 1 ? "" : "s"} in one call` : "None yet"}>
          {st.screening && scs.length > 0 && (
            <Link href={`${base}/roleplay#screening`} className="flex items-center gap-2 rounded-control px-2 py-1.5 transition-colors hover:bg-subtle">
              <ShieldCheck className="size-3.5 shrink-0 text-info" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-caption font-semibold text-ink-2">Screening · {screen.length} of {scs.length}</span>
            </Link>
          )}
        </Step>
        <Step n={3} href={`${base}/assign`} label="Assign to people" done={assigned > 0}
          sub={assigned ? `${assigned} assigned · pass ${st.passRoleplay}%` : lv ? `Pass ${st.passRoleplay}% · ${st.attempts} tries a scenario` : "Publish, then assign"} />
      </ol>
      {preview && source(preview) && <SourcePreview s={source(preview)!} onClose={() => setPreview(null)} />}
    </nav>
  );
}
