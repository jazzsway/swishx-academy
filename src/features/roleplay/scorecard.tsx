"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X, ShieldAlert, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import type { RoleplayResult } from "@/data/types";
import { prohibited } from "@/data/scenarios";
import { Text } from "@/components/ui/text";
import { Ring } from "@/components/patterns/academy";

const mmss = (n?: number) => (n === undefined ? "" : `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}`);

/** One scorecard for practice (coaching), assessment (pass/fail) and manager verify (PRD PR-3, FA-1, FA-3). */
export function Scorecard({ result, mode, approvedHref, onSeek, compact }: {
  result: RoleplayResult; mode: "practice" | "assessment" | "verify" | "screening";
  approvedHref?: (moduleId: string) => string; onSeek?: (sec: number) => void; compact?: boolean;
}) {
  const [showTranscript, setShowTranscript] = useState(mode === "verify");
  const met = result.criteria.filter((c) => c.met);
  const missed = result.criteria.filter((c) => !c.met);
  const critical = result.flags.filter((f) => f.critical);

  return (
    <div className="flex flex-col gap-4">
      {!compact && (
        <div className="flex items-center gap-4">
          <Ring value={result.score} size={72} stroke={7} tone={result.score >= 75 ? "ok" : "brand"} label={`Roleplay score ${result.score}%`}>
            <Text size="title" weight="extrabold" tabular>{result.score}</Text>
          </Ring>
          <div className="flex flex-col gap-0.5">
            <Text size="title" weight="bold">{met.length} of {result.criteria.length} criteria met</Text>
            <Text size="body" tone="subtle">{mmss(result.durationSec)} · {result.typed ? "typed" : "voice"}{mode === "practice" ? " · private" : ""}</Text>
          </div>
        </div>
      )}

      {result.flags.length > 0 && (
        <div className="flex flex-col gap-2">
          {result.flags.map((f) => {
            const rule = prohibited(f.ruleId);
            const isFail = f.critical && mode === "assessment";
            return (
              <div key={f.ruleId} className={cn("squircle flex flex-col gap-2 rounded-panel border p-4", f.critical ? "border-danger-line bg-danger-bg" : "border-warn-line bg-warn-bg")}>
                <div className="flex items-center gap-2">
                  <ShieldAlert className={cn("size-4.5", f.critical ? "text-danger" : "text-warn")} aria-hidden="true" />
                  <Text size="body-lg" weight="bold" tone={f.critical ? "danger" : "warn"}>
                    {isFail ? "Critical compliance flag · automatic fail" : mode === "practice" || mode === "screening" ? `Coaching: ${f.label.toLowerCase()}` : f.label}
                  </Text>
                  {onSeek ? <button type="button" onClick={() => onSeek(f.at)} className="ml-auto text-caption font-semibold underline">{mmss(f.at)}</button> : <Text size="caption" tone="subtle" className="ml-auto">{mmss(f.at)}</Text>}
                </div>
                <Text size="body-lg" className="italic">“{f.quote}”</Text>
                <Text size="body" tone="muted">{f.explanation}</Text>
                {rule?.approvedRef && approvedHref && (
                  <Link href={approvedHref(rule.approvedRef.moduleId)} className="self-start text-body font-semibold text-brand-deep hover:underline">What the approved material says: {rule.approvedRef.label}</Link>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        {result.criteria.map((c) => (
          <div key={c.id} className="flex items-start gap-3 rounded-control px-1 py-1.5">
            <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full", c.met ? "bg-ok text-white" : "bg-black/[0.08] text-ink-3")}>
              {c.met ? <Check className="size-3" aria-hidden="true" /> : <X className="size-3" aria-hidden="true" />}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <Text size="body-lg" weight="semibold" tone={c.met ? "default" : "subtle"}>{c.label}</Text>
              {c.met && c.quote && <Text size="caption" tone="subtle" clamp={2}>“{c.quote}”</Text>}
            </div>
            {c.met && c.at !== undefined && (onSeek ? <button type="button" onClick={() => onSeek(c.at!)} className="text-caption font-semibold text-brand-deep underline">{mmss(c.at)}</button> : <Text size="caption" tone="faint">{mmss(c.at)}</Text>)}
          </div>
        ))}
      </div>

      {mode !== "verify" && missed.length > 0 && (
        <div className="squircle flex flex-col gap-1 rounded-panel bg-subtle px-4 py-3">
          <Text size="caption" weight="bold" tone="subtle">TRY NEXT TIME</Text>
          {missed.slice(0, 2).map((m) => <Text key={m.id} size="body-lg">· {m.label}</Text>)}
        </div>
      )}
      {critical.length === 0 && mode === "assessment" && <Text size="body" tone="ok" weight="semibold">No compliance flags.</Text>}

      <button type="button" onClick={() => setShowTranscript(!showTranscript)} className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-2">
        <ChevronDown className={cn("size-4 transition-transform", showTranscript && "rotate-180")} aria-hidden="true" />Transcript
      </button>
      {showTranscript && (
        <ol className="flex flex-col gap-2">
          {result.transcript.map((t, i) => {
            const flagged = t.speaker === "rep" && result.flags.some((f) => f.quote === t.text);
            return (
              <li key={i} className={cn("flex gap-3 rounded-control px-2 py-1.5", flagged && "bg-danger-bg")}>
                <button type="button" disabled={!onSeek} onClick={() => onSeek?.(t.at)} className="w-10 shrink-0 text-left text-caption font-semibold text-ink-3 tabular-nums">{mmss(t.at)}</button>
                <div className="flex flex-col"><Text size="caption" weight="bold" tone={t.speaker === "rep" ? "brand-deep" : "subtle"}>{t.speaker === "rep" ? "Rep" : "HCP"}</Text><Text size="body">{t.text}</Text></div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
