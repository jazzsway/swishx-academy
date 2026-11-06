"use client";

import { Check, ChevronDown, Lock, Compass } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Course, Module, Progress, User } from "@/data/types";
import { useApp } from "@/store/app-store";
import { fmtDate } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Card } from "@/components/patterns/academy";
import { BLOCK_META } from "./block-view";
import { nextStepFor, pathProgress } from "@/features/rep/use-rep";
import { unmetPrereqs } from "@/features/library/library-data";

type StepState = "done" | "current" | "todo" | "locked" | "attention";
interface Step { label: string; state: StepState; detail?: string }

const DOT: Record<StepState, string> = {
  done: "bg-ok text-white", current: "bg-brand text-white", attention: "bg-danger text-white", locked: "bg-black/[0.06] text-ink-3", todo: "bg-black/[0.06] text-ink-4",
};

/** The course journey for one person, step by step, with dates and what's blocking them. */
function journey(p: Progress, c: Course, blockedBy: Course[]): Step[] {
  const pr = pathProgress(p, c);
  const passed = p.attempts.find((a) => a.passed);
  const fails = p.attempts.filter((a) => !a.passed).length;
  const learnDone = pr.total > 0 && pr.done === pr.total;
  const steps: Step[] = [{ label: "Assigned", state: "done", detail: fmtDate(p.assignedAt, true) }];

  if (c.type === "personalised") {
    if (c.settings.screening) {
      steps.push(p.screening
        ? { label: "Screening", state: "done", detail: `${fmtDate(p.screening.at, true)} · ${p.screening.overall}%` }
        : blockedBy.length ? { label: "Screening", state: "locked", detail: `Locked until ${blockedBy.map((b) => b.title).join(", ")} is certified` }
        : { label: "Screening", state: p.state === "screening" || p.state === "not_started" ? "current" : "todo", detail: p.state === "screening" ? "Started, not finished" : "Not taken yet" });
    }
    steps.push({ label: p.path?.kind === "remediation" ? "Retake path" : "Learning path", state: learnDone ? "done" : ["learning", "remediation", "needs_coaching"].includes(p.state) ? "current" : "todo",
      detail: p.path ? `${pr.modulesDone} of ${pr.modules} modules · ${pr.done} of ${pr.total} blocks` : "Built after screening" });
    steps.push({ label: "Final assessment", state: passed ? "done" : fails ? "attention" : p.state === "assessment" ? "current" : "todo",
      detail: passed ? `${fmtDate(passed.at, true)} · ${passed.overall}%` : fails ? `${fails} attempt${fails > 1 ? "s" : ""} not passed · ${c.settings.attempts - fails} left` : undefined });
    if (c.settings.verify === "manager") {
      steps.push({ label: "Manager sign-off", state: p.verify?.status === "approved" ? "done" : p.state === "needs_coaching" ? "attention" : p.state === "awaiting_verify" ? "current" : "todo",
        detail: p.verify?.status === "approved" ? fmtDate(p.verify.at, true) : p.state === "needs_coaching" ? "Sent back for coaching" : p.state === "awaiting_verify" ? `Waiting since ${fmtDate(p.verify?.requestedAt)}` : undefined });
    }
  } else {
    steps.push({ label: "Modules", state: learnDone ? "done" : p.state === "not_started" ? "todo" : "current", detail: `${pr.done} of ${pr.total} blocks` });
    steps.push({ label: "Attestation", state: p.attestedAt ? "done" : learnDone ? "current" : "todo", detail: p.attestedAt ? fmtDate(p.attestedAt, true) : undefined });
  }
  steps.push({ label: "Certified", state: p.certifiedAt ? "done" : "todo", detail: p.certifiedAt ? `Valid to ${fmtDate(p.certExpiresAt, true)}` : undefined });
  return steps;
}

/** One module's standing for this person: done, part done, tested out, explored, or untouched. */
function moduleStatus(m: Module, p: Progress, explored: string[]) {
  const ids = m.blocks.map((b) => b.id);
  const done = ids.filter((id) => p.completedBlocks.includes(id)).length;
  const seen = ids.filter((id) => explored.includes(id) && !p.completedBlocks.includes(id)).length;
  const inPath = !p.path || p.path.moduleIds.includes(m.id);
  const reason = p.path?.reasons[m.id];
  if (!inPath) return { label: "Tested out", tone: "ok" as const, detail: reason?.replace(/^(Optional|Tested out): /, "Screening ") ?? "Not in their path", done, seen };
  if (done === ids.length) return { label: "Done", tone: "ok" as const, detail: undefined, done, seen };
  if (done > 0) return { label: `${done} of ${ids.length} blocks`, tone: "brand" as const, detail: undefined, done, seen };
  if (seen > 0) return { label: "Explored", tone: "default" as const, detail: "Opened from the Library, not for credit yet", done, seen };
  return { label: p.state === "not_started" ? "Not opened" : "Not started", tone: "default" as const, detail: undefined, done, seen };
}

export function CourseProgress({ p, course, mods, user }: { p: Progress; course: Course; mods: Module[]; user: User }) {
  const s = useApp();
  const explored = s.explored[user.id] ?? [];
  const blockedBy = p.screening ? [] : unmetPrereqs(s, user.id, course);
  const steps = journey(p, course, blockedBy);
  const next = nextStepFor(p, course);

  return (
    <>
      <Card title="Journey" eyebrow="Step by step">
        <ol className="flex flex-col">
          {steps.map((st, i) => (
            <li key={st.label} className="flex gap-3">
              <span className="flex flex-col items-center">
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-micro font-bold", DOT[st.state])}>
                  {st.state === "done" ? <Check className="size-3.5" aria-hidden="true" /> : st.state === "locked" ? <Lock className="size-3" aria-hidden="true" /> : i + 1}
                </span>
                {i < steps.length - 1 && <span className={cn("w-px flex-1", st.state === "done" ? "bg-ok/40" : "bg-hair-2")} />}
              </span>
              <span className="flex min-w-0 flex-col pb-4">
                <Text size="body-lg" weight="semibold" tone={st.state === "todo" ? "subtle" : undefined}>{st.label}</Text>
                {st.detail && <Text size="caption" tone={st.state === "attention" || st.state === "locked" ? "danger" : "subtle"}>{st.detail}</Text>}
              </span>
            </li>
          ))}
        </ol>
        {next && p.state !== "certified" && (
          <div className="squircle flex items-start gap-2.5 rounded-panel bg-subtle px-4 py-3">
            <Compass className="mt-0.5 size-4 shrink-0 text-brand-deep" aria-hidden="true" />
            <Text size="body" tone="muted">
              <strong className="text-ink">What {user.first} sees next: </strong>
              {blockedBy.length ? `Finish ${blockedBy.map((b) => b.title).join(", ")} to unlock screening.` : `${next.title}. ${next.why.replace(/\b[Yy]our\b/g, (w) => (w === "Your" ? "Their" : "their")).replace(/\b[Yy]ou\b/g, user.first)}`}
            </Text>
          </div>
        )}
      </Card>

      <Card title="Modules" eyebrow={`${mods.length} in v${p.version}${p.path ? ` · ${p.path.moduleIds.length} in their path` : ""}`}>
        <ul className="-mx-2 flex flex-col">
          {mods.map((m) => {
            const st = moduleStatus(m, p, explored);
            return (
              <li key={m.id}>
                <details className="group rounded-panel px-2 open:bg-subtle">
                  <summary className="flex cursor-pointer list-none items-center gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="size-4 shrink-0 -rotate-90 text-ink-4 transition-transform group-open:rotate-0" aria-hidden="true" />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex min-w-0 items-center gap-2">
                        <Text size="body" weight="semibold" truncate>{m.title}</Text>
                        {m.required && <Chip size="xs" tone="warn">Required</Chip>}
                      </span>
                      {st.detail && <Text size="caption" tone="subtle">{st.detail}</Text>}
                    </span>
                    <Text size="caption" tone="subtle" className="hidden shrink-0 sm:inline" tabular>{m.minutes} min</Text>
                    <Chip size="sm" tone={st.tone}>{st.label}</Chip>
                  </summary>
                  <ul className="flex flex-col gap-1.5 pb-3 pl-7">
                    {m.blocks.map((b) => {
                      const Icon = BLOCK_META[b.type].icon;
                      const done = p.completedBlocks.includes(b.id);
                      const seen = explored.includes(b.id);
                      return (
                        <li key={b.id} className="flex items-center gap-2.5 text-body">
                          <span className={cn("grid size-5 shrink-0 place-items-center rounded-full", done ? "bg-ok text-white" : "bg-black/[0.06] text-ink-4")}>
                            {done ? <Check className="size-3" aria-hidden="true" /> : <Icon className="size-3" aria-hidden="true" />}
                          </span>
                          <span className={cn("min-w-0 flex-1 truncate", done ? "text-ink" : "text-ink-3")}>{BLOCK_META[b.type].label} · {b.title}</span>
                          <span className="shrink-0 text-caption text-ink-3">{done ? "Done" : seen ? "Explored" : `${b.minutes} min`}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
