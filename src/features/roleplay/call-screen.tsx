"use client";

import { useEffect, useRef, useState } from "react";
import { Keyboard, Mic, MicOff, PhoneOff, Volume2, VolumeX, X, Lock, Sparkles, ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Scenario } from "@/data/types";
import { objection } from "@/data/scenarios";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { startCall, repSays, sampleAnswers, scoreCall, type CallState } from "./engine";
import { useVoice } from "./use-voice";

export type CallMode = "screening" | "assessment" | "practice" | "test";
export type CallOutcome = ReturnType<typeof scoreCall>;

const MODE: Record<CallMode, { label: string; tone: string }> = {
  screening: { label: "Screening call · not graded", tone: "bg-white/10 text-white" },
  assessment: { label: "Assessment · recorded for verification", tone: "bg-brand text-white" },
  practice: { label: "Practice · only you can see this", tone: "bg-white/10 text-white" },
  test: { label: "Trainer test call · not saved", tone: "bg-white/10 text-white" },
};

export function CallScreen({ scenario, objectionIds, mode, voiceAllowed, onComplete, onExit, personaOverride }: {
  scenario: Scenario; objectionIds?: string[]; mode: CallMode; voiceAllowed: boolean;
  onComplete: (r: CallOutcome) => void; onExit: () => void; personaOverride?: Partial<Scenario["persona"]>;
}) {
  const sc: Scenario = personaOverride ? { ...scenario, persona: { ...scenario.persona, ...personaOverride } } : scenario;
  const [stage, setStage] = useState<"prep" | "call" | "ended">("prep");
  const [state, setState] = useState<CallState>(() => startCall(sc, objectionIds));
  const [typing, setTyping] = useState(!voiceAllowed);
  const [text, setText] = useState("");
  const [muted, setMuted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [usedTyping, setUsedTyping] = useState(!voiceAllowed);
  const voice = useVoice();
  const endRef = useRef<HTMLDivElement>(null);
  const initials = sc.persona.name.replace("Dr. ", "").split(" ").map((x) => x[0]).join("");

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [state.turns, voice.interim]);
  useEffect(() => {
    if (stage !== "call") return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [stage]);
  useEffect(() => {
    if (stage === "call" && elapsed >= sc.durationMin * 60) setStage("ended");
  }, [elapsed, stage, sc.durationMin]);
  useEffect(() => { if (state.done && stage === "call") window.setTimeout(() => setStage("ended"), 600); }, [state.done, stage]);

  function hcpSpeak(t: string) { if (!muted && !typing) voice.speak(t); }

  function submit(t: string, viaTyping: boolean) {
    if (!t.trim() || state.done) return;
    if (viaTyping) setUsedTyping(true);
    const next = repSays(state, t);
    setState(next);
    setText("");
    hcpSpeak(next.turns.at(-1)!.text);
  }

  const mmss = (n: number) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`;
  const samples = sampleAnswers(state);

  if (stage === "prep") {
    return (
      <div className="flex min-h-full flex-1 flex-col gap-6 bg-ink px-5 pb-8 pt-5 text-white">
        <div className="flex items-center justify-between">
          <span className={cn("rounded-chip px-2.5 py-1 text-caption font-semibold", MODE[mode].tone)}>{MODE[mode].label}</span>
          <button type="button" aria-label="Exit" onClick={onExit} className="grid size-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><X className="size-5" /></button>
        </div>
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <div className="grid size-24 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-hero font-extrabold">{initials}</div>
          <Text size="display-lg" weight="extrabold" tone="inverse">{sc.persona.name}</Text>
          <Text size="body-lg" tone="inverse" className="opacity-70">{sc.persona.specialty} · {sc.persona.setting}</Text>
          <div className="flex flex-wrap justify-center gap-1.5">{sc.persona.traits.map((t) => <span key={t} className="rounded-chip bg-white/10 px-2.5 py-1 text-caption">{t}</span>)}</div>
        </div>
        <div className="squircle flex flex-col gap-3 rounded-panel bg-white/[0.06] p-4">
          <Text size="caption" weight="bold" tone="inverse" className="opacity-60">YOUR OBJECTIVE</Text>
          <Text size="body-lg" tone="inverse">{sc.objective}</Text>
          <Text size="caption" weight="bold" tone="inverse" className="opacity-60">THEY MAY RAISE</Text>
          <div className="flex flex-wrap gap-1.5">{(objectionIds?.length ? objectionIds : sc.objectionIds).map((o) => <span key={o} className="rounded-chip bg-white/10 px-2 py-0.5 text-caption">{objection(o).label}</span>)}</div>
          <Text size="caption" tone="inverse" className="opacity-60">About {sc.durationMin} minutes. Speak naturally; the doctor answers out loud.{mode === "assessment" ? " This call is recorded and scored. Off-label statements fail the assessment." : mode === "screening" ? " Nothing here counts against you." : ""}</Text>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <Button size="lg" fullWidth onClick={() => { setStage("call"); hcpSpeak(state.turns[0].text); }}>
            <Mic className="size-5" aria-hidden="true" />Start call
          </Button>
          {!voiceAllowed && <Text size="caption" tone="inverse" className="text-center opacity-60">Voice is off until you agree to the recording notice. You'll type your answers.</Text>}
          {voiceAllowed && !voice.supported && <Text size="caption" tone="inverse" className="text-center opacity-60">This browser can't use the microphone here. You'll type your answers.</Text>}
        </div>
      </div>
    );
  }

  const canVoice = voiceAllowed && voice.supported && !typing;

  return (
    <div className="flex h-dvh flex-col bg-ink text-white sm:h-full">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3">
        <div className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-brand-2 to-brand text-body-lg font-extrabold">{initials}</div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Text size="body-lg" weight="bold" tone="inverse" truncate>{sc.persona.name}</Text>
          <span className="flex items-center gap-1.5 text-caption text-white/60">
            {mode === "practice" && <Lock className="size-3" aria-hidden="true" />}{MODE[mode].label}
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
            <Text size="title" weight="bold" tone="inverse">Call ended</Text>
            <Text size="body" tone="inverse" className="opacity-70">{state.turns.filter((t) => t.speaker === "rep").length} turns · {mmss(elapsed)}</Text>
            <Button size="lg" onClick={() => { voice.hush(); onComplete(scoreCall(sc, state.turns, usedTyping)); }}>
              <Sparkles className="size-4" aria-hidden="true" />{mode === "screening" ? "See my results" : "See my scorecard"}
            </Button>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {stage === "call" && (
        <div className="flex shrink-0 flex-col gap-3 border-t border-white/10 px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-3">
          {samples.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Text size="micro" weight="bold" tone="inverse" className="opacity-50">DEMO · TAP TO ANSWER WITHOUT A MIC</Text>
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
              <button type="button" aria-label="Type instead" onClick={() => setTyping(true)} className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Keyboard className="size-5" /></button>
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
                placeholder="Type what you'd say…" className="min-h-[48px] flex-1 resize-none rounded-control border border-white/15 bg-white/[0.06] px-3 py-2.5 text-body-lg text-white placeholder:text-white/40 outline-none focus:border-brand" />
              <button type="submit" aria-label="Send" className="grid size-12 place-items-center rounded-full bg-brand"><ArrowUp className="size-5" /></button>
              {voiceAllowed && voice.supported && <button type="button" aria-label="Use voice" onClick={() => setTyping(false)} className="grid size-12 place-items-center rounded-full bg-white/10"><Mic className="size-5" /></button>}
              <button type="button" aria-label="End call" onClick={() => setStage("ended")} className="grid size-12 place-items-center rounded-full bg-danger"><PhoneOff className="size-5" /></button>
            </form>
          )}
          {canVoice && <Text size="caption" tone="inverse" className="text-center opacity-50">{voice.speaking ? `${sc.persona.name.split(" ")[1]} is talking…` : voice.listening ? "Listening. Tap again when you're done." : "Tap the mic and talk"}</Text>}
        </div>
      )}
    </div>
  );
}
