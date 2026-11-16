"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Lock, PencilLine } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { useApp } from "@/store/app-store";
import { source } from "@/data/org";
import type { Block, Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/patterns/academy";
import { VisibilityPicker } from "../content-type";
import { directKind, directModules } from "../materials";
import { SourcePreview } from "../source-preview";
import { DemoDocs, Dropzone, LessonList, lengthOf, useUpload } from "../direct-course";
import { useCourse } from "./use-course";

const sourceOf = (b?: Block) => b?.file?.sourceId ?? b?.visualaid?.sourceId ?? b?.document?.sourceId;

/**
 * Step 1 of a training with the trainer's own material: the details set at creation (name, who can
 * find it, the brief) and the materials, editable here. The lessons are the files reps see, in order;
 * the demo-call documents are what the AI builds the scenarios from.
 */
export function TrainingDetails() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const updateCourse = useApp((s) => s.updateCourse);
  const setModules = useApp((s) => s.setModules);
  useApp((s) => s.uploads);
  const upload = useUpload(data?.course.productId);
  const [editingBrief, setEditingBrief] = useState(false);
  const [brief, setBrief] = useState(data?.course.brief ?? "");
  const [preview, setPreview] = useState<Source | null>(null);
  if (!data) return null;
  const { course, editable } = data;
  const base = `/trainer/courses/${course.id}`;
  const lessons = course.modules.map((m, i) => {
    const src = source(sourceOf(m.blocks[0]) ?? "");
    return { id: m.id, title: m.title, sub: `Lesson ${i + 1} · ${src ? `${directKind(src)} · ${lengthOf(src)}` : `${m.minutes} min`}`, src };
  });
  const rpIds = course.roleplaySourceIds ?? [];
  const demo = rpIds.map((x) => source(x)).filter((x): x is Source => !!x);

  function move(from: number, to: number) {
    if (to < 0 || to >= course.modules.length || from === to) return;
    const next = [...course.modules];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setModules(course.id, next);
  }
  function addLessons(items: Source[]) {
    setModules(course.id, [...course.modules, ...directModules(items, `d${Date.now().toString(36).slice(-4)}`)]);
  }
  const addDemo = (ids: string[]) => updateCourse(course.id, { roleplaySourceIds: [...rpIds, ...ids], sourceIds: [...new Set([...course.sourceIds, ...ids])] });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text size="micro" weight="bold" tone="brand-deep" uppercase tracking="wider">Step 1 of 3</Text>
          <Text as="h1" size="display" weight="extrabold" tracking="tight">Details & materials</Text>
          <Text size="body-lg" tone="subtle">What you set up when you created it. Change anything here; reps only see it once you publish.</Text>
        </div>
        <Button variant="secondary" onClick={() => router.push(`${base}/roleplay`)}>Next: scenarios<ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>

      <Card>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Field label="Training name" value={course.title} disabled={!editable} onChange={(e) => updateCourse(course.id, { title: e.target.value })} />
          <VisibilityPicker value={course.visibility === "assigned" ? "private" : "public"} onChange={(v) => editable && updateCourse(course.id, { visibility: v === "public" ? "audience" : "assigned" })} teams="the field team" />
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand text-white"><AgentIcon className="size-4" aria-hidden="true" /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <Text size="title" weight="bold" className="flex-1">Objective brief</Text>
              {editable && !editingBrief && <Button size="sm" variant="ghost" onClick={() => setEditingBrief(true)}><PencilLine className="size-3.5" aria-hidden="true" />Edit</Button>}
            </div>
            {editingBrief ? (
              <div className="flex flex-col gap-2">
                <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} autoFocus aria-label="Objective brief"
                  className="w-full resize-none rounded-panel border border-hair-2 bg-card px-3 py-2.5 text-body-lg leading-relaxed text-ink outline-none focus:border-brand/60" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { updateCourse(course.id, { brief: brief.trim() || undefined }); setEditingBrief(false); }}>Save brief</Button>
                  <Button size="sm" variant="secondary" onClick={() => { setBrief(course.brief ?? ""); setEditingBrief(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Text size="body-lg" tone={course.brief ? "default" : "subtle"} className="leading-relaxed">{course.brief ?? "No brief yet. Tell SwishX what reps should be able to do; it uses this when it drafts scenarios."}</Text>
            )}
            <Text size="caption" tone="subtle">SwishX drafted the first scenarios from this. Editing it doesn&apos;t change them; add or change scenarios in step 2.</Text>
          </div>
        </div>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex flex-col gap-0.5">
            <Text as="h2" size="title" weight="bold">Lessons<span className="font-semibold text-ink-3"> · {lessons.length}</span></Text>
            <Text size="body" tone="subtle">Your files, one lesson each, shown to reps exactly as uploaded. Drag to reorder.</Text>
          </div>
          <LessonList items={lessons} onMove={(a, b) => editable && move(a, b)} onPreview={(x) => (x.src ? setPreview(x.src) : router.push(`${base}?module=${x.id}`))}
            onRemove={editable ? (x) => setModules(course.id, course.modules.filter((m) => m.id !== x.id)) : undefined} />
          {editable && <Dropzone label="Add files as lessons" kinds="Video, audio, PDF, slides or images" onFiles={(f) => addLessons(upload(f, "rep"))} />}
        </Card>
        <Card>
          <div className="flex flex-col gap-0.5">
            <Text as="h2" size="title" weight="bold">Materials for the demo call<span className="font-semibold text-ink-3"> · {demo.length}</span></Text>
            <Text size="body" tone="subtle" className="flex items-start gap-1.5"><Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Only the AI reads these, to build the scenarios. Reps never see them.</Text>
          </div>
          {demo.length === 0 && <Text size="body" tone="subtle">None yet. The scenarios are drafted from your lessons.</Text>}
          <DemoDocs docs={demo} onPreview={setPreview}
            onRemove={editable ? (x) => updateCourse(course.id, { roleplaySourceIds: rpIds.filter((r) => r !== x) }) : undefined} />
          {editable && <Dropzone label="Add call scenarios, objection lists or your selling model" kinds="PDF, Word or slides" onFiles={(f) => addDemo(upload(f, "rp").map((a) => a.id))} />}
        </Card>
      </div>
      {preview && <SourcePreview s={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}
