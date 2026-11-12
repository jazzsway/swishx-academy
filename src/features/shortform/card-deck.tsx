"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, X, Quote, Ban, RotateCw, Sparkles, Lightbulb, Layers, PlayCircle, HelpCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/cn";
import { SOURCES } from "@/data/org";
import type { ShortTemplate } from "@/data/types";
import { TEMPLATES, type CardRole, type ShortCard } from "@/lib/short-form";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { BlockView } from "@/features/shared/block-view";

const ROLE_ICON: Record<CardRole, typeof Check> = { idea: Lightbulb, point: Sparkles, flip: Layers, media: PlayCircle, check: HelpCircle };

/** Where a card's words come from, e.g. "Prescribing Information p. 4". */
function CiteChip({ sourceId, page }: { sourceId: string; page: number }) {
  const s = SOURCES.find((x) => x.id === sourceId);
  return <span className="max-w-[55%] truncate rounded-chip bg-subtle px-2 py-0.5 text-micro font-semibold text-ink-3" title={s?.title}><BookOpen className="mr-1 inline size-3 align-[-2px]" aria-hidden="true" />{s?.title ?? "Source"} p. {page}</span>;
}

function Eyebrow({ role, template, extra }: { role: CardRole; template: ShortTemplate; extra?: ReactNode }) {
  const Icon = ROLE_ICON[role];
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1.5 rounded-chip bg-tint px-2.5 py-1 text-micro font-bold uppercase tracking-wider text-brand-deep">
        <Icon className="size-3.5" aria-hidden="true" />{TEMPLATES[template].eyebrow[role]}
      </span>
      <span className="ml-auto" />
      {extra}
    </div>
  );
}

/**
 * The cover of a short-form course or module, designed per template, around the real title:
 * Essentials is a checklist, At a glance has quick-fact tiles, Objection handler is a conversation,
 * Label update carries an "Updated" tape, Myth vs fact is split in two. `mini` shrinks it for pickers.
 */
export function CoverFace({ template, kicker, title, meta, children, mini }: { template: ShortTemplate; kicker: string; title: string; meta?: string; children?: ReactNode; mini?: boolean }) {
  const t = TEMPLATES[template];
  const z = mini
    ? { pad: "p-2.5 gap-1.5", kick: "text-[7px] px-1.5 py-0.5", title: "text-[13px] leading-[1.1]", small: "text-[7px]", icon: "size-2.5", dot: "size-3", radius: "rounded-[14px]", grid: "9px" }
    : { pad: "p-6 gap-3", kick: "text-micro px-2.5 py-1", title: "text-hero leading-[1.05]", small: "text-caption", icon: "size-3.5", dot: "size-5", radius: "rounded-[28px]", grid: "22px" };
  const Kicker = <span className={cn("self-start rounded-chip bg-white/15 font-bold uppercase tracking-wider text-white/90", z.kick)}>{kicker}</span>;
  const Title = <h2 className={cn("font-extrabold tracking-tight text-white", z.title, mini ? "line-clamp-4" : "")}>{title}</h2>;
  const Meta = !mini && meta ? <Text size="body-lg" tone="inverse" className="opacity-75">{meta}</Text> : null;
  const bar = (w: string, cls = "bg-white/25") => <span className={cn("block h-[3px] rounded-full", mini ? "h-[2px]" : "h-1", cls)} style={{ width: w }} />;

  let body: ReactNode;
  switch (template) {
    case "essentials":
      body = (<>
        {Kicker}{Title}{Meta}
        <ul className={cn("mt-auto flex flex-col", mini ? "gap-1" : "gap-2.5")} aria-hidden="true">
          {["78%", "62%", "70%"].map((w, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className={cn("grid shrink-0 place-items-center rounded-full", z.dot)} style={{ background: t.accent }}><Check className={cn("text-white", z.icon)} /></span>{bar(w)}
            </li>
          ))}
        </ul>
      </>);
      break;
    case "glance":
      body = (<>
        <span className={cn("absolute rounded-full border-white/25", mini ? "-right-4 -top-4 size-16 border-[6px]" : "-right-10 -top-10 size-44 border-[18px]")} style={{ borderColor: t.accent, opacity: 0.55 }} aria-hidden="true" />
        {Kicker}<div className="mt-auto flex flex-col gap-1.5">{Title}{Meta}</div>
        <div className={cn("grid grid-cols-3", mini ? "gap-1" : "gap-2")} aria-hidden="true">
          {["Who", "Data", "Dose"].map((x) => <span key={x} className={cn("rounded-[6px] bg-white/10 font-bold text-white/80", mini ? "px-1 py-1 text-[7px]" : "rounded-control px-2.5 py-2 text-caption")}>{x}</span>)}
        </div>
      </>);
      break;
    case "objection":
      body = (<>
        {Kicker}
        <div className={cn("relative mt-auto self-start bg-white text-ink", mini ? "max-w-[92%] rounded-[10px] rounded-bl-[3px] p-2" : "max-w-[90%] rounded-[22px] rounded-bl-[6px] p-5")}>
          <Quote className={cn("mb-1", mini ? "size-2.5" : "size-5")} style={{ color: t.ink }} aria-hidden="true" />
          <h2 className={cn("font-extrabold tracking-tight", mini ? "line-clamp-3 text-[11px] leading-[1.15]" : "text-display-lg leading-tight")}>{title}</h2>
        </div>
        <span className={cn("self-end font-bold text-white", mini ? "rounded-[10px] rounded-br-[3px] px-2 py-1 text-[7px]" : "rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-body")} style={{ background: t.accent }}>Here&apos;s what to say</span>
        {Meta}
      </>);
      break;
    case "label":
      body = (<>
        <span className={cn("absolute rotate-[35deg] text-center font-black uppercase tracking-widest text-ink", mini ? "-right-7 top-3 w-24 py-0.5 text-[7px]" : "-right-16 top-8 w-64 py-1.5 text-caption")} style={{ background: t.accent }} aria-hidden="true">Updated</span>
        {Kicker}<div className="mt-auto flex flex-col gap-1.5">{Title}{Meta}</div>
        <div className={cn("flex flex-col", mini ? "gap-1" : "gap-2")} aria-hidden="true">
          <span className="flex items-center gap-2"><span className={cn("w-9 shrink-0 font-bold text-white/45", z.small)}>Before</span><span className="relative flex-1">{bar("85%", "bg-white/20")}<span className="absolute inset-x-0 top-1/2 h-px bg-white/50" /></span></span>
          <span className="flex items-center gap-2"><span className={cn("w-9 shrink-0 font-bold", z.small)} style={{ color: t.accent }}>Now</span><span className="flex-1"><span className={cn("block rounded-full", mini ? "h-[2px]" : "h-1")} style={{ width: "70%", background: t.accent }} /></span></span>
        </div>
      </>);
      break;
    case "myth":
      body = (<>
        <div className={cn("flex items-center gap-1.5 bg-white/[0.08] font-bold uppercase tracking-wider text-white/55", mini ? "rounded-[8px] px-2 py-1 text-[7px]" : "rounded-panel px-4 py-3 text-caption")}>
          <X className={z.icon} aria-hidden="true" /><span className="line-through">Myth</span>
        </div>
        <div className="flex flex-1 flex-col justify-center gap-1.5">{Kicker}{Title}{Meta}</div>
        <div className={cn("flex items-center gap-1.5 font-bold uppercase tracking-wider text-ink", mini ? "rounded-[8px] px-2 py-1 text-[7px]" : "rounded-panel px-4 py-3 text-caption")} style={{ background: t.accent }}>
          <Check className={z.icon} aria-hidden="true" />Fact
        </div>
      </>);
      break;
  }

  return (
    <div className={cn("squircle relative flex h-full flex-col overflow-hidden bg-ink text-white", z.radius, z.pad)}>
      <div className="pointer-events-none absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 85% 8%, ${t.accent} 0, transparent 55%), radial-gradient(circle at 0% 100%, var(--color-brand-2) 0, transparent 45%)` }} />
      {template === "essentials" && <div className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)", backgroundSize: `${z.grid} ${z.grid}` }} />}
      <div className={cn("relative flex flex-1 flex-col", z.pad.split(" ")[1])}>
        {body}
        {!mini && children}
      </div>
    </div>
  );
}

/** One card's content. Answers and flips live with the deck, so going back keeps them. */
export function CardFace({ card, template, sourceIds, answer, onAnswer, flipped, onFlip }: {
  card: ShortCard; template: ShortTemplate; sourceIds: string[];
  answer?: number; onAnswer?: (i: number) => void; flipped?: boolean; onFlip?: () => void;
}) {
  const shell = "squircle flex h-full flex-col gap-4 overflow-y-auto rounded-[28px] border border-hair bg-card p-6 shadow-float";

  if (card.role === "flip") {
    return (
      <button type="button" onClick={onFlip} aria-label={flipped ? "Show the question side" : "Flip the card"}
        className={cn(shell, "text-left transition-colors", flipped && "border-ok-line bg-ok-bg")}>
        <Eyebrow role="flip" template={template} extra={<span className="flex items-center gap-1 text-micro font-bold text-ink-3"><RotateCw className="size-3.5" aria-hidden="true" />{flipped ? "Answer" : "Tap to flip"}</span>} />
        <div className="my-auto flex flex-col gap-3">
          {flipped && <Text size="caption" weight="bold" tone="subtle">{card.front}</Text>}
          <Text size={flipped ? "display" : "display-lg"} weight="extrabold" tracking="tight" className="leading-tight" tone={flipped ? "ok" : "default"}>{flipped ? card.back : card.front}</Text>
        </div>
      </button>
    );
  }

  if (card.role === "check") {
    const answered = answer !== undefined;
    return (
      <div className={shell}>
        <Eyebrow role="check" template={template} />
        <Text size="display" weight="extrabold" tracking="tight" className="leading-snug">{card.question}</Text>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={card.question}>
          {card.options.map((o, i) => {
            const right = answered && i === card.answer;
            const wrong = answered && i === answer && i !== card.answer;
            return (
              <button key={i} type="button" role="radio" aria-checked={answer === i} disabled={answered} onClick={() => onAnswer?.(i)}
                className={cn("squircle flex items-center gap-3 rounded-panel border px-4 py-3.5 text-left text-body-lg font-semibold transition-colors",
                  right ? "border-ok-line bg-ok-bg text-ok" : wrong ? "border-danger-line bg-danger-bg text-danger" : answered ? "border-hair text-ink-3" : "border-hair-2 bg-card hover:border-brand hover:bg-tint")}>
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-caption font-bold", right ? "bg-ok text-white" : wrong ? "bg-danger text-white" : "bg-subtle text-ink-3")}>
                  {right ? <Check className="size-4" aria-hidden="true" /> : wrong ? <X className="size-4" aria-hidden="true" /> : String.fromCharCode(65 + i)}
                </span>
                {o}
              </button>
            );
          })}
        </div>
        {answered && card.rationale && (
          <div className="rise-in squircle flex flex-col gap-0.5 rounded-panel bg-subtle px-4 py-3">
            <Text size="body" weight="bold" tone={answer === card.answer ? "ok" : "danger"}>{answer === card.answer ? "Right." : "Not quite."}</Text>
            <Text size="body" tone="muted">{card.rationale}</Text>
          </div>
        )}
      </div>
    );
  }

  if (card.role === "media") {
    return (
      <div className={cn(shell, "gap-3 p-4")}>
        <div className="px-2 pt-2"><Eyebrow role="media" template={template} /></div>
        <Text size="title" weight="bold" className="px-2">{card.block.title}</Text>
        <BlockView block={card.block} sourceIds={sourceIds} interactive />
      </div>
    );
  }

  const point = card.role === "point" && !card.say;
  return (
    <div className={shell}>
      <Eyebrow role={card.role} template={template} extra={card.cite && <CiteChip {...card.cite} />} />
      <div className="my-auto flex flex-col gap-3">
        {card.stat && <Text size="hero-lg" weight="black" tone="brand" tracking="tight" className="leading-none">{card.stat}</Text>}
        {card.title && <Text as="h2" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">{card.title}</Text>}
        {card.body && (card.title
          ? <Text size="subhead" tone="muted" className="leading-relaxed">{card.body}</Text>
          : <Text size="display" weight={point ? "extrabold" : "semibold"} tracking="tight" className="leading-snug">{card.body}</Text>)}
      </div>
      {card.say && (
        <div className="squircle flex gap-2.5 rounded-panel border border-tint-line bg-tint px-4 py-3">
          <Quote className="mt-0.5 size-4 shrink-0 text-brand-deep" aria-hidden="true" />
          <Text size="body-lg" weight="semibold" tone="brand-deep">{card.say}</Text>
        </div>
      )}
      {card.avoid && (
        <div className="squircle flex gap-2.5 rounded-panel border border-danger-line bg-danger-bg px-4 py-3">
          <Ban className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
          <Text size="body" weight="semibold" tone="danger">Avoid: {card.avoid}</Text>
        </div>
      )}
    </div>
  );
}

/**
 * The stage cards sit on: a stacked deck look, swipe or arrow keys to move, Back and Next below.
 * `canNext` is false while a question waits for an answer.
 */
export function DeckStage({ index, total, dir, onPrev, onNext, canNext, nextLabel = "Next", children, className, compact }: {
  index: number; total: number; dir: 1 | -1; onPrev: () => void; onNext: () => void; canNext: boolean; nextLabel?: ReactNode; children: ReactNode; className?: string; compact?: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const nextRef = useRef(onNext);
  const prevRef = useRef(onPrev);
  nextRef.current = canNext ? onNext : () => {};
  prevRef.current = onPrev;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input, textarea")) return;
      if (e.key === "ArrowRight") nextRef.current();
      if (e.key === "ArrowLeft") prevRef.current();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}>
      <div className="relative min-h-0 flex-1 touch-pan-y"
        onPointerDown={(e) => { start.current = { x: e.clientX, y: e.clientY }; }}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(e.clientY - s.y)) return;
          if (dx < 0) nextRef.current(); else prevRef.current();
        }}>
        {/* The deck underneath. */}
        {index < total - 1 && <div aria-hidden="true" className="absolute inset-x-5 bottom-[-14px] top-6 rounded-[28px] border border-hair bg-card/70" />}
        {index < total - 2 && <div aria-hidden="true" className="absolute inset-x-10 bottom-[-26px] top-12 -z-10 rounded-[28px] border border-hair bg-card/40" />}
        <div key={index} className={cn("absolute inset-0", dir === 1 ? "card-next" : "card-prev")}>{children}</div>
      </div>
      <div className={cn("flex items-center gap-3", compact ? "pt-3" : "pt-5")}>
        <Button aria-label="Previous card" variant="secondary" size="lg" disabled={index === 0} onClick={onPrev} className="px-4"><ArrowLeft className="size-5" aria-hidden="true" /></Button>
        <Text size="caption" weight="bold" tone="subtle" tabular className="flex-1 text-center">{index + 1} / {total}</Text>
        <Button size="lg" disabled={!canNext} onClick={onNext} className="min-w-[132px]">{nextLabel}<ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div>
    </div>
  );
}

/** Story-style progress: one segment per card. */
export function DeckProgress({ index, total, className }: { index: number; total: number; className?: string }) {
  return (
    <div className={cn("flex gap-[3px]", className)} aria-label={`Card ${index + 1} of ${total}`}>
      {Array.from({ length: total }, (_, k) => <span key={k} className={cn("h-1 flex-1 rounded-full transition-colors", k < index ? "bg-brand/50" : k === index ? "bg-brand" : "bg-black/[0.08]")} />)}
    </div>
  );
}

/** A template's example cards, swipeable, for the course builder's previews. */
export function SampleDeck({ template, startAt = 0, title }: { template: ShortTemplate; startAt?: number; title?: string }) {
  const t = TEMPLATES[template];
  const cards: ShortCard[] = t.sample.cards.map((c, i) => c.role === "check"
    ? { id: `s${i}`, blockId: "sample", role: "check", question: c.body, options: c.options ?? [], answer: c.answer ?? 0, rationale: "" }
    : c.role === "idea" || c.role === "point" ? { id: `s${i}`, blockId: "sample", role: c.role, title: c.title, body: c.body, say: c.say } : { id: `s${i}`, blockId: "sample", role: "idea", body: c.body });
  return <PreviewDeck template={template} kicker={t.label} title={title || t.sample.title} meta={`${cards.length} cards · about 2 min`} cards={cards} startAt={startAt} />;
}

/** Any cards as a swipeable deck behind a cover, for previews. Nothing is recorded. */
export function PreviewDeck({ template, kicker, title, meta, cards, sourceIds = [], startAt = 0 }: {
  template: ShortTemplate; kicker: string; title: string; meta: string; cards: ShortCard[]; sourceIds?: string[]; startAt?: number;
}) {
  const total = cards.length + 1;
  const [i, setI] = useState(Math.min(startAt, total - 1));
  const [dir, setDir] = useState<1 | -1>(1);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const go = (n: number) => { setDir(n > i ? 1 : -1); setI(Math.max(0, Math.min(total - 1, n))); };
  const card = i > 0 ? cards[i - 1] : undefined;
  return (
    <div className="flex h-full flex-col gap-4">
      <DeckProgress index={i} total={total} />
      <DeckStage index={i} total={total} dir={dir} onPrev={() => go(i - 1)} onNext={() => go(i < total - 1 ? i + 1 : 0)}
        canNext={!(card?.role === "check" && answers[card.id] === undefined)} nextLabel={i === total - 1 ? "Start over" : i === 0 ? "Start" : "Next"} compact>
        {card ? <CardFace card={card} template={template} sourceIds={sourceIds} answer={answers[card.id]} onAnswer={(a) => setAnswers({ ...answers, [card.id]: a })}
            flipped={flipped[card.id]} onFlip={() => setFlipped({ ...flipped, [card.id]: !flipped[card.id] })} />
          : <CoverFace template={template} kicker={kicker} title={title} meta={meta} />}
      </DeckStage>
    </div>
  );
}

/** A card shrunk to a thumbnail, for lists of cards. */
export function MiniCard({ card, template, onClick }: { card: ShortCard; template: ShortTemplate; onClick?: () => void }) {
  const Icon = ROLE_ICON[card.role];
  const title = card.role === "flip" ? card.front : card.role === "check" ? card.question : card.role === "media" ? card.block.title : card.title ?? card.body;
  const body = card.role === "flip" ? card.back : card.role === "check" ? card.options.join(" · ") : card.role === "media" ? "Plays as is" : card.title ? card.body : card.say ?? "";
  return (
    <button type="button" onClick={onClick} className="squircle flex h-[150px] w-[118px] shrink-0 flex-col gap-1.5 overflow-hidden rounded-[14px] border border-hair bg-card p-2.5 text-left shadow-2xs transition-transform hover:-translate-y-0.5 hover:border-hair-3">
      <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-brand-deep"><Icon className="size-3" aria-hidden="true" /><span className="truncate">{TEMPLATES[template].eyebrow[card.role]}</span></span>
      <span className="line-clamp-4 text-caption font-bold leading-snug text-ink">{title}</span>
      {body && <span className="line-clamp-3 text-[10px] leading-snug text-ink-3">{body}</span>}
    </button>
  );
}
