"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Rocket } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
import { competency } from "@/data/org";
import type { Course } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useCourse } from "./use-course";
import { turnId, useTrainingChat } from "./training-chat-store";

/**
 * Publishing a training built with the trainer's own material: not a stage of its own but one step
 * between settings and assigning. What goes live, anything missing, then publish and go on to assign.
 */
export function PublishDialog({ course }: { course: Course }) {
  const router = useRouter();
  const open = useTrainingChat((s) => s.publishOpen);
  const setOpen = useTrainingChat((s) => s.setPublishOpen);
  const publish = useApp((s) => s.publish);
  const custom = useApp((s) => s.scenarios);
  const data = useCourse(course.id);
  const scs = useMemo(() => allScenarios().filter((x) => course.scenarioIds.includes(x.id)), [course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!open || !data) return null;
  const { cur, lv } = data;
  const base = `/trainer/courses/${course.id}`;
  const st = course.settings;
  const obs = course.objectives ?? [];
  const bare = obs.filter((o) => !scs.some((x) => x.objectiveId === o.id));
  const info = (course.roleplaySourceIds ?? []).length;
  const must = st.criticalCompetencies.filter((c) => obs.some((o) => o.weights.some((w) => w.competency === c)));
  const blockers = [
    !course.modules.length && { text: "No lessons yet. Reps need at least one file to learn from.", href: `${base}/roleplay?files=1`, fix: "Add a file" },
    !scs.length && { text: "No situations yet, so there's nothing to call on.", href: `${base}/situations`, fix: "Add situations" },
  ].filter((x): x is { text: string; href: string; fix: string } => !!x);
  const warnings = bare.length ? [{ text: `${bare.length} objective${bare.length === 1 ? " has" : "s have"} no situations, so ${bare.length === 1 ? "it isn't" : "they aren't"} tested yet.`, href: `${base}/situations`, fix: "Add situations" }] : [];
  const close = () => setOpen(false);
  const go = (href: string) => { close(); router.push(href); };
  const lines = [
    { label: "Lessons", value: `${course.modules.length} file${course.modules.length === 1 ? "" : "s"} reps see${info ? ` · ${info} information only` : ""}`, href: `${base}/roleplay?files=1` },
    { label: "Objectives", value: `${obs.length} objective${obs.length === 1 ? "" : "s"} · ${scs.length} situation${scs.length === 1 ? "" : "s"}`, href: `${base}/roleplay` },
    { label: "Rules", value: `Pass ${st.passRoleplay}% · ${st.attempts} ${st.attempts === 1 ? "try" : "tries"} · screening ${st.screening ? "on" : "off"}${st.finalNoHints === false ? " · assisted" : ""} · recertify every ${st.recertMonths} mo`, href: `${base}/settings` },
    { label: "Must pass", value: must.length ? must.map((c) => competency(c)?.name).join(", ") : "None", href: `${base}/settings` },
  ];

  return (
    <Modal open onClose={close} size="md"
      footer={<>
        <Link href={`${base}/review`} onClick={close} className="mr-auto text-body font-semibold text-ink-3 hover:text-ink">Send for MLR review instead</Link>
        <Button variant="secondary" onClick={close}>Not yet</Button>
        <Button disabled={blockers.length > 0} onClick={() => {
          publish(course.id, "minor");
          useTrainingChat.getState().push(course.id, { id: turnId("a"), from: "ai", text: `Published as v${cur.version}. Now choose who takes it: the teams or people, then assign.` });
          go(`${base}/assign`);
        }}><Rocket className="size-4" aria-hidden="true" />Publish and assign</Button>
      </>}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-control bg-tint text-brand"><Rocket className="size-5" aria-hidden="true" /></span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Text as="h2" size="title" weight="bold">Publish v{cur.version}?</Text>
            <Text size="body" tone="subtle">{lv ? `It replaces v${lv.version} for anyone who starts from now. ` : ""}Reps only ever see a published version. Once it's live, you choose who takes it.</Text>
          </div>
        </div>

        <ul className="flex flex-col divide-y divide-hair rounded-panel border border-hair">
          {lines.map((x) => (
            <li key={x.label} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-24 shrink-0 text-caption font-semibold text-ink-3">{x.label}</span>
              <span className="min-w-0 flex-1 text-body text-ink">{x.value}</span>
              <button type="button" onClick={() => go(x.href)} className="shrink-0 text-caption font-semibold text-brand-deep hover:underline">Change</button>
            </li>
          ))}
        </ul>

        {(blockers.length > 0 || warnings.length > 0) ? (
          <ul className="flex flex-col gap-2">
            {[...blockers.map((b) => ({ ...b, hard: true })), ...warnings.map((w) => ({ ...w, hard: false }))].map((x) => (
              <li key={x.text} className={cn("flex items-center gap-2.5 rounded-control px-3 py-2.5", x.hard ? "bg-danger/10" : "bg-warn-bg")}>
                <AlertTriangle className={cn("size-4 shrink-0", x.hard ? "text-danger" : "text-warn")} aria-hidden="true" />
                <Text size="body" className="min-w-0 flex-1">{x.text}</Text>
                <button type="button" onClick={() => go(x.href)} className="shrink-0 text-caption font-bold text-brand-deep hover:underline">{x.fix}</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-2.5 rounded-control bg-ok-bg px-3 py-2.5">
            <Check className="size-4 shrink-0 text-ok" aria-hidden="true" />
            <Text size="body">Ready. {obs.length ? "Every objective is tested, and your" : "Your"} files go in exactly as uploaded.</Text>
          </div>
        )}
      </div>
    </Modal>
  );
}
