"use client";

import { Check, Lock, ScanSearch } from "lucide-react";
import { cn } from "@/lib/cn";
import { Text } from "@/components/ui/text";

/**
 * Asked right under the course name, in both ways of building a course: screen reps first, or not.
 * On by default. Short form has nothing to screen with, so it says so instead of hiding.
 */
export function ScreeningPicker({ value, onChange, kind }: { value: boolean; onChange: (v: boolean) => void; kind: "direct" | "long" | "short" }) {
  if (kind === "short")
    return (
      <div className="squircle flex items-start gap-3 rounded-panel border border-hair bg-subtle p-4">
        <Lock className="mt-0.5 size-4.5 shrink-0 text-ink-3" aria-hidden="true" />
        <div className="flex flex-col gap-0.5">
          <Text size="body-lg" weight="semibold" tone="muted">No screening for short form</Text>
          <Text size="caption" tone="subtle">Short form is the same cards for everyone, so there&apos;s nothing to skip.</Text>
        </div>
      </div>
    );
  const what = kind === "direct" ? "A 5-minute call with the course's AI doctor" : "A short quiz and a 5-minute call with an AI doctor";
  const opts = [
    { v: true, label: "Screen reps first", hint: `${what} before the content. Reps skip what they already know, and the score is the baseline you measure progress from.` },
    { v: false, label: "Everyone takes everything", hint: "No screening. Every rep goes through every " + (kind === "direct" ? "file" : "module") + ", in order." },
  ];
  return (
    <div className="flex flex-col gap-2">
      <Text size="label" weight="semibold" tone="muted">Screening</Text>
      <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Screening">
        {opts.map((o) => {
          const on = value === o.v;
          return (
            <button key={o.label} type="button" role="radio" aria-checked={on} onClick={() => onChange(o.v)}
              className={cn("squircle flex gap-3 rounded-panel border p-3.5 text-left transition-colors", on ? "border-brand bg-tint/60 ring-1 ring-brand" : "border-hair-2 bg-card hover:bg-subtle")}>
              <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border", on ? "border-brand bg-brand text-white" : "border-hair-3")}>{on && <Check className="size-3" aria-hidden="true" />}</span>
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-body-lg font-semibold text-ink">{o.label}{o.v && <span className="rounded-glyph bg-ok-bg px-1.5 text-micro font-bold text-ok">Recommended</span>}</span>
                <span className="text-caption text-ink-3">{o.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
      {value && (
        <Text size="caption" tone="subtle" className="flex items-start gap-1.5"><ScanSearch className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Safety content is never skipped. You can change this later from the course&apos;s rep journey.</Text>
      )}
    </div>
  );
}
