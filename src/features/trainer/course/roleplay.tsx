"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Mic, ShieldAlert } from "lucide-react";
import { SCENARIOS, objection, prohibited } from "@/data/scenarios";
import { competency, product } from "@/data/org";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Card, Avatar } from "@/components/patterns/academy";
import { useCourse } from "./use-course";

export function RoleplaySetup() {
  const { id } = useParams<{ id: string }>();
  const data = useCourse(id);
  if (!data) return null;
  if (data.course.type !== "personalised") return null;
  const scs = SCENARIOS.filter((s) => data.course.scenarioIds.includes(s.id));
  return (
    <div id="roleplay" className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <Text as="h2" size="title" weight="bold">Roleplay doctor</Text>
        <Text size="body" tone="subtle">The AI HCP reps talk to in screening, assessment and practice. Its persona, rubric and prohibited list go to MLR with the course.</Text>
      </div>
      {scs.length === 0 && (
        <Card>
          <Text size="body-lg" weight="semibold">No roleplay doctor for {product(data.course.productId)?.brand ?? "this course"} yet</Text>
          <Text size="body" tone="muted">Doctors are product-specific: the objections, rubric and prohibited language come from this product&apos;s approved materials. Until one is set up, the assessment is the quiz only.</Text>
        </Card>
      )}
      {scs.map((sc) => (
        <Card key={sc.id} title={sc.title} eyebrow={`Used for ${sc.use.join(" · ")}`}
          actions={<Link href={`/trainer/test-call?scenario=${sc.id}&back=/trainer/courses/${id}/questions`} className="inline-flex h-10 items-center gap-2 rounded-control bg-brand px-4 text-body-lg font-semibold text-white hover:bg-brand-deep"><Mic className="size-4" aria-hidden="true" />Test call</Link>}>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar initials={sc.persona.name.split(" ").slice(1).map((x) => x[0]).join("")} size={48} tone="ink" />
                <div className="flex flex-col"><Text size="subhead" weight="bold">{sc.persona.name}</Text><Text size="body" tone="subtle">{sc.persona.specialty} · {sc.persona.setting}</Text></div>
              </div>
              <div className="flex flex-wrap gap-1.5">{sc.persona.traits.map((t) => <Chip key={t} size="md">{t}</Chip>)}</div>
              <div className="flex flex-col gap-1"><Text size="caption" weight="bold" tone="subtle">Call objective</Text><Text size="body-lg">{sc.objective} · {sc.durationMin} min · {sc.context}</Text></div>
              <div className="flex flex-col gap-1"><Text size="caption" weight="bold" tone="subtle">Opening line</Text><Text size="body-lg" tone="muted">“{sc.persona.opening}”</Text></div>
              <div className="flex flex-col gap-2">
                <Text size="caption" weight="bold" tone="subtle">Objection pool (AI raises these)</Text>
                {sc.objectionIds.map((o) => (
                  <div key={o} className="squircle rounded-panel bg-subtle px-3.5 py-2.5">
                    <Text size="body" weight="semibold">{objection(o).label}</Text>
                    <Text as="p" size="body" tone="muted">“{objection(o).line}”</Text>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Text size="caption" weight="bold" tone="subtle">Rubric · pass at 75%</Text>
                {sc.rubric.map((r) => (
                  <div key={r.id} className="flex items-start gap-3 border-b border-hair pb-2 last:border-0">
                    <Text size="body" weight="bold" tone="brand-deep" className="w-10 shrink-0 tabular-nums">{r.weight}%</Text>
                    <div className="flex flex-col gap-0.5"><Text size="body" weight="semibold">{r.label}</Text><Text size="caption" tone="subtle">{competency(r.competency)?.name} · good: {r.good}</Text></div>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <Text size="caption" weight="bold" tone="subtle">Prohibited language</Text>
                {sc.prohibitedIds.map((pid) => {
                  const p = prohibited(pid);
                  return (
                    <div key={pid} className="flex items-start gap-2.5">
                      <ShieldAlert className={`mt-0.5 size-4 shrink-0 ${p.critical ? "text-danger" : "text-warn"}`} aria-hidden="true" />
                      <div className="flex flex-col"><Text size="body" weight="semibold">{p.label} {p.critical && <Chip size="xs" tone="danger" className="ml-1">auto-fail in assessment</Chip>}</Text><Text size="caption" tone="subtle">{p.explanation}</Text></div>
                    </div>
                  );
                })}
              </div>
              <div className="squircle rounded-panel border border-hair bg-subtle px-4 py-3">
                <Text size="caption" weight="bold" tone="subtle">AI HCP behaviour note · included in the MLR package</Text>
                <Text as="p" size="body" tone="muted" className="mt-1 leading-relaxed">{sc.behaviourNote}</Text>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
