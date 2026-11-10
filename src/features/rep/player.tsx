"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { X, ArrowRight, Trophy } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Meter, EmptyState } from "@/components/patterns/academy";
import { BlockView, BLOCK_META } from "@/features/shared/block-view";
import { modulesOf, pathModules, pathDone, nextBlock } from "./use-rep";
import { useCopilot } from "@/features/copilot/copilot-store";

/** R7: one block per screen, thumb-reachable Continue, save-and-exit anywhere (PRD RH-3). */
export function BlockPlayer() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  const optional = search.get("optional") === "1";
  /* Explore: open anything, not for credit. Also the mode for Library courses the rep hasn't started. */
  const explore = search.get("explore") === "1" || !p || (p.state === "not_started" && !!c?.settings.screening);
  const moduleId = search.get("module") ?? (p && c ? nextBlock(p, c)?.module.id : undefined);
  const mod = useMemo(() => (c ? modulesOf(c).find((m) => m.id === moduleId) ?? (p ? pathModules(p, c)[0] : undefined) : undefined), [c, p, moduleId]);
  const firstOpen = mod && p && p.state !== "not_started" ? Math.max(0, mod.blocks.findIndex((b) => !p.completedBlocks.includes(b.id))) : 0;
  const [idx, setIdx] = useState(firstOpen);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [doneScreen, setDoneScreen] = useState(false);
  const [mediaDone, setMediaDone] = useState<Record<string, boolean>>({});

  if (!c || !mod) return <div className="p-4"><EmptyState title="Nothing to learn here" /></div>;
  const completed = (id: string) => !!p?.completedBlocks.includes(id) || (explore && (s.explored[me.id] ?? []).includes(id));
  const block = mod.blocks[Math.min(idx, mod.blocks.length - 1)];
  const Meta = BLOCK_META[block.type];
  const needsAnswer = !explore && block.type === "check" && !answered[block.id] && !completed(block.id);
  /* Video 90% watched, every assigned page read, every visual-aid page walked. Audio is never gated: it repeats approved text. */
  const gated = !explore && ["video", "document", "visualaid"].includes(block.type) && !mediaDone[block.id] && !completed(block.id) && !optional;
  const gateLabel = block.type === "video" ? "Watch 90% to continue" : block.type === "document" ? "Read every page to continue" : "Walk every page to continue";
  const path = explore || !p ? modulesOf(c) : pathModules(p, c);
  const nextModule = path[path.findIndex((m) => m.id === mod.id) + 1];

  function advance() {
    if (!c || !mod) return;
    if (explore) {
      s.markExplored(me.id, block.id);
      /* Already learning for credit and this module is in the path: it counts straight away. */
      if (p && p.state !== "not_started" && p.path?.moduleIds.includes(mod.id)) s.completeBlock(p.id, block.id, block.minutes);
    } else if (p) {
      if (p.state === "not_started") s.startCourse(p.id);
      s.completeBlock(p.id, block.id, block.minutes);
    }
    s.touchStreak(me.id);
    if (idx < mod.blocks.length - 1) setIdx(idx + 1);
    else setDoneScreen(true);
  }

  if (doneScreen && (explore || !p)) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center gap-5 px-6 pb-8 pt-16 text-center">
        <div className="success-pop grid size-20 place-items-center rounded-full bg-ink text-white"><Trophy className="size-9" aria-hidden="true" /></div>
        <Text as="h1" size="hero" weight="extrabold" tracking="tight">Module explored</Text>
        <Text size="subhead" tone="muted">{mod.title} · not for credit. It's ticked off if you get certified later.</Text>
        <span className="rounded-chip bg-tint px-3 py-1 text-body font-bold text-brand-deep">+{mod.blocks.length * 5} XP</span>
        <div className="mt-auto flex w-full flex-col gap-2">
          {nextModule && <Button size="lg" fullWidth onClick={() => { setDoneScreen(false); setIdx(0); router.replace(`/rep/course/${c.id}/learn?module=${nextModule.id}&explore=1`); }}>Next: {nextModule.title}<ArrowRight className="size-4" aria-hidden="true" /></Button>}
          <Button size="lg" fullWidth variant="ghost" onClick={() => router.push(`/rep/course/${c.id}`)}>Back to course</Button>
        </div>
      </div>
    );
  }

  if (doneScreen && p) {
    const fresh = useApp.getState().progress.find((x) => x.id === p.id)!;
    const allDone = pathDone(fresh, c);
    const linear = !c.settings.completion.assessment;
    return (
      <div className="flex min-h-full flex-1 flex-col items-center gap-5 px-6 pb-8 pt-16 text-center">
        <div className="success-pop grid size-20 place-items-center rounded-full bg-brand text-white shadow-brand-lift"><Trophy className="size-9" aria-hidden="true" /></div>
        <Text as="h1" size="hero" weight="extrabold" tracking="tight">{allDone ? "Path complete" : "Module done"}</Text>
        <Text size="subhead" tone="muted">{mod.title}{optional ? " · optional review" : ""}</Text>
        <span className="rounded-chip bg-tint px-3 py-1 text-body font-bold text-brand-deep">+{mod.blocks.length * 5 + 20} XP</span>
        <div className="mt-auto flex w-full flex-col gap-2">
          {allDone ? (
            linear
              ? <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/attest`)}>Sign attestation<ArrowRight className="size-4" aria-hidden="true" /></Button>
              : <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/assessment`)}><AgentIcon className="size-4" aria-hidden="true" />{fresh.state === "needs_coaching" ? "Resubmit your roleplay" : "Take the final assessment"}</Button>
          ) : nextModule && !optional ? (
            <Button size="lg" fullWidth onClick={() => { setDoneScreen(false); setIdx(0); router.replace(`/rep/course/${c.id}/learn?module=${nextModule.id}`); }}>Next: {nextModule.title}<ArrowRight className="size-4" aria-hidden="true" /></Button>
          ) : null}
          <Button size="lg" fullWidth variant="ghost" onClick={() => router.push(`/rep/course/${c.id}`)}>Back to course</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-hair bg-canvas/95 px-4 py-3 backdrop-blur">
        <Link href={`/rep/course/${c.id}`} aria-label="Save and exit" className="grid size-10 shrink-0 place-items-center rounded-full bg-subtle"><X className="size-5" /></Link>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex justify-between gap-2 text-caption text-ink-3"><span className="truncate">{explore ? "Exploring · " : ""}{mod.title}</span><span className="shrink-0">{idx + 1} / {mod.blocks.length}</span></div>
          <Meter value={((idx + (completed(block.id) ? 1 : 0)) / mod.blocks.length) * 100} height={6} label="Module progress" />
        </div>
        <button type="button" aria-label="Ask SwishX AI Agent about this module" onClick={() => useCopilot.getState().setOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-full bg-tint text-brand-deep"><AgentIcon className="size-4.5" aria-hidden="true" /></button>
      </div>
      <div key={block.id} className="rise-in flex flex-1 flex-col gap-4 px-5 py-6">
        <span className="flex items-center gap-1.5 text-caption font-bold text-brand-deep"><Meta.icon className="size-3.5" aria-hidden="true" />{Meta.label} · {block.minutes} min</span>
        <Text as="h1" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">{block.title}</Text>
        <BlockView block={block} sourceIds={c.sourceIds} interactive size="lg" siblings={mod.blocks} onCheckAnswered={() => setAnswered({ ...answered, [block.id]: true })}
          onComplete={() => setMediaDone((d) => (d[block.id] ? d : { ...d, [block.id]: true }))} />
      </div>
      <div className="sticky bottom-0 flex gap-2 border-t border-hair bg-canvas/95 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur">
        {idx > 0 && <Button size="lg" variant="secondary" onClick={() => setIdx(idx - 1)}>Back</Button>}
        <Button size="lg" fullWidth disabled={needsAnswer || gated} onClick={advance}>{needsAnswer ? "Answer to continue" : gated ? gateLabel : idx < mod.blocks.length - 1 ? "Continue" : "Finish module"}</Button>
      </div>
    </div>
  );
}
