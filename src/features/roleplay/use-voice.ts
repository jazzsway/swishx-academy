"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* Browser speech: SpeechRecognition for the rep, speechSynthesis for the AI doctor.
   Chrome/Edge/Safari support both; anything else falls back to typing. No voiceprint is created. */

interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function useVoice() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef("");
  const onFinal = useRef<((t: string) => void) | null>(null);

  useEffect(() => {
    setSupported(!!getRecognition() && "speechSynthesis" in window);
    return () => { rec.current?.abort(); window.speechSynthesis?.cancel(); };
  }, []);

  const listen = useCallback((cb: (text: string) => void) => {
    const r = getRecognition();
    if (!r) return;
    window.speechSynthesis?.cancel();
    rec.current = r;
    finalText.current = "";
    onFinal.current = cb;
    r.continuous = true;
    r.interimResults = true;
    r.lang = "en-US";
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript + " ";
        else live += res[0].transcript;
      }
      setInterim((finalText.current + live).trim());
    };
    r.onerror = (e) => { setError(e.error === "not-allowed" ? "Microphone access was blocked. You can type instead." : null); setListening(false); };
    r.onend = () => {
      setListening(false);
      const t = finalText.current.trim();
      setInterim("");
      if (t) onFinal.current?.(t);
    };
    setError(null);
    setListening(true);
    r.start();
  }, []);

  const stop = useCallback(() => { rec.current?.stop(); }, []);

  const speak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { onEnd?.(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    u.voice = voices.find((v) => /Samantha|Google US English|Aria|Jenny/i.test(v.name)) ?? voices[0] ?? null;
    u.rate = 1.04;
    u.onstart = () => setSpeaking(true);
    u.onend = () => { setSpeaking(false); onEnd?.(); };
    u.onerror = () => { setSpeaking(false); onEnd?.(); };
    window.speechSynthesis.speak(u);
  }, []);

  const hush = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, []);

  return { supported, listening, speaking, interim, error, listen, stop, speak, hush };
}
