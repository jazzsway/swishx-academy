"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, X } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { IconButton } from "@/components/ui/button";
import { Composer, Suggestions } from "./composer";
import { BRAINS, type CoItem, type CoReply, type Ctx, type Role, type Tone } from "./brains";
import { useCopilot } from "./copilot-store";

const DOT: Record<Tone, string> = { danger: "bg-danger", warn: "bg-warn", ok: "bg-ok", faint: "bg-hair-3" };

function useCtx(): Ctx {
  const s = useApp();
  const me = useMe();
  const path = usePathname();
  const search = useSearchParams();
  return { s, me, path, search: new URLSearchParams(search.toString()) };
}

function Items({ items, onGo }: { items: CoItem[]; onGo: () => void }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((it, i) => {
        const body = (
          <>
            {it.tone && <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[it.tone])} aria-hidden="true" />}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body font-semibold text-ink">{it.title}</span>
              {it.sub && <span className="text-caption text-ink-3">{it.sub}</span>}
            </span>
            {it.href && <ChevronRight className="mt-0.5 size-4 shrink-0 text-ink-4" aria-hidden="true" />}
          </>
        );
        return (
          <li key={i}>
            {it.href
              ? <Link href={it.href} onClick={onGo} className="flex items-start gap-2.5 rounded-control px-2 py-1.5 hover:bg-subtle">{body}</Link>
              : <div className="flex items-start gap-2.5 px-2 py-1.5">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

interface Turn { id: string; from: "you" | "ai"; reply?: CoReply; text?: string; done?: Record<number, string> }

/** The role's own copilot: a briefing for the page you're on, then a conversation. */
function RoleCopilot({ role, onGo }: { role: Role; onGo: () => void }) {
  const ctx = useCtx();
  const router = useRouter();
  const brain = BRAINS[role];
  const brief = brain.briefing(ctx);
  const prompts = brain.prompts(ctx);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, thinking]);

  function send(prompt: string) {
    if (!prompt.trim() || thinking) return;
    setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt }]);
    setText("");
    setThinking(true);
    window.setTimeout(() => {
      setTurns((t) => [...t, { id: `a${Date.now()}`, from: "ai", reply: brain.answer(prompt, ctx) }]);
      setThinking(false);
    }, 650);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <section className="squircle flex flex-col gap-2 rounded-panel border border-tint-line bg-tint/60 p-3.5">
          <Text size="body-lg" weight="bold">{brief.title}</Text>
          <Text size="body" tone="muted">{brief.text}</Text>
          {brief.items.length > 0 && <div className="-mx-1.5"><Items items={brief.items} onGo={onGo} /></div>}
        </section>

        {turns.map((t) => (
          <div key={t.id} className={cn("flex flex-col gap-2", t.from === "you" && "items-end")}>
            {t.from === "you" ? (
              <div className="max-w-[88%] rounded-panel bg-ink px-3.5 py-2.5 text-body text-white">{t.text}</div>
            ) : t.reply && (
              <div className="flex w-full flex-col gap-2 rounded-panel bg-subtle px-3.5 py-3">
                <Text as="p" size="body" className="leading-relaxed">{t.reply.text}</Text>
                {t.reply.items && <div className="-mx-2"><Items items={t.reply.items} onGo={onGo} /></div>}
                {t.reply.actions && t.reply.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {t.reply.actions.map((a, i) => t.done?.[i]
                      ? <Text key={i} size="caption" weight="semibold" tone="ok">{t.done[i]}</Text>
                      : (
                        <button key={i} type="button"
                          onClick={() => {
                            if (a.run) { const msg = a.run(); setTurns((all) => all.map((x) => (x.id === t.id ? { ...x, done: { ...x.done, [i]: msg } } : x))); }
                            else if (a.href) { router.push(a.href); onGo(); }
                          }}
                          className="inline-flex h-8 items-center rounded-control bg-card px-3 text-body font-semibold text-brand-deep shadow-hair hover:bg-tint">
                          {a.label}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {turns.length === 0 && <Suggestions items={prompts} onPick={send} variant="list" />}
        {thinking && <div className="flex gap-1 self-start rounded-panel bg-subtle px-3.5 py-3 text-ink-3"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
        <div ref={endRef} />
      </div>

      <div className="flex flex-col gap-2.5 border-t border-hair p-3">
        {turns.length > 0 && <Suggestions items={prompts} onPick={send} variant="row" />}
        <Composer id={`copilot-${role}`} value={text} onChange={setText} onSend={() => send(text)} busy={thinking}
          placeholder="Ask anything about your work here" hint={brain.scope} />
      </div>
    </>
  );
}

const ROLE_LABEL: Record<Role, string> = { trainer: "Trainer", manager: "Manager", rep: "Learning" };

/**
 * The right-hand copilot. Docked beside the content on very wide desk screens,
 * a drawer from the right elsewhere. Pages can take it over with <CopilotOverride>.
 */
export function CopilotPanel({ role, variant }: { role: Role; variant: "desk" | "phone" }) {
  const open = useCopilot((s) => s.open);
  const setOpen = useCopilot((s) => s.setOpen);
  const setSlot = useCopilot((s) => s.setSlot);
  const overridden = useCopilot((s) => s.overrides > 0);
  const close = () => setOpen(false);
  /* On the phone the panel covers the screen, so following a link should reveal the page. */
  const onGo = variant === "phone" ? close : () => undefined;

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  });

  return (
    <>
      {/* On the phone the panel is modal; on a desk it floats beside your work so you can use both. */}
      {open && variant === "phone" && <div aria-hidden="true" onClick={close} className="fixed inset-0 z-40 bg-ink/30 sm:absolute" />}
      <aside aria-label="SwishX AI Agent" aria-hidden={!open}
        className={cn("flex-col bg-card",
          open ? "copilot-in flex" : "hidden",
          variant === "desk"
            ? "fixed inset-y-0 right-0 z-50 w-[min(400px,100vw)] border-l border-hair shadow-modal min-[1600px]:sticky min-[1600px]:top-0 min-[1600px]:z-20 min-[1600px]:h-dvh min-[1600px]:w-[380px] min-[1600px]:shrink-0 min-[1600px]:shadow-none"
            : "fixed inset-y-0 right-0 z-50 w-[min(420px,100vw)] shadow-modal sm:absolute sm:w-[92%]")}>
        <header className="flex h-(--screen-header-h) min-h-14 shrink-0 items-center gap-2.5 border-b border-hair px-4">
          <span className="grid size-8 place-items-center rounded-control bg-brand text-white"><AgentIcon className="size-4" aria-hidden="true" /></span>
          <div className="flex flex-1 flex-col"><Text size="body-lg" weight="bold">SwishX AI Agent</Text><Text size="micro" tone="subtle">{ROLE_LABEL[role]}</Text></div>
          <IconButton aria-label="Close SwishX AI Agent" onClick={close}><X className="size-4" /></IconButton>
        </header>
        <div ref={setSlot} className={cn("min-h-0 flex-1 flex-col", overridden ? "flex" : "hidden")} />
        {!overridden && <RoleCopilot role={role} onGo={onGo} />}
      </aside>
    </>
  );
}

/** Header button that opens the copilot, with a count of things waiting. */
export function CopilotButton({ role, compact }: { role: Role; compact?: boolean }) {
  const ctx = useCtx();
  const open = useCopilot((s) => s.open);
  const toggle = useCopilot((s) => s.toggle);
  const n = role === "rep" ? 0 : BRAINS[role].briefing(ctx).items.filter((i) => i.tone === "danger" || i.tone === "warn").length;

  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); toggle(); } };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [toggle]);

  return (
    <button type="button" onClick={toggle} aria-pressed={open} title="SwishX AI Agent (⌘J)"
      className={cn("focus-ring relative flex h-10 items-center gap-2 rounded-control border px-3 text-body font-semibold transition-colors",
        open ? "border-brand bg-brand text-white" : "border-tint-line bg-tint text-brand-deep hover:bg-tint/70")}>
      <AgentIcon className="size-4" aria-hidden="true" />
      {!compact && <span className="hidden sm:inline">SwishX AI Agent</span>}
      {n > 0 && !open && <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1 text-micro font-bold text-white">{n}</span>}
    </button>
  );
}

/** Lets a page put its own copilot in the panel (e.g. the course editor's editing chat). */
export function CopilotOverride({ children }: { children: ReactNode }) {
  const slot = useCopilot((s) => s.slot);
  const claim = useCopilot((s) => s.claim);
  useEffect(() => claim(), [claim]);
  return slot ? createPortal(children, slot) : null;
}
