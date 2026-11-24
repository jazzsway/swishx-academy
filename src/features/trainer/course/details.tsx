"use client";

import { useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { source } from "@/data/org";
import type { Block, Course, Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { directModules } from "../materials";
import { FORMAT_ICON, FORMAT_LABEL, SourcePreview } from "../source-preview";
import { THUMB, kindOf, lengthOf, useUpload } from "../direct-course";
import { useCourse } from "./use-course";
import { StageHeader } from "./stage-ui";

const sourceOf = (b?: Block) => b?.file?.sourceId ?? b?.visualaid?.sourceId ?? b?.document?.sourceId;

/**
 * The training's files, from the top bar: every file is either visible to reps (a lesson, exactly as
 * uploaded, in this order) or information only, which the training uses for its objectives and
 * situations but reps never see. Chosen first when the files are added; changed here later.
 */
export function MaterialsDialog({ course, editable, onClose }: { course: Course; editable: boolean; onClose: () => void }) {
  const files = course.modules.length + (course.roleplaySourceIds?.length ?? 0);
  return (
    <Modal open onClose={onClose} size="lg" title="Files" description={`${course.modules.length} visible to reps · ${files - course.modules.length} information only`}
      footer={<Button onClick={onClose}>Done</Button>}>
      <MaterialManager course={course} editable={editable} />
    </Modal>
  );
}

/**
 * The training's files, wherever they're managed (the Material stage, or the Files dialog): the ones reps
 * see, in order, and the ones that only build the calls. Add more any time, as either kind; switch a file
 * between them, reorder, preview or remove.
 */
export function MaterialManager({ course, editable }: { course: Course; editable: boolean }) {
  const router = useRouter();
  const updateCourse = useApp((s) => s.updateCourse);
  const setModules = useApp((s) => s.setModules);
  useApp((s) => s.uploads);
  const upload = useUpload(course.productId);
  const [preview, setPreview] = useState<Source | null>(null);
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
  function addFiles(files: File[], visible: boolean) {
    if (!files.length) return;
    const added = upload(files, visible ? "f" : "rp");
    if (visible) setModules(course.id, [...course.modules, ...directModules(added, `d${Date.now().toString(36).slice(-4)}`)]);
    else updateCourse(course.id, { roleplaySourceIds: [...(course.roleplaySourceIds ?? []), ...added.map((a) => a.id)] });
    updateCourse(course.id, { sourceIds: [...new Set([...course.sourceIds, ...added.map((a) => a.id)])] });
  }
  const adder = (visible: boolean) => editable && (
    <label className="flex cursor-pointer items-center gap-1.5 rounded-control px-2 py-1 text-caption font-semibold text-brand-deep transition-colors hover:bg-tint">
      <Plus className="size-3.5" aria-hidden="true" />Add files
      <input type="file" multiple className="sr-only" onChange={(e) => { addFiles(Array.from(e.target.files ?? []), visible); e.target.value = ""; }} />
    </label>
  );

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-ok" aria-hidden="true" />
          <Text size="body" weight="bold" className="flex-1">Reps see · {lessons.length}</Text>
          {adder(true)}
        </div>
        <ul className="flex flex-col gap-1.5">
          {lessons.map(({ m, src }, i) => (
            <Row key={m.id} title={m.title} src={src} visible sub={`${i + 1} · ${src ? `${FORMAT_LABEL[kindOf(src)]} · ${lengthOf(src)}` : `${m.minutes} min`}`}
              onToggle={editable ? () => hide(m.id, src) : undefined} onPreview={() => (src ? setPreview(src) : router.push(`${base}?module=${m.id}`))}
              onRemove={editable ? () => setModules(course.id, course.modules.filter((x) => x.id !== m.id)) : undefined}
              order={editable ? <><IconButton aria-label={`Move ${m.title} up`} disabled={i === 0} onClick={() => move(i, i - 1)}><ChevronUp className="size-4" /></IconButton><IconButton aria-label={`Move ${m.title} down`} disabled={i === lessons.length - 1} onClick={() => move(i, i + 1)}><ChevronDown className="size-4" /></IconButton></> : undefined} />
          ))}
          {!lessons.length && <li className="rounded-panel border border-dashed border-hair-3 px-4 py-4 text-center text-caption text-ink-3">None. Reps go from screening straight to the assessments.</li>}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <EyeOff className="size-4 text-ink-4" aria-hidden="true" />
          <Text size="body" weight="bold" className="flex-1">Context only · {info.length}</Text>
          {adder(false)}
        </div>
        <ul className="flex flex-col gap-1.5">
          {info.map((src) => (
            <Row key={src.id} title={src.title} src={src} visible={false} sub="Builds the objectives and the calls. Reps don't see it."
              onToggle={editable ? () => show(src) : undefined} onPreview={() => setPreview(src)}
              onRemove={editable ? () => updateCourse(course.id, { roleplaySourceIds: (course.roleplaySourceIds ?? []).filter((x) => x !== src.id) }) : undefined} />
          ))}
          {!info.length && <li className="rounded-panel border border-dashed border-hair-3 px-4 py-4 text-center text-caption text-ink-3">None.</li>}
        </ul>
      </section>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/** The Material stage: the training's files, first in the flow and there to come back to any time. */
export function MaterialStage() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  if (!data) return null;
  const { course, editable } = data;
  return (
    <div className="flex flex-col gap-4">
      <StageHeader n={1} sub="Files reps see, and files that only build the calls. Add more any time." />
      <section className="squircle rounded-card border border-hair bg-card p-5">
        <MaterialManager course={course} editable={editable} />
      </section>
      {course.modules.length > 0 && <Text size="caption" tone="subtle">Whether reps must go through their files or can skip them is set in Settings.</Text>}
    </div>
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
