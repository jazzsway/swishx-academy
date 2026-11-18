"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { source } from "@/data/org";
import type { Block, Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { IconButton } from "@/components/ui/button";
import { directModules } from "../materials";
import { FORMAT_ICON, FORMAT_LABEL, SourcePreview } from "../source-preview";
import { THUMB, kindOf, lengthOf, useUpload } from "../direct-course";
import { useCourse } from "./use-course";
import { Card } from "@/components/patterns/academy";
import { StageHeader } from "./stage-ui";

const sourceOf = (b?: Block) => b?.file?.sourceId ?? b?.visualaid?.sourceId ?? b?.document?.sourceId;

/**
 * Stage 1, basic details: the name, the objective, and the material. Every file is either visible to
 * reps (a lesson, exactly as uploaded, in this order) or information only, which the training uses
 * for its objectives and situations but reps never see.
 */
export function TrainingDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const updateCourse = useApp((s) => s.updateCourse);
  const setModules = useApp((s) => s.setModules);
  useApp((s) => s.uploads);
  const upload = useUpload(data?.course.productId);
  const [preview, setPreview] = useState<Source | null>(null);
  if (!data) return null;
  const { course, editable } = data;
  const base = `/trainer/courses/${course.id}`;
  const lessons = course.modules.map((m) => ({ m, src: source(sourceOf(m.blocks[0]) ?? "") }));
  const info = (course.roleplaySourceIds ?? []).map((x) => source(x)).filter((x): x is Source => !!x);

  function move(from: number, to: number) {
    if (to < 0 || to >= course.modules.length) return;
    const next = [...course.modules];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setModules(course.id, next);
  }
  /* Switching a file between the two: a lesson reps see, or information only. */
  function hide(moduleId: string, src?: Source) {
    setModules(course.id, course.modules.filter((m) => m.id !== moduleId));
    if (src) updateCourse(course.id, { roleplaySourceIds: [...(course.roleplaySourceIds ?? []), src.id] });
  }
  function show(src: Source) {
    updateCourse(course.id, { roleplaySourceIds: (course.roleplaySourceIds ?? []).filter((x) => x !== src.id) });
    setModules(course.id, [...course.modules, ...directModules([src], `d${Date.now().toString(36).slice(-4)}`)]);
  }
  function addFiles(files: File[]) {
    const added = upload(files, "f");
    setModules(course.id, [...course.modules, ...directModules(added, `d${Date.now().toString(36).slice(-4)}`)]);
    updateCourse(course.id, { sourceIds: [...new Set([...course.sourceIds, ...added.map((a) => a.id)])] });
  }

  return (
    <div className="flex flex-col gap-3">
      <StageHeader n={1} sub="Name it, set the objective, and choose which files reps see." />

      <Section label="Name">
        <input aria-label="Training name" value={course.title} disabled={!editable} onChange={(e) => updateCourse(course.id, { title: e.target.value })}
          className="w-full bg-transparent text-title font-bold text-ink outline-none placeholder:text-ink-4" placeholder="Name the training" />
      </Section>

      <Section label="Objective" hint="What reps should be able to do overall">
        <textarea aria-label="Objective" value={course.brief ?? ""} disabled={!editable} rows={3} onChange={(e) => updateCourse(course.id, { brief: e.target.value, objective: e.target.value })}
          className="w-full resize-none rounded-control border border-hair-2 bg-card px-3 py-2 text-body-lg leading-relaxed text-ink outline-none focus:border-brand/60" placeholder="e.g. Reps can present the new trial results exactly as approved." />
      </Section>

      <Section label="Materials" hint={`${lessons.length} visible to reps · ${info.length} information only`}>
        <ul className="flex flex-col gap-1.5">
          {lessons.map(({ m, src }, i) => (
            <Row key={m.id} title={m.title} src={src} visible sub={`Lesson ${i + 1} · ${src ? `${FORMAT_LABEL[kindOf(src)]} · ${lengthOf(src)}` : `${m.minutes} min`}`}
              onToggle={editable ? () => hide(m.id, src) : undefined} onPreview={() => (src ? setPreview(src) : router.push(`${base}?module=${m.id}`))}
              onRemove={editable ? () => setModules(course.id, course.modules.filter((x) => x.id !== m.id)) : undefined}
              order={editable ? <><IconButton aria-label={`Move ${m.title} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ChevronUp className="size-4" /></IconButton><IconButton aria-label={`Move ${m.title} down`} disabled={i === lessons.length - 1} onClick={() => move(i, i + 1)}><ChevronDown className="size-4" /></IconButton></> : undefined} />
          ))}
          {info.map((src) => (
            <Row key={src.id} title={src.title} src={src} visible={false} sub="Information only. Used for the training, not visible to reps."
              onToggle={editable ? () => show(src) : undefined} onPreview={() => setPreview(src)}
              onRemove={editable ? () => updateCourse(course.id, { roleplaySourceIds: (course.roleplaySourceIds ?? []).filter((x) => x !== src.id) }) : undefined} />
          ))}
        </ul>
        {editable && (
          <label className="flex cursor-pointer items-center gap-1.5 self-start text-body font-semibold text-brand-deep hover:underline">
            <Plus className="size-4" aria-hidden="true" />Add files
            <input type="file" multiple className="sr-only" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </label>
        )}
        <Text size="caption" tone="subtle">Files reps don&apos;t see are still used for the training: the agent, the objectives and the situations draw on them.</Text>
      </Section>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function Section({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <Card title={label} actions={hint ? <Text size="caption" tone="subtle">{hint}</Text> : undefined}>
      <div className="-mt-1 flex flex-col gap-3">{children}</div>
    </Card>
  );
}

/** A file in the training: what it is, whether reps see it, and the controls for it. */
function Row({ title, sub, src, visible, onToggle, onPreview, onRemove, order }: {
  title: string; sub: string; src?: Source; visible: boolean; onToggle?: () => void; onPreview: () => void; onRemove?: () => void; order?: ReactNode;
}) {
  const k = src ? kindOf(src) : "pdf";
  const Icon = FORMAT_ICON[k];
  return (
    <li className="squircle flex items-center gap-3 rounded-panel border border-hair-2 bg-card p-2.5 pr-2">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-control", visible ? THUMB[k] : "bg-subtle text-ink-4")}><Icon className="size-4.5" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-body font-semibold text-ink">{title}</span>
        <span className="truncate text-caption text-ink-3">{sub}</span>
      </span>
      {onToggle && (
        <button type="button" role="switch" aria-checked={visible} onClick={onToggle} title={visible ? "Visible to reps" : "Hidden from reps"}
          className="flex shrink-0 items-center gap-2 rounded-control px-2 py-1 text-caption font-semibold text-ink-2 hover:bg-subtle">
          {visible ? <Eye className="size-3.5 text-ok" aria-hidden="true" /> : <EyeOff className="size-3.5 text-ink-4" aria-hidden="true" />}<span className="hidden sm:inline">Visible to reps</span>
          <span className={cn("relative h-5 w-9 rounded-full transition-colors", visible ? "bg-ok" : "bg-hair-3")}><span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow-hair transition-all", visible ? "left-[18px]" : "left-0.5")} /></span>
        </button>
      )}
      {order}
      <IconButton aria-label={`Preview ${title}`} onClick={onPreview}><Eye className="size-4" /></IconButton>
      {onRemove && <IconButton aria-label={`Remove ${title}`} onClick={onRemove}><Trash2 className="size-4" /></IconButton>}
    </li>
  );
}
