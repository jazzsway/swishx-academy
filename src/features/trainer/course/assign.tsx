"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Rocket, Users } from "lucide-react";
import { useApp, audienceMatches } from "@/store/app-store";
import { TODAY } from "@/data/org";
import type { AudienceRules, Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Segmented, SegmentedButton } from "@/components/patterns/segmented";
import { Card, Avatar } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { AudienceBuilder, EMPTY_RULES, targetRules } from "../audience";
import { useCourse } from "./use-course";
import { Num, Row, Toggle } from "./settings";

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
  const base = `/trainer/courses/${course.id}`;
  const assignedHere = progress.filter((p) => p.courseId === course.id).length;
  const head = direct && (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Text size="micro" weight="bold" tone="brand-deep" uppercase tracking="wider">Step 3 of 3</Text>
        <Text as="h1" size="display" weight="extrabold" tracking="tight">Assign to people</Text>
        <Text size="body-lg" tone="subtle">How reps pass the scenario call, and who takes the training.</Text>
      </div>
      {assignedHere > 0 && <Link href={`${base}/people`} className="inline-flex h-10 items-center gap-2 rounded-control border border-hair-2 bg-card px-3.5 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle"><Users className="size-4" aria-hidden="true" />{assignedHere} assigned · see progress</Link>}
    </div>
  );

  if (!lv)
    return direct ? (
      <div className="flex flex-col gap-4">
        {head}
        <PassRules courseId={course.id} />
        <Card>
          <div className="flex flex-wrap items-center gap-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-tint text-brand-deep"><Rocket className="size-5" aria-hidden="true" /></span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text size="title" weight="bold">Publish, then pick who takes it</Text>
              <Text size="body" tone="subtle">Only a published version can be assigned, so reps never see a draft.</Text>
            </div>
            <Button onClick={() => router.push(`${base}/review`)}>Publish<ArrowRight className="size-4" aria-hidden="true" /></Button>
          </div>
        </Card>
      </div>
    ) : <Card><Text tone="subtle">Only a published version can be assigned. Publish it first from Publish & versions.</Text></Card>;

  return (
    <div className="flex flex-col gap-4">
    {head}
    {direct && <PassRules courseId={course.id} />}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex min-w-0 flex-col gap-5">
        <Card title="Who" eyebrow={`Assign v${lv.version}`}>
          <AudienceBuilder rules={rules} onChange={setRules} />
        </Card>
        <Card title="What they do">
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="What they do">
            {([
              { v: "learn", label: direct ? "Lessons + scenarios" : "Learn + practice", hint: direct ? "Screening, the lessons, then the scenario call. For new hires and anyone new to the product." : "The lessons, then practice calls and the final test. For new hires and anyone new to the product." },
              { v: "practice", label: direct ? "Scenarios only" : "Practice only", hint: direct ? "No lessons. Straight to the scenario call. For experienced reps." : "No lessons. Straight to practice calls and the final test. For experienced reps." },
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

/** How reps pass a training's scenario call: set here, next to who takes it. */
function PassRules({ courseId }: { courseId: string }) {
  const data = useCourse(courseId);
  const updateSettings = useApp((s) => s.updateSettings);
  if (!data) return null;
  const st = data.course.settings;
  const set = (patch: Parameters<typeof updateSettings>[1]) => updateSettings(courseId, patch);
  return (
    <Card title="How reps pass" eyebrow="The scenario call">
      <div className="flex flex-col">
        <Row label="Pass mark on each scenario" hint="Each scenario's score is its criteria, weighted the way you set them. A critical compliance flag always fails it.">
          <Num label="Pass mark" value={st.passRoleplay} suffix="%" onChange={(n) => set({ passRoleplay: Math.max(1, Math.min(100, n)) })} />
        </Row>
        <Row label="Tries on each scenario" hint="A failed scenario can be retried on its own; the passed ones stay passed.">
          <Num label="Tries" value={st.attempts} onChange={(n) => set({ attempts: Math.max(1, n) })} />
        </Row>
        <Row label="Wait between tries" hint="Time to go back over the lessons first.">
          <Num label="Wait" value={st.cooldownHours} suffix="hours" onChange={(n) => set({ cooldownHours: Math.max(0, n) })} />
        </Row>
        <Row label="No hints on the scored call" hint="No prompts and no tap-to-answer lines. Screening never has hints either.">
          <Toggle label="No hints" on={!!st.finalNoHints} onChange={(v) => set({ finalNoHints: v })} />
        </Row>
        <Row label="Screening sets a baseline" hint="Each rep's screening score is their starting point; progress is shown from it.">
          <Toggle label="Baseline" on={!!st.baseline} onChange={(v) => set({ baseline: v })} />
        </Row>
      </div>
    </Card>
  );
}
