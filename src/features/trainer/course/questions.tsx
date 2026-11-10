"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Check, Lock } from "lucide-react"; // v1-hidden: Trash2
import { cn } from "@/lib/cn";
import { competency, source } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { useCourse } from "./use-course";
import { ChatPanel, useApplyChanges } from "./editor";
import { QUESTION_SUGGESTIONS } from "./chat";
import { questionsByModule, type Question, type QuestionKind } from "./question-index";
import { AgentIcon } from "@/components/ui/logo-mark";
import { CopilotOverride } from "@/features/copilot/copilot-panel";
import { useCopilot } from "@/features/copilot/copilot-store";

/* When a rep meets each kind of question, in the order they meet them. */
const KINDS: { id: QuestionKind; label: string; when: string }[] = [
  { id: "screening", label: "Screening", when: "Asked before the course starts, to skip what reps already know. No feedback." },
  { id: "check", label: "Knowledge checks", when: "Inside the lessons. Reps see the answer straight away." },
  { id: "assessment", label: "Final assessment", when: "Drawn into the final assessment. Answer keys show after a pass or the last attempt." },
  { id: "practice", label: "Practice", when: "Practice mode only. Doesn't count toward certification." },
];
const LOOSE = "__course";

/** Same module index as Content; each module shows the questions that test it. */
export function QuestionBank() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const data = useCourse(id);
  const apply = useApplyChanges(id);
  const copilotOpen = useCopilot((s) => s.open);
  const setCopilotOpen = useCopilot((s) => s.setOpen);
  const [selected, setSelected] = useState<string | undefined>(search.get("module") ?? undefined);
  if (!data) return null;
  const { course, editable } = data;
  const { byModule, loose } = questionsByModule(course);
  const mod = course.modules.find((m) => m.id === selected) ?? (selected === LOOSE ? undefined : course.modules[0]);
  const list = mod ? byModule.get(mod.id)! : loose;
  const coverage = course.competencyIds.map((c) => ({ c, n: course.items.filter((i) => i.competency === c).length }));

  // v1-hidden: const patch = (item: Item, p: Partial<Item>) => updateCourse(course.id, { items: course.items.map((i) => (i.id === item.id ? { ...i, ...p } : i)) });

  return (
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      {editable && (
        <CopilotOverride>
          <ChatPanel courseId={course.id} moduleId={mod?.id} editable fresh={false} issues={0} onApply={apply} suggestions={QUESTION_SUGGESTIONS} />
        </CopilotOverride>
      )}
      <nav aria-label="Modules" className="flex flex-col gap-1.5 lg:sticky lg:top-[84px] lg:self-start">
        <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="px-2 pb-1">{course.modules.length} modules</Text>
        {course.modules.map((m, i) => (
          <IndexRow key={m.id} n={i + 1} title={m.title} active={m.id === mod?.id} onClick={() => setSelected(m.id)} locked={m.required}
            meta={`${count(byModule.get(m.id)!.length)} · ${competency(m.competency)?.name}`} />
        ))}
        {loose.length > 0 && <IndexRow n="+" title="Across the course" active={!mod} onClick={() => setSelected(LOOSE)} meta={`${count(loose.length)} · not tied to one module`} />}

        {course.items.length > 0 && (
          <div className="mt-3 rounded-panel border border-hair bg-card p-3">
            <Text size="micro" tone="subtle" weight="bold" uppercase tracking="wider" className="block">Coverage</Text>
            <Text size="caption" tone="subtle" className="mb-2 block">Aim for 6+ questions per competency.</Text>
            <ul className="flex flex-col gap-1">
              {coverage.map(({ c, n }) => (
                <li key={c} className="flex justify-between gap-2 text-caption">
                  <span className="truncate text-ink-2">{competency(c)?.name}</span>
                  <span className={cn("tabular-nums", n < 6 ? "font-bold text-warn" : "text-ink-3")}>{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <Text as="h2" size="display" weight="bold" tracking="tight">{mod?.title ?? "Across the course"}</Text>
              <Text size="body-lg" tone="subtle">{mod ? `The questions that test “${mod.title}”.` : "Questions that test a competency no single module teaches."}</Text>
            </div>
            {editable && !copilotOpen && <Button variant="soft" size="sm" onClick={() => setCopilotOpen(true)}><AgentIcon className="size-4" aria-hidden="true" />Ask SwishX AI Agent</Button>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mod && <Chip size="md" tone="brand">{competency(mod.competency)?.name}</Chip>}
            {KINDS.map((k) => {
              const n = list.filter((q) => q.kind === k.id).length;
              return n > 0 && <Chip key={k.id} size="md">{k.label} · {n}</Chip>;
            })}
          </div>
        </div>

        {list.length === 0 && (
          <div className="squircle rounded-card border border-dashed border-hair-2 px-6 py-10 text-center">
            <Text size="body" tone="muted">No questions test this module yet.{editable && " Ask the SwishX AI Agent to add a knowledge check from its sources."}</Text>
          </div>
        )}

        {KINDS.map((k) => {
          const qs = list.filter((q) => q.kind === k.id);
          if (!qs.length) return null;
          return (
            <section key={k.id} className="flex flex-col gap-3">
              <div className="flex flex-col px-1">
                <Text size="body-lg" weight="bold">{k.label} <span className="font-normal text-ink-3">· {qs.length}</span></Text>
                <Text size="caption" tone="subtle">{k.when}</Text>
              </div>
              {qs.map((q, n) => <QuestionCard key={q.id} q={q} n={n + 1} />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}

const count = (n: number) => `${n} question${n === 1 ? "" : "s"}`;

function IndexRow({ n, title, meta, active, locked, onClick }: { n: number | string; title: string; meta: string; active: boolean; locked?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active}
      className={cn("squircle flex items-start gap-2.5 rounded-control px-2.5 py-2 text-left transition-colors", active ? "bg-tint" : "hover:bg-subtle")}>
      <span className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-glyph text-micro font-bold", active ? "bg-brand text-white" : "bg-black/[0.06] text-ink-3")}>{n}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("text-body font-semibold leading-snug", active ? "text-brand-deep" : "text-ink")}>{title}</span>
        <span className="text-micro text-ink-3">{meta}</span>
      </span>
      {locked && <Lock className="mt-1 size-3.5 shrink-0 text-ink-4" aria-label="Required for everyone" />}
    </button>
  );
}

function QuestionCard({ q, n }: { q: Question; n: number }) {
  return (
    <article className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Text size="caption" weight="bold" tone="subtle">Q{n}</Text>
        <Chip size="sm" tone="brand">{competency(q.competency)?.name}</Chip>
        {q.difficulty && <Chip size="sm">{["", "Easy", "Medium", "Hard"][q.difficulty]}</Chip>}
        {q.lesson && <Text size="caption" tone="subtle" className="ml-auto">After “{q.lesson}”</Text>}
        {/* v1-hidden: the pool picker and Retire button. Ask the agent: Move “…” to practice, or Retire the question “…”. */}
      </div>
      <Text size="subhead" weight="bold" className="leading-snug">{q.question}</Text>
      <ol className="grid gap-1.5 sm:grid-cols-2">
        {q.options.map((o, i) => (
          <li key={i} className={cn("squircle flex items-center gap-2 rounded-control border px-3 py-2 text-body", i === q.answer ? "border-ok-line bg-ok-bg font-semibold text-ok" : "border-hair text-ink-2")}>
            <span className="text-micro font-bold opacity-60">{String.fromCharCode(65 + i)}</span>{o}{i === q.answer && <Check className="ml-auto size-4" aria-label="Correct answer" />}
          </li>
        ))}
      </ol>
      <Text size="body" tone="subtle"><strong className="text-ink-2">Rationale.</strong> {q.rationale} {q.cite && <span className="text-brand-deep">({source(q.cite.sourceId)?.title}, p. {q.cite.page})</span>}</Text>
    </article>
  );
}
