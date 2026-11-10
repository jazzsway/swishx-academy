"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowUp, Lock, PencilLine, MessageSquareText, FileText, Paperclip } from "lucide-react"; // v1-hidden: Trash2, Scissors
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { competency, source } from "@/data/org";
import type { Block, Module, Source } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
// v1-hidden: import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { BlockView, BLOCK_META, SourceList } from "@/features/shared/block-view";
import { useCourse } from "./use-course";
import { applyChanges, respond, SUGGESTIONS, type ChatTurn } from "./chat";
import { runChecks } from "./checks";
// v1-hidden: import { AddMediaRow } from "./add-media";
import { formatOf, rememberFile } from "../source-preview";
import { blockFor, howRepsGetIt } from "../materials";
// v1-hidden: import { clipsFrom } from "./media-builders";
import { useToast, Toast } from "@/components/patterns/toast";
import { CopilotOverride } from "@/features/copilot/copilot-panel";
import { useCopilot } from "@/features/copilot/copilot-store";

export function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const data = useCourse(id);
  const setModules = useApp((s) => s.setModules);
  const backToDraft = useApp((s) => s.backToDraft);
  const [selected, setSelected] = useState<string | undefined>(search.get("module") ?? undefined);
  const [editing, setEditing] = useState<{ moduleId: string; block: Block } | null>(null);
  const { message, open } = useToast();
  const copilotOpen = useCopilot((s) => s.open);
  const setCopilotOpen = useCopilot((s) => s.setOpen);
  const fresh = search.get("fresh") === "1";
  const apply = useApplyChanges(id);
  useEffect(() => { if (fresh) setCopilotOpen(true); }, [fresh, setCopilotOpen]);

  const course = data?.course;
  const modules = course?.modules ?? [];
  const mod = modules.find((m) => m.id === selected) ?? modules[0];
  const issues = useMemo(() => (course ? runChecks(course).filter((f) => f.severity !== "green") : []), [course]);

  if (!data || !course) return null;
  const { editable } = data;

  function save(next: Module[]) {
    if (!course) return;
    if (data?.cur.state === "ready") backToDraft(course.id);
    setModules(course.id, next);
  }
  const patchModule = (mid: string, patch: Partial<Module>) => save(modules.map((m) => (m.id === mid ? { ...m, ...patch } : m)));

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <nav aria-label="Modules" className="flex flex-col gap-1.5 lg:sticky lg:top-[84px] lg:self-start">
        <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="px-2 pb-1">{modules.length} modules</Text>
        {modules.map((m, i) => {
          const active = m.id === mod?.id;
          const modIssues = issues.filter((f) => f.moduleId === m.id).length;
          return (
            <button key={m.id} type="button" onClick={() => setSelected(m.id)} aria-current={active}
              className={cn("squircle flex items-start gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors", active ? "bg-tint" : "hover:bg-subtle")}>
              <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-glyph text-micro font-bold", active ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>{i + 1}</span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("text-body font-semibold leading-snug", active ? "text-brand-deep" : "text-ink")}>{m.title}</span>
                <span className="text-micro text-ink-3">{m.minutes} min · {competency(m.competency)?.name}</span>
              </span>
              {m.required && <Lock className="mt-1 size-3.5 shrink-0 text-ink-4" aria-label="Required for everyone" />}
              {modIssues > 0 && <span className="mt-0.5 rounded-glyph bg-danger-bg px-1.5 text-micro font-bold text-danger">{modIssues}</span>}
            </button>
          );
        })}
        <div className="mt-3 rounded-panel border border-hair bg-card p-3">
          <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="mb-2 block">Sources</Text>
          <SourceList sourceIds={course.sourceIds} />
        </div>
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        {mod ? (
          <>
            <div className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  {/* v1-hidden: inline title editing. Every edit goes through the SwishX AI Agent ("Rename this module to …"). */}
                  <Text as="h2" size="display" weight="bold" tracking="tight">{mod.title}</Text>
                  <Text size="body-lg" tone="subtle">{mod.summary}</Text>
                </div>
                {editable && !copilotOpen && <Button variant="soft" size="sm" onClick={() => setCopilotOpen(true)}><AgentIcon className="size-4" aria-hidden="true" />Ask SwishX AI Agent</Button>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Chip size="md" tone="brand">{competency(mod.competency)?.name}</Chip>
                <Chip size="md">{mod.minutes} min</Chip>
                {course.type === "personalised" && <Chip size="md" iconLeft={mod.required ? <Lock className="size-3.5" aria-hidden="true" /> : undefined}>{mod.required ? "Required for everyone" : `Personalisable · ${mod.tier === "core" ? "core" : "extra practice"}`}</Chip>}
                {/* v1-hidden: the Required / Personalisable toggle. Ask the agent: "Make this module required".
                {course.type === "personalised" && (
                  <Segmented aria-label="Personalisation">
                    <SegmentedButton active={!!mod.required} disabled={!editable} onClick={() => patchModule(mod.id, { required: true })}>
                      <Lock className="size-3.5" aria-hidden="true" />Required for everyone
                    </SegmentedButton>
                    <SegmentedButton active={!mod.required} disabled={!editable || mod.competency === "c-safety"} onClick={() => patchModule(mod.id, { required: false })}
                      title={mod.competency === "c-safety" ? "Safety modules can't be personalised away" : undefined}>
                      Personalisable · {mod.tier === "core" ? "core" : "extra practice"}
                    </SegmentedButton>
                  </Segmented>
                )}
                */}
              </div>
              {mod.competency === "c-safety" && <Text size="caption" tone="subtle">Safety content is always included for every rep and can&apos;t be switched off.</Text>}
            </div>

            {mod.blocks.map((b) => {
              const Meta = BLOCK_META[b.type];
              const blockIssues = issues.filter((f) => f.blockId === b.id);
              return (
                <article key={b.id} className={cn("squircle flex flex-col gap-4 rounded-card border bg-card p-5", blockIssues.some((f) => f.severity === "red") ? "border-danger-line" : "border-hair")}>
                  <header className="flex items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-control bg-subtle text-ink-2"><Meta.icon className="size-4" aria-hidden="true" /></span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <Text size="body-lg" weight="bold">{b.title}</Text>
                      <Text size="micro" tone="subtle">{Meta.label} · {b.minutes} min · {b.competencies.map((c) => competency(c)?.name).join(", ")}</Text>
                    </div>
                    {/* v1-hidden: Edit text, Split into clips and Delete block. The agent does all three.
                    {editable && (b.type === "lesson" || b.type === "keypoints") && (
                      <IconButton aria-label="Edit text" onClick={() => setEditing({ moduleId: mod.id, block: b })}><PencilLine className="size-4" /></IconButton>
                    )}
                    {editable && b.type === "video" && b.video && b.video.origin !== "clip" && b.video.chapters.length >= 3 && b.video.durationSec > 300 && (
                      <Button size="sm" variant="secondary" onClick={() => {
                        const clips = clipsFrom(b);
                        const i = mod.blocks.findIndex((x) => x.id === b.id);
                        patchModule(mod.id, { blocks: [...mod.blocks.slice(0, i + 1), ...clips, ...mod.blocks.slice(i + 1)], minutes: mod.minutes + clips.reduce((a, c) => a + c.minutes, 0) });
                        showToast(`Cut into ${clips.length} clips`);
                      }}><Scissors className="size-4" aria-hidden="true" />Split into clips</Button>
                    )}
                    {editable && !mod.required && mod.blocks.length > 1 && (
                      <IconButton aria-label="Delete block" tone="danger" onClick={() => patchModule(mod.id, { blocks: mod.blocks.filter((x) => x.id !== b.id), minutes: mod.minutes - b.minutes })}><Trash2 className="size-4" /></IconButton>
                    )}
                    */}
                  </header>
                  <BlockView block={b} sourceIds={course.sourceIds} flag siblings={mod.blocks} />
                  {blockIssues.length > 0 && (
                    <div className="flex flex-col gap-1.5 border-t border-hair pt-3">
                      {blockIssues.map((f) => (
                        <div key={f.id} className="flex items-center gap-2 text-caption">
                          <span className={cn("size-2 rounded-full", f.severity === "red" ? "bg-danger" : "bg-warn")} />
                          <span className="font-semibold text-ink-2">{f.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
            {/* v1-hidden: <AddMediaRow …/> (Upload video, Generate a short video, Assign PDF pages, Audio version). The agent adds media now. */}
            {editable && (
              <button type="button" onClick={() => setCopilotOpen(true)}
                className="squircle flex items-center gap-3 rounded-card border border-dashed border-hair-3 p-4 text-left transition-colors hover:bg-subtle">
                <span className="grid size-9 shrink-0 place-items-center rounded-control bg-tint text-brand-deep"><AgentIcon className="size-4.5" /></span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <Text size="body-lg" weight="semibold">Change this module with the SwishX AI Agent</Text>
                  <Text size="caption" tone="subtle">Add a video, audio or PDF pages, split a recording into clips, rename it, or remove something. Attach your own files in the chat.</Text>
                </span>
              </button>
            )}
          </>
        ) : (
          <div className="squircle rounded-card border border-dashed border-hair-2 p-10 text-center"><Text tone="subtle">No modules yet.</Text></div>
        )}
      </div>

      {/* Locked versions get the trainer's general copilot instead: there's nothing to edit. */}
      {editable && <CopilotOverride>
        <ChatPanel courseId={course.id} moduleId={mod?.id} editable={editable} fresh={fresh} issues={issues.length} onApply={apply} />
      </CopilotOverride>}

      {editing && <EditBlockModal editing={editing} onClose={() => setEditing(null)} onSave={(block) => {
        const m = modules.find((x) => x.id === editing.moduleId)!;
        patchModule(m.id, { blocks: m.blocks.map((b) => (b.id === block.id ? block : b)) });
        setEditing(null);
      }} />}
      <Toast message={message} open={open} />
    </div>
  );
}

/** Applies an accepted chat change to the course. Shared by every tab that hosts the editing chat. */
export function useApplyChanges(courseId: string) {
  const data = useCourse(courseId);
  const setModules = useApp((s) => s.setModules);
  const updateCourse = useApp((s) => s.updateCourse);
  const backToDraft = useApp((s) => s.backToDraft);
  return (changes: NonNullable<ChatTurn["changes"]>) => {
    if (!data) return;
    const next = applyChanges(data.course, changes);
    if (data.cur.state === "ready") backToDraft(courseId);
    if (next.modules !== data.course.modules) setModules(courseId, next.modules);
    if (next.items !== data.course.items) updateCourse(courseId, { items: next.items });
  };
}

/** The copilot while editing a course: the only way to change it. Proposes cited changes that wait for the trainer's OK. */
export function ChatPanel({ courseId, moduleId, editable, fresh, issues, onApply, suggestions = SUGGESTIONS }: {
  courseId: string; moduleId?: string; editable: boolean; fresh: boolean; issues: number;
  onApply: (c: NonNullable<ChatTurn["changes"]>) => void; suggestions?: string[];
}) {
  const data = useCourse(courseId);
  const addUploads = useApp((s) => s.addUploads);
  const [turns, setTurns] = useState<ChatTurn[]>(() => [{
    id: "hello", from: "ai",
    text: fresh
      ? `I wrote ${data?.course.modules.length ?? 0} modules from ${data?.course.sourceIds.length ?? 0} sources, plus ${data?.course.items.length ?? 0} questions. ${issues ? `${issues} finding${issues > 1 ? "s" : ""} need${issues > 1 ? "" : "s"} your attention before review.` : "Everything is cited."}`
      : editable ? "Ask me to change this course. I'll only use its sources, and every change waits for your OK." : "This version is locked. I can answer questions about it; to change it, start a new version.",
  }]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, thinking]);
  if (!data) return null;

  /* Your own files go into the module you're on, as a proposed change like any other. */
  function attach(files: File[]) {
    const mod = data!.course.modules.find((m) => m.id === moduleId) ?? data!.course.modules[0];
    if (!files.length || !mod) return;
    const added: Source[] = files.map((f, i) => {
      const id = `up-${Date.now().toString(36)}-${i}`;
      rememberFile(id, f);
      return { id, title: f.name.replace(/\.[^.]+$/, ""), type: "Uploaded file", pages: 0, productId: data!.course.productId, uploaded: { fileName: f.name, format: formatOf(f.name), at: new Date().toISOString() } };
    });
    addUploads(added);
    setTurns((t) => [...t,
      { id: `u${Date.now()}`, from: "you", text: `Attached ${files.map((f) => f.name).join(", ")}` },
      { id: `a${Date.now()}`, from: "ai", text: `I'll put ${added.length === 1 ? "it" : "them"} in ${mod.title}. ${added.map((s) => howRepsGetIt(s)).join(". ")}.`,
        changes: added.map((s) => ({ kind: "block" as const, moduleId: mod.id, block: blockFor(s, mod) })), status: "pending" },
    ]);
  }

  function send(prompt: string) {
    if (!prompt.trim() || !data) return;
    setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt }]);
    setText("");
    setThinking(true);
    window.setTimeout(() => {
      const r = respond(prompt, data.course, moduleId);
      if (!editable && r.changes) {
        r.changes = undefined;
        r.status = undefined;
        r.text = "This version is locked, so I can't change it. Use \"Edit as a new version\" first, and I'll make the change there.";
      }
      setTurns((t) => [...t, r]);
      setThinking(false);
    }, 900);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-hair bg-tint/60 px-4 py-2.5">
        <PencilLine className="size-4 text-brand-deep" aria-hidden="true" />
        <Text size="caption" weight="semibold" tone="muted" className="truncate">Editing {data.course.title} · uses only its {data.course.sourceIds.length} sources</Text>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {turns.map((t) => (
          <div key={t.id} className={cn("flex flex-col gap-2", t.from === "you" && "items-end")}>
            <div className={cn("max-w-[92%] rounded-panel px-3.5 py-2.5 text-body leading-relaxed", t.from === "you" ? "bg-ink text-white" : "bg-subtle text-ink")}>{t.text}</div>
            {t.changes && (
              <div className="flex w-full flex-col gap-2 rounded-panel border border-hair p-3">
                {t.changes.map((ch, i) => (
                  <div key={i} className="flex flex-col gap-1 text-body">
                    {ch.kind === "para" && (
                      <>
                        {ch.before && <span className="rounded-chip bg-danger-bg px-2 py-1 text-danger line-through decoration-danger/60">{ch.before.text}</span>}
                        {ch.after && <span className="rounded-chip bg-ok-bg px-2 py-1 text-ok">{ch.after.text} <span className="text-micro font-bold">[{source(ch.after.cite?.sourceId ?? "")?.title}, p. {ch.after.cite?.page}]</span></span>}
                      </>
                    )}
                    {ch.kind === "block" && <span className="rounded-chip bg-ok-bg px-2 py-1 text-ok">+ {ch.block.title.startsWith(BLOCK_META[ch.block.type].label) ? "" : `${BLOCK_META[ch.block.type].label}: `}{ch.block.check?.question ?? ch.block.title}</span>}
                    {ch.kind === "items" && ch.items.map((it) => <span key={it.id} className="rounded-chip bg-ok-bg px-2 py-1 text-ok">+ {it.question} <span className="text-micro font-bold">({it.pool})</span></span>)}
                    {ch.kind === "insert" && <span className="rounded-chip bg-ok-bg px-2 py-1 text-ok">+ {ch.label}</span>}
                    {ch.kind === "addModule" && <span className="rounded-chip bg-ok-bg px-2 py-1 text-ok">+ Module: {ch.module.title} · {ch.module.minutes} min</span>}
                    {(ch.kind === "removeBlock" || ch.kind === "removeModule" || ch.kind === "retire") && <span className="rounded-chip bg-danger-bg px-2 py-1 text-danger line-through decoration-danger/60">{ch.kind === "removeModule" ? "Module: " : ""}{ch.label}</span>}
                    {(ch.kind === "module" || ch.kind === "pool") && <span className="rounded-chip bg-tint px-2 py-1 text-brand-deep">{ch.label}</span>}
                  </div>
                ))}
                {t.status === "pending" ? (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" onClick={() => { onApply(t.changes!); setTurns((all) => all.map((x) => (x.id === t.id ? { ...x, status: "accepted" } : x))); }}>Accept</Button>
                    <Button size="sm" variant="secondary" onClick={() => setTurns((all) => all.map((x) => (x.id === t.id ? { ...x, status: "rejected" } : x)))}>Reject</Button>
                  </div>
                ) : <Text size="caption" weight="semibold" tone={t.status === "accepted" ? "ok" : "subtle"}>{t.status === "accepted" ? "Applied" : "Rejected"}</Text>}
              </div>
            )}
          </div>
        ))}
        {thinking && <div className="flex gap-1 self-start rounded-panel bg-subtle px-3.5 py-3 text-ink-3"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
        <div ref={endRef} />
      </div>
      <div className="flex flex-col gap-2 border-t border-hair p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => <Chip key={s} size="sm" onClick={() => send(s)}>{s}</Chip>)}
        </div>
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <label className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-control border border-hair-2 bg-card text-ink-3 hover:bg-subtle hover:text-ink" title="Attach your own video, PDF, slides, image or audio">
            <Paperclip className="size-4" aria-hidden="true" /><span className="sr-only">Attach a file</span>
            <input type="file" multiple className="sr-only" onChange={(e) => { attach(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </label>
          <label className="sr-only" htmlFor="course-chat">Message</label>
          <textarea id="course-chat" rows={2} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
            placeholder={moduleId ? "e.g. Add a short video to this module" : "Ask for a change"}
            className="squircle min-h-[44px] flex-1 resize-none rounded-control border border-hair-2 bg-card px-3 py-2.5 text-body-lg outline-none focus:border-brand" />
          <IconButton aria-label="Send" type="submit" size={9} tone="brand" className="bg-brand text-white hover:bg-brand-deep hover:text-white"><ArrowUp className="size-4" /></IconButton>
        </form>
      </div>
    </div>
  );
}

function EditBlockModal({ editing, onClose, onSave }: { editing: { moduleId: string; block: Block }; onClose: () => void; onSave: (b: Block) => void }) {
  const isPoints = editing.block.type === "keypoints";
  const [rows, setRows] = useState((isPoints ? editing.block.points : editing.block.paragraphs) ?? []);
  return (
    <Modal open onClose={onClose} title={`Edit · ${editing.block.title}`} description="Edited sentences keep their citation. A sentence you write yourself has no source until you add one, and checks will flag it." size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={() => onSave({ ...editing.block, [isPoints ? "points" : "paragraphs"]: rows })}>Save</Button></>}>
      <div className="flex flex-col gap-3">
        {rows.map((p, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Field multiline rows={2} aria-label={`Sentence ${i + 1}`} value={p.text}
              onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, text: (e.target as unknown as HTMLTextAreaElement).value } : r)))} />
            <Text size="micro" tone={p.cite && !p.missing ? "subtle" : "danger"} className="flex items-center gap-1">
              <FileText className="size-3" aria-hidden="true" />{p.cite && !p.missing ? `${source(p.cite.sourceId)?.title}, p. ${p.cite.page}` : "No source"}
            </Text>
          </div>
        ))}
        <Button variant="secondary" size="sm" className="self-start" onClick={() => setRows([...rows, { text: "", missing: true }])}>
          <MessageSquareText className="size-4" aria-hidden="true" />Add a sentence
        </Button>
      </div>
    </Modal>
  );
}
