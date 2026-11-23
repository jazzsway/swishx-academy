"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Delete, ArrowBigUp, Smile, Mic, Globe, KeyboardOff } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Device } from "./device-frame";

/**
 * The on-screen keyboard of the desktop iPhone/iPad mock. It appears while a
 * text field inside the device has focus (device-frame.tsx decides that).
 * Keys really type into that field, and typing on the desktop keyboard lights
 * up the matching key, so it reads like the phone while working like a desk.
 */

export const KEYBOARD_HEIGHT: Record<Device, number> = { iphone: 306, ipad: 318 };

type Typable = HTMLElement;

/* Text fields the keyboard is for: not checkboxes, ranges, files or read-only fields. */
const TEXT_TYPES = new Set(["", "text", "search", "email", "url", "tel", "password", "number"]);
export function isTypable(el: EventTarget | null): el is Typable {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  if (el instanceof HTMLInputElement) return TEXT_TYPES.has(el.type) && !el.readOnly && !el.disabled;
  return el.isContentEditable;
}

/* Fallback for when execCommand is unavailable: set the value the way React will notice. */
function setValue(el: Typable, next: (v: string) => string) {
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, next(el.value));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
/* execCommand keeps React's onChange, the caret and undo working on controlled fields. Deprecated, but it is still the only API that does all three. */
function insert(el: Typable, text: string) {
  el.focus();
  if (!document.execCommand("insertText", false, text)) setValue(el, (v) => v + text);
}
function backspace(el: Typable) {
  el.focus();
  if (!document.execCommand("delete", false)) setValue(el, (v) => v.slice(0, -1));
}
/* Return presses Enter, which is how the app's fields submit; if nothing handles it, a textarea gets a new line. */
function enter(el: Typable) {
  const unhandled = el.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", bubbles: true, cancelable: true }));
  if (!unhandled) return;
  if (el instanceof HTMLTextAreaElement || el.isContentEditable) insert(el, "\n");
  else if (el instanceof HTMLInputElement) { if (el.form) el.form.requestSubmit(); else el.blur(); }
}

type Layer = "abc" | "123" | "#+=";
const LETTERS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];
const NUMBERS = ["1234567890", "-/:;()$&@\"", ".,?!'"];
const SYMBOLS = ["[]{}#%^*+=", "_\\|~<>€£¥•", ".,?!'"];
const SUGGEST = ["I", "The", "I'm"];

type KeySpec = { id: string; label: ReactNode; onPress: () => void; grow?: number; special?: boolean; wide?: boolean; on?: boolean };

export function DeviceKeyboard({ device, target }: { device: Device; target: Typable | null }) {
  const [layer, setLayer] = useState<Layer>("abc");
  const [shift, setShift] = useState<"off" | "once" | "lock">("once");
  const [lit, setLit] = useState<string>();
  const ipad = device === "ipad";

  /* A new field starts on letters, capitalised, like iOS. */
  useEffect(() => { setLayer("abc"); setShift("once"); }, [target]);

  /* Typing on the real keyboard lights up the same key on this one. */
  useEffect(() => {
    if (!target) return;
    let t: ReturnType<typeof setTimeout>;
    const down = (e: KeyboardEvent) => {
      const k = e.key === " " ? "space" : e.key === "Backspace" ? "delete" : e.key === "Enter" ? "return" : e.key.toLowerCase();
      setLit(k);
      clearTimeout(t);
      t = setTimeout(() => setLit(undefined), 140);
    };
    target.addEventListener("keydown", down);
    return () => { target.removeEventListener("keydown", down); clearTimeout(t); };
  }, [target]);

  const rows = layer === "abc" ? LETTERS : layer === "123" ? NUMBERS : SYMBOLS;
  const upper = layer === "abc" && shift !== "off";
  const type = (ch: string) => {
    if (!target) return;
    insert(target, upper ? ch.toUpperCase() : ch);
    if (shift === "once") setShift("off");
  };

  /* A render function, not a component: a component declared in render would remount every key on each keystroke.
     Every key keeps focus in the field: mousedown is cancelled and the click does the work. */
  const key = ({ id, label, onPress, grow = 1, special, wide, on }: KeySpec) => (
    <button key={id} type="button" tabIndex={-1} aria-label={typeof label === "string" && label ? label : id}
      onMouseDown={(e) => e.preventDefault()} onClick={onPress} style={{ flexGrow: grow, flexBasis: 0 }}
      className={cn("grid min-w-0 select-none place-items-center rounded-[9px] text-[#1c1c1e] shadow-[0_1px_0_rgba(0,0,0,.28)] transition-colors duration-75",
        ipad ? "h-[56px] text-[22px]" : "h-[44px] text-[23px]",
        wide && "text-[15px]",
        special && !on ? "bg-[#b6b9c2] active:bg-white" : "bg-white active:bg-[#d4d6db]",
        lit === id && (special ? "bg-white" : "bg-[#d4d6db]"))}>
      {label}
    </button>
  );
  const spacer = (id: string, grow: number) => <span key={id} aria-hidden="true" style={{ flexGrow: grow, flexBasis: 0 }} />;
  const letter = (ch: string, grow = 1) => key({ id: ch.toLowerCase(), label: upper ? ch.toUpperCase() : ch, onPress: () => type(ch), grow });

  const shiftKey = (id: string) => layer === "abc"
    ? key({ id, special: true, on: shift !== "off", grow: ipad ? 1.25 : 1.3,
        onPress: () => setShift(shift === "off" ? "once" : shift === "once" ? "lock" : "off"),
        label: <span className="flex flex-col items-center"><ArrowBigUp className={cn("size-[22px]", shift !== "off" && "fill-current")} strokeWidth={1.6} />{shift === "lock" && <span className="-mt-0.5 h-0.5 w-3 rounded bg-current" />}</span> })
    : key({ id, special: true, wide: true, grow: ipad ? 1.25 : 1.3, onPress: () => setLayer(layer === "123" ? "#+=" : "123"), label: layer === "123" ? "#+=" : "123" });
  const deleteKey = key({ id: "delete", special: true, grow: ipad ? 1.25 : 1.3, onPress: () => target && backspace(target), label: <Delete className="size-[22px]" strokeWidth={1.6} /> });
  const returnKey = (grow: number) => key({ id: "return", special: true, wide: true, grow, onPress: () => target && enter(target), label: "return" });
  const layerKey = (id: string) => key({ id, special: true, wide: true, grow: ipad ? 1.4 : 1.25, onPress: () => setLayer(layer === "abc" ? "123" : "abc"), label: layer === "abc" ? (ipad ? ".?123" : "123") : "ABC" });
  const gap = ipad ? "gap-2" : "gap-1.5";

  return (
    <div role="group" aria-label="On-screen keyboard" onMouseDown={(e) => e.preventDefault()}
      className="flex h-full flex-col bg-[#d3d5db]/95 backdrop-blur-xl" style={{ fontFamily: '-apple-system, "SF Pro Text", system-ui, sans-serif' }}>
      {/* QuickType suggestions */}
      <div className={cn("flex shrink-0 items-center text-[17px] text-[#1c1c1e]", ipad ? "h-[46px] px-40" : "h-[42px] px-2")}>
        {SUGGEST.map((w, i) => (
          <button key={w} type="button" tabIndex={-1} onMouseDown={(e) => e.preventDefault()} onClick={() => target && insert(target, `${w} `)}
            className={cn("flex-1 truncate py-2 text-center", i > 0 && "border-l border-black/15")}>{i === 0 ? `“${w}”` : w}</button>
        ))}
      </div>

      <div className={cn("flex flex-col", ipad ? "gap-2 px-1.5 pt-1" : "gap-3 px-[3px] pt-1.5")}>
        <div className={cn("flex", gap)}>
          {[...rows[0]].map((ch) => letter(ch))}
          {ipad && deleteKey}
        </div>
        <div className={cn("flex", gap)}>
          {layer === "abc" && spacer("l2", ipad ? 0.35 : 0.5)}
          {[...rows[1]].map((ch) => letter(ch))}
          {layer === "abc" && !ipad && spacer("r2", 0.5)}
          {ipad && returnKey(1.75)}
        </div>
        <div className={cn("flex", gap)}>
          {shiftKey("shift")}
          {!ipad && spacer("l3", layer === "abc" ? 0.15 : 0.3)}
          {[...rows[2]].map((ch) => letter(ch, layer === "abc" || ipad ? 1 : 1.4))}
          {ipad && layer === "abc" && <>{letter(",")}{letter(".")}</>}
          {!ipad && spacer("r3", layer === "abc" ? 0.15 : 0.3)}
          {ipad ? shiftKey("shift-r") : deleteKey}
        </div>
        <div className={cn("flex", gap)}>
          {layerKey("layer")}
          {ipad && key({ id: "globe", special: true, onPress: () => {}, label: <Globe className="size-5" strokeWidth={1.7} /> })}
          {ipad && key({ id: "mic", special: true, onPress: () => {}, label: <Mic className="size-5" strokeWidth={1.7} /> })}
          {key({ id: "space", grow: ipad ? 5.6 : 5, wide: true, onPress: () => target && insert(target, " "), label: "" })}
          {ipad ? layerKey("layer-r") : returnKey(2.5)}
          {ipad && key({ id: "hide", special: true, grow: 1.2, onPress: () => target?.blur(), label: <KeyboardOff className="size-5" strokeWidth={1.7} /> })}
        </div>
      </div>

      {/* iPhone: emoji and dictation sit under the keys, either side of the home indicator. */}
      {!ipad && (
        <div className="flex flex-1 items-start justify-between px-6 pt-2.5 text-[#3c3c43]">
          <button type="button" tabIndex={-1} aria-label="Emoji" onMouseDown={(e) => e.preventDefault()} className="grid size-9 place-items-center"><Smile className="size-[26px]" strokeWidth={1.5} /></button>
          <button type="button" tabIndex={-1} aria-label="Dictate" onMouseDown={(e) => e.preventDefault()} className="grid size-9 place-items-center"><Mic className="size-[24px]" strokeWidth={1.5} /></button>
        </div>
      )}
    </div>
  );
}
