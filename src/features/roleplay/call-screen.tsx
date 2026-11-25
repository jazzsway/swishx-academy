"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Briefcase, Ear, Info, Keyboard, Lightbulb, MapPin, MessageCircleWarning, Mic, MicOff, PhoneOff, Pill, Presentation, Stethoscope, Syringe, Target, UserRound, Volume2, VolumeX, X, Lock, ArrowUp } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import type { Character, Scenario } from "@/data/types";
import { CHARACTERS, characterOf } from "@/lib/scenario-set";
import { prohibited } from "@/data/scenarios";
import { source } from "@/data/org";
import { configOf } from "@/lib/roleplay-draft";
import { Text } from "@/components/ui/text";
// (Primary buttons on the dark call screen are white pills, not <Button>.)
import { startCall, repSays, sampleAnswers, scoreCall, type CallState } from "./engine";
import { useVoice } from "./use-voice";

/** Who the rep is talking to, as an icon: the role, not a monogram. */
export const ROLE_ICON: Record<Character, typeof Mic> = { doctor: Stethoscope, nurse: Syringe, manager: Briefcase, pharmacist: Pill, patient: UserRound };

/** v1-hidden: typing answers on a call. Voice only for now. */
const TYPING_ON = false;

export type CallMode = "screening" | "assessment" | "practice" | "test";
export type CallOutcome = ReturnType<typeof scoreCall>;

const MODE: Record<CallMode, { label: string; tone: string }> = {
  screening: { label: "Screening call · sets your baseline", tone: "bg-white/10 text-white" },
  assessment: { label: "Scored call · recorded", tone: "bg-brand text-white" },
  practice: { label: "Practice · only you can see this", tone: "bg-white/10 text-white" },
  test: { label: "Trainer test call · not saved", tone: "bg-white/10 text-white" },
};

export function CallScreen({ scenario, objectionIds, mode, voiceAllowed, onComplete, onExit, personaOverride, skipPrep, showSamples, onChange, assisted, hints, run, covers }: {
  scenario: Scenario; objectionIds?: string[]; mode: CallMode; voiceAllowed: boolean;
  onComplete: (r: CallOutcome, meta: { assisted: boolean; hints: number }) => void;
  /** Assisted mode on a scored call (a training setting): a Hint button the rep can tap when stuck. */
  hints?: boolean;
  /** One call that covers several objectives with the same person: what comes up, in order. */
  covers?: { objective: string; situation: string }[];
  /** Practice only: start with live prompts on. The rep can switch before the call starts. */
  assisted?: boolean; onExit: () => void; personaOverride?: Partial<Scenario["persona"]>;
  /** The page did its own briefing: go straight into the call. */
  skipPrep?: boolean;
  /** Offer tap-to-answer lines (always in presenter mode). */
  showSamples?: boolean;
  /** Follows the call as it happens, for a live view next to it. */
  onChange?: (state: CallState, elapsed: number, ended: boolean) => void;
  /** One scenario of several, back to back: where it sits, and what the end button leads to. */
  run?: { label: string; next: string };
}) {
  /* A dark screen: the device mock's status bar and home indicator go light while it's up (see device-frame.tsx). */
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.screen = "dark";
    return () => { delete root.dataset.screen; };
  }, []);
  const sc: Scenario = personaOverride ? { ...scenario, persona: { ...scenario.persona, ...personaOverride } } : scenario;
  /* prep → joining (the other person comes in) → call → wrap (reviewing) → ended (the summary). */
  const [stage, setStage] = useState<"prep" | "joining" | "call" | "wrap" | "ended">(skipPrep ? "joining" : "prep");
  const [brief, setBrief] = useState(false);
  useEffect(() => {
    if (!brief) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setBrief(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [brief]);
  const [state, setState] = useState<CallState>(() => startCall(sc, objectionIds, mode));
  const [typing, setTyping] = useState(!voiceAllowed);
  const [text, setText] = useState("");
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [usedTyping, setUsedTyping] = useState(!voiceAllowed);
  const [assist, setAssist] = useState(!!assisted && mode === "practice");
  /* Assisted: a hint when the rep asks for one, for the moment the call is at. It goes when they answer, or after a while. */
  const helped = (assist || !!hints) && mode !== "screening";
  const [hint, setHint] = useState<string | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const moment = state.idx >= 0 ? state.queue[state.idx]?.id ?? "open" : "open";
  const [seen, setSeen] = useState<string | null>(null);
  useEffect(() => { if (!hint) return; const t = window.setTimeout(() => setHint(null), 12000); return () => window.clearTimeout(t); }, [hint]);
  function askHint() {
    if (hint) return setHint(null);
    setHint(moment); setSeen(moment); setHintsUsed((n) => n + 1);
  }
  const voice = useVoice();
  const endRef = useRef<HTMLDivElement>(null);
  /* The screening call is the short version of the course's call. */
  const minutes = mode === "screening" ? Math.min(3, sc.durationMin) : sc.durationMin;
  const Who = ROLE_ICON[characterOf(sc)];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [state.turns, voice.interim]);
  useEffect(() => {
    if (stage !== "call") return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [stage]);
  const ended = stage === "wrap" || stage === "ended";
  function endCall() { voice.stop(); setStage((x) => (x === "call" || x === "joining" ? "wrap" : x)); }
  useEffect(() => {
    if (stage === "call" && elapsed >= minutes * 60) endCall();
  }, [elapsed, stage, minutes]); // eslint-disable-line react-hooks/exhaustive-deps
  /* The last line stays up long enough to read before the call closes. */
  useEffect(() => { if (state.done && stage === "call") { const t = window.setTimeout(endCall, 1800); return () => window.clearTimeout(t); } }, [state.done, stage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (stage !== "wrap") return; const t = window.setTimeout(() => setStage("ended"), 1600); return () => window.clearTimeout(t); }, [stage]);

  function hcpSpeak(t: string) { if (!muted && !typing) voice.speak(t); }
  /* Joining: a beat while the other person comes in, a chime, then they open. */
  useEffect(() => {
    if (stage !== "joining") return;
    const t = window.setTimeout(() => {
      setStage("call");
      if (!muted) { const a = new Audio("/call/join.mp3"); a.volume = 0.5; a.play().catch(() => {}); }
      hcpSpeak(state.turns[0].text);
    }, 2200);
    return () => window.clearTimeout(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onChange?.(state, elapsed, ended); }, [state, elapsed, ended, onChange]);

  /* Who's talking, for the tiles: the voice when there is one; otherwise the doctor for a moment after each line, and the rep while typing. */
  const hcpLines = state.turns.filter((t) => t.speaker === "hcp").length;
  const [hcpBusy, setHcpBusy] = useState(false);
  useEffect(() => {
    const last = state.turns.at(-1);
    if (stage !== "call" || last?.speaker !== "hcp") return;
    setHcpBusy(true);
    const t = window.setTimeout(() => setHcpBusy(false), Math.min(4200, 900 + last.text.length * 28));
    return () => window.clearTimeout(t);
  }, [hcpLines, stage]); // eslint-disable-line react-hooks/exhaustive-deps
  const [keying, setKeying] = useState(false);
  useEffect(() => {
    if (!text) { setKeying(false); return; }
    setKeying(true);
    const t = window.setTimeout(() => setKeying(false), 900);
    return () => window.clearTimeout(t);
  }, [text]);
  const me = useMe();
  const outcome = useMemo(() => (stage === "ended" ? scoreCall(sc, state.turns, usedTyping) : null), [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(t: string, viaTyping: boolean) {
    if (!t.trim() || state.done) return;
    if (viaTyping) setUsedTyping(true);
    const next = repSays(state, t);
    setState(next);
    setText("");
    setHint(null);
    hcpSpeak(next.turns.at(-1)!.text);
  }

  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const presenter = useApp((s) => s.presenter);
  /* Voice only for now. With no mic (not allowed, or a browser without speech), the rep answers by tapping a line. */
  const micOff = !(voiceAllowed && voice.supported);
  const samples = presenter || showSamples || micOff ? sampleAnswers(state) : [];

  if (stage === "prep") {
    const cfg = configOf(sc);
    const aid = cfg.showPages ? source(cfg.showPages.sourceId) : undefined;
    const raise = state.queue.filter((o) => !o.moment);
    const role = CHARACTERS[characterOf(sc)].label;
    return (
      <div className="relative isolate flex min-h-full flex-[1_0_auto] flex-col bg-ink text-white">
        <Backdrop strong />
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <span className={cn("rounded-full px-3 py-1.5 text-caption font-bold", MODE[mode].tone)}>{run ? `${run.label} · ` : ""}{MODE[mode].label}</span>
          <button type="button" aria-label="Exit" onClick={onExit} className="grid size-11 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-2">
          {/* Who you're meeting: centred, like a contact card. */}
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="relative grid size-24 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand shadow-brand-lift ring-[6px] ring-white/10">
              <Who className="size-10" aria-hidden="true" />
            </div>
            <Text size="display" weight="extrabold" tone="inverse" className="mt-1 leading-tight">{sc.persona.name}</Text>
            <Text size="body" tone="inverse" className="-mt-1.5 opacity-70">{sc.persona.specialty === role ? role : `${role} · ${sc.persona.specialty}`}</Text>
            {sc.persona.traits.length > 0 && <div className="flex flex-wrap justify-center gap-1.5">{sc.persona.traits.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-white/10 px-3 py-1 text-caption font-semibold text-white/85">{t}</span>)}</div>}
          </div>

          {/* The brief, in one card: what's going on, then the goal, what they'll raise and where. */}
          <div className="flex flex-col divide-y divide-white/10 overflow-hidden rounded-card bg-white/[0.07] ring-1 ring-white/10">
            {covers ? (
              <div className="flex flex-col gap-2.5 p-4">
                <span className="text-caption font-bold text-white/55">This call covers</span>
                <ol className="flex flex-col gap-2">
                  {covers.map((x, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-micro font-extrabold">{i + 1}</span>
                      <Text size="body" weight="bold" tone="inverse" className="leading-snug">{x.objective}</Text>
                    </li>
                  ))}
                </ol>
              </div>
            ) : sc.description ? (
              <div className="flex flex-col gap-1 p-4">
                <Text size="body-lg" weight="bold" tone="inverse" className="leading-snug">{sc.title}</Text>
                <Text size="body" tone="inverse" className="line-clamp-3 leading-relaxed opacity-70">{sc.description}</Text>
              </div>
            ) : null}
            <PrepRow icon={Target} label="Your goal"><Text size="body" tone="inverse" className="line-clamp-3 leading-relaxed">{sc.objective}</Text></PrepRow>
            {raise.length > 0 && <PrepRow icon={MessageCircleWarning} label="They may raise"><div className="flex flex-wrap gap-1.5">{raise.map((o) => <span key={o.id} className="rounded-full bg-white/10 px-2.5 py-0.5 text-caption text-white/90">{o.label}</span>)}</div></PrepRow>}
            <PrepRow icon={MapPin} label="Where"><Text size="body" tone="inverse" className="opacity-85">{cfg.callType} · {cfg.place.toLowerCase()}</Text></PrepRow>
            {aid && cfg.showPages && <PrepRow icon={Presentation} label="You can show"><Text size="body" tone="inverse" className="opacity-85">{aid.title}, pages {cfg.showPages.pages.join(", ")}</Text></PrepRow>}
          </div>

          {hints && mode !== "practice" && mode !== "screening" && (
            <div className="squircle flex items-start gap-3 rounded-panel border border-warn/40 bg-warn/10 p-3.5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-warn text-ink"><Lightbulb className="size-4" aria-hidden="true" /></span>
              <span className="flex flex-col gap-0.5"><Text size="body" weight="bold" tone="inverse">Assisted call</Text><Text size="caption" tone="inverse" className="opacity-70">Stuck? Tap the bulb for a hint on what to say next. Hints you use show on your report.</Text></span>
            </div>
          )}
          {mode === "practice" && (
            <div className="flex flex-col gap-2">
              <span className="text-micro font-bold uppercase tracking-wider text-white/50">How much help?</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Assisted or unassisted">
                {[{ on: true, label: "Assisted", hint: "A hint whenever you tap the bulb" }, { on: false, label: "Unassisted", hint: "A clean call, like the real one" }].map((o) => (
                  <button key={o.label} type="button" role="radio" aria-checked={assist === o.on} onClick={() => setAssist(o.on)}
                    className={cn("squircle flex flex-col gap-0.5 rounded-panel border p-3 text-left transition-colors", assist === o.on ? "border-brand bg-brand/20" : "border-white/15 bg-white/[0.04] hover:bg-white/[0.08]")}>
                    <span className="text-body-lg font-bold text-white">{o.label}</span>
                    <span className="text-caption text-white/60">{o.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Always in reach, however long the brief. */}
        <div className="sticky bottom-0 z-10 flex flex-col gap-2.5 bg-gradient-to-t from-ink from-70% to-ink/0 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-6">
          {/* Bright on the dark screen: the one thing to press. */}
          <button type="button" onClick={() => setStage("joining")}
            className="focus-ring flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-subhead font-extrabold text-ink shadow-[0_10px_30px_-10px_rgba(0,0,0,.6)] transition-transform active:scale-[0.98]">
            <Mic className="size-5 text-brand" aria-hidden="true" />Start call<span className="font-semibold text-ink-3">· {minutes} min</span>
          </button>
          <Text size="caption" tone="inverse" className="text-center opacity-60">
            {mode === "assessment" ? "Scored · off-label statements fail" : mode === "screening" ? "Scored for your baseline" : mode === "practice" ? "Private · only you see it" : "Scored"}
            {!voiceAllowed ? " · you'll tap your answers" : voice.supported ? "" : " · you'll tap your answers"}
          </Text>
        </div>
      </div>
    );
  }

  const canVoice = voiceAllowed && voice.supported && !typing;
  const live = stage === "call";
  const first = sc.persona.name.replace(/^(Dr\.?|Nurse|Mr\.?|Ms\.?|Mrs\.?)\s+/, "").split(/[ ,]/)[0];
  const short = sc.persona.name.replace(/,.*$/, "");
  const doctorTalking = live && (voice.speaking || (hcpBusy && !voice.listening));
  const repTalking = live && (voice.listening || keying);
  const repTurns = state.turns.filter((t) => t.speaker === "rep").length;
  const critical = outcome?.flags.some((f) => f.critical);
  const cfg = configOf(sc);
  const raise = state.queue.filter((o) => !o.moment);

  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-ink text-white desk:h-full">
      <Backdrop />

      {/* The bar: on air and for how long, what kind of call, the brief, the doctor's volume. */}
      <div className="flex shrink-0 items-center gap-2.5 px-4 pb-1 pt-3">
        {stage === "joining" ? (
          <span className="flex items-center gap-2 text-body font-semibold text-white/60"><span className="size-1.5 animate-pulse rounded-full bg-white/50" />Connecting</span>
        ) : (
          <span className="flex items-center gap-2">
            <span className={cn("size-2 rounded-full", ended ? "bg-white/40" : "animate-pulse bg-[#ff5a4f]")} aria-hidden="true" />
            <Text size="body-lg" weight="bold" tone="inverse" tabular>{mmss(elapsed)}</Text>
          </span>
        )}
        <span className="flex min-w-0 items-center gap-1.5 truncate rounded-chip bg-black/35 px-2.5 py-1 text-caption font-semibold text-white/75">
          {mode === "practice" && <Lock className="size-3 shrink-0" aria-hidden="true" />}
          <span className="truncate">{run ? `${run.label} · ` : covers ? `${covers.length} objectives · ` : ""}{MODE[mode].label}</span>
        </span>
        <span className="flex-1" />
        <button type="button" aria-label="Call brief" aria-expanded={brief} onClick={() => setBrief(!brief)} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"><Info className="size-4.5" /></button>
        <button type="button" aria-label={muted ? `Unmute ${short}` : `Mute ${short}`} onClick={() => { setMuted(!muted); voice.hush(); }} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20">
          {muted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
        </button>
      </div>

      {/* The two of you, side by side. Each ring breathes with whoever is talking. */}
      <div className={cn("flex h-[24vh] max-h-[240px] min-h-[132px] shrink-0 gap-3 px-4 pt-2 transition-opacity duration-500", ended && "opacity-35")}>
        <Tile active={repTalking} name="You" badge={!live ? null : repTalking ? (voice.listening ? "speaking" : "typing") : null}>
          <span className="text-title font-bold">{me.initials}</span>
        </Tile>
        {stage === "joining" ? (
          <div className="squircle relative flex min-w-0 flex-1 flex-col items-center justify-center gap-2.5 rounded-card border border-dashed border-white/20 bg-white/[0.04] backdrop-blur-xl">
            <span className="relative grid size-14 place-items-center rounded-full bg-white/10 text-white/60 sm:size-16">
              <span className="pulse-ring absolute inset-0 rounded-full bg-white/15" aria-hidden="true" />
              <Who className="relative size-6" aria-hidden="true" />
            </span>
            <span className="flex items-center gap-1 text-caption font-semibold text-white/60" role="status">{short} is joining<Dots /></span>
          </div>
        ) : (
          <Tile active={doctorTalking} name={short} sub={sc.persona.specialty} enter badge={!live ? null : doctorTalking ? "speaking" : "listening"} warm>
            <Who className="size-6 sm:size-7" aria-hidden="true" />
          </Tile>
        )}
      </div>

      {/* Live captions: the whole conversation, scrolling on its own so the stage never moves. */}
      <div className={cn("squircle mx-4 mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-white/15 bg-white/[0.07] backdrop-blur-xl transition-opacity duration-500", ended && "opacity-35")}>
        <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4">
          <span className="text-micro font-bold uppercase tracking-wider text-white/50">Live captions</span>
          {helped && hintsUsed > 0 && <span className="text-micro font-semibold text-white/40">{hintsUsed} hint{hintsUsed === 1 ? "" : "s"} used{mode === "assessment" ? " · on your report" : ""}</span>}
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-4" aria-live="polite">
          {stage === "joining" ? (
            <div className="m-auto flex max-w-[280px] flex-col items-center gap-1 text-center">
              <Text size="body" weight="semibold" tone="inverse" className="opacity-70">Waiting for {short}</Text>
              <Text size="caption" tone="inverse" className="opacity-45">{first} opens the call. What you both say shows up here.</Text>
            </div>
          ) : state.turns.map((t, i) => (
            <div key={i} className={cn("rise-in flex", t.speaker === "rep" ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[86%] rounded-panel px-3.5 py-2.5", t.speaker === "rep" ? "bg-brand/30" : "bg-white/10")}>
                <span className="block text-caption font-bold text-white/55">{t.speaker === "rep" ? "You" : short}</span>
                <span className="mt-0.5 block text-body-lg leading-relaxed text-white/95">{t.text}</span>
              </div>
            </div>
          ))}
          {voice.listening && voice.interim && (
            <div className="flex justify-end"><div className="max-w-[86%] rounded-panel bg-brand/20 px-3.5 py-2.5"><span className="block text-caption font-bold text-white/55">You</span><span className="mt-0.5 block text-body-lg italic text-white/80">{voice.interim}</span></div></div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* The controls: dimmed until the other person is in, gone once the call is over. */}
      {!ended && (
        <div className={cn("flex shrink-0 flex-col gap-2.5 px-4 pb-[max(env(safe-area-inset-bottom),28px)] pt-3 transition-opacity", !live && "pointer-events-none opacity-40")} aria-disabled={!live}>
          {helped && hint && <HintCard state={state} onClose={() => setHint(null)} />}
          {samples.length > 0 && live && (
            <div className="flex flex-col gap-1.5">
              <Text size="micro" weight="bold" tone="inverse" className="opacity-50">{presenter ? "PRESENTER · TAP TO ANSWER" : micOff ? "TAP A LINE TO ANSWER" : "TAP A LINE TO ANSWER, OR SAY YOUR OWN"}</Text>
              <div className="flex flex-wrap gap-1.5">
                {samples.map((sa) => (
                  <button key={sa.label} type="button" onClick={() => submit(sa.text, true)} className={cn("rounded-chip border bg-black/25 px-2.5 py-1 text-caption font-semibold backdrop-blur", sa.label.includes("try it") ? "border-danger/60 text-[#ff9e9b]" : "border-white/20 text-white/85 hover:bg-white/10")}>{sa.label}</button>
                ))}
              </div>
            </div>
          )}
          {voice.error && <Text size="caption" className="text-warn-on-dark">{voice.error}</Text>}
          {/* v1-hidden: typing an answer. Off for now (TYPING_ON); the form below stays for when it comes back. */}
          {!(TYPING_ON && !canVoice) ? (
            <>
              <div className="mx-auto flex items-center gap-3 rounded-full border border-white/15 bg-black/40 p-2 backdrop-blur-xl">
                {TYPING_ON && canVoice && <button type="button" aria-label="Type instead" onClick={() => setTyping(true)} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Keyboard className="size-5" /></button>}
                {helped && <HintButton on={!!hint} fresh={seen !== moment} onClick={askHint} />}
                <div className="relative">
                  {voice.listening && <span className="pulse-ring absolute inset-0 rounded-full bg-brand" aria-hidden="true" />}
                  <button type="button" aria-label={micOff ? "Microphone off" : voice.listening ? "Done speaking" : "Hold the floor and speak"} disabled={micOff || (voice.speaking && !voice.listening)}
                    onClick={() => (voice.listening ? voice.stop() : voice.listen((t) => submit(t, false)))}
                    className={cn("relative grid size-16 place-items-center rounded-full shadow-brand-lift transition-transform active:scale-95", voice.listening ? "bg-white text-brand" : "bg-brand text-white", (micOff || (voice.speaking && !voice.listening)) && "opacity-50", micOff && "bg-white/15 shadow-none")}>
                    {voice.listening || micOff ? <MicOff className="size-7" /> : <Mic className="size-7" />}
                  </button>
                </div>
                <button type="button" aria-label="End call" onClick={endCall} className="grid size-12 place-items-center rounded-full bg-danger hover:bg-danger-deep"><PhoneOff className="size-5" /></button>
              </div>
              <Text size="caption" tone="inverse" className="text-center opacity-50">{micOff ? (voiceAllowed ? "This browser can't use the mic. Tap a line above to answer." : "Voice is off for you. Tap a line above to answer.") : voice.speaking ? `${first} is talking…` : voice.listening ? "Listening. Tap again when you're done." : helped && seen !== moment ? "Tap the mic and talk, or the bulb for a hint" : "Tap the mic and talk"}</Text>
            </>
          ) : (
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(text, true); }}>
              <label htmlFor="call-input" className="sr-only">Your answer</label>
              <textarea id="call-input" rows={2} value={text} onChange={(e) => setText(e.target.value)} disabled={!live}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(text, true); } }}
                placeholder={helped && seen !== moment ? "Type what you'd say, or tap the bulb" : "Type what you'd say…"} className="min-h-[48px] flex-1 resize-none rounded-control border border-white/15 bg-black/35 px-3 py-2.5 text-body-lg text-white backdrop-blur-xl outline-none placeholder:text-white/40 focus:border-brand" />
              {helped && <HintButton on={!!hint} fresh={seen !== moment} onClick={askHint} />}
              <button type="submit" aria-label="Send" disabled={!text.trim()} className="grid size-12 place-items-center rounded-full bg-brand transition-opacity disabled:opacity-50"><ArrowUp className="size-5" /></button>
              {voiceAllowed && voice.supported && <button type="button" aria-label="Use voice" onClick={() => setTyping(false)} className="grid size-12 place-items-center rounded-full bg-white/10 backdrop-blur hover:bg-white/20"><Mic className="size-5" /></button>}
              <button type="button" aria-label="End call" onClick={endCall} className="grid size-12 place-items-center rounded-full bg-danger hover:bg-danger-deep"><PhoneOff className="size-5" /></button>
            </form>
          )}
        </div>
      )}

      {/* Leaving: a short review, then what happened on the call and the way on to the scorecard. */}
      {ended && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-md [animation:fadeIn_300ms_ease_both]">
          {stage === "wrap" ? (
            <div className="squircle rise-in flex flex-col items-center gap-3 rounded-card border border-white/15 bg-white/10 px-10 py-8 backdrop-blur-xl" role="status">
              <span className="size-6 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-hidden="true" />
              <span className="text-micro font-bold uppercase tracking-wider text-white/70">{mode === "screening" ? "Reading your answers…" : "Reviewing your call…"}</span>
            </div>
          ) : (
            <div className="squircle rise-in flex w-full min-w-0 max-w-[420px] flex-col items-center gap-5 rounded-card border border-white/15 bg-white/10 px-5 py-7 text-center shadow-float backdrop-blur-xl">
              <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand shadow-brand-lift"><AgentIcon className="size-6 text-white" /></span>
              <div className="flex flex-col gap-1">
                <span className="text-micro font-bold uppercase tracking-wider text-white/60">{state.done ? `${short} has left the call` : "You left the call"}</span>
                <Text size="title" weight="extrabold" tone="inverse" className="leading-tight">{run ? run.label : mode === "screening" ? "Screening done" : "Call ended"}</Text>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-chip bg-black/35 px-2.5 py-1 text-caption font-semibold text-white/80"><Who className="size-3.5" aria-hidden="true" />{short}</span>
                {!covers && sc.title && <span className="max-w-full truncate rounded-chip bg-black/35 px-2.5 py-1 text-caption font-semibold text-white/80">{sc.title.startsWith(short) ? sc.title.slice(short.length).replace(/^\s*[·,-]\s*/, "") || sc.title : sc.title}</span>}
                {covers && <span className="rounded-chip bg-black/35 px-2.5 py-1 text-caption font-semibold text-white/80">{covers.length} objectives</span>}
              </div>
              <div className="flex w-full items-center justify-center gap-5 rounded-panel border border-white/10 bg-black/25 px-4 py-4">
                <Stat label="Duration">{mmss(elapsed)}</Stat>
                <span className="h-9 w-px bg-white/15" aria-hidden="true" />
                <Stat label="Your turns">{repTurns}</Stat>
                <span className="h-9 w-px bg-white/15" aria-hidden="true" />
                {!outcome ? <Stat label="Score">–</Stat> : (
                  <Stat label="Score"><span className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", critical ? "bg-danger" : outcome.score >= 70 ? "bg-ok" : "bg-warn")} aria-hidden="true" />{outcome.score}/100</span></Stat>
                )}
              </div>
              {critical && <Text size="caption" className="-mt-2 text-[#ffb3b0]">A critical compliance flag came up. Your scorecard shows where.</Text>}
              {/* Bright on the dark screen, like Start call. */}
              <button type="button" onClick={() => { voice.hush(); onComplete(outcome ?? scoreCall(sc, state.turns, usedTyping), { assisted: assist || !!hints, hints: hintsUsed }); }}
                className="focus-ring flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-subhead font-extrabold text-ink transition-transform active:scale-[0.98]">
                <AgentIcon className="size-4 text-brand" />{run ? run.next : mode === "screening" ? "See my results" : mode === "test" ? "See the scorecard" : "See my scorecard"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* The brief, any time during the call. */}
      {brief && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end">
          <button type="button" aria-label="Close the brief" onClick={() => setBrief(false)} className="absolute inset-0 bg-black/50 [animation:fadeIn_200ms_ease_both]" />
          <div className="sheet-up relative flex max-h-[75%] flex-col overflow-hidden rounded-t-card border-t border-white/15 bg-[#14161c]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
              <span className="text-micro font-bold uppercase tracking-wider text-white/60">Call brief</span>
              <button type="button" aria-label="Close the brief" onClick={() => setBrief(false)} className="grid size-8 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-4" /></button>
            </div>
            <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand"><Who className="size-5" aria-hidden="true" /></span>
                <span className="flex min-w-0 flex-col"><Text size="body-lg" weight="bold" tone="inverse">{sc.persona.name}</Text><Text size="caption" tone="inverse" className="opacity-60">{sc.persona.specialty} · {sc.persona.setting}</Text></span>
              </div>
              {covers ? (
                <ol className="flex flex-col gap-2">
                  {covers.map((x, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-micro font-extrabold">{i + 1}</span>
                      <span className="flex min-w-0 flex-col"><Text size="body" weight="bold" tone="inverse" className="leading-snug">{x.objective}</Text><Text size="caption" tone="inverse" className="opacity-60">{x.situation}</Text></span>
                    </li>
                  ))}
                </ol>
              ) : sc.description ? <Text size="body" tone="inverse" className="leading-relaxed opacity-75">{sc.description}</Text> : null}
              <ul className="flex flex-col divide-y divide-white/10 rounded-panel border border-white/10">
                <PrepRow icon={Target} label="Your goal"><Text size="body" tone="inverse" className="leading-relaxed">{sc.objective}</Text></PrepRow>
                {raise.length > 0 && <PrepRow icon={MessageCircleWarning} label="They may raise"><div className="flex flex-wrap gap-1.5">{raise.map((o) => <span key={o.id} className="rounded-chip bg-white/10 px-2 py-0.5 text-caption text-white/90">{o.label}</span>)}</div></PrepRow>}
                <PrepRow icon={MapPin} label="Where"><Text size="body" tone="inverse" className="opacity-85">{cfg.callType} · {cfg.place.toLowerCase()}</Text></PrepRow>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** The call's stage: the SwishX backdrop under a scrim, so glass and white text read on any part of it. */
function Backdrop({ strong }: { strong?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <img src="/call/stage-bg.jpg" alt="" className="size-full object-cover" />
      <div className={cn("absolute inset-0", strong ? "bg-ink/80" : "bg-ink/50")} />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/60" />
    </div>
  );
}

/** One person on the call. The ring around them swells and settles like a live audio level while they talk, and rests at a soft glow otherwise. */
function Tile({ active, name, sub, badge, enter, warm, children }: {
  active: boolean; name: string; sub?: string; badge: "speaking" | "listening" | "typing" | null; enter?: boolean; warm?: boolean; children: React.ReactNode;
}) {
  const [level, setLevel] = useState(0.14);
  useEffect(() => {
    const t = window.setInterval(() => setLevel((v) => (active ? v + (0.55 + Math.random() * 0.4 - v) * 0.35 : v + (0.14 - v) * 0.15)), 90);
    return () => window.clearInterval(t);
  }, [active]);
  const glow = `0 0 0 ${2 + level * 2}px color-mix(in srgb, var(--color-brand) ${Math.round((0.35 + level * 0.5) * 100)}%, transparent), 0 0 ${14 + level * 40}px ${2 + level * 8}px color-mix(in srgb, var(--color-brand) ${Math.round((0.15 + level * 0.35) * 100)}%, transparent)`;
  return (
    <div className={cn("squircle relative min-w-0 flex-1 overflow-hidden rounded-card border border-white/15 bg-white/10 backdrop-blur-xl", enter && "tile-in")}>
      <div className="absolute inset-0 grid place-items-center">
        <span className={cn("grid size-14 place-items-center rounded-full text-white transition-shadow duration-150 sm:size-16", warm ? "bg-gradient-to-br from-brand-2 to-brand" : "bg-ink-2")} style={{ boxShadow: glow }}>{children}</span>
      </div>
      <span className="absolute bottom-2.5 left-2.5 flex max-w-[calc(100%-1.25rem)] items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1">
        <span className="truncate text-caption font-semibold text-white">{name}</span>
        {/* v1-hidden: the role beside the name; tiles are narrow on a phone, the name is enough. */}
      </span>
      {badge && (
        <span className={cn("rise-in absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-micro font-semibold", badge === "listening" ? "text-white/55" : "text-[#ff8a66]")}>
          {badge === "listening" ? <Ear className="size-3" aria-hidden="true" /> : badge === "typing" ? <Keyboard className="size-3" aria-hidden="true" /> : <Volume2 className="size-3 animate-pulse" aria-hidden="true" />}
          {badge === "listening" ? "Listening" : badge === "typing" ? "Typing" : "Speaking"}
        </span>
      )}
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-micro font-bold uppercase tracking-wider text-white/45">{label}</span>
      <span className="text-body-lg font-bold tabular-nums text-white">{children}</span>
    </div>
  );
}

function Dots() {
  return <span className="inline-flex gap-0.5" aria-hidden="true">{[0, 1, 2].map((i) => <span key={i} className="size-1 rounded-full bg-current [animation:typing-bounce_1.2s_ease-in-out_infinite]" style={{ animationDelay: `${i * 150}ms` }} />)}</span>;
}

/** One line of the brief: an icon, what it is, then the detail. */
function PrepRow({ icon: Icon, label, children }: { icon: typeof Mic; label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 p-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-white/50" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-1"><span className="text-micro font-bold uppercase tracking-wider text-white/50">{label}</span>{children}</div>
    </li>
  );
}

/** The bulb: glows while a hint is open, and pulses when the call has moved on and a fresh hint is there. */
function HintButton({ on, fresh, onClick }: { on: boolean; fresh: boolean; onClick: () => void }) {
  return (
    <span className="relative">
      {fresh && !on && <span className="pulse-ring absolute inset-0 rounded-full bg-warn/60" aria-hidden="true" />}
      <button type="button" aria-label={on ? "Hide the hint" : "Show a hint"} aria-pressed={on} onClick={onClick}
        className={cn("relative grid size-12 place-items-center rounded-full transition-colors", on ? "bg-warn text-ink" : fresh ? "bg-warn/25 text-warn hover:bg-warn/35" : "bg-white/10 text-white/80 hover:bg-white/20")}>
        <Lightbulb className="size-5" />
      </button>
    </span>
  );
}

/** One hint for where the call is now: what to do, the approved way to say it, and what to stay away from. It times out on its own. */
function HintCard({ state, onClose }: { state: CallState; onClose: () => void }) {
  if (state.done) return null;
  const cur = state.idx >= 0 ? state.queue[state.idx] : undefined;
  const say = sampleAnswers(state).find((x) => !x.label.includes("try it"))?.text;
  const avoid = state.scenario.prohibitedIds.map((id) => prohibited(id)).find((r) => r?.critical);
  const stage = cur ? cur.label : "The opening";
  const tip = cur ? "Acknowledge it first, answer with the approved facts, then move to a next step." : "Open on a patient type and ask one question before you talk about the product.";
  return (
    <div className="squircle rise-in relative flex flex-col gap-1.5 overflow-hidden rounded-panel border border-warn/40 bg-[#2a2414] p-3 pr-9" role="status" aria-live="polite">
      <span className="flex items-center gap-1.5 text-micro font-bold uppercase tracking-wider text-warn"><Lightbulb className="size-3" aria-hidden="true" />Hint · {stage}</span>
      <Text size="body" tone="inverse" className="opacity-90">{tip}</Text>
      {say && <Text size="body" tone="inverse" className="italic opacity-75">“{say.length > 170 ? `${say.slice(0, 168)}…` : say}”</Text>}
      {avoid && <span className="self-start rounded-chip bg-danger/25 px-2 py-0.5 text-caption font-semibold text-[#ffb3b0]">Avoid: {avoid.label.toLowerCase()}</span>}
      <button type="button" aria-label="Hide the hint" onClick={onClose} className="absolute right-2 top-2 grid size-6 place-items-center rounded-full text-white/50 hover:bg-white/10 hover:text-white"><X className="size-3.5" /></button>
      <span className="hint-timer absolute bottom-0 left-0 h-0.5 bg-warn/70" aria-hidden="true" />
    </div>
  );
}
