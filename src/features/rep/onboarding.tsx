"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mic, Route, ShieldCheck, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { useMe } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/features/shell/brand";

/** RH-2: three screens, voice consent, mic check. */
export function RepOnboarding() {
  const router = useRouter();
  const me = useMe();
  const settings = useApp((s) => s.settings);
  const complete = useApp((s) => s.completeOnboarding);
  const setConsent = useApp((s) => s.setVoiceConsent);
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState(0);
  const [micState, setMicState] = useState<"idle" | "on" | "blocked">("idle");
  const stream = useRef<MediaStream | null>(null);
  const raf = useRef(0);

  useEffect(() => () => { cancelAnimationFrame(raf.current); stream.current?.getTracks().forEach((t) => t.stop()); }, []);

  async function testMic() {
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = st;
      const ctx = new AudioContext();
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      ctx.createMediaStreamSource(st).connect(an);
      const data = new Uint8Array(an.frequencyBinCount);
      setMicState("on");
      const tick = () => { an.getByteFrequencyData(data); setLevel(Math.min(100, Math.round((data.reduce((a, b) => a + b, 0) / data.length) * 1.6))); raf.current = requestAnimationFrame(tick); };
      tick();
    } catch { setMicState("blocked"); }
  }

  function finish() {
    complete(me.id);
    router.replace("/rep");
  }

  const screens = [
    {
      icon: <Route className="size-7" aria-hidden="true" />, title: `Welcome, ${me.first}`,
      body: "Start with your foundation courses. Then a short screening finds what you already know, so your path covers only your gaps, plus the safety content everyone takes.",
      points: ["Foundations first: compliance and your therapy area", "Screening: ~10 min quiz + a 5 min call with an AI doctor", "Explore the Library any time. Nothing there is graded"],
    },
    {
      icon: <Lock className="size-7" aria-hidden="true" />, title: "Practice is private",
      body: "Rehearse any conversation as often as you like. Your trainer and manager never see your practice sessions, only anonymous team-wide trends. Share a session yourself if you want coaching.",
      points: ["Unlimited, ungraded, never in your record", "Recordings delete after 30 days", "You choose what to share"],
    },
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col gap-6 px-5 pb-8 pt-8">
      <div className="flex items-center gap-2"><BrandMark size={30} /><Text size="body-lg" weight="extrabold">Academy</Text>
        <div className="ml-auto flex gap-1.5">{[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 w-6 rounded-full", i <= step ? "bg-brand" : "bg-black/10")} />)}</div>
      </div>

      {step < 2 && (
        <div key={step} className="rise-in flex flex-1 flex-col gap-5">
          <div className="grid size-16 place-items-center rounded-panel bg-tint text-brand-deep">{screens[step].icon}</div>
          <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{screens[step].title}</Text>
          <Text as="p" size="subhead" tone="muted" className="leading-relaxed">{screens[step].body}</Text>
          <ul className="flex flex-col gap-2.5">
            {screens[step].points.map((p) => <li key={p} className="flex items-start gap-2.5"><Check className="mt-0.5 size-4.5 shrink-0 text-ok" aria-hidden="true" /><Text size="body-lg">{p}</Text></li>)}
          </ul>
          <Button size="lg" fullWidth className="mt-auto" onClick={() => setStep(step + 1)}>Continue</Button>
        </div>
      )}

      {step === 2 && (
        <div className="rise-in flex flex-1 flex-col gap-5">
          <div className="grid size-16 place-items-center rounded-panel bg-tint text-brand-deep"><ShieldCheck className="size-7" aria-hidden="true" /></div>
          <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">Before your first voice session</Text>
          <div className="squircle rounded-panel border border-hair bg-card p-4">
            <Text as="p" size="body-lg" tone="muted" className="leading-relaxed">{settings.consentText}</Text>
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <Button size="lg" fullWidth onClick={() => { setConsent(me.id, true); setStep(3); }}>I agree</Button>
            <Button size="lg" fullWidth variant="ghost" onClick={() => { setConsent(me.id, false); finish(); }}>Not now · I'll type instead</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rise-in flex flex-1 flex-col gap-5">
          <div className="grid size-16 place-items-center rounded-panel bg-tint text-brand-deep"><Mic className="size-7" aria-hidden="true" /></div>
          <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">Quick mic check</Text>
          <Text as="p" size="subhead" tone="muted">Say a few words. The bar should move.</Text>
          <div className="flex h-16 items-end gap-1.5" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className={cn("w-full rounded-full transition-all", i < (level / 100) * 24 ? "bg-brand" : "bg-black/10")} style={{ height: `${20 + ((i * 37) % 60)}%` }} />
            ))}
          </div>
          {micState === "blocked" && <Text tone="warn" weight="semibold">The browser blocked the microphone. You can still type in every call.</Text>}
          <div className="mt-auto flex flex-col gap-2">
            {micState !== "on" ? <Button size="lg" fullWidth onClick={testMic}><Mic className="size-4" aria-hidden="true" />Test my microphone</Button>
              : <Button size="lg" fullWidth onClick={finish}><Sparkles className="size-4" aria-hidden="true" />Sounds good, let&apos;s go</Button>}
            <Button size="lg" fullWidth variant="ghost" onClick={finish}>Skip</Button>
          </div>
        </div>
      )}
    </div>
  );
}
