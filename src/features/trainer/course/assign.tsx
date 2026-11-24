"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Check, Rocket, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp, audienceMatches, type RolloutPlan } from "@/store/app-store";
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
import { noMaterial } from "@/lib/direct-material";
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
 * A training with the trainer's own material, at the end: publishing and assigning are two things.
 * While it's a draft this is Publish, the last building stage: what goes live, and (from the second
 * version on) what happens to the people already on it. Once it's live this is Assign: who else takes
 * it, and by when. A first publish leads straight here to assign.
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
  /* v1-hidden: picking Required / Onboarding / Optional. A due date makes it required (with reminders); without one it's open-ended. */
  const [due, setDue] = useState("");
  /* Whether the material is mandatory or optional is the training's, set in Settings; not per assignment. */
  const [start, setStart] = useState(today);
  /* What happens to the people on the live version, group by group. Small fixes keep everything. */
  const [plan, setPlan] = useState<RolloutPlan>({ inProgress: "keep", completed: "keep", recertifyDays: 30 });
  const matched = useMemo(() => audienceMatches(users, targetRules(rules)), [users, rules]);
  const scs = useMemo(() => allScenarios().filter((x) => data?.course.scenarioIds.includes(x.id)), [data?.course.scenarioIds, custom]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!data) return null;
  const { course, cur, lv } = data;
  const base = `/trainer/courses/${course.id}`;
  const draft = cur.state !== "published";
  const mine = progress.filter((p) => p.courseId === course.id);
  const already = new Set(mine.map((p) => p.userId));
  const fresh = matched.filter((u) => !already.has(u.id));
  const type: Progress["assignType"] = due ? "required" : "recommended";
  const badDates = !!due && due < start;
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
    /* A calls-only training has nothing for reps to see on purpose (Settings › What reps see). */
    /* Every objective is a call (with no situations, on the objective itself); with no objectives there's nothing to call on. */
    !obs.length && { text: "No objectives yet, so there's nothing to call on.", href: `${base}/roleplay`, fix: "Add objectives" },
  ].filter((x): x is { text: string; href: string; fix: string } => !!x);
  const warnings = bare.length ? [{ text: `${bare.length} objective${bare.length === 1 ? " has" : "s have"} no situations: reps get a call on the objective itself. Situations add specific moments and edge cases.`, href: `${base}/situations`, fix: "Add situations" }] : [];
  const lines = [
    { label: "Materials", value: noMaterial(course) ? `None for reps${info ? ` · ${info} file${info === 1 ? "" : "s"} build the calls` : ""}` : `${course.modules.length} file${course.modules.length === 1 ? "" : "s"} reps see, ${st.materialOptional ? "optional" : "mandatory"}${info ? ` · ${info} context only` : ""}`, href: `${base}/settings` },
    { label: "Objectives", value: `${obs.length} objective${obs.length === 1 ? "" : "s"} · ${scs.length} situation${scs.length === 1 ? "" : "s"}`, href: `${base}/situations` },
    { label: "Rules", value: `Screening ${st.screening ? "on" : "off"} · recertify every ${st.recertMonths} months${st.finalNoHints === false ? " · hints on" : ""}`, href: `${base}/settings` },
  ];

  /* Assigning is for a live version; publishing is for a draft. */
  const assigning = !draft;
  /* The plan, in a few words, for the bar and the toast; and its history label. */
  const planText = [n("in_progress") && (plan.inProgress === "keep" ? `${ppl(n("in_progress"))} carry on` : `${ppl(n("in_progress"))} start over`),
    n("done") && (plan.completed === "keep" ? `${ppl(n("done"))} stay certified` : `${ppl(n("done"))} recertify in ${plan.recertifyDays} days`)].filter(Boolean).join(", ") || "everyone moves across";
  const transition = plan.inProgress === "restart" ? "restart_open" : plan.completed === "recertify" ? "recertify" : "minor";

  function go() {
    if (draft) {
      const first = !lv;
      publish(course.id, lv && mine.length ? transition : "minor", lv && mine.length ? plan : undefined);
      const said = `Published v${cur.version}${lv && mine.length ? `. On v${lv.version}: ${planText}` : ""}`;
      showToast(first ? `${said}. Now choose who takes it.` : said);
      useTrainingChat.getState().push(course.id, { id: turnId("a"), from: "ai", text: first ? `${said}. It's live: choose who takes it.` : `${said}. You'll see everyone's progress under People.` });
      /* A first publish leads to assigning it; a new version to the people it just moved. */
      window.setTimeout(() => router.push(first ? `${base}/assign` : mine.length ? `${base}/people` : base), first ? 0 : 900);
      return;
    }
    const assigned = assign(course.id, targetRules(rules), type, due || undefined, undefined, start);
    const said = `Assigned to ${assigned} rep${assigned === 1 ? "" : "s"}`;
    showToast(said);
    useTrainingChat.getState().push(course.id, { id: turnId("a"), from: "ai", text: `${said}. You'll see their progress under People.` });
    if (assigned) window.setTimeout(() => router.push(`${base}/people`), 900);
  }

  const action = draft ? `Publish v${cur.version}` : `Assign to ${fresh.length}`;
  const blocked = draft ? blockers.length > 0 : !fresh.length || badDates;

  return (
    <div className="flex flex-col gap-4">
      <StageHeader n={6} title={draft ? undefined : "Assign"} sub={draft ? (lv ? `v${cur.version} replaces v${lv.version} when you publish.` : "Check what goes live, then publish. You choose who takes it right after.") : ""}
        actions={mine.length > 0 && <Link href={`${base}/people`} className="inline-flex h-9 items-center gap-1.5 rounded-control border border-hair-2 bg-card px-3 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle"><Users className="size-4" aria-hidden="true" />{mine.length} assigned · see progress</Link>} />

      {/* 1. What goes live. */}
      {draft && (
        <Card title="What goes live" eyebrow={`v${cur.version}${lv ? ` · replaces v${lv.version}` : " · first version"}`}
>
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
            <div className="flex flex-col">
              <Text size="body" weight="semibold" className="pb-1">When v{cur.version} goes live</Text>
              <ul className="flex flex-col">
                <Line label={`Not started · ${n("not_started")}`} hint={`They get v${cur.version} when they start.`}>
                  <Text size="caption" weight="semibold" tone="subtle">Moved to v{cur.version}</Text>
                </Line>
                {n("in_progress") > 0 && (
                  <Line label={`In progress · ${n("in_progress")}`} hint={plan.inProgress === "keep" ? `They carry on in v${cur.version} where they are. For small fixes.` : `They start v${cur.version} from the beginning: screening, material and assessments. For changes that matter to anyone still learning.`}>
                    <Segmented aria-label="In progress">
                      <SegmentedButton active={plan.inProgress === "keep"} onClick={() => setPlan({ ...plan, inProgress: "keep" })}>Carry on</SegmentedButton>
                      <SegmentedButton active={plan.inProgress === "restart"} onClick={() => setPlan({ ...plan, inProgress: "restart" })}>Start over</SegmentedButton>
                    </Segmented>
                  </Line>
                )}
                {n("done") > 0 && (
                  <Line label={`Completed · ${n("done")}`} hint={plan.completed === "keep" ? `They stay certified. Nothing to retake.` : `They take v${cur.version}'s assessments again, due in ${plan.recertifyDays} days. For changes everyone must know.`}>
                    <Segmented aria-label="Completed">
                      <SegmentedButton active={plan.completed === "keep"} onClick={() => setPlan({ ...plan, completed: "keep" })}>Stay certified</SegmentedButton>
                      <SegmentedButton active={plan.completed === "recertify"} onClick={() => setPlan({ ...plan, completed: "recertify" })}>Recertify</SegmentedButton>
                    </Segmented>
                    {plan.completed === "recertify" && (
                      <select aria-label="Recertify within" value={plan.recertifyDays} onChange={(e) => setPlan({ ...plan, recertifyDays: Number(e.target.value) })}
                        className="h-9 rounded-control border border-hair-2 bg-card px-2 text-body text-ink outline-none focus:border-brand/60">
                        {[14, 30, 60].map((d) => <option key={d} value={d}>within {d} days</option>)}
                      </select>
                    )}
                  </Line>
                )}
              </ul>
              <Text size="caption" tone="subtle" className="pt-1">Anyone whose training changes gets a notification.</Text>
            </div>
          )}
        </Card>
      )}

      {/* 3. Who takes it: only once it's live. */}
      {assigning && (
        <>
          <Card title={lv && mine.length ? "New people" : "Who takes it"} eyebrow={matched.length > fresh.length ? `${matched.length - fresh.length} already have it, skipped` : undefined}>
            <CompactAudience rules={rules} onChange={setRules} />
          </Card>
          <Card title="What and when">
            <ul className="-mt-1 flex flex-col">
              <Line label="Dates" hint={badDates ? "Pick a due date after the start date." : `Both optional. ${start > today ? "Reps see it now but can't start until the start date." : "Reps can start right away."}${due ? " Reminders 7, 3 and 1 day before it's due." : " No due date, no reminders."}`}>
                <label className="flex items-center gap-1.5 text-caption text-ink-3">Starts<input type="date" aria-label="Starts" value={start} min={today} onChange={(e) => setStart(e.target.value || today)} className={dateInput} /></label>
                <label className="flex items-center gap-1.5 text-caption text-ink-3">Due<input type="date" aria-label="Due" value={due} min={start} onChange={(e) => setDue(e.target.value)} className={cn(dateInput, badDates && "border-danger", !due && "text-ink-4")} /></label>
                {due && <button type="button" onClick={() => setDue("")} className="text-caption font-semibold text-ink-3 hover:text-ink">Clear</button>}
              </Line>
            </ul>
          </Card>
        </>
      )}

      {/* The one bar: back, what will happen, and the action. */}
      <div className="sticky bottom-0 z-10 -mx-1 px-1 pb-4 pt-2">
        <div className="squircle flex flex-wrap items-center gap-x-3 gap-y-2 rounded-panel border border-hair bg-card/95 px-3 py-2.5 shadow-float backdrop-blur">
          <button type="button" onClick={() => router.push(draft ? `${base}/test` : base)} className="flex h-10 items-center gap-1.5 rounded-control px-3 text-body font-semibold text-ink-2 transition-colors hover:bg-subtle hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Back</button>
          <span className="h-6 w-px bg-hair-2" aria-hidden="true" />
          <div className="flex min-w-[200px] flex-1 flex-col">
            <Text size="body" weight="semibold" className="line-clamp-2 leading-snug">
              {draft ? [`v${cur.version} goes live`, lv && mine.length && planText].filter(Boolean).join(" · ") : `${fresh.length} new ${fresh.length === 1 ? "rep" : "reps"} for v${cur.version}`}
            </Text>
            {assigning && <Text size="caption" tone="subtle" truncate>{fresh.length ? `${fresh.slice(0, 2).map((u) => u.name).join(", ")}${fresh.length > 2 ? ` and ${fresh.length - 2} more` : ""} · ` : "Nobody new matches · "}{noMaterial(course) ? "no material" : st.materialOptional ? "material optional" : "material mandatory"} · {start > today ? `opens ${day(start)}` : "opens now"}{due ? ` · due ${day(due)}` : " · no due date"}</Text>}
          </div>
          <Button disabled={blocked} onClick={go}>{draft && <Rocket className="size-4" aria-hidden="true" />}{action}</Button>
        </div>
      </div>
      <Toast message={message} open={open} />
    </div>
  );
}
