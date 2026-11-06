"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Rocket, RefreshCcw, UserPlus, CalendarClock } from "lucide-react";
import { useApp, live, audienceMatches } from "@/store/app-store";
import { counts, daysFromToday, fmtDate, isOverdue, pct, projected, trend, STATE_LABEL } from "@/store/selectors";
import { REGIONS, TODAY } from "@/data/org";
import type { AudienceRules, Campaign } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { PageHeading } from "@/components/patterns/page-heading";
import { DataTable } from "@/components/patterns/data-table";
import { Card, Meter, Sparkline, Avatar, ProgressChip, EmptyState } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { AudienceBuilder, EMPTY_RULES } from "./audience";

const TYPE_META: Record<Campaign["type"], { label: string; icon: typeof Rocket }> = {
  launch: { label: "Launch readiness", icon: Rocket },
  label_update: { label: "Label update recertification", icon: RefreshCcw },
  onboarding: { label: "New-hire onboarding", icon: UserPlus },
  annual: { label: "Annual recertification", icon: CalendarClock },
};

function useCampaignProgress(c: Campaign) {
  const progress = useApp((s) => s.progress);
  return useMemo(() => progress.filter((p) => p.campaignId === c.id), [progress, c]);
}

const startedMessage = (r: { created: number; linked: number; elsewhere: number }) =>
  [`${r.created} new assignments`, r.linked ? `${r.linked} already had the course and joined` : "", r.elsewhere ? `${r.elsewhere} stay in another campaign` : ""].filter(Boolean).join(" · ");

export function CampaignList() {
  const router = useRouter();
  const campaigns = useApp((s) => s.campaigns);
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Campaigns" description="Time-boxed programs for launches, label updates, onboarding and recertification."
        actions={<Button size="lg" onClick={() => router.push("/trainer/campaigns/new")}><Plus className="size-4" aria-hidden="true" />New campaign</Button>} />
      <div className="grid gap-4 lg:grid-cols-2">
        {campaigns.map((c) => <CampaignCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

function CampaignCard({ c }: { c: Campaign }) {
  const ps = useCampaignProgress(c);
  const ct = counts(ps);
  const Icon = TYPE_META[c.type].icon;
  const ready = pct(ct.certified, ct.total);
  return (
    <Link href={`/trainer/campaigns/${c.id}`} className="squircle flex flex-col gap-4 rounded-card border border-hair bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-soft">
      <div className="flex items-start gap-3">
        <span className="grid size-10 place-items-center rounded-control bg-tint text-brand-deep"><Icon className="size-5" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-col"><Text size="title" weight="bold">{c.name}</Text><Text size="caption" tone="subtle">{TYPE_META[c.type].label} · {fmtDate(c.startAt)} → {fmtDate(c.dueAt, true)}</Text></div>
        <Chip size="md" tone={c.status === "active" ? "ok" : "default"}>{c.status === "active" ? "Active" : c.status === "scheduled" ? "Scheduled" : "Closed"}</Chip>
      </div>
      {c.status === "scheduled" ? <Text tone="subtle">Starts {fmtDate(c.startAt, true)}.</Text> : (
        <>
          <div className="flex items-end justify-between"><Text size="hero" weight="extrabold" tabular>{ready}%</Text><Text size="body" tone="subtle">target {c.target}% · {ct.total} people</Text></div>
          <Meter value={ready} tone={ready >= c.target ? "ok" : "brand"} label={`${ready}% certified`} />
          <Text size="body" tone={ct.overdue ? "danger" : "subtle"}>{ct.overdue ? `${ct.overdue} overdue` : "Nobody overdue"} · due in {daysFromToday(c.dueAt)} days</Text>
        </>
      )}
    </Link>
  );
}

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const s = useApp();
  const { message, open, showToast } = useToast();
  const c = s.campaigns.find((x) => x.id === id);
  const ps = useCampaignProgress(c ?? s.campaigns[0]);
  const [region, setRegion] = useState(search.get("region") ?? "");
  if (!c) return <EmptyState title="Campaign not found" />;
  const byUser = new Map(s.users.map((u) => [u.id, u]));
  const scoped = region ? ps.filter((p) => byUser.get(p.userId)?.regionId === region) : ps;
  const ct = counts(scoped);
  const ready = pct(ct.certified, ct.total);
  const proj = projected(scoped, c.dueAt);
  const districts = s.districts.filter((d) => scoped.some((p) => byUser.get(p.userId)?.districtId === d.id))
    .map((d) => { const dp = scoped.filter((p) => byUser.get(p.userId)?.districtId === d.id); return { d, ct: counts(dp), v: pct(counts(dp).certified, dp.length), mgr: byUser.get(d.managerId) }; })
    .sort((a, b) => a.v - b.v);
  const overdue = scoped.filter(isOverdue);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/trainer/campaigns" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Campaigns</Link>
      <PageHeading eyebrow={TYPE_META[c.type].label} title={c.name}
        description={`${c.courseIds.map((cid) => s.courses.find((x) => x.id === cid)?.title).join(", ")} · ${fmtDate(c.startAt)} → ${fmtDate(c.dueAt, true)} · target ${c.target}%`}
        actions={overdue.length > 0 && <Button onClick={() => { let n = 0; for (const p of overdue) if (s.nudge(p.id, "u-maya")) n++; showToast(n ? `Nudged ${n} overdue reps` : "Everyone overdue was nudged in the last 48 hours"); }}>Nudge all overdue ({overdue.length})</Button>} />
      {c.status === "scheduled" && (
        <Card tone="tint">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <Text size="subhead" weight="bold">Scheduled for {fmtDate(c.startAt, true)}</Text>
              <Text size="body" tone="muted">On that day, {audienceMatches(s.users, c.audience).length} people get the {c.courseIds.length > 1 ? "courses" : "course"} as required, due {fmtDate(c.dueAt, true)}. Anyone who already has {c.courseIds.length > 1 ? "them" : "it"} joins with the earlier due date.</Text>
            </div>
            <Button onClick={() => showToast(startedMessage(s.startCampaign(c.id)))}>Start now</Button>
          </div>
        </Card>
      )}
      {region && <Chip tone="brand" size="lg" removable onRemove={() => setRegion("")} className="self-start">Region: {REGIONS.find((r) => r.id === region)?.name}</Chip>}
      {/* Nothing to track until it starts. */}
      {c.status !== "scheduled" && (
        <>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Readiness over time">
          <div className="flex flex-wrap items-end gap-10">
            <div className="flex flex-col"><Text size="hero-lg" weight="extrabold" tabular>{ready}%</Text><Text tone="muted" size="body-lg">certified · {ct.certified} of {ct.total}</Text></div>
            <div className="flex flex-col pb-1"><Text size="display" weight="bold" tone={proj >= c.target ? "ok" : "warn"} tabular>{proj}%</Text><Text size="body" tone="muted">projected by {fmtDate(c.dueAt)}</Text></div>
            <div className="relative ml-auto">
              <Sparkline values={trend(scoped, 10)} width={320} height={90} label={`Readiness trend, now ${ready}%`} />
              <div className="absolute inset-x-0 border-t-2 border-dashed border-ok/60" style={{ top: `${90 - 6 - (c.target / 100) * 78}px` }} aria-hidden="true" />
              <Text size="micro" tone="ok" weight="bold" className="absolute right-0" style={{ top: `${90 - 22 - (c.target / 100) * 78}px` }}>target {c.target}%</Text>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[["Certified", ct.certified, "ok"], ["In progress", ct.in_progress, "brand"], ["Not started", ct.not_started, "faint"], ["Overdue", ct.overdue, "danger"]].map(([k, v, t]) => (
              <div key={k as string} className="squircle flex flex-col rounded-panel bg-subtle px-4 py-3">
                <Text size="caption" tone="subtle">{k}</Text>
                <Text size="display" weight="extrabold" tone={t === "danger" ? "danger" : t === "ok" ? "ok" : "default"} tabular>{v}</Text>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Escalation rules" padded>
          <ul className="flex flex-col gap-2.5 text-body-lg text-ink-2">
            <li>Reps reminded 7, 3 and 1 day before their due date</li>
            <li>Manager notified when a rep is overdue</li>
            <li>You're notified 7 days after a rep goes overdue</li>
            <li>After 3 failed attempts, manager and trainer are alerted</li>
          </ul>
        </Card>
      </div>
      <Card title="By district" actions={<Text size="caption" tone="subtle">Lowest readiness first</Text>}>
        <DataTable
          rows={districts}
          rowKey={(r) => r.d.id}
          columns={[
            { key: "d", header: "District", cell: (r) => <div className="flex flex-col"><Text size="body-lg" weight="semibold">{r.d.name}</Text><Text size="caption" tone="subtle">{r.mgr?.name}</Text></div> },
            { key: "bar", header: "Certified", cell: (r) => <div className="flex min-w-[160px] items-center gap-3"><Meter value={r.v} tone={r.v >= c.target ? "ok" : r.v < 50 ? "brand" : "brand-2"} label={`${r.d.name} ${r.v}%`} /><span className="w-10 text-right font-bold tabular-nums text-ink">{r.v}%</span></div> },
            { key: "ip", header: "In progress", numeric: true, cell: (r) => r.ct.in_progress },
            { key: "ns", header: "Not started", numeric: true, secondary: true, cell: (r) => r.ct.not_started },
            { key: "od", header: "Overdue", numeric: true, cell: (r) => <span className={r.ct.overdue ? "font-bold text-danger" : undefined}>{r.ct.overdue}</span> },
          ]}
        />
      </Card>
      <Card title={`Overdue · ${overdue.length}`}>
        {overdue.length === 0 ? <Text tone="subtle">Nobody is overdue.</Text> : (
          <DataTable
            rows={overdue}
            rowKey={(p) => p.id}
            columns={[
              { key: "n", header: "Rep", cell: (p) => { const u = byUser.get(p.userId)!; return <Link href={`/trainer/people/${u.id}`} className="flex items-center gap-2.5 hover:underline"><Avatar initials={u.initials} size={30} /><span className="font-semibold text-ink">{u.name}</span></Link>; } },
              { key: "d", header: "District", secondary: true, cell: (p) => s.districts.find((d) => d.id === byUser.get(p.userId)?.districtId)?.name },
              { key: "st", header: "Stage", cell: (p) => <ProgressChip state={p.state} label={STATE_LABEL[p.state]} /> },
              { key: "due", header: "Was due", cell: (p) => <span className="text-danger">{fmtDate(p.dueAt)}</span> },
              { key: "a", header: "", cell: (p) => <Button size="sm" variant="secondary" onClick={() => showToast(s.nudge(p.id, "u-maya") ? `Nudged ${byUser.get(p.userId)?.first}` : "Already nudged in the last 48 hours")}>Nudge</Button> },
            ]}
          />
        )}
      </Card>
        </>
      )}
      <Toast message={message} open={open} />
    </div>
  );
}

export function NewCampaign() {
  const router = useRouter();
  const search = useSearchParams();
  const s = useApp();
  const { message, open, showToast } = useToast();
  const presetCourse = search.get("course") ?? "";
  const presetType = (search.get("type") as Campaign["type"]) ?? "launch";
  const presetCourseObj = s.courses.find((c) => c.id === presetCourse);
  const [type, setType] = useState<Campaign["type"]>(presetType);
  const [name, setName] = useState(presetCourseObj ? `${presetCourseObj.title} · recertification` : "");
  const [courseIds, setCourseIds] = useState<string[]>(presetCourse ? [presetCourse] : []);
  const [rules, setRules] = useState<AudienceRules>({ ...EMPTY_RULES, divisionIds: presetCourseObj?.productId === "p-cardexa" ? ["div-cm"] : [] });
  const [startAt, setStartAt] = useState(TODAY.toISOString().slice(0, 10));
  const [dueAt, setDueAt] = useState(new Date(TODAY.getTime() + 21 * 86400000).toISOString().slice(0, 10));
  const [target, setTarget] = useState(presetType === "label_update" ? 100 : 90);
  const published = s.courses.filter((c) => live(c));
  const startsLater = startAt > TODAY.toISOString().slice(0, 10);

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6">
      <Link href="/trainer/campaigns" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />Campaigns</Link>
      <PageHeading title="New campaign" description={type === "label_update" ? "Everyone certified on the old version recertifies on the new one by the due date." : "Group courses, an audience and a deadline, and track readiness against a target."} />
      <Card title="What">
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(TYPE_META) as Campaign["type"][]).map((t) => {
            const Icon = TYPE_META[t].icon;
            return (
              <button key={t} type="button" aria-pressed={type === t} onClick={() => setType(t)}
                className={`squircle flex items-center gap-3 rounded-panel border p-3.5 text-left ${type === t ? "border-brand bg-tint" : "border-hair-2 hover:bg-subtle"}`}>
                <Icon className="size-5 text-brand-deep" aria-hidden="true" /><span className="text-body-lg font-semibold">{TYPE_META[t].label}</span>
              </button>
            );
          })}
        </div>
        <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Q1 onboarding cohort" />
        <div className="flex flex-col gap-2">
          <Text size="label" weight="semibold" tone="muted">Courses (published only)</Text>
          <div className="flex flex-wrap gap-2">{published.map((c) => <Chip key={c.id} size="lg" selected={courseIds.includes(c.id)} onClick={() => setCourseIds(courseIds.includes(c.id) ? courseIds.filter((x) => x !== c.id) : [...courseIds, c.id])}>{c.title}</Chip>)}</div>
        </div>
      </Card>
      <Card title="Who"><AudienceBuilder rules={rules} onChange={setRules} /></Card>
      <Card title="When">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Starts" type="date" value={startAt} onChange={(e) => setStartAt(e.target.value)} hint={startsLater ? "Courses are assigned on this date." : "Courses are assigned as soon as you start."} />
          <Field label="Due" type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          <Field label="Target certified %" type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
        </div>
      </Card>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={() => router.push("/trainer/campaigns")}>Cancel</Button>
        <Button size="lg" disabled={!name.trim() || !courseIds.length} onClick={() => {
          const cid = s.createCampaign({ name, type, courseIds, audience: rules, startAt, dueAt, target });
          if (startsLater) showToast(`Scheduled · assigns on ${fmtDate(startAt, true)}`);
          else showToast(startedMessage(s.startCampaign(cid)));
          window.setTimeout(() => router.push(`/trainer/campaigns/${cid}`), 800);
        }}>{startsLater ? "Schedule campaign" : "Start campaign"}</Button>
      </div>
      <Toast message={message} open={open} />
    </div>
  );
}
