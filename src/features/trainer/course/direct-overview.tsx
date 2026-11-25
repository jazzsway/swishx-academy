"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Award, BookOpen, ChevronDown, Eye, EyeOff, FileText, GitBranch, Layers, Mic, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { source, TODAY } from "@/data/org";
import type { Course, Scenario, Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Card, VersionChip } from "@/components/patterns/academy";
import { FORMAT_ICON, SourcePreview } from "../source-preview";
import { directKind } from "../materials";
import { People } from "./scenarios";
import { useCourse } from "./use-course";
import { ObjectiveFlow } from "./roleplay";
import { objectiveBank, screeningMinutes, screeningSet } from "@/lib/objective-call";

const day = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const iconOf = (s: Source) => FORMAT_ICON[s.uploaded?.format ?? (s.type === "Visual aid" ? "slides" : "pdf")];
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

/**
 * The view of a training built with the trainer's own material: what it is, the journey reps take
 * through it, what it tests, the files behind it and how the people on it are doing. Where a training
 * opens from the list; the four building stages are one click away on the left.
 */
export function DirectOverview() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  const custom = useApp((s) => s.scenarios);
  const progress = useApp((s) => s.progress);
  const [preview, setPreview] = useState<Source | null>(null);
  const [flowOb, setFlowOb] = useState<string | null>(null);
  const scs = useMemo(() => allScenarios().filter((x) => data?.course.scenarioIds.includes(x.id)), [data?.course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  const { course, cur, lv } = data;
  const base = `/trainer/courses/${course.id}`;
  const st = course.settings;
  const published = cur.state === "published";
  const obs = course.objectives ?? [];
  const lessons = course.modules;
  const lessonMin = lessons.reduce((a, m) => a + m.minutes, 0);
  const context = (course.roleplaySourceIds ?? []).map(source).filter((s): s is Source => !!s);
  const mine = progress.filter((p) => p.courseId === course.id);
  const certified = mine.filter((p) => p.state === "certified").length;
  const started = mine.filter((p) => p.state !== "not_started" && p.state !== "certified").length;
  const overdue = mine.filter((p) => p.state !== "certified" && p.dueAt && new Date(p.dueAt) < TODAY).length;

  /* The journey, as reps see it: screening, mandatory materials, the assessments, optional materials, the certificate. No material, no step. */
  const optional = !!st.materialOptional;
  const materials = { key: "materials", icon: BookOpen, label: "Materials", on: true, main: `${plural(lessons.length, "file")} · ${optional ? "optional" : "mandatory"}`, sub: `${lessonMin} min` };
  const journey = [
    { key: "screen", icon: ShieldCheck, label: "Screening call", on: st.screening, main: st.screening ? `About ${screeningMinutes(obs.length)} min` : "Off", sub: st.screening ? "A question per objective · sets the baseline" : "" },
    ...(lessons.length && !optional ? [materials] : []),
    { key: "calls", icon: Mic, label: "Assessments", on: obs.length > 0, main: `${plural(obs.length, "objective")} · one call each`, sub: `Pass ${st.passRoleplay}% · ${st.attempts === 1 ? "1 try" : `${st.attempts} tries`}` },
    ...(lessons.length && optional ? [materials] : []),
    { key: "cert", icon: Award, label: "Certified", on: true, main: `Recertify every ${st.recertMonths} months`, sub: "" },
  ];

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* A draft, seen the way it will look once it's live. */}
      {!published && (
        <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-tint-line bg-tint px-4 py-3">
          <Eye className="size-4 shrink-0 text-brand-deep" aria-hidden="true" />
          <Text size="body" className="min-w-0 flex-1">Preview of the v{cur.version} draft. {lv ? `Reps still get v${lv.version} until you publish.` : "Nobody sees it until you publish."}</Text>
          <Link href={`${base}/roleplay`} className="text-caption font-semibold text-brand-deep hover:underline">Back to editing</Link>
        </div>
      )}
      {/* What it is. */}
      <header className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-2">
          <Text as="h1" size="display" weight="extrabold" tracking="tight" className="leading-tight">{course.title}</Text>
          {(course.brief || course.objective) && <Text size="body-lg" tone="subtle" className="line-clamp-2 max-w-[72ch] leading-snug">{course.brief || course.objective}</Text>}
        </div>
        {(obs.length > 0 || scs.length > 0) && <TestMenu course={course} scs={scs} />}
      </header>

      {/* How the people on it are doing. */}
      {mine.length > 0 && (
        <Link href={`${base}/people`} className="squircle group grid grid-cols-2 gap-px overflow-hidden rounded-card border border-hair bg-hair sm:grid-cols-4">
          {[
            { label: "Assigned", value: mine.length, sub: "reps" },
            { label: "In progress", value: started, sub: `${mine.length - started - certified} not started` },
            { label: "Certified", value: certified, sub: `${Math.round((certified / mine.length) * 100)}% of assigned`, tone: "text-ok" },
            { label: "Overdue", value: overdue, sub: overdue ? "past the due date" : "nobody late", tone: overdue ? "text-danger" : undefined },
          ].map((x) => (
            <div key={x.label} className="flex flex-col gap-0.5 bg-card px-4 py-3.5 transition-colors group-hover:bg-canvas">
              <span className="text-caption font-semibold text-ink-3">{x.label}</span>
              <span className={cn("text-title font-extrabold tabular-nums text-ink", x.tone)}>{x.value}</span>
              <span className="text-micro text-ink-3">{x.sub}</span>
            </div>
          ))}
        </Link>
      )}

      {/* The rep's journey. */}
      <Card title="What reps go through" eyebrow="Rep journey"
        actions={<Link href={`${base}/settings`} className="text-caption font-semibold text-brand-deep hover:underline">Settings</Link>}>
        <ol className={cn("-mt-1 grid gap-3 sm:grid-cols-2", journey.length === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4")}>
          {journey.map((j, i) => (
            <li key={j.key} className={cn("squircle relative flex flex-col gap-2 rounded-panel border p-3.5", j.on ? "border-hair bg-card" : "border-dashed border-hair-2 bg-subtle/60")}>
              <span className="flex items-center gap-2">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", j.on ? "bg-tint text-brand-deep" : "bg-black/[0.05] text-ink-4")}><j.icon className="size-3.5" aria-hidden="true" /></span>
                <span className="text-micro font-bold uppercase tracking-wider text-ink-4">Step {i + 1}</span>
              </span>
              <span className={cn("text-body-lg font-bold leading-snug", j.on ? "text-ink" : "text-ink-3")}>{j.label}</span>
              <span className={cn("text-body font-semibold", j.on ? "text-ink-2" : "text-ink-3")}>{j.main}</span>
              {j.sub && <span className="text-caption text-ink-3">{j.sub}</span>}
            </li>
          ))}
        </ol>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* What it tests. */}
        <Card title="Objectives" eyebrow={`${plural(obs.length, "objective")} · ${plural(scs.length, "situation")}`}
          actions={<Link href={`${base}/situations`} className="text-caption font-semibold text-brand-deep hover:underline">Open situations</Link>}>
          {!obs.length ? (
            <Text tone="subtle">No objectives yet. <Link href={`${base}/roleplay`} className="font-semibold text-brand-deep hover:underline">Add the first one</Link>.</Text>
          ) : (
            <ol className="-mt-1 flex flex-col divide-y divide-hair">
              {obs.map((ob, i) => {
                const its = scs.filter((x) => x.objectiveId === ob.id);
                const bank = objectiveBank(course, ob, scs);
                return (
                  <li key={ob.id} className="flex flex-col py-3 first:pt-1 last:pb-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-glyph bg-brand text-micro font-extrabold tabular-nums text-white">{String(i + 1).padStart(2, "0")}</span>
                      <Link href={`${base}/situations?obj=${ob.id}`} className="min-w-0 flex-1 text-body-lg font-bold leading-snug text-ink hover:text-brand-deep">{ob.title}</Link>
                      <span className="shrink-0 text-caption text-ink-3"><People people={ob.people} icons /></span>
                      <span className={cn("w-[92px] shrink-0 text-right text-caption font-semibold tabular-nums text-ink-3")}>{its.length ? plural(its.length, "situation") : "Its own call"}</span>
                      <button type="button" onClick={() => setFlowOb(flowOb === ob.id ? null : ob.id)} aria-expanded={flowOb === ob.id}
                        className={cn("inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-hair-2 bg-card px-3 text-caption font-bold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep", flowOb === ob.id && "border-brand text-brand-deep")}>
                        <GitBranch className="size-3.5" aria-hidden="true" />Call flow<ChevronDown className={cn("size-3.5 transition-transform", flowOb === ob.id && "rotate-180")} aria-hidden="true" />
                      </button>
                      <Link href={`/trainer/courses/${course.id}/roleplay/test?run=objective&obj=${ob.id}&back=${encodeURIComponent(base)}`} className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-brand px-3 text-caption font-bold text-white shadow-brand-lift transition-colors hover:bg-brand-deep">
                        <Mic className="size-3.5" aria-hidden="true" />Call
                      </Link>
                    </div>
                    {flowOb === ob.id && (
                      <div className="mt-3 overflow-hidden rounded-panel border border-hair bg-canvas/40">
                        <ObjectiveFlow scs={bank} passMark={st.passRoleplay} />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        {/* The files behind it. */}
        <Card title="Your material" eyebrow={plural(lessons.length + context.length, "file")}
          actions={<Link href={`${base}/material`} className="text-caption font-semibold text-brand-deep hover:underline">All files</Link>}>
          <div className="-mt-1 flex flex-col gap-2">
            <Text size="micro" weight="bold" uppercase tracking="wider" tone="subtle">Reps see</Text>
            {lessons.length ? (
              <ul className="flex flex-col gap-1.5">
                {lessons.map((m) => {
                  const b = m.blocks[0];
                  /* An upload this tab hasn't registered still has its file details on the block. */
                  const src = source(b?.file?.sourceId ?? b?.visualaid?.sourceId ?? b?.document?.sourceId ?? "")
                    ?? (b?.file ? { id: b.file.sourceId, title: m.title, type: "Uploaded file", pages: b.file.pages ?? 0, uploaded: { fileName: b.file.fileName, format: b.file.format, at: course.updatedAt } } as Source : undefined);
                  const Icon = src ? iconOf(src) : FileText;
                  return (
                    <li key={m.id}>
                      <button type="button" onClick={() => src && setPreview(src)} disabled={!src}
                        className="squircle flex w-full items-center gap-2.5 rounded-panel border border-hair bg-card p-2.5 text-left transition-colors hover:bg-subtle disabled:cursor-default disabled:hover:bg-card">
                        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><Icon className="size-4" aria-hidden="true" /></span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body font-semibold text-ink">{m.title}</span>
                          <span className="text-caption text-ink-3">{src ? directKind(src) : "File"} · {m.minutes} min{m.required ? " · for everyone" : ""}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : <Text size="body" tone="subtle">None</Text>}
          </div>
          {context.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-hair pt-4">
              <Text size="micro" weight="bold" uppercase tracking="wider" tone="subtle" className="flex items-center gap-1.5"><EyeOff className="size-3" aria-hidden="true" />Context only · builds the calls</Text>
              <ul className="flex flex-col gap-1.5">
                {context.map((s) => {
                  const Icon = iconOf(s);
                  return (
                    <li key={s.id}>
                      <button type="button" onClick={() => setPreview(s)} className="squircle flex w-full items-center gap-2.5 rounded-panel border border-dashed border-hair-2 p-2.5 text-left transition-colors hover:bg-subtle">
                        <span className="grid size-9 shrink-0 place-items-center rounded-control bg-subtle text-ink-3"><Icon className="size-4" aria-hidden="true" /></span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-body font-semibold text-ink-2">{s.title}</span>
                          <span className="text-caption text-ink-3">{directKind(s)}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>
      {/* Every version, newest first: what's live, what's being worked on, what came before. */}
      <Card title="Versions" eyebrow={plural(course.versions.length, "version")}>
        <ol className="-mt-1 flex flex-col divide-y divide-hair">
          {[...course.versions].reverse().map((v) => {
            const on = progress.filter((p) => p.courseId === course.id && p.version === v.version);
            return (
              <li key={v.version} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 first:pt-1 last:pb-0">
                <span className="w-9 shrink-0 text-body font-bold tabular-nums text-ink">v{v.version}</span>
                <VersionChip state={v.state} size="xs" />
                <span className="min-w-0 flex-1 text-body text-ink-2">
                  {v.state === "published" ? `Live since ${day(v.publishedAt!)}` : v.publishedAt ? `Live from ${day(v.publishedAt)}` : "Not published yet"}
                </span>
                {on.length > 0 && <span className="text-caption font-semibold tabular-nums text-ink-3">{plural(on.length, "rep")} · {on.filter((p) => p.state === "certified").length} certified</span>}
              </li>
            );
          })}
        </ol>
      </Card>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/**
 * Test the training the way a rep takes it, without saving anything: the screening call, one objective's
 * situations, or every situation back to back. A menu, since "the call" is really several.
 */
function TestMenu({ course, scs }: { course: Course; scs: Scenario[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const base = `/trainer/courses/${course.id}`;
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  const test = `/trainer/courses/${course.id}/roleplay/test`;
  /* Screening-only situations set the baseline; they're not part of an objective's test. */
  const scored = scs.filter((x) => !x.use.includes("screening") || x.use.includes("assessment"));
  const obs = (course.objectives ?? []).map((ob, i) => ({ ob, i, n: scored.filter((x) => x.objectiveId === ob.id).length }));
  const screen = course.settings.screening ? screeningSet(course, scs) : [];
  const go = (href: string) => { setOpen(false); router.push(`${href}&back=${encodeURIComponent(base)}`); };
  const row = "flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-subtle";
  const badge = "grid size-8 shrink-0 place-items-center rounded-full";
  return (
    <div ref={box} className="relative shrink-0">
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}
        className={cn("squircle flex h-11 items-center gap-2.5 rounded-button border pl-1.5 pr-3.5 text-body-lg font-semibold transition-colors", open ? "border-brand bg-tint text-brand-deep" : "border-tint-line bg-card text-ink hover:border-brand hover:bg-tint/50")}>
        <span className="grid size-8 place-items-center rounded-full bg-brand text-white shadow-brand-lift"><Mic className="size-4" aria-hidden="true" /></span>
        Test a call
        <ChevronDown className={cn("size-4 text-ink-3 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="select-pop absolute right-0 top-full z-30 mt-2 flex w-[340px] flex-col overflow-hidden rounded-panel border border-hair bg-card shadow-modal">
          <div className="flex items-center justify-between border-b border-hair px-4 py-2.5">
            <span className="text-caption font-bold text-ink-2">Take it as a rep would</span>
            <span className="text-micro font-semibold text-ink-4">Nothing is saved</span>
          </div>
          <div className="flex max-h-[420px] flex-col gap-0.5 overflow-y-auto p-1.5">
            {screen.length > 0 && (
              <button type="button" role="menuitem" onClick={() => go(`${test}?run=screening`)} className={row}>
                <span className={cn(badge, "bg-info-bg text-info")}><ShieldCheck className="size-4" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-1 flex-col"><span className="text-body font-semibold text-ink">Screening call</span><span className="text-caption text-ink-3">About {screeningMinutes(screen.length)} min · sets the baseline</span></span>
              </button>
            )}
            {obs.length > 0 && <span className="px-2.5 pb-1 pt-2 text-micro font-bold uppercase tracking-wider text-ink-4">One objective</span>}
            {obs.map(({ ob, i, n }) => (
              <button key={ob.id} type="button" role="menuitem" onClick={() => go(`${test}?run=objective&obj=${ob.id}`)} className={row}>
                <span className={cn(badge, "bg-tint text-micro font-extrabold tabular-nums text-brand-deep")}>{String(i + 1).padStart(2, "0")}</span>
                <span className="flex min-w-0 flex-1 flex-col"><span className="truncate text-body font-semibold text-ink">{ob.title}</span><span className="text-caption text-ink-3">{n > 1 ? `One of ${n} situations, drawn` : n ? "1 situation" : "A call on the objective itself"}</span></span>
              </button>
            ))}
            <div className="mx-2.5 my-1 h-px bg-hair" aria-hidden="true" />
            <button type="button" role="menuitem" onClick={() => go(`${test}?run=assessment`)} className={row}>
              <span className={cn(badge, "bg-subtle text-ink-2")}><Layers className="size-4" aria-hidden="true" /></span>
              <span className="flex min-w-0 flex-1 flex-col"><span className="text-body font-semibold text-ink">Every objective</span><span className="text-caption text-ink-3">{plural(obs.length, "call")}, back to back</span></span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
