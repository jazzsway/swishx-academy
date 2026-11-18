"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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

const sourceOf = (b?: Block) => b?.file?.sourceId ?? b?.visualaid?.sourceId ?? b?.document?.sourceId;

/**
 * The training's files, from the top bar: every file is either visible to reps (a lesson, exactly as
 * uploaded, in this order) or information only, which the training uses for its objectives and
 * situations but reps never see. Chosen first when the files are added; changed here later.
 */
export function MaterialsDialog({ course, editable, onClose }: { course: Course; editable: boolean; onClose: () => void }) {
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
  function addFiles(files: File[]) {
    const added = upload(files, "f");
    setModules(course.id, [...course.modules, ...directModules(added, `d${Date.now().toString(36).slice(-4)}`)]);
    updateCourse(course.id, { sourceIds: [...new Set([...course.sourceIds, ...added.map((a) => a.id)])] });
  }

  return (
    <>
      <Modal open onClose={onClose} size="lg" title="Files" description={`${lessons.length} visible to reps as lessons · ${info.length} information only`}
        footer={<>
          {editable && (
            <label className="mr-auto flex cursor-pointer items-center gap-1.5 text-body font-semibold text-brand-deep hover:underline">
              <Plus className="size-4" aria-hidden="true" />Add files
              <input type="file" multiple className="sr-only" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            </label>
          )}
          <Button onClick={onClose}>Done</Button>
        </>}>
        <div className="flex flex-col gap-3">
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
            {!lessons.length && !info.length && <li className="rounded-panel border border-dashed border-hair-3 px-4 py-6 text-center text-body text-ink-3">No files yet.</li>}
          </ul>
          <Text size="caption" tone="subtle">Files reps don&apos;t see are still used for the training: the agent, the objectives and the situations draw on them.</Text>
        </div>
      </Modal>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </>
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
