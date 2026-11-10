"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { X, ArrowRight, Trophy, Check, RotateCcw, BookOpenCheck, Clock, Lock, ListChecks } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { competency } from "@/data/org";
import type { Block, Course, Module } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Ring, EmptyState } from "@/components/patterns/academy";
import { BlockView, BLOCK_META } from "@/features/shared/block-view";
import { modulesOf, pathModules, pathDone, nextBlock } from "./use-rep";
import { useCopilot } from "@/features/copilot/copilot-store";

/** With no pass mark set on the course, a module check needs 70%. */
const DEFAULT_CHECK_PASS = 70;

type Screen = { kind: "intro" } | { kind: "step"; i: number } | { kind: "check"; q: number } | { kind: "result" } | { kind: "done" };

/**
 * A module, start to finish: an overview, the material one piece at a time (read, watch, walk, listen),
 * then a module check. Pass it to finish the module; miss it and you're pointed back to what to re-read.
 */
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

  const material = mod?.blocks.filter((b) => b.type !== "check") ?? [];
  const checks = mod?.blocks.filter((b) => b.type === "check") ?? [];
  const done = (bid: string) => !!p?.completedBlocks.includes(bid) || (explore && (s.explored[me.id] ?? []).includes(bid));
  const started = [...material, ...checks].some((b) => done(b.id));
  const resumeAt = material.findIndex((b) => !done(b.id));

  const [screen, setScreen] = useState<Screen>({ kind: "intro" });
  const [mediaDone, setMediaDone] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, number>>({});

  if (!c || !mod) return <div className="p-4"><EmptyState title="Nothing to learn here" /></div>;
  const path = explore || !p ? modulesOf(c) : pathModules(p, c);
  const pos = path.findIndex((m) => m.id === mod.id);
  const nextModule = path[pos + 1];
  const passMark = c.settings.completion.checks || DEFAULT_CHECK_PASS;
  const steps = material.length + (checks.length ? 1 : 0);
  const stepNo = screen.kind === "step" ? screen.i : screen.kind === "intro" ? -1 : material.length;

  function credit(b: Block) {
    if (!c || !mod) return;
    if (explore) {
      s.markExplored(me.id, b.id);
      /* Already learning for credit and this module is in the path: it counts straight away. */
      if (p && p.state !== "not_started" && p.path?.moduleIds.includes(mod.id)) s.completeBlock(p.id, b.id, b.minutes);
    } else if (p) {
      if (p.state === "not_started") s.startCourse(p.id);
      s.completeBlock(p.id, b.id, b.minutes);
    }
  }
  function next(i: number) {
    credit(material[i]);
    s.touchStreak(me.id);
    if (i < material.length - 1) setScreen({ kind: "step", i: i + 1 });
    else if (checks.length) { setAnswers({}); setScreen({ kind: "check", q: 0 }); }
    else setScreen({ kind: "done" });
  }
  function goModule(m: Module) {
    setScreen({ kind: "intro" });
    router.replace(`/rep/course/${c!.id}/learn?module=${m.id}${explore ? "&explore=1" : ""}`);
  }

  const header = (
    <div className="sticky top-0 z-20 flex flex-col gap-2.5 border-b border-hair bg-canvas/90 px-4 pb-3 pt-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <Link href={`/rep/course/${c.id}`} aria-label="Save and exit" className="grid size-10 shrink-0 place-items-center rounded-full bg-card shadow-hair transition-colors hover:bg-subtle"><X className="size-5" /></Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{explore ? "Exploring · " : ""}Module {pos + 1} of {path.length}</Text>
          <Text size="body-lg" weight="bold" truncate>{mod.title}</Text>
        </div>
        <button type="button" aria-label="Ask SwishX AI Agent about this module" onClick={() => useCopilot.getState().setOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-full bg-tint text-brand-deep transition-transform hover:scale-105"><AgentIcon className="size-4.5" aria-hidden="true" /></button>
      </div>
      {/* One segment per step: done, current, still to come. */}
      <div className="flex gap-1" aria-label={`Step ${Math.max(0, stepNo) + 1} of ${steps}`}>
        {Array.from({ length: steps }, (_, k) => {
          const b = k < material.length ? material[k] : undefined;
          const isDone = b ? done(b.id) : checks.every((x) => done(x.id));
          return <span key={k} className={cn("h-1.5 flex-1 rounded-full transition-colors", k === stepNo ? "bg-brand" : isDone ? "bg-brand/40" : "bg-black/[0.08]")} />;
        })}
      </div>
    </div>
  );

  /* ── Overview ── */
  if (screen.kind === "intro") {
    const minutes = mod.blocks.reduce((a, b) => a + b.minutes, 0);
    const allMaterialDone = resumeAt === -1;
    return (
      <div className="flex min-h-full flex-1 flex-col">
        {header}
        <div className="rise-in flex flex-1 flex-col gap-5 px-5 py-6">
          <div className="squircle relative overflow-hidden rounded-card bg-ink p-5 text-white">
            <div className="pointer-events-none absolute inset-0 opacity-60" style={{ background: "radial-gradient(circle at 90% 0%, var(--color-brand) 0, transparent 55%), radial-gradient(circle at 0% 100%, var(--color-brand-2) 0, transparent 50%)" }} />
            <div className="relative flex flex-col gap-2">
              <span className="flex items-center gap-2 text-caption font-bold text-white/70">
                <Clock className="size-3.5" aria-hidden="true" />~{minutes} min · {competency(mod.competency)?.name}{mod.required && <><Lock className="ml-1 size-3" aria-hidden="true" />Required</>}
              </span>
              <Text as="h1" size="display-lg" weight="extrabold" tone="inverse" tracking="tight" className="leading-tight">{mod.title}</Text>
              <Text size="body-lg" tone="inverse" className="opacity-80">{mod.summary}</Text>
            </div>
          </div>

          <section className="flex flex-col gap-2">
            <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">In this module</Text>
            <ol className="flex flex-col overflow-hidden rounded-panel border border-hair bg-card">
              {material.map((b, k) => {
                const Meta = BLOCK_META[b.type];
                const isDone = done(b.id);
                return (
                  <li key={b.id} className="flex items-center gap-3 border-b border-hair px-3.5 py-3 last:border-0">
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-control", isDone ? "bg-ok-bg text-ok" : "bg-subtle text-ink-2")}>
                      {isDone ? <Check className="size-4" aria-hidden="true" /> : <Meta.icon className="size-4" aria-hidden="true" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-semibold text-ink">{b.title}</span>
                      <span className="text-caption text-ink-3">{stepHint(b)} · {b.minutes} min</span>
                    </span>
                    <span className="text-caption font-semibold tabular-nums text-ink-4">{k + 1}</span>
                  </li>
                );
              })}
              {checks.length > 0 && (
                <li className="flex items-center gap-3 bg-tint/60 px-3.5 py-3">
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-control", checks.every((x) => done(x.id)) ? "bg-ok-bg text-ok" : "bg-brand text-white")}><ListChecks className="size-4" aria-hidden="true" /></span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body font-semibold text-ink">Module check</span>
                    <span className="text-caption text-ink-3">{checks.length} question{checks.length === 1 ? "" : "s"} · get {passMark}% to finish the module</span>
                  </span>
                </li>
              )}
            </ol>
          </section>
        </div>
        <Footer>
          <Button size="lg" className="flex-1" onClick={() => setScreen(allMaterialDone && checks.length ? { kind: "check", q: 0 } : { kind: "step", i: started && resumeAt > 0 ? resumeAt : 0 })}>
            {!started ? "Start module" : allMaterialDone ? (checks.length ? "Take the module check" : "Review the module") : "Continue where you left off"}<ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Footer>
      </div>
    );
  }

  /* ── One piece of material ── */
  if (screen.kind === "step") {
    const block = material[screen.i];
    const Meta = BLOCK_META[block.type];
    /* Video 90% watched with every chapter question answered, every assigned page read, every deck page walked. Audio is never gated. */
    const gated = !explore && !optional && ["video", "document", "visualaid"].includes(block.type) && !mediaDone[block.id] && !done(block.id);
    const gateLabel = block.type === "video" ? (block.video?.chapters.some((ch) => ch.check) ? "Watch it and answer the questions" : "Watch 90% to continue") : block.type === "document" ? "Read every page to continue" : "Walk every page to continue";
    const last = screen.i === material.length - 1;
    return (
      <div className="flex min-h-full flex-1 flex-col">
        {header}
        <div key={block.id} className="rise-in flex min-w-0 flex-1 flex-col gap-4 px-5 py-6">
          <span className="flex items-center gap-1.5 text-caption font-bold text-brand-deep"><Meta.icon className="size-3.5" aria-hidden="true" />{Meta.label} · {block.minutes} min</span>
          <Text as="h1" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">{block.title}</Text>
          <Text size="body" tone="subtle" className="-mt-2">{stepHint(block)}</Text>
          <BlockView block={block} sourceIds={c.sourceIds} interactive size="lg" siblings={mod.blocks}
            onComplete={() => setMediaDone((d) => (d[block.id] ? d : { ...d, [block.id]: true }))} />
        </div>
        <Footer>
          <Button size="lg" variant="secondary" onClick={() => setScreen(screen.i > 0 ? { kind: "step", i: screen.i - 1 } : { kind: "intro" })}>Back</Button>
          <Button size="lg" className="min-w-0 flex-1" disabled={gated} onClick={() => next(screen.i)}>
            <span className="truncate">{gated ? gateLabel : !last ? "Continue" : checks.length ? "Go to the module check" : "Finish module"}</span>
          </Button>
        </Footer>
      </div>
    );
  }

  /* ── Module check: one question at a time, answer shown straight away ── */
  if (screen.kind === "check") {
    const b = checks[screen.q];
    const ch = b.check!;
    const picked = answers[b.id];
    const answered = picked !== undefined;
    const right = picked === ch.answer;
    return (
      <div className="flex min-h-full flex-1 flex-col">
        {header}
        <div key={b.id} className="rise-in flex min-w-0 flex-1 flex-col gap-4 px-5 py-6">
          <span className="flex items-center gap-1.5 text-caption font-bold text-brand-deep"><ListChecks className="size-3.5" aria-hidden="true" />Module check · {screen.q + 1} of {checks.length}</span>
          <Text as="h1" size="display" weight="extrabold" tracking="tight" className="leading-snug">{ch.question}</Text>
          <div className="flex flex-col gap-2.5">
            {ch.options.map((o, i) => {
              const state = !answered ? "idle" : i === ch.answer ? "right" : picked === i ? "wrong" : "idle";
              return (
                <button key={i} type="button" disabled={answered} onClick={() => setAnswers({ ...answers, [b.id]: i })}
                  className={cn("squircle flex min-h-[56px] items-center gap-3 rounded-control border px-4 py-3 text-left text-subhead transition-all",
                    state === "idle" && "border-hair-2 bg-card", state === "idle" && !answered && "hover:border-brand hover:bg-tint active:scale-[0.99]",
                    state === "idle" && answered && "opacity-50",
                    state === "right" && "border-ok bg-ok-bg font-semibold text-ok", state === "wrong" && "border-danger bg-danger-bg text-danger")}>
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-caption font-bold", state === "idle" ? "border-hair-2 text-ink-3" : "border-current")}>{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1">{o}</span>
                  {state === "right" && <Check className="size-5" aria-hidden="true" />}
                  {state === "wrong" && <X className="size-5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {answered && (
            <div className={cn("rise-in squircle rounded-panel px-4 py-3", right ? "bg-ok-bg" : "bg-warn-bg")}>
              <Text size="body-lg" tone="muted"><strong className={right ? "text-ok" : "text-warn"}>{right ? "Correct. " : "Not quite. "}</strong>{ch.rationale}</Text>
            </div>
          )}
        </div>
        <Footer>
          <Button size="lg" className="flex-1" disabled={!answered} onClick={() => setScreen(screen.q < checks.length - 1 ? { kind: "check", q: screen.q + 1 } : { kind: "result" })}>
            {!answered ? "Pick an answer" : screen.q < checks.length - 1 ? "Next question" : "See your result"}<ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Footer>
      </div>
    );
  }

  /* ── Result: pass to finish, or re-read and retake ── */
  if (screen.kind === "result") {
    const correct = checks.filter((b) => answers[b.id] === b.check!.answer);
    const score = Math.round((correct.length / checks.length) * 100);
    const passed = score >= passMark || explore;
    const missed = checks.filter((b) => !correct.includes(b));
    return (
      <div className="flex min-h-full flex-1 flex-col">
        {header}
        <div className="rise-in flex flex-1 flex-col items-center gap-4 px-5 py-8 text-center">
          <Ring value={score} size={112} stroke={10} tone={passed ? "ok" : "brand"} label={`Module check ${score}%`}>
            <Text size="hero" weight="extrabold" tabular>{correct.length}/{checks.length}</Text>
          </Ring>
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">{passed ? "You passed" : "Not yet"}</Text>
          <Text size="subhead" tone="muted">{passed ? `${score}% on the module check.` : `${score}% · you need ${passMark}%. Re-read what you missed, then retake it.`}</Text>
          {missed.length > 0 && (
            <div className="flex w-full flex-col gap-2 text-left">
              <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">Worth another look</Text>
              {missed.map((b) => {
                const k = revisitFor(b, material);
                return (
                  <button key={b.id} type="button" onClick={() => setScreen({ kind: "step", i: k })}
                    className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3 text-left transition-colors hover:bg-subtle">
                    <BookOpenCheck className="size-5 shrink-0 text-brand" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body font-semibold text-ink">{material[k]?.title}</span>
                      <span className="truncate text-caption text-ink-3">For: {b.check!.question}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <Footer>
          {passed ? (
            <Button size="lg" className="flex-1" onClick={() => { checks.forEach(credit); s.touchStreak(me.id); setScreen({ kind: "done" }); }}>Finish module<ArrowRight className="size-4" aria-hidden="true" /></Button>
          ) : (
            <>
              <Button size="lg" variant="secondary" onClick={() => setScreen({ kind: "step", i: 0 })}>Review</Button>
              <Button size="lg" className="flex-1" onClick={() => { setAnswers({}); setScreen({ kind: "check", q: 0 }); }}><RotateCcw className="size-4" aria-hidden="true" />Retake the check</Button>
            </>
          )}
        </Footer>
      </div>
    );
  }

  /* ── Module finished ── */
  return <ModuleDone c={c} mod={mod} explore={explore} optional={optional} nextModule={nextModule} onNext={goModule} />;
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 z-20 flex gap-2 border-t border-hair bg-canvas/90 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3 backdrop-blur-xl">{children}</div>;
}

/** What the rep does with this piece of material. */
function stepHint(b: Block) {
  if (b.type === "video") {
    const n = b.video?.chapters.filter((ch) => ch.check).length ?? 0;
    return `${b.video?.origin === "youtube" ? "Watch on YouTube" : "Watch"}${n ? ` · ${n} question${n === 1 ? "" : "s"} along the way` : ""}`;
  }
  if (b.type === "document") return `Read ${b.document?.pages.length} page${b.document?.pages.length === 1 ? "" : "s"}`;
  if (b.type === "visualaid") return `Walk ${b.visualaid?.pages.length} page${b.visualaid?.pages.length === 1 ? "" : "s"} of the deck`;
  if (b.type === "audio") return "Listen";
  if (b.type === "graphic") return "At a glance";
  if (b.type === "flashcards") return `${b.cards?.length} cards to flip`;
  if (b.type === "scenario") return "Practise the call";
  return "Read";
}

/** The material a missed question came from: the nearest earlier block that teaches its topic. */
function revisitFor(check: Block, material: Block[]) {
  const comps = check.competencies;
  const k = material.findLastIndex((b) => b.competencies.some((x) => comps.includes(x)) && b.type !== "scenario");
  return Math.max(0, k);
}

function ModuleDone({ c, mod, explore, optional, nextModule, onNext }: { c: Course; mod: Module; explore: boolean; optional: boolean; nextModule?: Module; onNext: (m: Module) => void }) {
  const router = useRouter();
  const me = useMe();
  const p = useApp((s) => s.progress.find((x) => x.userId === me.id && x.courseId === c.id));
  const allDone = p && !explore ? pathDone(p, c) : false;
  const linear = !c.settings.completion.assessment;
  return (
    <div className="flex min-h-full flex-1 flex-col items-center gap-5 px-6 pb-8 pt-16 text-center">
      <div className={cn("success-pop grid size-20 place-items-center rounded-full text-white", explore ? "bg-ink" : "bg-brand shadow-brand-lift")}><Trophy className="size-9" aria-hidden="true" /></div>
      <Text as="h1" size="hero" weight="extrabold" tracking="tight">{explore ? "Module explored" : allDone ? "Path complete" : "Module done"}</Text>
      <Text size="subhead" tone="muted">{mod.title}{explore ? " · not for credit. It's ticked off if you get certified later." : optional ? " · optional review" : ""}</Text>
      <span className="rounded-chip bg-tint px-3 py-1 text-body font-bold text-brand-deep">+{mod.blocks.length * 5 + (explore ? 0 : 20)} XP</span>
      <div className="mt-auto flex w-full flex-col gap-2">
        {allDone ? (
          linear
            ? <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/attest`)}>Sign attestation<ArrowRight className="size-4" aria-hidden="true" /></Button>
            : <Button size="lg" fullWidth onClick={() => router.push(`/rep/course/${c.id}/assessment`)}><AgentIcon className="size-4" aria-hidden="true" />{p?.state === "needs_coaching" ? "Resubmit your roleplay" : "Take the final assessment"}</Button>
        ) : nextModule && !optional ? (
          <Button size="lg" fullWidth onClick={() => onNext(nextModule)}><span className="truncate">Next: {nextModule.title}</span><ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Button>
        ) : null}
        <Button size="lg" fullWidth variant="ghost" onClick={() => router.push(`/rep/course/${c.id}`)}>Back to course</Button>
      </div>
    </div>
  );
}
