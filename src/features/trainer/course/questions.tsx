"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Check } from "lucide-react"; // v1-hidden: Trash2
import { cn } from "@/lib/cn";
import { competency, source } from "@/data/org";
import type { Pool } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Card, EmptyState } from "@/components/patterns/academy";
import { useCourse } from "./use-course";
import { ChatPanel, useApplyChanges } from "./editor";
import { QUESTION_SUGGESTIONS } from "./chat";
import { AgentIcon } from "@/components/ui/logo-mark";
import { CopilotOverride } from "@/features/copilot/copilot-panel";
import { useCopilot } from "@/features/copilot/copilot-store";

const POOLS: { id: Pool | "all"; label: string }[] = [
  { id: "all", label: "All" }, { id: "screening", label: "Screening" }, { id: "assessment", label: "Assessment" }, { id: "practice", label: "Practice" },
];

export function QuestionBank() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  const apply = useApplyChanges(id);
  const setCopilotOpen = useCopilot((s) => s.setOpen);
  const [pool, setPool] = useState<Pool | "all">("all");
  const [comp, setComp] = useState<string>("all");
  if (!data) return null;
  const { course, editable } = data;
  const items = course.items.filter((i) => (pool === "all" || i.pool === pool) && (comp === "all" || i.competency === comp));
  const coverage = course.competencyIds.map((c) => ({ c, n: course.items.filter((i) => i.competency === c).length }));

  // v1-hidden: const patch = (item: Item, p: Partial<Item>) => updateCourse(course.id, { items: course.items.map((i) => (i.id === item.id ? { ...i, ...p } : i)) });

  const chat = editable && (
    <CopilotOverride>
      <ChatPanel courseId={course.id} editable fresh={false} issues={0} onApply={apply} suggestions={QUESTION_SUGGESTIONS} />
    </CopilotOverride>
  );

  if (course.type === "linear" && course.items.length === 0)
    return <EmptyState title="Linear course" body="This course uses the knowledge checks inside its lessons. Switch to a personalised course to add screening and assessment questions." />;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {chat}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          {POOLS.map((p) => <Chip key={p.id} size="lg" selected={pool === p.id} onClick={() => setPool(p.id)}>{p.label} · {p.id === "all" ? course.items.length : course.items.filter((i) => i.pool === p.id).length}</Chip>)}
        </div>
        {items.map((it, n) => (
          <article key={it.id} className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Text size="caption" weight="bold" tone="subtle">Q{n + 1}</Text>
              <Chip size="sm" tone="brand">{competency(it.competency)?.name}</Chip>
              <Chip size="sm">{["", "Easy", "Medium", "Hard"][it.difficulty]}</Chip>
              <div className="ml-auto flex items-center gap-1">
                {/* v1-hidden: the pool picker and Retire button. Ask the agent: Move “…” to practice, or Retire the question “…”.
                {editable ? (
                  <select aria-label="Pool" value={it.pool} onChange={(e) => patch(it, { pool: e.target.value as Pool })}
                    className="h-8 rounded-chip border border-hair-2 bg-card px-2 text-body font-semibold">
                    <option value="screening">Screening</option><option value="assessment">Assessment</option><option value="practice">Practice</option>
                  </select>
                ) : <Chip size="sm">{it.pool}</Chip>}
                {editable && <IconButton aria-label="Retire question" tone="danger" onClick={() => updateCourse(course.id, { items: course.items.filter((i) => i.id !== it.id) })}><Trash2 className="size-4" /></IconButton>}
                */}
                <Chip size="sm">{it.pool[0].toUpperCase() + it.pool.slice(1)}</Chip>
              </div>
            </div>
            <Text size="subhead" weight="bold" className="leading-snug">{it.question}</Text>
            <ol className="grid gap-1.5 sm:grid-cols-2">
              {it.options.map((o, i) => (
                <li key={i} className={cn("squircle flex items-center gap-2 rounded-control border px-3 py-2 text-body", i === it.answer ? "border-ok-line bg-ok-bg font-semibold text-ok" : "border-hair text-ink-2")}>
                  <span className="text-micro font-bold opacity-60">{String.fromCharCode(65 + i)}</span>{o}{i === it.answer && <Check className="ml-auto size-4" aria-label="Correct answer" />}
                </li>
              ))}
            </ol>
            <Text size="body" tone="subtle"><strong className="text-ink-2">Rationale.</strong> {it.rationale} {it.cite && <span className="text-brand-deep">({source(it.cite.sourceId)?.title}, p. {it.cite.page})</span>}</Text>
          </article>
        ))}
      </div>
      <aside className="flex flex-col gap-4 lg:sticky lg:top-[84px] lg:self-start">
        <Card title="Coverage" padded>
          <Text size="caption" tone="subtle" className="-mt-2">Aim for 6+ per competency across pools.</Text>
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => setComp("all")} className={cn("flex justify-between rounded-chip px-2 py-1.5 text-body", comp === "all" ? "bg-tint font-semibold text-brand-deep" : "hover:bg-subtle")}><span>All competencies</span><span>{course.items.length}</span></button>
            {coverage.map((c) => (
              <button key={c.c} type="button" onClick={() => setComp(c.c)} className={cn("flex justify-between gap-2 rounded-chip px-2 py-1.5 text-left text-body", comp === c.c ? "bg-tint font-semibold text-brand-deep" : "hover:bg-subtle")}>
                <span className="truncate">{competency(c.c)?.name}</span><span className={cn("tabular-nums", c.n < 6 && "font-bold text-warn")}>{c.n}</span>
              </button>
            ))}
          </div>
        </Card>
        {editable && (
          <button type="button" onClick={() => setCopilotOpen(true)} className="squircle flex items-start gap-3 rounded-panel border border-dashed border-hair-3 p-3.5 text-left hover:bg-subtle">
            <AgentIcon className="mt-0.5 size-4.5 text-brand" />
            <span className="flex flex-col"><Text size="body" weight="semibold">Change questions with the SwishX AI Agent</Text><Text size="caption" tone="subtle">Add questions, retire one, or move it to another pool.</Text></span>
          </button>
        )}
        <Text size="caption" tone="subtle" className="px-1">Screening questions never give feedback. Assessment answer keys show only after a pass or the last attempt.</Text>
      </aside>
    </div>
  );
}
