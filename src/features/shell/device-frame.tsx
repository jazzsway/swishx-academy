"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Smartphone, Tablet, Signal, Wifi, BatteryFull, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { DeviceKeyboard, KEYBOARD_HEIGHT, isTypable } from "./device-keyboard";

/**
 * The rep app on a desktop: shown inside an iPhone or iPad, with a switcher
 * above it, scaled to fit the window. On a real phone or tablet (no fine
 * pointer, or narrower than 640px) none of this renders and the app is
 * full-screen. The `desk:` variant in globals.css is the same media query,
 * so the shell's frame-only classes switch on exactly when this does.
 */

export type Device = "iphone" | "ipad";

/* Screen sizes in CSS points: iPhone 16 Pro and iPad Air 11" in portrait. */
const SPEC = {
  iphone: { label: "iPhone", w: 402, h: 874, bezel: 12, screenRadius: 56, status: 54, indicator: 134 },
  ipad:   { label: "iPad",   w: 820, h: 1180, bezel: 22, screenRadius: 20, status: 30, indicator: 200 },
} as const;

const DESK = "(min-width: 640px) and (pointer: fine)";
const KEY = "swishx-rep-device";
const ORIENT_KEY = "swishx-rep-orientation";
const CHROME = 104; // switcher, gap and padding above and below the device

export function DeviceFrame({ dark, children }: { dark?: boolean; children: ReactNode }) {
  const [desk, setDesk] = useState<boolean>();
  const [device, setDevice] = useState<Device>("iphone");
  /* Only the iPad turns: the rep app on a phone is portrait-only. */
  const [landscape, setLandscape] = useState(false);
  const [zoom, setZoom] = useState(1);
  const screen = useRef<HTMLDivElement>(null);
  const [field, setField] = useState<HTMLElement | null>(null);
  /* A dark screen (the call screen marks <html data-screen="dark">) turns the status bar light, whatever the route. */
  const [darkScreen, setDarkScreen] = useState(false);
  useEffect(() => {
    const root = document.documentElement;
    const read = () => setDarkScreen(root.dataset.screen === "dark");
    read();
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ["data-screen"] });
    return () => mo.disconnect();
  }, []);

  /* The keyboard follows focus inside the screen, like iOS: up on a text field, down when focus leaves one. */
  useEffect(() => {
    const el = screen.current;
    if (!el) return;
    const into = (e: FocusEvent) => { if (isTypable(e.target)) setField(e.target); };
    const out = () => setTimeout(() => {
      const a = document.activeElement;
      if (!(isTypable(a) && el.contains(a))) setField(null);
    });
    el.addEventListener("focusin", into);
    el.addEventListener("focusout", out);
    return () => { el.removeEventListener("focusin", into); el.removeEventListener("focusout", out); };
  }, [desk]);
  /* Once it's up, bring the field into the space left above it. */
  useEffect(() => {
    if (!field) return;
    const t = setTimeout(() => field.scrollIntoView({ block: "nearest", behavior: "smooth" }), 320);
    return () => clearTimeout(t);
  }, [field]);

  /* The last device picked, per viewer. Storage can be unavailable; the iPhone is the fallback. */
  useEffect(() => {
    try {
      const d = localStorage.getItem(KEY); if (d === "iphone" || d === "ipad") setDevice(d);
      setLandscape(localStorage.getItem(ORIENT_KEY) === "landscape");
    } catch {}
  }, []);
  const rotate = () => {
    setLandscape(!landscape);
    try { localStorage.setItem(ORIENT_KEY, landscape ? "portrait" : "landscape"); } catch {}
  };
  const wide = device === "ipad" && landscape;
  /* The screen's size in points, turned for landscape. */
  const dims = (d: Device) => { const x = SPEC[d]; return d === "ipad" && landscape ? { w: x.h, h: x.w } : { w: x.w, h: x.h }; };
  const pick = (d: Device) => {
    setDevice(d);
    try { localStorage.setItem(KEY, d); } catch {}
  };

  useEffect(() => {
    const mq = window.matchMedia(DESK);
    const fit = () => {
      setDesk(mq.matches);
      const s = SPEC[device], { w, h } = dims(device);
      setZoom(Math.min(1, (window.innerHeight - CHROME) / (h + s.bezel * 2), (window.innerWidth - 48) / (w + s.bezel * 2)));
    };
    fit();
    window.addEventListener("resize", fit);
    mq.addEventListener("change", fit);
    return () => { window.removeEventListener("resize", fit); mq.removeEventListener("change", fit); };
  }, [device, landscape]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Not on a desktop (or not measured yet): the app as it is. Until measured, a desktop keeps it hidden so it doesn't flash at full size. */
  if (!desk) return <div className={cn(desk === undefined && "desk:invisible")}>{children}</div>;

  const s = SPEC[device];
  const { w, h } = dims(device);
  dark = dark || darkScreen;
  const ink = dark ? "text-white" : "text-ink";
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 overflow-hidden px-6 py-4">
      <div role="radiogroup" aria-label="Preview on" className="flex shrink-0 items-center gap-1 rounded-full bg-card p-1 shadow-soft ring-1 ring-hair">
        {(Object.keys(SPEC) as Device[]).map((d) => {
          const Icon = d === "iphone" ? Smartphone : Tablet;
          const on = d === device;
          return (
            <button key={d} type="button" role="radio" aria-checked={on} onClick={() => pick(d)}
              className={cn("focus-ring flex h-9 items-center gap-1.5 rounded-full px-4 text-body font-bold transition-colors", on ? "bg-cta text-white" : "text-ink-3 hover:text-ink")}>
              <Icon className="size-4" aria-hidden="true" />{SPEC[d].label}
            </button>
          );
        })}
        {device === "ipad" && (
          <button type="button" onClick={rotate} aria-label={landscape ? "Turn to portrait" : "Turn to landscape"} title={landscape ? "Portrait" : "Landscape"}
            className="focus-ring ml-1 flex h-9 items-center gap-1.5 rounded-full border-l border-hair-2 pl-3 pr-4 text-body font-bold text-ink-3 transition-colors hover:text-ink">
            <RotateCw className={cn("size-4 transition-transform duration-300", landscape && "rotate-90")} aria-hidden="true" />{landscape ? "Landscape" : "Portrait"}
          </button>
        )}
      </div>

      {/* The device. zoom (not transform) so layout, hit-testing and getBoundingClientRect all agree. */}
      <div className="relative shrink-0 bg-[#1b1817] shadow-[0_40px_90px_-30px_rgba(40,25,15,.55),0_0_0_2px_#3a3330,inset_0_0_0_1px_rgba(255,255,255,.08)]"
        style={{ zoom, padding: s.bezel, borderRadius: s.screenRadius + s.bezel }}>
        {/* Side buttons, a hint of hardware. */}
        {device === "iphone" ? (
          <>
            <span aria-hidden="true" className="absolute -left-[3px] top-[180px] h-[34px] w-[3px] rounded-l bg-[#2e2926]" />
            <span aria-hidden="true" className="absolute -left-[3px] top-[240px] h-[62px] w-[3px] rounded-l bg-[#2e2926]" />
            <span aria-hidden="true" className="absolute -left-[3px] top-[312px] h-[62px] w-[3px] rounded-l bg-[#2e2926]" />
            <span aria-hidden="true" className="absolute -right-[3px] top-[260px] h-[96px] w-[3px] rounded-r bg-[#2e2926]" />
          </>
        ) : landscape ? (
          /* iPad Air: the front camera sits on the long edge, so it is at the top in landscape. */
          <>
            <span aria-hidden="true" className="absolute left-1/2 top-[9px] size-[6px] -translate-x-1/2 rounded-full bg-[#2c2a33] ring-1 ring-black/60" />
            <span aria-hidden="true" className="absolute -right-[3px] top-[80px] h-[52px] w-[3px] rounded-r bg-[#2e2926]" />
            <span aria-hidden="true" className="absolute -top-[3px] right-[110px] h-[3px] w-[48px] rounded-t bg-[#2e2926]" />
            <span aria-hidden="true" className="absolute -top-[3px] right-[168px] h-[3px] w-[48px] rounded-t bg-[#2e2926]" />
          </>
        ) : (
          <>
            <span aria-hidden="true" className="absolute right-[9px] top-1/2 size-[6px] -translate-y-1/2 rounded-full bg-[#2c2a33] ring-1 ring-black/60" />
            <span aria-hidden="true" className="absolute -top-[3px] right-[80px] h-[3px] w-[52px] rounded-t bg-[#2e2926]" />
            <span aria-hidden="true" className="absolute -right-[3px] top-[110px] h-[48px] w-[3px] rounded-r bg-[#2e2926]" />
            <span aria-hidden="true" className="absolute -right-[3px] top-[168px] h-[48px] w-[3px] rounded-r bg-[#2e2926]" />
          </>
        )}

        <div ref={screen} data-wide={wide || undefined} className={cn("relative flex flex-col overflow-hidden transition-[width,height] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]", dark ? "bg-ink" : "bg-canvas")} style={{ width: w, height: h, borderRadius: s.screenRadius }}>
          {/* Status bar */}
          <div aria-hidden="true" className={cn("relative z-40 flex shrink-0 items-center justify-between font-bold", ink, device === "iphone" ? "px-9 pt-1.5 text-[16px]" : "px-6 text-[13px]")} style={{ height: s.status }}>
            <span className="tabular-nums">9:41{device === "ipad" && <span className="ml-2 font-semibold">Mon 23 Nov</span>}</span>
            {device === "iphone" && <span className="absolute left-1/2 top-[11px] h-[36px] w-[124px] -translate-x-1/2 rounded-full bg-black" />}
            <span className="flex items-center gap-1.5">
              {device === "iphone" && <Signal className="size-4" strokeWidth={2.6} />}
              <Wifi className="size-4" strokeWidth={2.6} />
              <BatteryFull className="size-6" strokeWidth={1.8} />
            </span>
          </div>
          <div className="relative flex min-h-0 flex-1 flex-col transition-[padding] duration-300" style={{ paddingBottom: field ? 10 : 0 }}>{children}</div>
          {/* The keyboard takes its height from the bottom of the screen, so the app (tab bar, sheets, sticky buttons) sits above it, as on iOS. */}
          <div aria-hidden={!field} className="relative z-[60] shrink-0 overflow-hidden transition-[height] duration-300 ease-[cubic-bezier(.2,.8,.2,1)]"
            style={{ height: field ? KEYBOARD_HEIGHT[device] : 0 }}>
            <div style={{ height: KEYBOARD_HEIGHT[device] }}><DeviceKeyboard device={device} target={field} /></div>
          </div>
          {/* Home indicator */}
          <span aria-hidden="true" className={cn("pointer-events-none absolute bottom-2 left-1/2 z-[70] h-[5px] -translate-x-1/2 rounded-full", dark ? "bg-white/80" : "bg-ink/80")} style={{ width: s.indicator }} />
        </div>
      </div>
    </div>
  );
}
