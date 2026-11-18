"use client";

import { useEffect, useRef, useState } from "react";
import { Briefcase, Keyboard, Lightbulb, MapPin, MessageCircleWarning, Mic, MicOff, PhoneOff, Pill, Presentation, Stethoscope, Syringe, Target, UserRound, Volume2, VolumeX, X, Lock, ArrowUp } from "lucide-react";
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import type { Character, Scenario } from "@/data/types";
import { CHARACTERS, characterOf } from "@/lib/scenario-set";
import { prohibited } from "@/data/scenarios";
import { source } from "@/data/org";
import { configOf } from "@/lib/roleplay-draft";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { startCall, repSays, sampleAnswers, scoreCall, type CallState } from "./engine";
import { useVoice } from "./use-voice";

/** Who the rep is talking to, as an icon: the role, not a monogram. */
export const ROLE_ICON: Record<Character, typeof Mic> = { doctor: Stethoscope, nurse: Syringe, manager: Briefcase, pharmacist: Pill, patient: UserRound };

export type CallMode = "screening" | "assessment" | "practice" | "test";
export type CallOutcome = ReturnType<typeof scoreCall>;

const MODE: Record<CallMode, { label: string; tone: string }> = {
  screening: { label: "Screening call · not graded", tone: "bg-white/10 text-white" },
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
  const sc: Scenario = personaOverride ? { ...scenario, persona: { ...scenario.persona, ...personaOverride } } : scenario;
  const [stage, setStage] = useState<"prep" | "call" | "ended">(skipPrep ? "call" : "prep");
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
  useEffect(() => {
    if (stage === "call" && elapsed >= minutes * 60) setStage("ended");
  }, [elapsed, stage, minutes]);
  useEffect(() => { if (state.done && stage === "call") window.setTimeout(() => setStage("ended"), 600); }, [state.done, stage]);

  function hcpSpeak(t: string) { if (!muted && !typing) voice.speak(t); }
  /* Straight into the call: the doctor opens. */
  const opened = useRef(false);
  useEffect(() => { if (skipPrep && !opened.current) { opened.current = true; hcpSpeak(state.turns[0].text); } }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { onChange?.(state, elapsed, stage === "ended"); }, [state, elapsed, stage, onChange]);

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
  const samples = presenter || showSamples ? sampleAnswers(state) : [];

  if (stage === "prep") {
    const cfg = configOf(sc);
    const aid = cfg.showPages ? source(cfg.showPages.sourceId) : undefined;
    const raise = state.queue.filter((o) => !o.moment);
    const role = CHARACTERS[characterOf(sc)].label;
    return (
      <div className="flex min-h-full flex-[1_0_auto] flex-col bg-ink text-white">
        <div className="flex items-center justify-between gap-3 px-5 pt-5">
          <span className={cn("rounded-chip px-2.5 py-1 text-caption font-semibold", MODE[mode].tone)}>{run ? `${run.label} · ` : ""}{MODE[mode].label}</span>
          <button type="button" aria-label="Exit" onClick={onExit} className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </div>

        <div className="flex flex-1 flex-col gap-5 px-5 pb-6 pt-5">
          {/* Who you're meeting. */}
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand shadow-brand-lift"><Who className="size-7" aria-hidden="true" /></div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <Text size="title" weight="extrabold" tone="inverse" className="leading-tight">{sc.persona.name}</Text>
              <Text size="body" tone="inverse" className="opacity-70">{sc.persona.specialty === role ? role : `${role} · ${sc.persona.specialty}`}</Text>
              <Text size="caption" tone="inverse" className="opacity-50">{sc.persona.setting}</Text>
            </div>
          </div>
          {sc.persona.traits.length > 0 && <div className="-mt-2 flex flex-wrap gap-1.5">{sc.persona.traits.map((t) => <span key={t} className="rounded-chip bg-white/10 px-2.5 py-1 text-caption text-white/85">{t}</span>)}</div>}

          {/* What's happening, and what you're there to do. */}
          {covers && (
            <div className="squircle flex flex-col gap-2.5 rounded-panel bg-white/[0.06] p-4">
              <span className="text-micro font-bold uppercase tracking-wider text-white/50">This call covers {covers.length} objectives</span>
              <ol className="flex flex-col gap-2">
                {covers.map((x, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-micro font-extrabold">{i + 1}</span>
                    <span className="flex min-w-0 flex-col"><Text size="body" weight="bold" tone="inverse" className="leading-snug">{x.objective}</Text><Text size="caption" tone="inverse" className="opacity-60">{x.situation}</Text></span>
                  </li>
                ))}
              </ol>
              <Text size="caption" tone="inverse" className="opacity-55">{sc.persona.name.replace(/,.*$/, "")} brings each one up in turn. Each is scored on its own, so a slip on one doesn&apos;t cost you the others.</Text>
            </div>
          )}
          {!covers && sc.description && (
            <div className="squircle flex flex-col gap-1.5 rounded-panel bg-white/[0.06] p-4">
              <span className="text-micro font-bold uppercase tracking-wider text-white/50">The situation</span>
              <Text size="body-lg" weight="bold" tone="inverse" className="leading-snug">{sc.title}</Text>
              <Text size="body" tone="inverse" className="leading-relaxed opacity-75">{sc.description}</Text>
            </div>
          )}
          <ul className="flex flex-col divide-y divide-white/10 rounded-panel border border-white/10">
            <PrepRow icon={Target} label="Your goal"><Text size="body" tone="inverse" className="leading-relaxed">{sc.objective}</Text></PrepRow>
            {raise.length > 0 && <PrepRow icon={MessageCircleWarning} label="They may raise"><div className="flex flex-wrap gap-1.5">{raise.map((o) => <span key={o.id} className="rounded-chip bg-white/10 px-2 py-0.5 text-caption text-white/90">{o.label}</span>)}</div></PrepRow>}
            <PrepRow icon={MapPin} label="Where"><Text size="body" tone="inverse" className="opacity-85">{cfg.callType} · {cfg.place.toLowerCase()}</Text></PrepRow>
            {aid && cfg.showPages && <PrepRow icon={Presentation} label="You can show"><Text size="body" tone="inverse" className="opacity-85">{aid.title}, pages {cfg.showPages.pages.join(", ")}</Text></PrepRow>}
          </ul>

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
        <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-white/10 bg-ink/95 px-5 pb-[max(env(safe-area-inset-bottom),20px)] pt-3 backdrop-blur">
          <Button size="lg" fullWidth onClick={() => { setStage("call"); hcpSpeak(state.turns[0].text); }}>
            <Mic className="size-5" aria-hidden="true" />Start call
          </Button>
          <Text size="caption" tone="inverse" className="text-center opacity-55">
            About {minutes} min{mode === "assessment" ? ` · scored · an off-label statement fails ${run ? "this situation" : "the call"}` : mode === "screening" ? " · nothing here counts against you" : mode === "practice" ? " · only you see it" : ""}
            {!voiceAllowed ? " · you'll type your answers" : voice.supported ? "" : " · this browser can't use the mic, so you'll type"}
          </Text>
        </div>
      </div>
    );
  }

  const canVoice = voiceAllowed && voice.supported && !typing;

  return (
    <div className="flex h-dvh flex-col bg-ink text-white sm:h-full">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand"><Who className="size-5" aria-hidden="true" /></div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Text size="body-lg" weight="bold" tone="inverse" truncate>{sc.persona.name}</Text>
          <span className="flex items-center gap-1.5 text-caption text-white/60">
            {mode === "practice" && <Lock className="size-3" aria-hidden="true" />}{run ? `${run.label} · ` : covers ? `${covers.length} objectives · ` : ""}{MODE[mode].label}
          </span>
        </div>
        <Text size="body-lg" weight="bold" tone="inverse" tabular className="opacity-80">{mmss(elapsed)}</Text>
        <button type="button" aria-label={muted ? "Unmute doctor" : "Mute doctor"} onClick={() => { setMuted(!muted); voice.hush(); }} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20">
          {muted ? <VolumeX className="size-4.5" /> : <Volume2 className="size-4.5" />}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4" aria-live="polite">
        {state.turns.map((t, i) => (
          <div key={i} className={cn("flex", t.speaker === "rep" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[85%] rounded-panel px-3.5 py-2.5 text-body-lg leading-relaxed", t.speaker === "rep" ? "bg-brand text-white" : "bg-white/10 text-white")}>
              {t.text}
            </div>
          </div>
        ))}
        {voice.listening && voice.interim && <div className="flex justify-end"><div className="max-w-[85%] rounded-panel bg-brand/40 px-3.5 py-2.5 text-body-lg italic text-white/90">{voice.interim}</div></div>}
        {stage === "ended" && (
          <div className="squircle mt-2 flex flex-col items-center gap-3 rounded-panel bg-white/[0.06] p-5 text-center">
            <Text size="title" weight="bold" tone="inverse">{run ? `${sc.persona.name} has left the call` : "Call ended"}</Text>
            <Text size="body" tone="inverse" className="opacity-70">{state.turns.filter((t) => t.speaker === "rep").length} turns · {mmss(elapsed)}</Text>
            <Button size="lg" onClick={() => { voice.hush(); onComplete(scoreCall(sc, state.turns, usedTyping), { assisted: assist || !!hints, hints: hintsUsed }); }}>
              <AgentIcon className="size-4" aria-hidden="true" />{run ? run.next : mode === "screening" ? "See my results" : mode === "test" ? "See the scorecard" : "See my scorecard"}
            </Button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {stage === "call" && (
        <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
          {helped && hint && <HintCard state={state} onClose={() => setHint(null)} />}
          {samples.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Text size="micro" weight="bold" tone="inverse" className="opacity-50">{presenter ? "PRESENTER · TAP TO ANSWER" : "TAP A LINE TO ANSWER, OR SAY YOUR OWN"}</Text>
              <div className="flex flex-wrap gap-1.5">
                {samples.map((sa) => (
                  <button key={sa.label} type="button" onClick={() => submit(sa.text, true)} className={cn("rounded-chip border px-2.5 py-1 text-caption font-semibold", sa.label.includes("try it") ? "border-danger/60 text-[#ff9e9b]" : "border-white/20 text-white/85 hover:bg-white/10")}>{sa.label}</button>
                ))}
              </div>
            </div>
          )}
          {voice.error && <Text size="caption" className="text-warn-on-dark">{voice.error}</Text>}
          {canVoice ? (
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <button type="button" aria-label="Type instead" onClick={() => setTyping(true)} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Keyboard className="size-5" /></button>
                {helped && <HintButton on={!!hint} fresh={seen !== moment} onClick={askHint} />}
              </span>
              <div className="relative">
                {voice.listening && <span className="pulse-ring absolute inset-0 rounded-full bg-brand" aria-hidden="true" />}
                <button type="button" aria-label={voice.listening ? "Done speaking" : "Hold the floor and speak"} disabled={voice.speaking && !voice.listening}
                  onClick={() => (voice.listening ? voice.stop() : voice.listen((t) => submit(t, false)))}
                  className={cn("relative grid size-[72px] place-items-center rounded-full shadow-brand-lift transition-transform active:scale-95", voice.listening ? "bg-white text-brand" : "bg-brand text-white", voice.speaking && !voice.listening && "opacity-50")}>
                  {voice.listening ? <MicOff className="size-7" /> : <Mic className="size-7" />}
                </button>
              </div>
              <button type="button" aria-label="End call" onClick={() => setStage("ended")} className="grid size-12 place-items-center rounded-full bg-danger hover:bg-danger-deep"><PhoneOff className="size-5" /></button>
            </div>
          ) : (
            <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); submit(text, true); }}>
              <label htmlFor="call-input" className="sr-only">Your answer</label>
              <textarea id="call-input" rows={2} value={text} onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(text, true); } }}
                placeholder={helped && seen !== moment ? "Type what you'd say, or tap the bulb" : "Type what you'd say…"} className="min-h-[48px] flex-1 resize-none rounded-control border border-white/15 bg-white/[0.06] px-3 py-2.5 text-body-lg text-white placeholder:text-white/40 outline-none focus:border-brand" />
              {helped && <HintButton on={!!hint} fresh={seen !== moment} onClick={askHint} />}
              <button type="submit" aria-label="Send" className="grid size-12 place-items-center rounded-full bg-brand"><ArrowUp className="size-5" /></button>
              {voiceAllowed && voice.supported && <button type="button" aria-label="Use voice" onClick={() => setTyping(false)} className="grid size-12 place-items-center rounded-full bg-white/10"><Mic className="size-5" /></button>}
              <button type="button" aria-label="End call" onClick={() => setStage("ended")} className="grid size-12 place-items-center rounded-full bg-danger"><PhoneOff className="size-5" /></button>
            </form>
          )}
          {canVoice && <Text size="caption" tone="inverse" className="text-center opacity-50">{voice.speaking ? `${sc.persona.name.split(" ")[1] ?? sc.persona.name} is talking…` : voice.listening ? "Listening. Tap again when you're done." : helped && seen !== moment ? "Tap the mic and talk, or the bulb for a hint" : "Tap the mic and talk"}</Text>}
          {helped && hintsUsed > 0 && <Text size="micro" tone="inverse" className="-mt-1 text-center opacity-40">{hintsUsed} hint{hintsUsed === 1 ? "" : "s"} used{mode === "assessment" ? " · shown on your report" : ""}</Text>}
        </div>
      )}
    </div>
  );
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
