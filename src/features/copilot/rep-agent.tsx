"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, AudioLines, ChevronLeft, ChevronRight, History, MessageCircle, Mic, MicOff, Trash2, X, SquarePen } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { BRAINS, type CoItem, type CoReply, type Ctx, type Tone } from "./brains";
import { useCopilot } from "./copilot-store";
import { useChatHistory, type SavedChat } from "./chat-history";
import { VoiceWave } from "@/features/rep/hero-visuals";

/**
 * The rep's SwishX, behind the Chat tab: ask (type) or talk it through (voice). Chat-first, the way
 * ChatGPT works: a greeting, the two ways in, suggestions from the rep's own trainings and progress,
 * their recent chats, then a composer with a mic and a voice button. Rehearsing calls is Practice's.
 */

const DOT: Record<Tone, string> = { danger: "bg-danger", warn: "bg-warn", ok: "bg-ok", faint: "bg-hair-3" };
const brain = BRAINS.rep;

function useCtx(): Ctx {
  const s = useApp();
  const me = useMe();
  const path = usePathname();
  const search = useSearchParams();
  return { s, me, path, search: new URLSearchParams(search.toString()) };
}

interface Turn { id: string; from: "you" | "ai"; text?: string; reply?: CoReply; voice?: boolean }

export function RepAgent({ onClose, onGo }: { onClose: () => void; onGo: () => void }) {
  const ctx = useCtx();
  const router = useRouter();
  const intent = useCopilot((x) => x.intent);
  const clearIntent = useCopilot((x) => x.clearIntent);
  const brief = brain.briefing(ctx);
  const prompts = brain.prompts(ctx);
  const suggestions = brain.suggestions(ctx);
  const history = useChatHistory();
  const mine = history.chats.filter((c) => c.userId === ctx.me.id);
  const [chatId, setChatId] = useState(() => `chat-${Date.now().toString(36)}`);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [voice, setVoice] = useState(false);
  const [dictating, setDictating] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (turns.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [turns, thinking]);

  /* Opened from Home's ask bar: straight into voice, or with the question already asked. */
  useEffect(() => {
    if (!intent) return;
    if (intent.mode === "voice") setVoice(true);
    if (intent.ask) send(intent.ask);
    clearIntent();
  }, [intent]); // eslint-disable-line react-hooks/exhaustive-deps

  function send(prompt: string) {
    if (!prompt.trim() || thinking) return;
    history.ask(ctx.me.id, chatId, prompt.trim());
    setTurns((t) => [...t, { id: `u${Date.now()}`, from: "you", text: prompt }]);
    setText("");
    setThinking(true);
    window.setTimeout(() => {
      setTurns((t) => [...t, { id: `a${Date.now()}`, from: "ai", reply: brain.answer(prompt, ctx) }]);
      setThinking(false);
    }, 650);
  }

  /* Dictation: a prototype stand-in for speech-to-text. It "hears" the first suggestion and types it in. */
  function dictate() {
    if (dictating) return;
    setDictating(true);
    window.setTimeout(() => { setText(prompts[0] ?? ""); setDictating(false); inputRef.current?.focus(); }, 1600);
  }

  const newChat = () => { setTurns([]); setChatId(`chat-${Date.now().toString(36)}`); setView("chat"); };
  /* An earlier chat, asked again: the answers come from today's content and progress. */
  const openChat = (c: SavedChat) => {
    setTurns(c.asks.flatMap((a, i) => [{ id: `u${i}`, from: "you" as const, text: a.text, voice: a.voice }, { id: `a${i}`, from: "ai" as const, reply: brain.answer(a.text, ctx) }]));
    setChatId(c.id);
    setView("chat");
  };
  const when = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }); };
  const empty = turns.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 pb-2 pt-1">
        <span className="grid size-9 place-items-center rounded-full bg-brand text-white"><AgentIcon className="size-4.5" aria-hidden="true" /></span>
        <span className="flex flex-1 flex-col leading-tight"><span className="text-subhead font-extrabold text-ink">SwishX</span><span className="text-caption text-ink-3">Approved content only</span></span>
        {view === "chat" && mine.length > 0 && (
          <button type="button" onClick={() => setView("history")} aria-label="Past chats" title="Past chats"
            className="focus-ring grid size-10 place-items-center rounded-full bg-subtle text-ink-2 hover:text-ink"><History className="size-4.5" aria-hidden="true" /></button>
        )}
        {(!empty || view === "history") && (
          <button type="button" onClick={newChat} aria-label="New chat" title="New chat"
            className="focus-ring grid size-10 place-items-center rounded-full bg-subtle text-ink-2 hover:text-ink"><SquarePen className="size-4.5" aria-hidden="true" /></button>
        )}
        <button type="button" onClick={onClose} aria-label="Close SwishX" className="focus-ring grid size-10 place-items-center rounded-full bg-subtle text-ink-2 hover:text-ink"><X className="size-5" aria-hidden="true" /></button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 pt-2 [scrollbar-width:none]">
        {view === "history" ? (
          /* Every past chat, newest first. Open one to ask it again, or delete it. */
          <div className="flex flex-col gap-3">
            <button type="button" onClick={() => setView("chat")} className="flex items-center gap-1 self-start text-body font-semibold text-ink-3 hover:text-ink"><ChevronLeft className="size-4" aria-hidden="true" />Back</button>
            <Text as="h2" size="display" weight="extrabold" tracking="tight">Past chats</Text>
            <ul className="flex flex-col gap-2">
              {mine.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-panel bg-card p-1.5 pr-2 shadow-hair">
                  <button type="button" onClick={() => openChat(c)} className="flex min-w-0 flex-1 items-center gap-3 rounded-[16px] px-2 py-1.5 text-left hover:bg-subtle">
                    <span className={cn("grid size-10 shrink-0 place-items-center rounded-full text-white", c.asks.some((x) => x.voice) ? "bg-peach" : "bg-sage")}>{c.asks.some((x) => x.voice) ? <AudioLines className="size-4.5" aria-hidden="true" /> : <MessageCircle className="size-4.5" aria-hidden="true" />}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-body font-bold text-ink">{c.asks[0]?.text}</span>
                      <span className="truncate text-caption text-ink-3">{when(c.at)} · {c.asks.length} question{c.asks.length === 1 ? "" : "s"}{c.asks.some((x) => x.voice) ? " · voice" : ""}</span>
                    </span>
                  </button>
                  <button type="button" onClick={() => history.remove(c.id)} aria-label="Delete this chat" className="grid size-9 shrink-0 place-items-center rounded-full text-ink-4 hover:bg-subtle hover:text-danger"><Trash2 className="size-4" aria-hidden="true" /></button>
                </li>
              ))}
            </ul>
            {!mine.length && <Text size="body" tone="subtle">No chats yet.</Text>}
          </div>
        ) : empty ? (
          <>
            <div className="flex flex-col gap-1 pt-2">
              <Text as="h2" size="display-lg" weight="extrabold" tracking="tight" className="leading-tight">{brief.title},<br />how can I help?</Text>
              <Text size="body" tone="subtle">Answers come only from your approved training content.</Text>
            </div>

            {/* Two ways in: type it, or say it. */}
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => inputRef.current?.focus()}
                className="flex min-h-[128px] flex-col justify-between rounded-[24px] bg-sage p-3.5 text-left text-white shadow-soft transition-transform active:scale-[0.97]">
                <span className="grid size-10 place-items-center rounded-full bg-white/25"><MessageCircle className="size-5" aria-hidden="true" /></span>
                <span className="flex flex-col"><span className="text-body-lg font-extrabold leading-tight">Chat</span><span className="text-caption text-white/80">Type a question</span></span>
              </button>
              <button type="button" onClick={() => setVoice(true)}
                className="flex min-h-[128px] flex-col justify-between rounded-[24px] bg-cta p-3.5 text-left text-white shadow-soft transition-transform active:scale-[0.97]">
                <span className="flex items-center gap-2"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/20"><AudioLines className="size-5" aria-hidden="true" /></span><VoiceWave bars={9} className="h-7 flex-1" barClass="bg-white/70" /></span>
                <span className="flex flex-col"><span className="text-body-lg font-extrabold leading-tight">Talk it through</span><span className="text-caption text-white/80">Out loud, hands free</span></span>
              </button>
            </div>

            {/* Suggestions from the rep's own trainings and progress. */}
            <div className="flex flex-col gap-2">
              <Text size="caption" weight="bold" tone="subtle" className="px-1">Suggested for you</Text>
              {suggestions.map((x) => (
                <button key={x.text} type="button" onClick={() => send(x.text)}
                  className="flex items-center gap-3 rounded-[20px] bg-card px-3.5 py-3 text-left shadow-hair transition-colors hover:bg-subtle">
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="self-start rounded-full bg-tint px-2 py-0.5 text-[11px] font-bold text-brand-deep">{x.tag}</span>
                    <span className="text-body font-semibold leading-snug text-ink">{x.text}</span>
                  </span>
                  <ArrowUp className="size-4 shrink-0 rotate-45 text-ink-4" aria-hidden="true" />
                </button>
              ))}
            </div>

            {mine.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-1">
                  <Text size="caption" weight="bold" tone="subtle">Recent chats</Text>
                  <button type="button" onClick={() => setView("history")} className="flex items-center gap-0.5 text-caption font-bold text-brand-deep">See all<ChevronRight className="size-3.5" aria-hidden="true" /></button>
                </div>
                {mine.slice(0, 2).map((c) => (
                  <button key={c.id} type="button" onClick={() => openChat(c)} className="flex items-center gap-2.5 rounded-[16px] px-2 py-2 text-left hover:bg-subtle">
                    {c.asks.some((x) => x.voice) ? <AudioLines className="size-4 shrink-0 text-ink-4" aria-hidden="true" /> : <MessageCircle className="size-4 shrink-0 text-ink-4" aria-hidden="true" />}
                    <span className="min-w-0 flex-1 truncate text-body text-ink-2">{c.asks[0]?.text}</span>
                    <span className="shrink-0 text-caption text-ink-4">{when(c.at)}</span>
                  </button>
                ))}
              </div>
            )}
            {/* v1-hidden: "Practise a call" as a starter, and the "For you" list (the suggestions cover it). */}
            {false && brief.items.length > 0 && <Items items={brief.items} onGo={onGo} />}
          </>
        ) : turns.map((t) => (
          <div key={t.id} className={cn("flex flex-col gap-2", t.from === "you" && "items-end")}>
            {t.from === "you" ? (
              <div className="max-w-[85%] rounded-[22px] rounded-br-md bg-cta px-4 py-2.5 text-body-lg text-white">
                {t.voice && <AudioLines className="mb-0.5 mr-1.5 inline size-3.5 opacity-70" aria-label="Said out loud" />}{t.text}
              </div>
            ) : t.reply && (
              <div className="flex max-w-full flex-col gap-2.5">
                <span className="flex items-center gap-1.5 text-caption font-bold text-ink-3"><AgentIcon className="size-3.5 text-brand" />SwishX</span>
                <Text as="p" size="body-lg" className="leading-relaxed">{t.reply.text}</Text>
                {t.reply.items && <Items items={t.reply.items} onGo={onGo} />}
                {t.reply.actions && t.reply.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {t.reply.actions.map((a, i) => (
                      <button key={i} type="button" onClick={() => { if (a.run) a.run(); else if (a.href) { router.push(a.href); onGo(); } }}
                        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-tint px-4 text-body font-bold text-brand-deep transition-colors hover:bg-tint-strong">
                        {a.label}<ChevronRight className="size-4" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {thinking && <div className="flex gap-1 self-start rounded-full bg-subtle px-4 py-3 text-ink-3"><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /></div>}
        <div ref={endRef} />
      </div>

      {/* Composer: type, dictate with the mic, or switch to voice. Send replaces the voice button once there's text, as in ChatGPT. */}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="shrink-0 px-3 pb-4 pt-2">
        <div className="flex items-end gap-2 rounded-[28px] bg-subtle p-1.5 pl-4 ring-1 ring-hair focus-within:bg-card focus-within:ring-hair-3">
          <label htmlFor="rep-agent-input" className="sr-only">Message SwishX</label>
          <textarea ref={inputRef} id="rep-agent-input" rows={1} value={text} onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
            placeholder={dictating ? "Listening…" : "Ask anything"}
            className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent py-2.5 text-body-lg text-ink outline-none placeholder:text-ink-4 [field-sizing:content]" />
          <button type="button" onClick={dictate} aria-label="Dictate" title="Dictate"
            className={cn("grid size-11 shrink-0 place-items-center rounded-full transition-colors", dictating ? "bg-brand text-white" : "text-ink-2 hover:bg-card")}>
            <Mic className={cn("size-5", dictating && "animate-pulse")} aria-hidden="true" />
          </button>
          {text.trim() ? (
            <button type="submit" aria-label="Send" className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-white transition-transform active:scale-95"><ArrowUp className="size-5" aria-hidden="true" /></button>
          ) : (
            <button type="button" onClick={() => setVoice(true)} aria-label="Talk to SwishX" title="Talk to SwishX"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-cta text-white transition-transform active:scale-95"><AudioLines className="size-5" aria-hidden="true" /></button>
          )}
        </div>
        <Text size="micro" tone="faint" className="mt-1.5 block text-center">{brain.scope}</Text>
      </form>

      {voice && <VoiceMode ctx={ctx} prompts={prompts}
        onEnd={(said) => {
          setVoice(false);
          if (!said.length) return;
          for (const x of said) if (x.from === "you" && x.text) history.ask(ctx.me.id, chatId, x.text, true);
          setTurns((t) => [...t, ...said]);
          setView("chat");
        }} />}
    </div>
  );
}


function Items({ items, onGo }: { items: CoItem[]; onGo: () => void }) {
  if (!items.length) return null;
  return (
    <ul className="flex flex-col divide-y divide-hair overflow-hidden rounded-panel bg-card ring-1 ring-hair">
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
            {it.href ? <Link href={it.href} onClick={onGo} className="flex items-start gap-2.5 px-3.5 py-3 hover:bg-subtle">{body}</Link>
              : <div className="flex items-start gap-2.5 px-3.5 py-3">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

type Phase = "consent" | "listening" | "thinking" | "speaking";

/**
 * Voice: talk it through, out loud. A prototype: it "hears" the suggested
 * questions in turn and answers each from approved content, reading the answer
 * aloud (speech synthesis, where the browser has it) with live captions.
 * Ending it drops the exchange into the chat as a transcript.
 */
function VoiceMode({ ctx, prompts, onEnd }: { ctx: Ctx; prompts: string[]; onEnd: (said: Turn[]) => void }) {
  const me = useMe();
  const consent = useApp((s) => !!s.voiceConsent[me.id]);
  const setConsent = useApp((s) => s.setVoiceConsent);
  const [phase, setPhase] = useState<Phase>(consent ? "listening" : "consent");
  const [muted, setMuted] = useState(false);
  const [heard, setHeard] = useState("");
  const [answer, setAnswer] = useState("");
  const [shown, setShown] = useState(0);
  const turn = useRef(0);
  const said = useRef<Turn[]>([]);

  /* The loop: listen, hear a question, think, speak the answer, listen again. */
  useEffect(() => {
    if (phase !== "listening" || muted) return;
    const t = setTimeout(() => {
      const q = prompts[turn.current % prompts.length] ?? "What should I do next?";
      turn.current += 1;
      setHeard(q); setAnswer(""); setShown(0);
      said.current.push({ id: `v${Date.now()}`, from: "you", text: q, voice: true });
      setPhase("thinking");
    }, 2400);
    return () => clearTimeout(t);
  }, [phase, muted, prompts]);

  useEffect(() => {
    if (phase !== "thinking") return;
    const t = setTimeout(() => {
      const r = brain.answer(heard, ctx);
      said.current.push({ id: `a${Date.now()}`, from: "ai", reply: r });
      setAnswer(r.text);
      setPhase("speaking");
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(r.text);
        u.rate = 1.05;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Captions follow the voice, word by word; then it listens again. */
  useEffect(() => {
    if (phase !== "speaking") return;
    const words = answer.split(" ");
    if (shown >= words.length) {
      const t = setTimeout(() => setPhase("listening"), 1400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShown((n) => n + 1), 170);
    return () => clearTimeout(t);
  }, [phase, shown, answer]);

  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  const end = () => onEnd(said.current);
  const label = { consent: "", listening: muted ? "Muted" : "Listening…", thinking: "Thinking…", speaking: "SwishX is speaking" }[phase];

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-canvas" role="dialog" aria-label="Talk to SwishX">
      <div className="flex shrink-0 items-center justify-between px-4 pt-1">
        <span className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-caption font-bold text-ink-2 shadow-hair"><AudioLines className="size-3.5 text-brand" aria-hidden="true" />Voice</span>
        <button type="button" onClick={end} aria-label="Back to chat" className="focus-ring grid size-10 place-items-center rounded-full bg-subtle text-ink-2"><X className="size-5" aria-hidden="true" /></button>
      </div>

      {phase === "consent" ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <span className="grid size-20 place-items-center rounded-full bg-tint text-brand-deep"><Mic className="size-9" aria-hidden="true" /></span>
          <Text as="h2" size="display" weight="extrabold">Talk to SwishX</Text>
          <Text size="body-lg" tone="muted">SwishX listens only while this screen is open. Nothing you say is shared with your trainer or manager.</Text>
          <button type="button" onClick={() => { setConsent(me.id, true); setPhase("listening"); }} className="mt-2 h-14 w-full rounded-full bg-cta text-subhead font-bold text-white">Allow microphone</button>
          <button type="button" onClick={end} className="text-body font-semibold text-ink-3">Not now</button>
        </div>
      ) : (
        <>
          <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
            {/* The orb breathes while listening, swells while speaking. */}
            <div className="relative grid size-56 place-items-center" aria-hidden="true">
              <span className={cn("absolute inset-0 rounded-full bg-gradient-to-br from-sun via-brand-2 to-brand opacity-25 blur-2xl transition-transform duration-500", phase === "speaking" ? "scale-110" : "scale-90")} />
              <span className={cn("relative size-44 rounded-full bg-gradient-to-br from-sun via-brand-2 to-brand shadow-brand-lift",
                phase === "speaking" ? "animate-[orb-talk_0.9s_ease-in-out_infinite]" : phase === "thinking" ? "animate-spin [animation-duration:2.5s]" : !muted && "animate-[orb-breathe_2.6s_ease-in-out_infinite]")} />
              <span className="absolute size-44 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,.55),transparent_45%)]" />
            </div>
            <div className="flex min-h-[132px] w-full flex-col items-center gap-2 text-center">
              <Text size="caption" weight="bold" tone="subtle" uppercase tracking="wider">{label}</Text>
              {heard && <Text size="body" tone="subtle">“{heard}”</Text>}
              {phase === "speaking" && <Text size="body-lg" weight="semibold" className="line-clamp-4 leading-relaxed">{answer.split(" ").slice(0, shown).join(" ")}</Text>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-center gap-4 px-6 pb-8">
            {/* v1-hidden: "Practise it as a call". Rehearsing calls lives in Practice. */}
            <div className="flex items-center gap-6">
              <button type="button" onClick={() => setMuted(!muted)} aria-pressed={muted} aria-label={muted ? "Unmute" : "Mute"}
                className={cn("grid size-16 place-items-center rounded-full transition-colors", muted ? "bg-ink text-white" : "bg-card text-ink shadow-soft")}>
                {muted ? <MicOff className="size-6" aria-hidden="true" /> : <Mic className="size-6" aria-hidden="true" />}
              </button>
              <button type="button" onClick={end} aria-label="End voice" className="grid size-16 place-items-center rounded-full bg-danger text-white shadow-soft"><X className="size-7" aria-hidden="true" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
