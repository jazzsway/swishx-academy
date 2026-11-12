"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { X, RotateCcw, Check, ArrowRight } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { competency } from "@/data/org";
import type { Module } from "@/data/types";
import { moduleCards, TEMPLATES } from "@/lib/short-form";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Ring, EmptyState } from "@/components/patterns/academy";
import { CardFace, CoverFace, DeckProgress, DeckStage } from "@/features/shortform/card-deck";
import { useCopilot } from "@/features/copilot/copilot-store";
import { modulesOf, pathModules, nextBlock } from "./use-rep";
import { ModuleDone } from "./player";

const DEFAULT_CHECK_PASS = 70;

/**
 * A short-form module: the same approved content as cards, one idea each. A cover, the cards, then
 * the module's questions. Pass them to finish; miss them and go back over the cards.
 */
export function ShortPlayer() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const me = useMe();
  const s = useApp();
  const p = s.progress.find((x) => x.userId === me.id && x.courseId === id);
  const c = s.courses.find((x) => x.id === id);
  const optional = search.get("optional") === "1";
  const explore = search.get("explore") === "1" || !p || (p.state === "not_started" && !!c?.settings.screening);
  /* Held once the rep earns credit here, so finishing the module doesn't jump to the next one underneath them. */
  const [pinned, setPinned] = useState<string>();
  const moduleId = pinned ?? search.get("module") ?? (p && c ? nextBlock(p, c)?.module.id : undefined);
  const mod = useMemo(() => (c ? modulesOf(c).find((m) => m.id === moduleId) ?? (p ? pathModules(p, c)[0] : undefined) : undefined), [c, p, moduleId]);
  const cards = useMemo(() => (mod ? moduleCards(mod) : []), [mod]);

  const [i, setI] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [retakes, setRetakes] = useState(0);
  const [finished, setFinished] = useState(false);

  if (!c || !mod) return <div className="p-4"><EmptyState title="Nothing to learn here" /></div>;
  const template = c.template ?? "essentials";
  const path = explore || !p ? modulesOf(c) : pathModules(p, c);
  const pos = path.findIndex((m) => m.id === mod.id);
  const nextModule = path[pos + 1];
  const passMark = c.settings.completion.checks || DEFAULT_CHECK_PASS;
  const checks = cards.filter((x) => x.role === "check");
  const firstCheck = cards.findIndex((x) => x.role === "check");
  /* Cover, every card, then the result when there are questions. */
  const total = 1 + cards.length + (checks.length ? 1 : 0);
  const card = i >= 1 && i <= cards.length ? cards[i - 1] : undefined;
  const onResult = checks.length > 0 && i === total - 1;
  const correct = checks.filter((x) => x.role === "check" && answers[x.id] === x.answer).length;
  const score = checks.length ? Math.round((correct / checks.length) * 100) : 100;
  const passed = score >= passMark || explore;

  function credit(blockId: string) {
    const b = mod!.blocks.find((x) => x.id === blockId);
    if (!b) return;
    setPinned(mod!.id);
    if (explore) {
      s.markExplored(me.id, b.id);
      if (p && p.state !== "not_started" && p.path?.moduleIds.includes(mod!.id)) s.completeBlock(p.id, b.id, b.minutes);
    } else if (p) {
      if (p.state === "not_started") s.startCourse(p.id);
      s.completeBlock(p.id, b.id, b.minutes);
    }
  }
  function go(n: number) {
    /* Leaving a block's last card counts that block as read. */
    if (n > i && card && card.role !== "check" && cards[i]?.blockId !== card.blockId) credit(card.blockId);
    setDir(n > i ? 1 : -1);
    setI(Math.max(0, Math.min(total - 1, n)));
  }
  function finish() {
    mod!.blocks.forEach((b) => credit(b.id));
    s.touchStreak(me.id);
    if (p && !explore) {
      s.earn(me.id, "module", `Finished ${c!.title} · ${mod!.title}`, { key: `mod-${p.id}-${mod!.id}` });
      if (checks.length) s.earn(me.id, "check", retakes ? "Passed the quick check" : "Passed the quick check, first try", { points: retakes ? 10 : 15, key: `chk-${p.id}-${mod!.id}` });
    }
    setFinished(true);
  }
  function goModule(m: Module) {
    setI(0); setAnswers({}); setFlipped({}); setRetakes(0); setFinished(false); setPinned(undefined);
    router.replace(`/rep/course/${c!.id}/learn?module=${m.id}${explore ? "&explore=1" : ""}`);
  }

  if (finished) return <ModuleDone c={c} mod={mod} explore={explore} optional={optional} nextModule={nextModule} onNext={goModule} earned={explore ? 0 : 20 + (checks.length ? (retakes ? 10 : 15) : 0)} />;

  const last = i === total - 1;
  const canNext = !(card?.role === "check" && answers[card.id] === undefined) && !(onResult && !passed);
  const nextLabel = i === 0 ? "Start" : onResult ? "Finish" : last ? "Finish" : card?.role === "check" && cards[i]?.role !== "check" ? "See result" : "Next";

  return (
    <div className="flex h-dvh flex-col sm:h-auto sm:min-h-0 sm:flex-1">
      <div className="flex flex-col gap-3 px-4 pt-3">
        <div className="flex items-center gap-3">
          <Link href={`/rep/course/${c.id}`} aria-label="Save and exit" className="grid size-10 shrink-0 place-items-center rounded-full bg-card shadow-hair transition-colors hover:bg-subtle"><X className="size-5" /></Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <Text size="micro" weight="bold" tone="subtle" uppercase tracking="wider">{explore ? "Exploring · " : ""}Module {pos + 1} of {path.length} · {TEMPLATES[template].label}</Text>
            <Text size="body-lg" weight="bold" truncate>{mod.title}</Text>
          </div>
          <button type="button" aria-label="Ask SwishX AI Agent about this module" onClick={() => useCopilot.getState().setOpen(true)} className="grid size-10 shrink-0 place-items-center rounded-full bg-tint text-brand-deep transition-transform hover:scale-105"><AgentIcon className="size-4.5" aria-hidden="true" /></button>
        </div>
        <DeckProgress index={i} total={total} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4">
        <DeckStage index={i} total={total} dir={dir} onPrev={() => go(i - 1)} onNext={() => (onResult || last ? finish() : go(i + 1))} canNext={canNext} nextLabel={nextLabel}>
          {i === 0 ? (
            <CoverFace template={template} kicker={`${TEMPLATES[template].label} · Module ${pos + 1}`} title={mod.title}
              meta={`${cards.length} cards · about ${Math.max(1, Math.round(cards.length * 0.35))} min · ${competency(mod.competency)?.name}`}>
              <Text size="body" tone="inverse" className="opacity-70">{mod.summary}</Text>
              <Text size="caption" tone="inverse" className="opacity-60">Swipe or use the arrows. {checks.length ? `${checks.length} question${checks.length === 1 ? "" : "s"} at the end.` : ""}</Text>
            </CoverFace>
          ) : card ? (
            <CardFace card={card} template={template} sourceIds={c.sourceIds} answer={answers[card.id]} onAnswer={(a) => setAnswers({ ...answers, [card.id]: a })}
              flipped={flipped[card.id]} onFlip={() => setFlipped({ ...flipped, [card.id]: !flipped[card.id] })} />
          ) : (
            <div className="squircle flex h-full flex-col items-center justify-center gap-4 rounded-[28px] border border-hair bg-card p-6 text-center shadow-float">
              <Ring value={score} size={112} stroke={10} tone={passed ? "ok" : "brand"} label={`Quick check ${score}%`}>
                <span className="text-display font-extrabold tabular-nums">{score}%</span>
              </Ring>
              <Text as="h2" size="hero" weight="extrabold" tracking="tight">{passed ? "You passed" : "Not yet"}</Text>
              <Text size="subhead" tone="muted">{correct} of {checks.length} right{passed ? "." : ` · you need ${passMark}%. Go back over the cards, then try the questions again.`}</Text>
              {passed && !explore && <span className="flex items-center gap-1.5 rounded-chip bg-tint px-3 py-1 text-body font-bold text-brand-deep"><Check className="size-4" aria-hidden="true" />+{20 + (retakes ? 10 : 15)} points</span>}
              {!passed && (
                <div className="flex w-full flex-col gap-2 pt-2">
                  <Button size="lg" fullWidth onClick={() => { setAnswers({}); setRetakes(retakes + 1); go(firstCheck + 1); }}><RotateCcw className="size-4" aria-hidden="true" />Try the questions again</Button>
                  <Button size="lg" fullWidth variant="secondary" onClick={() => { setAnswers({}); setRetakes(retakes + 1); setDir(-1); setI(1); }}>Go over the cards<ArrowRight className={cn("size-4")} aria-hidden="true" /></Button>
                </div>
              )}
            </div>
          )}
        </DeckStage>
      </div>
    </div>
  );
}
