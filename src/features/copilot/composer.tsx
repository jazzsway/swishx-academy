"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp, ArrowUpRight, BellRing, CalendarClock, Check, ChevronDown, Film, Headphones, HelpCircle, LayoutList,
  ListChecks, MessageCircle, Paperclip, Scissors, Target, Wand2, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { AgentIcon } from "@/components/ui/logo-mark";
import { Text } from "@/components/ui/text";

/** The models offered in the picker. A prototype: the choice is shown, not routed anywhere. */
export const AGENT_MODELS = [
  { id: "finsen-3.2", name: "Finsen 3.2", hint: "Best for writing and checking courses" },
  { id: "finsen-3.2-fast", name: "Finsen 3.2 Fast", hint: "Quicker for small edits and questions" },
];

/* A suggestion's icon, from what it asks for. */
const ICONS: [RegExp, LucideIcon][] = [
  [/fix|wording|citation/i, Wand2], [/video/i, Film], [/audio|listen/i, Headphones], [/check|quiz/i, ListChecks],
  [/shorten|trim|split|clip/i, Scissors], [/module/i, LayoutList], [/question/i, HelpCircle], [/overdue|nudge|behind/i, BellRing],
  [/weak|skill|gap|focus/i, Target], [/expir|due|deadline/i, CalendarClock], [/objection|talk|teen|cost/i, MessageCircle],
];
const iconFor = (label: string) => ICONS.find(([re]) => re.test(label))?.[1];

/**
 * Prompt suggestions. "list" is the starter set shown before the conversation begins, one per row
 * with an icon; "row" is a compact scrolling strip once it's under way.
 */
export function Suggestions({ items, onPick, variant }: { items: string[]; onPick: (s: string) => void; variant: "list" | "row" }) {
  if (!items.length) return null;
  if (variant === "row") {
    return (
      <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Suggestions">
        {items.map((s) => {
          const Icon = iconFor(s);
          return (
            <button key={s} type="button" onClick={() => onPick(s)}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-hair-2 bg-card px-3 py-1.5 text-caption font-semibold text-ink-2 transition-colors hover:border-brand hover:bg-tint hover:text-brand-deep">
              {Icon ? <Icon className="size-3.5 text-ink-3" aria-hidden="true" /> : <AgentIcon className="size-3.5 text-brand" />}{s}
            </button>
          );
        })}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5" role="group" aria-label="Suggestions">
      <Text size="caption" weight="bold" tone="subtle" className="px-1">Try asking</Text>
      {items.map((s) => {
        const Icon = iconFor(s);
        return (
          <button key={s} type="button" onClick={() => onPick(s)}
            className="group flex items-center gap-3 rounded-panel border border-hair bg-card px-3 py-2.5 text-left transition-colors hover:border-tint-line hover:bg-tint">
            <span className="grid size-8 shrink-0 place-items-center rounded-control bg-subtle text-ink-2 group-hover:bg-white group-hover:text-brand-deep">
              {Icon ? <Icon className="size-4" aria-hidden="true" /> : <AgentIcon className="size-4 text-brand" />}
            </span>
            <span className="min-w-0 flex-1 text-body font-semibold text-ink">{s}</span>
            <ArrowUpRight className="size-4 shrink-0 text-ink-4 group-hover:text-brand-deep" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * The message box: one rounded card with the text on top and, underneath, the model picker,
 * a one-line hint, the attach button and send. Enter sends; Shift+Enter adds a line.
 */
export function Composer({ id, value, onChange, onSend, placeholder, hint, onAttach, busy }: {
  id: string; value: string; onChange: (v: string) => void; onSend: () => void; placeholder: string; hint?: string;
  onAttach?: (files: File[]) => void; busy?: boolean;
}) {
  const [model, setModel] = useState(AGENT_MODELS[0]);
  const [picking, setPicking] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const ready = value.trim().length > 0 && !busy;
  /* Grow with the text, up to a few lines. */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    /* scrollHeight is 0 while the panel is still hidden, so never go below two lines. */
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 52), 160)}px`;
  }, [value]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); if (ready) onSend(); }}
      className="squircle flex flex-col gap-1.5 rounded-[20px] border border-hair-2 bg-card px-3.5 pb-2.5 pt-3 shadow-hair transition-colors focus-within:border-brand/60">
      <label className="sr-only" htmlFor={id}>Message the SwishX AI Agent</label>
      <textarea ref={ref} id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (ready) onSend(); } }}
        className="min-h-[52px] w-full resize-none bg-transparent text-body-lg leading-relaxed text-ink outline-none placeholder:text-ink-4" />
      <div className="flex items-center gap-2">
        <div className="relative shrink-0">
          <button type="button" onClick={() => setPicking(!picking)} aria-haspopup="listbox" aria-expanded={picking}
            className="flex items-center gap-1.5 rounded-control px-1.5 py-1 text-body font-semibold text-ink-2 hover:bg-subtle">
            <AgentIcon className="size-4 text-brand" />{model.name}<ChevronDown className="size-3.5 text-ink-3" aria-hidden="true" />
          </button>
          {picking && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPicking(false)} aria-hidden="true" />
              <ul role="listbox" aria-label="Model" className="select-pop absolute bottom-full left-0 z-20 mb-1.5 w-[250px] rounded-panel border border-hair bg-card p-1.5 shadow-float">
                {AGENT_MODELS.map((m) => (
                  <li key={m.id}>
                    <button type="button" role="option" aria-selected={m.id === model.id} onClick={() => { setModel(m); setPicking(false); }}
                      className={cn("flex w-full items-start gap-2.5 rounded-control px-2.5 py-2 text-left hover:bg-subtle", m.id === model.id && "bg-tint")}>
                      <Check className={cn("mt-0.5 size-4 shrink-0", m.id === model.id ? "text-brand-deep" : "invisible")} aria-hidden="true" />
                      <span className="flex flex-col"><span className="text-body font-semibold text-ink">{m.name}</span><span className="text-caption text-ink-3">{m.hint}</span></span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        {hint && <Text size="caption" tone="subtle" truncate className="min-w-0 flex-1" title={hint}>{hint}</Text>}
        {!hint && <span className="flex-1" />}
        {onAttach && (
          <label className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-3 transition-colors hover:bg-subtle hover:text-ink" title="Attach your own video, PDF, slides, image or audio">
            <Paperclip className="size-4" aria-hidden="true" /><span className="sr-only">Attach a file</span>
            <input type="file" multiple className="sr-only" onChange={(e) => { onAttach(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
          </label>
        )}
        <button type="submit" disabled={!ready} aria-label="Send"
          className={cn("grid size-9 shrink-0 place-items-center rounded-full transition-colors", ready ? "bg-brand text-white hover:bg-brand-deep" : "bg-black/[0.06] text-ink-4")}>
          <ArrowUp className="size-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
