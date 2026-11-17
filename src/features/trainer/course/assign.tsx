"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Rocket, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, audienceMatches } from "@/store/app-store";
import { TODAY } from "@/data/org";
import type { AudienceRules, Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, Avatar } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { AudienceBuilder, CompactAudience, EMPTY_RULES, targetRules } from "../audience";
import { useCourse } from "./use-course";
import { StageHeader } from "./stage-ui";
import { Line } from "./training-settings";
import { turnId, useTrainingChat } from "./training-chat-store";

const today = TODAY.toISOString().slice(0, 10);
const in30 = new Date(TODAY.getTime() + 30 * 86400000).toISOString().slice(0, 10);

export function AssignCourse() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const users = useApp((s) => s.users);
  const progress = useApp((s) => s.progress);
  // v1-hidden: const campaigns = useApp((s) => s.campaigns);
  const assign = useApp((s) => s.assign);
  const { message, open, showToast } = useToast();
  const [rules, setRules] = useState<AudienceRules>({ ...EMPTY_RULES, roles: ["rep"], /* v1: reps only */ divisionIds: data?.course.teams?.length ? data.course.teams : data?.course.productId === "p-cardexa" ? ["div-cm"] : ["div-imm"] });
  const [type, setType] = useState<Progress["assignType"]>("required");
  const [mode, setMode] = useState<"learn" | "practice">("learn");
  const [due, setDue] = useState(in30);
  const [start, setStart] = useState(today);
  const badDates = type !== "recommended" && !!due && due < start;
  const [campaignId] = useState<string>(""); // v1-hidden: setCampaignId, used by the campaign picker

  const matched = useMemo(() => audienceMatches(users, targetRules(rules)), [users, rules]);
  if (!data) return null;
  const { course, lv } = data;
  const already = new Set(progress.filter((p) => p.courseId === course.id).map((p) => p.userId));
  const fresh = matched.filter((u) => !already.has(u.id));

  const direct = course.origin === "direct";
  if (direct) return <DirectAssign />;
  if (!lv) return <Card><Text tone="subtle">Only a published version can be assigned. Publish it first from Publish & versions.</Text></Card>;

  return (
    <div className="flex flex-col gap-4">
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card title="Who" eyebrow={`Assign v${lv.version}`}>
          <AudienceBuilder rules={rules} onChange={setRules} />
        </Card>
        <Card title="What they do">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What they do">
            {([
              { v: "learn", label: direct ? "Lessons + call" : "Learn + practice", hint: direct ? "Screening, the lessons, then the call. For new hires and anyone new to the product." : "The lessons, then practice calls and the final test. For new hires and anyone new to the product." },
              { v: "practice", label: direct ? "Call only" : "Practice only", hint: direct ? "No lessons. Straight to the call. For experienced reps." : "No lessons. Straight to practice calls and the final test. For experienced reps." },
            ] as const).map((o) => (
              <button key={o.v} type="button" role="radio" aria-checked={mode === o.v} onClick={() => setMode(o.v)}
                className={`squircle flex flex-col gap-1 rounded-panel border p-4 text-left transition-colors ${mode === o.v ? "border-brand bg-tint/60 ring-1 ring-brand" : "border-hair-2 bg-card hover:bg-subtle"}`}>
                <span className="text-body-lg font-bold text-ink">{o.label}</span>
                <span className="text-caption text-ink-3">{o.hint}</span>
              </button>
            ))}
          </div>
          {mode === "practice" && !course.scenarioIds.length && <Text size="body" tone="danger">This training has no roleplay yet. Add one in the training before assigning practice only.</Text>}
          <Text size="caption" tone="subtle">Different groups need different modes? Assign once per group.</Text>
        </Card>
        <Card title="How">
          <Segmented aria-label="Assignment type">
            <SegmentedButton active={type === "required"} onClick={() => setType("required")}>Required</SegmentedButton>
            <SegmentedButton active={type === "default"} onClick={() => setType("default")}>Onboarding</SegmentedButton>
            <SegmentedButton active={type === "recommended"} onClick={() => setType("recommended")}>Recommended</SegmentedButton>
          </Segmented>
          <Text size="body" tone="muted">
            {type === "default" && "Everyone who matches now, and anyone who matches later (new hires, transfers), gets it automatically."}
            {type === "required" && "Assigned with a due date. Reps get reminders at 7, 3 and 1 day before it's due."}
            {type === "recommended" && "Optional. No due date, no reminders."}
          </Text>
          <div className="grid max-w-[460px] gap-3 sm:grid-cols-2">
            <Field label="Starts" type="date" value={start} min={today} onChange={(e) => setStart(e.target.value || today)}
              hint={start > today ? "Reps see it now but can't start until then." : "Reps can start right away."} />
            {type !== "recommended" && <Field label={type === "default" ? "Due (for current matches)" : "Due"} type="date" value={due} min={start} onChange={(e) => setDue(e.target.value)}
              error={badDates ? "Pick a due date after the start date." : undefined} />}
          </div>
          {/* v1-hidden: campaigns.
          <div className="flex flex-col gap-2">
            <Text size="label" weight="semibold" tone="muted">Track as part of a campaign (optional)</Text>
            <select aria-label="Campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="h-11 max-w-[360px] rounded-control border border-hair-2 bg-card px-3 text-body-lg">
              <option value="">No campaign</option>
              {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          */}
        </Card>
      </div>
      <aside className="flex flex-col gap-4 xl:sticky xl:top-[84px] xl:self-start">
        <Card title={`${fresh.length} new assignment${fresh.length === 1 ? "" : "s"}`} padded>
          <Text size="body" tone="subtle" className="-mt-2">{matched.length - fresh.length} already have this training and are skipped.</Text>
          <ul className="flex flex-col gap-2">
            {fresh.slice(0, 8).map((u) => (
              <li key={u.id} className="flex items-center gap-2.5"><Avatar initials={u.initials} size={30} /><div className="flex min-w-0 flex-col"><Text size="body" weight="semibold" truncate>{u.name}</Text><Text size="micro" tone="subtle" truncate>{u.title}</Text></div></li>
            ))}
            {fresh.length > 8 && <Text size="caption" tone="subtle">and {fresh.length - 8} more</Text>}
          </ul>
          {start > today && <Text size="body" weight="semibold" className="text-brand-deep">Opens {new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}{type !== "recommended" && due ? ` · due ${new Date(due).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}</Text>}
          <Button size="lg" fullWidth disabled={!fresh.length || badDates || (mode === "practice" && !course.scenarioIds.length)} onClick={() => {
            const n = assign(course.id, targetRules(rules), type, type === "recommended" ? undefined : due, campaignId || undefined, start, mode);
            showToast(`Assigned ${mode === "practice" ? "practice only " : ""}to ${n} ${n === 1 ? "person" : "people"}`);
            window.setTimeout(() => router.push(campaignId ? `/trainer/campaigns/${campaignId}` : "/trainer/records"), 900);
          }}>{mode === "practice" ? "Assign practice to" : "Assign to"} {fresh.length}</Button>
        </Card>
      </aside>
      <Toast message={message} open={open} />
    </div>
    </div>
  );
}

/**
 * Stage 4 for a training with the trainer's own material: who takes it, what they do and by when, with
 * who'll get it always in view. Assigning needs a published version; until then, the one thing here is
 * to publish it.
 */
function DirectAssign() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const users = useApp((s) => s.users);
  const progress = useApp((s) => s.progress);
  const assign = useApp((s) => s.assign);
  const setPublishOpen = useTrainingChat((s) => s.setPublishOpen);
  const { message, open, showToast } = useToast();
  const [rules, setRules] = useState<AudienceRules>({ ...EMPTY_RULES, roles: ["rep"], divisionIds: data?.course.teams?.length ? data.course.teams : data?.course.productId === "p-cardexa" ? ["div-cm"] : ["div-imm"] });
  const [type, setType] = useState<Progress["assignType"]>("required");
  const [mode, setMode] = useState<"learn" | "practice">("learn");
  const [due, setDue] = useState(in30);
  const [start, setStart] = useState(today);
  const matched = useMemo(() => audienceMatches(users, targetRules(rules)), [users, rules]);
  if (!data) return null;
  const { course, cur, lv } = data;
  const base = `/trainer/courses/${course.id}`;
  const already = new Set(progress.filter((p) => p.courseId === course.id).map((p) => p.userId));
  const fresh = matched.filter((u) => !already.has(u.id));
  const badDates = type !== "recommended" && !!due && due < start;
  const day = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateInput = "h-9 rounded-control border border-hair-2 bg-card px-2.5 text-body text-ink outline-none focus:border-brand/60";

  const head = (
    <StageHeader n={4} sub={lv ? `v${lv.version} is live. Choose who takes it, and by when.` : "Publish it, then choose who takes it."}
      actions={already.size > 0 && <Link href={`${base}/people`} className="inline-flex h-9 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle"><Users className="size-4" aria-hidden="true" />{already.size} assigned · see progress</Link>} />
  );

  if (!lv)
    return (
      <div className="flex flex-col gap-4">
        {head}
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-tint text-brand"><Rocket className="size-6" aria-hidden="true" /></span>
            <Text size="title" weight="bold">Publish v{cur.version} to start assigning</Text>
            <Text size="body" tone="subtle" className="max-w-[440px]">Reps only ever see a published version. Check what goes live, publish it, and choose who takes it here.</Text>
            <Button onClick={() => setPublishOpen(true)}><Rocket className="size-4" aria-hidden="true" />Publish v{cur.version}</Button>
          </div>
        </Card>
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      {head}
      {cur.state !== "published" && (
        <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-warn/30 bg-warn-bg px-4 py-2.5">
          <Text size="body" className="min-w-0 flex-1">You&apos;re assigning <b>v{lv.version}</b>. Your changes in v{cur.version} reach reps once you publish them.</Text>
          <Button size="sm" variant="secondary" onClick={() => setPublishOpen(true)}>Publish v{cur.version}</Button>
        </div>
      )}
      <Card title="Who" eyebrow={`Assign v${lv.version}`}>
        <CompactAudience rules={rules} onChange={setRules} />
      </Card>
      <Card title="What and when" eyebrow="The assignment">
        <ul className="-mt-1 flex flex-col">
          <Line label="What they do" hint={mode === "learn" ? "Screening, the lessons, then the scored call. For new hires and anyone new to the product." : "No lessons, straight to the scored call. For experienced reps."}>
            <Segmented aria-label="What they do">
              <SegmentedButton active={mode === "learn"} onClick={() => setMode("learn")}>Lessons + call</SegmentedButton>
              <SegmentedButton active={mode === "practice"} onClick={() => setMode("practice")}>Call only</SegmentedButton>
            </Segmented>
          </Line>
          <Line label="Assignment" hint={type === "default" ? "Everyone who matches now, and anyone who matches later (new hires, transfers), gets it." : type === "required" ? "With a due date. Reminders 7, 3 and 1 day before." : "Optional. No due date, no reminders."}>
            <Segmented aria-label="Assignment type">
              <SegmentedButton active={type === "required"} onClick={() => setType("required")}>Required</SegmentedButton>
              <SegmentedButton active={type === "default"} onClick={() => setType("default")}>Onboarding</SegmentedButton>
              <SegmentedButton active={type === "recommended"} onClick={() => setType("recommended")}>Optional</SegmentedButton>
            </Segmented>
          </Line>
          <Line label="Dates" hint={badDates ? "Pick a due date after the start date." : start > today ? "Reps see it now but can't start until then." : "Reps can start right away."}>
            <label className="flex items-center gap-1.5 text-caption text-ink-3">Starts<input type="date" aria-label="Starts" value={start} min={today} onChange={(e) => setStart(e.target.value || today)} className={dateInput} /></label>
            {type !== "recommended" && <label className="flex items-center gap-1.5 text-caption text-ink-3">Due<input type="date" aria-label="Due" value={due} min={start} onChange={(e) => setDue(e.target.value)} className={cn(dateInput, badDates && "border-danger")} /></label>}
          </Line>
        </ul>
      </Card>
      {/* Who gets it, always in view, with the one action. */}
      <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-1 pt-2">
        <div className="squircle flex flex-wrap items-center gap-x-4 gap-y-2 rounded-panel border border-hair bg-card/95 px-4 py-3 shadow-float backdrop-blur">
          <Text size="display" weight="extrabold" tabular className="leading-none">{fresh.length}</Text>
          <div className="flex min-w-[200px] flex-1 flex-col">
            <Text size="body" weight="semibold">{fresh.length === 1 ? "rep gets it" : "reps get it"}{matched.length > fresh.length ? <span className="font-normal text-ink-3"> · {matched.length - fresh.length} already have it</span> : null}</Text>
            <Text size="caption" tone="subtle" truncate>{fresh.length ? `${fresh.slice(0, 2).map((u) => u.name).join(", ")}${fresh.length > 2 ? ` and ${fresh.length - 2} more` : ""} · ` : ""}{mode === "learn" ? "lessons + call" : "call only"} · {type === "default" ? "onboarding" : type === "required" ? "required" : "optional"} · {start > today ? `opens ${day(start)}` : "opens now"}{type !== "recommended" && due ? ` · due ${day(due)}` : ""}</Text>
          </div>
          <Button disabled={!fresh.length || badDates} onClick={() => {
            const n = assign(course.id, targetRules(rules), type, type === "recommended" ? undefined : due, undefined, start, mode);
            showToast(`Assigned to ${n} ${n === 1 ? "rep" : "reps"}`);
            useTrainingChat.getState().push(course.id, { id: turnId("a"), from: "ai", text: `Assigned to ${n} rep${n === 1 ? "" : "s"}. You'll see their progress under People.` });
            window.setTimeout(() => router.push(`${base}/people`), 900);
          }}>Assign to {fresh.length}</Button>
        </div>
      </div>
      <Toast message={message} open={open} />
    </div>
  );
}
