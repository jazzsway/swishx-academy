"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, AudioLines, ChevronRight, MessageCircle, Mic, MicOff, Stethoscope, X, SquarePen } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { BRAINS, type CoItem, type CoReply, type Ctx, type Tone } from "./brains";
import { useCopilot } from "./copilot-store";

/**
 * The rep's SwishX, behind the middle tab: one place to ask (chat), talk it
 * through (voice) or rehearse a call. Chat-first, the way ChatGPT works, so a
 * first-timer already knows it: a greeting, three starters, then a composer
 * with a mic and a voice button.
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

  const practise = () => { router.push("/rep/practice/prep"); onGo(); };
  const empty = turns.length === 0;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 pb-2 pt-1">
        <span className="grid size-9 place-items-center rounded-full bg-brand text-white"><AgentIcon className="size-4.5" aria-hidden="true" /></span>
        <span className="flex flex-1 flex-col leading-tight"><span className="text-subhead font-extrabold text-ink">SwishX</span><span className="text-caption text-ink-3">Approved content only</span></span>
        {!empty && (
          <button type="button" onClick={() => setTurns([])} aria-label="New chat" title="New chat"
            className="focus-ring grid size-10 place-items-center rounded-full bg-subtle text-ink-2 hover:text-ink"><SquarePen className="size-4.5" aria-hidden="true" /></button>
        )}
        <button type="button" onClick={onClose} aria-label="Close SwishX" className="focus-ring grid size-10 place-items-center rounded-full bg-subtle text-ink-2 hover:text-ink"><X className="size-5" aria-hidden="true" /></button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-4 pt-2 [scrollbar-width:none]">
        {empty ? (
          <>
            <div className="flex flex-col items-center gap-3 pt-4 text-center">
              <span className="relative grid size-16 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-white shadow-brand-lift">
                <span className="absolute inset-0 animate-ping rounded-full bg-brand/20 [animation-duration:2.4s]" aria-hidden="true" />
                <AgentIcon className="relative size-8" aria-hidden="true" />
              </span>
              <Text as="h2" size="display-lg" weight="extrabold" tracking="tight">{brief.title}, how can I help?</Text>
              <Text size="body" tone="subtle" className="max-w-[300px]">Ask about your trainings, talk something through out loud, or rehearse a call with an AI doctor.</Text>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <Starter icon={MessageCircle} tone="bg-sage" label="Ask a question" onClick={() => inputRef.current?.focus()} />
              <Starter icon={AudioLines} tone="bg-peach" label="Talk it through" onClick={() => setVoice(true)} />
              <Starter icon={Stethoscope} tone="bg-lilac" label="Practise a call" onClick={practise} />
            </div>

            {brief.items.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <Text size="caption" weight="bold" tone="subtle" className="px-1">For you</Text>
                <Items items={brief.items} onGo={onGo} />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Text size="caption" weight="bold" tone="subtle" className="px-1">Try asking</Text>
              {prompts.map((p) => (
                <button key={p} type="button" onClick={() => send(p)}
                  className="flex items-center gap-3 rounded-panel bg-subtle/70 px-3.5 py-3 text-left text-body font-semibold text-ink transition-colors hover:bg-subtle">
                  <span className="min-w-0 flex-1">{p}</span><ArrowUp className="size-4 shrink-0 rotate-45 text-ink-4" aria-hidden="true" />
                </button>
              ))}
            </div>
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

      {voice && <VoiceMode ctx={ctx} prompts={prompts} onPractise={practise}
        onEnd={(said) => { setVoice(false); if (said.length) setTurns((t) => [...t, ...said]); }} />}
    </div>
  );
}

function Starter({ icon: Icon, tone, label, onClick }: { icon: typeof Mic; tone: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("flex aspect-[0.95] flex-col justify-between rounded-panel p-3 text-left text-white shadow-soft transition-transform active:scale-[0.97]", tone)}>
      <span className="grid size-9 place-items-center rounded-full bg-white/25"><Icon className="size-4.5" aria-hidden="true" /></span>
      <span className="text-body font-extrabold leading-tight">{label}</span>
    </button>
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
function VoiceMode({ ctx, prompts, onEnd, onPractise }: { ctx: Ctx; prompts: string[]; onEnd: (said: Turn[]) => void; onPractise: () => void }) {
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
            <button type="button" onClick={onPractise} className="flex items-center gap-2 rounded-full bg-lilac px-4 py-2 text-body font-bold text-white shadow-soft"><Stethoscope className="size-4" aria-hidden="true" />Practise it as a call</button>
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
