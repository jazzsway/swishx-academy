"use client";

import { useEffect, useState } from "react";
import { Clock, FileText, History, Mic, RotateCcw, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import type { Course, Module } from "@/data/types";
import { CHARACTERS, characterOf } from "@/lib/scenario-set";
import { BLOCK_META } from "@/features/shared/block-view";
import { Portal } from "@/components/ui/portal";
import { Button, IconButton } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

/**
 * Version history, the way the SwishX for Biz studios keep it, numbered the way releases are.
 * The work towards a version is a point version (v0.1 before the first publish, v1.1 after it);
 * publishing makes a full Version. Pick one to see the training as it was, and restore it.
 */
interface Point {
  id: string;
  /** "v0.1", "Version 1", "v1.1". */
  label: string;
  kind: "session" | "published" | "current";
  day: string;
  author: string;
  summary: { text: string; by?: "swishx" }[];
  modules: Module[];
}

const PUBLISHED = new Set(["published", "superseded", "expired", "withdrawn"]);
const dayOf = (at: string | undefined) => {
  if (!at) return "Today";
  const d = new Date(at);
  return Number.isNaN(d.getTime()) ? at : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function pointsOf(course: Course): Point[] {
  const out: Point[] = [];
  for (const v of course.versions) {
    const work = v.history.filter((h) => h.action !== "Published" && !h.action.startsWith("Superseded"));
    const live = PUBLISHED.has(v.state);
    const label = v.version === 1 ? "v0.1" : `v${v.version - 1}.1`;
    const summary: Point["summary"] = work.length
      ? work.map((h) => ({ text: h.note ? `${h.action}: ${h.note}` : h.action }))
      : v.version === 1
        ? [{ text: `Created ${course.title}` }, { text: `Placed ${v.modules.length || course.modules.length} lessons as uploaded` }, { text: "Drafted the first scenarios from the brief", by: "swishx" }]
        : [{ text: "Edited the lessons and scenarios" }];
    out.push({ id: `s${v.version}`, label, kind: live ? "session" : "current", day: dayOf(work[0]?.at ?? v.publishedAt), author: work[0]?.by ?? "Maya Chen", summary, modules: live ? v.modules : course.modules });
    if (live)
      out.push({ id: `V${v.version}`, label: `Version ${v.version}`, kind: "published", day: dayOf(v.publishedAt), author: v.history.find((h) => h.action === "Published")?.by ?? "Maya Chen",
        summary: [{ text: `Published as Version ${v.version}` }, ...(v.transition ? [{ text: v.transition === "recertify" ? "Everyone recertifies" : v.transition === "minor" ? "Minor update · progress carries over" : "Everyone restarts" }] : [])], modules: v.modules });
  }
  return out.reverse();
}

/** The top-bar button: where the training is in its history, and the history behind it. */
export function VersionHistoryButton({ course }: { course: Course }) {
  const [open, setOpen] = useState(false);
  const points = pointsOf(course);
  const head = points[0];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title="Version history"
        className="hidden h-9 shrink-0 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-2.5 text-caption font-bold text-ink-2 transition-colors hover:border-brand hover:text-brand-deep sm:inline-flex">
        <History className="size-3.5" aria-hidden="true" />{head.kind === "current" ? `Draft ${head.label}` : head.label}
      </button>
      {open && <VersionHistoryModal course={course} points={points} onClose={() => setOpen(false)} />}
    </>
  );
}

function VersionHistoryModal({ course, points, onClose }: { course: Course; points: Point[]; onClose: () => void }) {
  const setModules = useApp((s) => s.setModules);
  const startNewVersion = useApp((s) => s.startNewVersion);
  useApp((s) => s.scenarios);
  const [selectedId, setSelectedId] = useState(points[1]?.id ?? points[0].id);
  const [confirming, setConfirming] = useState(false);
  const selected = points.find((p) => p.id === selectedId) ?? points[0];
  const isCurrent = selected.kind === "current";
  const scs = allScenarios().filter((x) => course.scenarioIds.includes(x.id));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);

  const days = points.reduce<{ day: string; items: Point[] }[]>((acc, p) => {
    const last = acc[acc.length - 1];
    if (last && last.day === p.day) last.items.push(p);
    else acc.push({ day: p.day, items: [p] });
    return acc;
  }, []);

  function restore() {
    const cur = course.versions.at(-1)!;
    if (PUBLISHED.has(cur.state)) startNewVersion(course.id);
    setModules(course.id, selected.modules);
    onClose();
  }

  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label="Version history" onClick={onClose} className="fixed inset-0 z-[80] bg-ink/70 p-3 backdrop-blur-sm sm:p-5">
        <div onClick={(e) => e.stopPropagation()} className="flex h-full w-full flex-col overflow-hidden rounded-card border border-hair bg-card shadow-modal">
          <div className="flex items-start gap-3 border-b border-hair px-5 py-3.5">
            <History className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Text as="p" size="body-lg" weight="extrabold">Version history</Text>
              <Text as="p" size="caption" tone="subtle">Work towards a version is a point version (v0.1, v1.1); publishing makes a full version. Pick one to see it, and restore it if you need to.</Text>
            </div>
            <IconButton aria-label="Close" onClick={onClose}><X className="size-4" /></IconButton>
          </div>

          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <ol className="max-h-48 shrink-0 overflow-y-auto border-b border-hair p-2 lg:max-h-none lg:w-64 lg:border-b-0 lg:border-r">
              {days.map((g) => (
                <li key={g.day}>
                  <div className="px-2 pb-1 pt-2 text-micro font-extrabold uppercase tracking-wider text-ink-4">{g.day}</div>
                  <ul className="flex flex-col gap-0.5">
                    {g.items.map((p) => (
                      <li key={p.id}>
                        <button type="button" onClick={() => { setSelectedId(p.id); setConfirming(false); }}
                          className={cn("flex w-full flex-col gap-1 rounded-control px-2.5 py-2 text-left transition-colors", p.id === selectedId ? "bg-tint ring-1 ring-tint-line" : "hover:bg-subtle")}>
                          <Tag p={p} />
                          <span className="flex items-center gap-1.5 text-caption text-ink-3"><span className="size-1.5 shrink-0 rounded-full bg-ok" />{p.author}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>

            {/* The training as it was: its lessons in order, and its scenarios. */}
            <div className="relative min-h-[260px] min-w-0 flex-1 overflow-y-auto bg-subtle p-6 sm:p-10">
              <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-chip bg-ink/80 px-2.5 py-1 text-caption font-bold text-white">{selected.label} · {isCurrent ? "as it is now" : selected.day}</span>
              <div className="mx-auto flex max-w-[620px] flex-col gap-4 pt-4">
                <Text size="display" weight="extrabold" tracking="tight">{course.title}</Text>
                <section className="squircle flex flex-col rounded-panel border border-hair bg-card">
                  <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="px-4 pb-1 pt-3">{selected.modules.length} lessons</Text>
                  <ol className="flex flex-col divide-y divide-hair">
                    {selected.modules.map((m, i) => {
                      const b = m.blocks.find((x) => x.type !== "check");
                      const Icon = b ? BLOCK_META[b.type].icon : FileText;
                      return (
                        <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="grid size-6 shrink-0 place-items-center rounded-glyph bg-black/[0.06] text-micro font-bold text-ink-3">{i + 1}</span>
                          <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{m.title}</span>
                          <Icon className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
                        </li>
                      );
                    })}
                  </ol>
                </section>
                <section className="squircle flex flex-col rounded-panel border border-hair bg-card">
                  <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider" className="px-4 pb-1 pt-3">{scs.length} scenarios{isCurrent ? "" : " · as they are now"}</Text>
                  <ul className="flex flex-col divide-y divide-hair">
                    {scs.map((sc) => (
                      <li key={sc.id} className="flex items-center gap-3 px-4 py-2.5">
                        <Mic className="size-4 shrink-0 text-brand" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-body font-semibold text-ink">{sc.title}</span>
                        <span className="shrink-0 text-caption text-ink-3">{CHARACTERS[characterOf(sc)].label}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </div>

            <div className="flex min-h-0 shrink-0 flex-col border-t border-hair lg:w-80 lg:border-l lg:border-t-0">
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
                <div className="flex flex-col gap-1">
                  <Tag p={selected} large />
                  <Text size="caption" tone="subtle">{selected.author} · {selected.day}</Text>
                </div>
                {isCurrent ? (
                  <div className="flex flex-col gap-2 rounded-control border border-hair bg-subtle p-3.5 text-body text-ink-2">
                    <span className="flex items-center gap-2 font-semibold text-ink"><Clock className="size-3.5 text-brand" aria-hidden="true" />This draft is still open.</span>
                    <span>Every change is saved as you go. Publishing makes it the next full version.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Text size="micro" weight="extrabold" tone="subtle" uppercase tracking="wider">What changed</Text>
                    <ul className="flex flex-col gap-1.5">
                      {selected.summary.map((s) => (
                        <li key={s.text} className="flex items-start gap-2 text-body leading-relaxed text-ink-2">
                          {s.by === "swishx" ? <Sparkles className="mt-1 size-3.5 shrink-0 text-brand" aria-hidden="true" /> : <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-4" />}
                          <span>{s.text}{s.by === "swishx" && <span className="text-ink-4"> · SwishX</span>}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {confirming && !isCurrent && (
                  <div className="flex flex-col gap-1 rounded-control border border-warn-line bg-warn-bg p-3.5 text-body text-ink-2">
                    <span className="font-bold text-ink">Restore {selected.label}?</span>
                    <span>The lessons go back to {selected.label}. What&apos;s live for reps doesn&apos;t change until you publish.</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-hair px-5 py-3">
                {isCurrent ? <Text size="caption" tone="subtle" className="mr-auto">The open draft is where you are.</Text>
                  : confirming ? (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Cancel</Button>
                      <Button size="sm" onClick={restore}><RotateCcw className="size-3.5" aria-hidden="true" />Restore</Button>
                    </>
                  ) : <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}><RotateCcw className="size-3.5" aria-hidden="true" />Restore this version</Button>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function Tag({ p, large }: { p: Point; large?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className={cn("rounded-glyph px-1.5 py-0.5 font-bold tabular-nums", large ? "text-body" : "text-caption",
        p.kind === "published" ? "bg-ok-bg text-ok" : p.kind === "current" ? "bg-tint text-brand-deep" : "bg-subtle text-ink-2")}>{p.label}</span>
      <span className={cn("font-semibold text-ink-3", large ? "text-body" : "text-caption")}>{p.kind === "published" ? "Published" : p.kind === "current" ? "Open draft" : "Draft"}</span>
    </span>
  );
}
