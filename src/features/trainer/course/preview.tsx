"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { buildPath, pathMinutes, courseMinutes } from "@/lib/learning";
import { competency } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, BandChip } from "@/components/patterns/academy";
import { BlockView } from "@/features/shared/block-view";
import { useCourse } from "./use-course";

const PROFILES = {
  new: { label: "New to therapy area", base: 38 },
  brand: { label: "Experienced, new to brand", base: 0 },
  expert: { label: "Expert", base: 92 },
} as const;

export function PreviewAsRep() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  const [profile, setProfile] = useState<keyof typeof PROFILES>("brand");
  const [open, setOpen] = useState<string | null>(null);
  const course = data?.course;

  const scores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of course?.competencyIds ?? []) {
      if (profile === "brand") out[c] = ["c-disease", "c-competitive", "c-opening", "c-moa"].includes(c) ? 86 : c === "c-dosing" ? 45 : c === "c-access" ? 52 : 68;
      else out[c] = PROFILES[profile].base + (c.length % 5);
    }
    return out;
  }, [course, profile]);

  if (!data || !course) return null;
  const linear = course.type === "linear";
  const plan = buildPath(course.modules, scores, linear ? "full" : "screening");
  const ordered = plan.moduleIds.map((m) => course.modules.find((x) => x.id === m)!);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="flex min-w-0 flex-col gap-4">
        {!linear && (
          <div className="flex flex-wrap items-center gap-3">
            <Text size="body-lg" weight="semibold">Simulate a screening result</Text>
            <Segmented aria-label="Profile">
              {Object.entries(PROFILES).map(([k, v]) => <SegmentedButton key={k} active={profile === k} onClick={() => setProfile(k as keyof typeof PROFILES)}>{v.label}</SegmentedButton>)}
            </Segmented>
          </div>
        )}
        <Card title={linear ? "Every rep takes the full course" : `${plan.moduleIds.length} of ${course.modules.length} modules · ~${pathMinutes(course.modules, plan.moduleIds)} min`}
          eyebrow={linear ? "Same for everyone" : `Full course ${courseMinutes(course)} min`}>
          {!linear && (
            <div className="flex flex-wrap gap-2">
              {course.competencyIds.map((c) => (
                <span key={c} className="flex items-center gap-1.5 rounded-chip border border-hair px-2 py-1 text-caption">
                  {competency(c)?.name} <strong className="tabular-nums">{scores[c]}</strong> <BandChip score={scores[c]} size="xs" />
                </span>
              ))}
            </div>
          )}
          <ol className="flex flex-col gap-2">
            {course.modules.map((m) => {
              const inPath = plan.moduleIds.includes(m.id);
              return (
                <li key={m.id} className={cn("squircle flex items-center gap-3 rounded-panel border px-3.5 py-3", inPath ? "border-hair bg-card" : "border-dashed border-hair-2 bg-subtle")}>
                  <span className={cn("grid size-7 place-items-center rounded-full", inPath ? "bg-brand text-white" : "bg-black/[0.06] text-ink-4")}>
                    {m.required ? <Lock className="size-3.5" aria-hidden="true" /> : inPath ? <Check className="size-3.5" aria-hidden="true" /> : <span className="text-micro">—</span>}
                  </span>
                  <button type="button" onClick={() => setOpen(open === m.id ? null : m.id)} className="flex min-w-0 flex-1 flex-col text-left">
                    <span className={cn("text-body-lg font-semibold", !inPath && "text-ink-3")}>{m.title}</span>
                    <span className="text-caption text-ink-3">{m.minutes} min</span>
                  </button>
                  <Chip size="sm" tone={m.required ? "warn" : inPath ? "brand" : "default"}>{plan.reasons[m.id]}</Chip>
                </li>
              );
            })}
          </ol>
          {!linear && <Text size="caption" tone="subtle">Order: your module order. {ordered.length ? `Starts with “${ordered[0].title}”.` : ""}</Text>}
        </Card>
      </div>
      <div className="flex flex-col gap-3 lg:sticky lg:top-[84px] lg:self-start">
        <Text size="caption" weight="bold" tone="subtle">Rep view · phone</Text>
        <div className="squircle mx-auto flex w-full max-w-[390px] flex-col gap-4 rounded-card border-[6px] border-ink bg-canvas p-4" style={{ minHeight: 560 }}>
          {(() => {
            const m = course.modules.find((x) => x.id === (open ?? ordered[0]?.id)) ?? course.modules[0];
            const b = m?.blocks[0];
            return m && b ? (
              <>
                <Text size="caption" tone="subtle">{m.title}</Text>
                <Text size="display" weight="bold" className="leading-tight">{b.title}</Text>
                <BlockView block={b} sourceIds={course.sourceIds} interactive siblings={m.blocks} />
              </>
            ) : <Text tone="subtle">Nothing to preview yet.</Text>;
          })()}
        </div>
      </div>
    </div>
  );
}
