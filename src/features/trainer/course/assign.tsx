"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Rocket, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, audienceMatches } from "@/store/app-store";
import { allScenarios } from "@/data/scenarios";
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

type Rollout = "minor" | "restart_open" | "restart";

/**
 * Stage 4 for a training with the trainer's own material: publishing and assigning as one page, in the
 * order they happen. What goes live; the people already on the live version and what this version
 * does to them; who else gets it, and by when. One bar at the bottom does it all.
 */
function DirectAssign() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const users = useApp((s) => s.users);
  const progress = useApp((s) => s.progress);
  const custom = useApp((s) => s.scenarios);
  const assign = useApp((s) => s.assign);
  const publish = useApp((s) => s.publish);
  const { message, open, showToast } = useToast();
  const [rules, setRules] = useState<AudienceRules>({ ...EMPTY_RULES, roles: ["rep"], divisionIds: data?.course.teams?.length ? data.course.teams : data?.course.productId === "p-cardexa" ? ["div-cm"] : ["div-imm"] });
  const [type, setType] = useState<Progress["assignType"]>("required");
  const [mode, setMode] = useState<"learn" | "practice">("learn");
  const [due, setDue] = useState(in30);
  const [start, setStart] = useState(today);
  const [rollout, setRollout] = useState<Rollout>("minor");
  const [addMore, setAddMore] = useState<boolean | null>(null);
  const matched = useMemo(() => audienceMatches(users, targetRules(rules)), [users, rules]);
  const scs = useMemo(() => allScenarios().filter((x) => data?.course.scenarioIds.includes(x.id)), [data?.course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  const { course, cur, lv } = data;
  const base = `/trainer/courses/${course.id}`;
  const draft = cur.state !== "published";
  const mine = progress.filter((p) => p.courseId === course.id);
  const already = new Set(mine.map((p) => p.userId));
  const fresh = matched.filter((u) => !already.has(u.id));
  const badDates = type !== "recommended" && !!due && due < start;
  const day = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateInput = "h-9 rounded-control border border-hair-2 bg-card px-2.5 text-body text-ink outline-none focus:border-brand/60";

  /* Where the people on the live version stand. */
  const groups = {
    not_started: mine.filter((p) => p.state === "not_started"),
    in_progress: mine.filter((p) => p.state !== "not_started" && p.state !== "certified"),
    done: mine.filter((p) => p.state === "certified"),
  };
  const n = (k: keyof typeof groups) => groups[k].length;
  const ppl = (x: number) => `${x} ${x === 1 ? "person" : "people"}`;

  /* What goes live, and what stops it. */
  const st = course.settings;
  const obs = course.objectives ?? [];
  const bare = obs.filter((o) => !scs.some((x) => x.objectiveId === o.id));
  const info = (course.roleplaySourceIds ?? []).length;
  const blockers = [
    !course.modules.length && { text: "No lessons yet. Reps need at least one file to learn from.", href: `${base}/roleplay?files=1`, fix: "Add a file" },
    !scs.length && { text: "No situations yet, so there's nothing to call on.", href: `${base}/situations`, fix: "Add situations" },
  ].filter((x): x is { text: string; href: string; fix: string } => !!x);
  const warnings = bare.length ? [{ text: `${bare.length} objective${bare.length === 1 ? " has" : "s have"} no situations, so ${bare.length === 1 ? "it isn't" : "they aren't"} tested.`, href: `${base}/situations`, fix: "Add situations" }] : [];
  const lines = [
    { label: "Lessons", value: `${course.modules.length} file${course.modules.length === 1 ? "" : "s"} reps see${info ? ` · ${info} information only` : ""}`, href: `${base}/roleplay?files=1` },
    { label: "Objectives", value: `${obs.length} objective${obs.length === 1 ? "" : "s"} · ${scs.length} situation${scs.length === 1 ? "" : "s"}`, href: `${base}/situations` },
    { label: "Rules", value: `Pass ${st.passRoleplay}% · ${st.attempts} ${st.attempts === 1 ? "try" : "tries"} · screening ${st.screening ? "on" : "off"}${st.finalNoHints === false ? " · assisted" : ""}`, href: `${base}/settings` },
  ];

  /* On a first publish, assigning is the point; on a new version, it's an extra. */
  const assigning = !draft || !lv || !mine.length || (addMore ?? false);
  const assignCount = assigning ? fresh.length : 0;
  const ROLLOUT: { v: Rollout; label: string; hint: string }[] = [
    { v: "minor", label: "Keep everyone's progress", hint: `Everyone moves to v${cur.version} where they are. ${n("in_progress") ? `${ppl(n("in_progress"))} in progress carry on; ` : ""}${n("done") ? `${ppl(n("done"))} who completed stay completed.` : "nobody starts over."} For small fixes.` },
    { v: "restart_open", label: "Restart anyone who hasn't finished", hint: `${ppl(n("not_started") + n("in_progress"))} start v${cur.version} from the beginning. ${n("done") ? `The ${ppl(n("done"))} who completed keep it.` : ""} For changes that matter to anyone still learning.` },
    { v: "restart", label: "Restart everyone, completed too", hint: `All ${ppl(mine.length)} take v${cur.version} from the beginning${n("done") ? `, including the ${ppl(n("done"))} who completed` : ""}. For changes everyone must learn.` },
  ];

  function go() {
    if (draft) publish(course.id, lv && mine.length ? rollout : "minor");
    const assigned = assignCount ? assign(course.id, targetRules(rules), type, type === "recommended" ? undefined : due, undefined, start, mode) : 0;
    const what = [draft && `Published v${cur.version}`, draft && lv && mine.length && `${ROLLOUT.find((r) => r.v === rollout)!.label.toLowerCase()} for the ${ppl(mine.length)} on v${lv.version}`, assigned && `assigned to ${assigned} new rep${assigned === 1 ? "" : "s"}`].filter(Boolean).join(", ");
    const said = what.charAt(0).toUpperCase() + what.slice(1);
    showToast(said);
    useTrainingChat.getState().push(course.id, { id: turnId("a"), from: "ai", text: `${said}. You'll see everyone's progress under People.` });
    setAddMore(null);
    if (assigned || (draft && mine.length)) window.setTimeout(() => router.push(`${base}/people`), 900);
  }

  const action = draft
    ? assignCount ? `Publish v${cur.version} & assign to ${assignCount}` : `Publish v${cur.version}`
    : `Assign to ${fresh.length}`;
  const blocked = (draft && blockers.length > 0) || (assigning && badDates) || (!draft && !fresh.length) || (draft && !lv && assigning && !fresh.length);

  return (
    <div className="flex flex-col gap-4">
      <StageHeader n={4} sub={draft ? (lv ? `v${cur.version} replaces v${lv.version}. Check it, decide what happens to the people on v${lv.version}, and publish.` : "Check what goes live, choose who takes it, and publish both in one go.") : `v${cur.version} is live. Assign it to more people.`}
        actions={mine.length > 0 && <Link href={`${base}/people`} className="inline-flex h-9 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle"><Users className="size-4" aria-hidden="true" />{mine.length} assigned · see progress</Link>} />

      {/* 1. What goes live. */}
      {draft && (
        <Card title="What goes live" eyebrow={`v${cur.version}${lv ? ` · replaces v${lv.version}` : " · first version"}`}
          actions={<Link href={`${base}/review`} className="text-caption font-semibold text-ink-3 hover:text-ink">Send for MLR review instead</Link>}>
          <ul className="-mt-1 flex flex-col divide-y divide-hair">
            {lines.map((x) => (
              <li key={x.label} className="flex items-center gap-3 py-2">
                <span className="w-24 shrink-0 text-caption font-semibold text-ink-3">{x.label}</span>
                <span className="min-w-0 flex-1 text-body text-ink">{x.value}</span>
                <Link href={x.href} className="shrink-0 text-caption font-semibold text-brand-deep hover:underline">Change</Link>
              </li>
            ))}
          </ul>
          {blockers.length > 0 || warnings.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {[...blockers.map((b) => ({ ...b, hard: true })), ...warnings.map((w) => ({ ...w, hard: false }))].map((x) => (
                <li key={x.text} className={cn("flex items-center gap-2.5 rounded-control px-3 py-2", x.hard ? "bg-danger/10" : "bg-warn-bg")}>
                  <AlertTriangle className={cn("size-4 shrink-0", x.hard ? "text-danger" : "text-warn")} aria-hidden="true" />
                  <Text size="body" className="min-w-0 flex-1">{x.text}</Text>
                  <Link href={x.href} className="shrink-0 text-caption font-bold text-brand-deep hover:underline">{x.fix}</Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-2.5 rounded-control bg-ok-bg px-3 py-2">
              <Check className="size-4 shrink-0 text-ok" aria-hidden="true" />
              <Text size="body" className="min-w-0 flex-1">Ready. Every objective is tested, and your files go in exactly as uploaded.</Text>
            </div>
          )}
        </Card>
      )}

      {/* 2. The people already on the live version, and what this version does to them. */}
      {lv && mine.length > 0 && (
        <Card title={`People on v${lv.version}`} eyebrow={`${mine.length} assigned`}>
          <div className="-mt-1 grid grid-cols-3 gap-2">
            {([["not_started", "Not started", "text-warn"], ["in_progress", "In progress", "text-brand-deep"], ["done", "Completed", "text-ok"]] as const).map(([k, label, tone]) => (
              <div key={k} className="squircle flex flex-col gap-1.5 rounded-panel border border-hair bg-canvas/60 px-3 py-2.5">
                <span className="flex items-baseline gap-1.5"><Text size="title" weight="extrabold" tabular className={tone}>{n(k)}</Text><Text size="caption" weight="semibold" tone="muted">{label}</Text></span>
                <span className="flex -space-x-1.5">
                  {groups[k].slice(0, 5).map((p) => { const u = users.find((x) => x.id === p.userId); return u ? <span key={p.id} title={u.name} className="rounded-full ring-2 ring-card"><Avatar initials={u.initials} size={22} /></span> : null; })}
                  {n(k) > 5 && <span className="grid size-[22px] place-items-center rounded-full bg-subtle text-[10px] font-bold text-ink-3 ring-2 ring-card">+{n(k) - 5}</span>}
                </span>
              </div>
            ))}
          </div>
          {draft && (
            <div className="flex flex-col gap-2">
              <Text size="body" weight="semibold">When v{cur.version} goes live</Text>
              <div className="flex flex-col gap-2" role="radiogroup" aria-label={`When v${cur.version} goes live`}>
                {ROLLOUT.map((o) => (
                  <button key={o.v} type="button" role="radio" aria-checked={rollout === o.v} onClick={() => setRollout(o.v)}
                    className={cn("squircle flex items-start gap-3 rounded-panel border px-3.5 py-3 text-left transition-colors", rollout === o.v ? "border-brand bg-tint/60 ring-1 ring-brand" : "border-hair-2 bg-card hover:bg-subtle")}>
                    <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", rollout === o.v ? "border-brand" : "border-hair-3")}>{rollout === o.v && <span className="size-2 rounded-full bg-brand" />}</span>
                    <span className="flex min-w-0 flex-col gap-0.5"><span className="text-body font-bold text-ink">{o.label}</span><span className="text-caption leading-relaxed text-ink-3">{o.hint}</span></span>
                  </button>
                ))}
              </div>
              <Text size="caption" tone="subtle">Anyone who starts from now gets v{cur.version}. Everyone affected is told.</Text>
            </div>
          )}
        </Card>
      )}

      {/* 3. Who else gets it. On a new version it's optional. */}
      {lv && mine.length > 0 && draft && (
        <label className="squircle flex cursor-pointer items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
          <input type="checkbox" checked={assigning} onChange={(e) => setAddMore(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
          <span className="flex min-w-0 flex-col"><span className="text-body font-semibold text-ink">Also assign it to new people</span><span className="text-caption text-ink-3">Anyone who matches and doesn&apos;t have it yet.</span></span>
        </label>
      )}
      {assigning && (
        <>
          <Card title={lv && mine.length ? "New people" : "Who takes it"} eyebrow={matched.length > fresh.length ? `${matched.length - fresh.length} already have it, skipped` : undefined}>
            <CompactAudience rules={rules} onChange={setRules} />
          </Card>
          <Card title="What and when">
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
        </>
      )}

      {/* The one bar: back, what will happen, and the action. */}
      <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-4 pt-2">
        <div className="squircle flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-hair bg-card/95 px-3 py-2.5 shadow-float backdrop-blur">
          <button type="button" onClick={() => router.push(`${base}/settings`)} className="flex h-10 items-center gap-1.5 rounded-control px-3 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Back</button>
          <span className="h-6 w-px bg-hair-2" aria-hidden="true" />
          <div className="flex min-w-[200px] flex-1 flex-col">
            <Text size="body" weight="semibold" className="line-clamp-2 leading-snug">
              {[draft && `v${cur.version} goes live`, draft && lv && mine.length && `${ppl(mine.length)} on v${lv.version}: ${ROLLOUT.find((r) => r.v === rollout)!.label.toLowerCase()}`, assigning && `${fresh.length} new ${fresh.length === 1 ? "rep" : "reps"}`].filter(Boolean).join(" · ")}
            </Text>
            {assigning && <Text size="caption" tone="subtle" truncate>{fresh.length ? `${fresh.slice(0, 2).map((u) => u.name).join(", ")}${fresh.length > 2 ? ` and ${fresh.length - 2} more` : ""} · ` : "Nobody new matches · "}{mode === "learn" ? "lessons + call" : "call only"} · {type === "default" ? "onboarding" : type === "required" ? "required" : "optional"} · {start > today ? `opens ${day(start)}` : "opens now"}{type !== "recommended" && due ? ` · due ${day(due)}` : ""}</Text>}
          </div>
          {draft && !lv && assigning && <button type="button" disabled={blockers.length > 0} onClick={() => { setAddMore(false); publish(course.id, "minor"); showToast(`Published v${cur.version}`); useTrainingChat.getState().push(course.id, { id: turnId("a"), from: "ai", text: `Published v${cur.version}, not assigned yet. Choose who takes it here when you're ready.` }); }}
            className="h-10 rounded-control px-3 text-body font-semibold text-ink-3 transition-colors hover:bg-subtle hover:text-ink disabled:opacity-40">Publish only</button>}
          <Button disabled={blocked} onClick={go}>{draft && <Rocket className="size-4" aria-hidden="true" />}{action}</Button>
        </div>
      </div>
      <Toast message={message} open={open} />
    </div>
  );
}
