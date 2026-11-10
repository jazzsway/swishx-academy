"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Search, UserPlus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useApp } from "@/store/app-store";
import { ASSIGN_LABEL, ASSIGN_TAG, fmtDate, isOverdue, opensLater, pct } from "@/store/selectors";
import type { Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { DataTable } from "@/components/patterns/data-table";
import { Avatar, Card, Meter, Stat } from "@/components/patterns/academy";
import { pinnedFirst } from "@/features/shared/people";
import { useCourse } from "./use-course";

type Status = "scheduled" | "not_started" | "in_progress" | "overdue" | "certified";
const STATUS: Record<Status, { label: string; tone: "default" | "brand" | "danger" | "ok" | "warn" }> = {
  scheduled: { label: "Scheduled", tone: "default" }, not_started: { label: "Not started", tone: "warn" },
  in_progress: { label: "In progress", tone: "brand" }, overdue: { label: "Overdue", tone: "danger" }, certified: { label: "Certified", tone: "ok" },
};

/** One person's standing on this course, in the words a trainer uses. */
function statusOf(p: Progress): Status {
  if (p.state === "certified") return "certified";
  if (opensLater(p)) return "scheduled";
  if (isOverdue(p)) return "overdue";
  return p.state === "not_started" ? "not_started" : "in_progress";
}

const score = (p: Progress) => p.attempts.filter((a) => a.passed).at(-1)?.overall ?? p.attempts.at(-1)?.overall;

/**
 * Who a course reached and how far they got: the funnel from assigned to certified,
 * every assignment made over time, and everyone on it, with their status.
 */
export function CoursePeople() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const data = useCourse(id);
  const s = useApp();
  const [status, setStatus] = useState<Status | "all">("all");
  const [q, setQ] = useState("");
  const ps = useMemo(() => s.progress.filter((p) => p.courseId === id), [s.progress, id]);
  const users = useMemo(() => new Map(s.users.map((u) => [u.id, u])), [s.users]);
  if (!data) return null;
  const { course, lv } = data;
  const personalised = course.type === "personalised";

  const counts = Object.fromEntries((Object.keys(STATUS) as Status[]).map((k) => [k, ps.filter((p) => statusOf(p) === k).length])) as Record<Status, number>;
  const started = ps.filter((p) => p.state !== "not_started" || p.certifiedAt).length;
  const tested = ps.filter((p) => (personalised ? p.attempts.length > 0 : !!p.attestedAt) || p.state === "certified").length;
  const scores = ps.map(score).filter((x): x is number => x !== undefined);
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : undefined;
  const funnel = [
    { label: "Assigned", n: ps.length },
    { label: "Started", n: started },
    { label: personalised ? "Took the final assessment" : "Finished and signed", n: tested },
    { label: "Certified", n: counts.certified },
  ];

  /* Every time the course was handed out: same day, same type, same start = one assignment. Due dates can differ per person. */
  const batches = useMemo(() => {
    const m = new Map<string, Progress[]>();
    for (const p of ps) {
      const k = [p.assignedAt, p.assignType, p.startsAt ?? ""].join("|");
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    return [...m.values()].sort((a, b) => b[0].assignedAt.localeCompare(a[0].assignedAt));
  }, [ps]);

  const rows = ps
    .filter((p) => status === "all" || statusOf(p) === status)
    .filter((p) => !q.trim() || `${users.get(p.userId)?.name} ${users.get(p.userId)?.territory}`.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => pinnedFirst(users.get(a.userId)!, users.get(b.userId)!));

  if (!ps.length) {
    return (
      <Card>
        <Text size="subhead" weight="bold">Nobody has this course yet</Text>
        <Text tone="subtle">{lv ? "Assign it to a team, a region or named reps, and their progress shows up here." : "Publish it first, then assign it."}</Text>
        {lv && <Link href={`/trainer/courses/${id}/assign`} className="self-start text-body-lg font-semibold text-brand-deep hover:underline">Assign it</Link>}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="From assigned to certified" eyebrow={`${ps.length} people · ${pct(counts.certified, ps.length)}% certified`}>
          <div className="flex flex-col gap-3">
            {funnel.map((f) => (
              <div key={f.label} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-3 text-body"><span>{f.label}</span><span className="tabular-nums"><strong>{f.n}</strong> <span className="text-ink-3">· {pct(f.n, ps.length)}%</span></span></div>
                <Meter value={pct(f.n, ps.length)} tone={f.label === "Certified" ? "ok" : "brand"} label={`${f.label} ${pct(f.n, ps.length)}%`} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Right now" padded>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="In progress" value={counts.in_progress} />
            <Stat label="Not started" value={counts.not_started} tone={counts.not_started ? "warn" : "default"} />
            <Stat label="Overdue" value={counts.overdue} tone={counts.overdue ? "danger" : "default"} />
            <Stat label="Scheduled" value={counts.scheduled} sub={counts.scheduled ? "Opens later" : undefined} />
            {avg !== undefined && <Stat label={personalised ? "Average final score" : "Average score"} value={`${avg}%`} />}
          </div>
        </Card>
      </div>

      <Card title="Assignment history" eyebrow={`${batches.length} assignment${batches.length === 1 ? "" : "s"}, newest first`}
        actions={lv && <Link href={`/trainer/courses/${id}/assign`} className="flex items-center gap-1.5 text-body-lg font-semibold text-brand-deep hover:underline"><UserPlus className="size-4" aria-hidden="true" />Assign more people</Link>}>
        <ul className="flex flex-col">
          {batches.map((b) => {
            const f = b[0];
            const done = b.filter((p) => p.state === "certified").length;
            const dues = b.map((p) => p.dueAt).filter((d): d is string => !!d).sort();
            const dueText = !dues.length ? (f.assignType === "self" ? " · picked from the Library" : "") : dues[0] === dues.at(-1) ? ` · due ${fmtDate(dues[0])}` : ` · due ${fmtDate(dues[0])} to ${fmtDate(dues.at(-1))}`;
            return (
              <li key={`${f.assignedAt}${f.assignType}${f.startsAt}`} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-hair py-3 last:border-0">
                <span className="flex min-w-0 flex-1 basis-[240px] flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Text size="body-lg" weight="semibold">{fmtDate(f.assignedAt, true)}</Text>
                    <Chip size="xs" tone={ASSIGN_TAG[f.assignType].tone}>{ASSIGN_LABEL[f.assignType]}</Chip>
                  </span>
                  <Text size="caption" tone="subtle">
                    {b.length} {b.length === 1 ? "person" : "people"}{f.startsAt ? ` · opens ${fmtDate(f.startsAt)}` : ""}{dueText}
                  </Text>
                </span>
                <span className="flex w-full items-center gap-2.5 sm:w-56">
                  <Meter value={pct(done, b.length)} tone="ok" label={`${pct(done, b.length)}% certified`} />
                  <Text size="caption" tone="subtle" tabular className="w-24 shrink-0 text-right">{done} of {b.length} certified</Text>
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full max-w-[280px]"><Field iconLeft={<Search className="size-4" />} placeholder="Search people" aria-label="Search people" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
            <Chip size="md" selected={status === "all"} onClick={() => setStatus("all")}>All · {ps.length}</Chip>
            {(Object.keys(STATUS) as Status[]).filter((k) => counts[k]).map((k) => (
              <Chip key={k} size="md" selected={status === k} onClick={() => setStatus(k)}>{STATUS[k].label} · {counts[k]}</Chip>
            ))}
          </div>
        </div>
        <DataTable<Progress>
          rows={rows.slice(0, 200)}
          rowKey={(p) => p.id}
          onRowClick={(p) => router.push(`/trainer/people/${p.userId}`)}
          empty="Nobody matches."
          columns={[
            { key: "who", header: "Person", cell: (p) => { const u = users.get(p.userId); return (
              <span className="flex items-center gap-2.5 py-1"><Avatar initials={u?.initials ?? "?"} size={30} /><span className="flex min-w-0 flex-col"><Text size="body" weight="semibold" truncate>{u?.name}</Text><Text size="micro" tone="subtle" truncate>{s.districts.find((d) => d.id === u?.districtId)?.name ?? u?.territory}</Text></span></span>); } },
            { key: "how", header: "How assigned", cell: (p) => <Chip size="xs" tone={ASSIGN_TAG[p.assignType].tone}>{ASSIGN_LABEL[p.assignType]}</Chip> },
            { key: "status", header: "Status", cell: (p) => { const st = STATUS[statusOf(p)]; return <Chip size="sm" tone={st.tone}>{st.label}</Chip>; } },
            { key: "assigned", header: "Assigned", secondary: true, cell: (p) => fmtDate(p.assignedAt) },
            { key: "due", header: "Due", cell: (p) => <span className={cn(isOverdue(p) && "font-semibold text-danger")}>{opensLater(p) ? `Opens ${fmtDate(p.startsAt)}` : p.dueAt ? fmtDate(p.dueAt) : "—"}</span> },
            { key: "score", header: "Score", numeric: true, cell: (p) => (score(p) !== undefined ? `${score(p)}%` : "—") },
            { key: "cert", header: "Certified", secondary: true, cell: (p) => (p.certifiedAt ? fmtDate(p.certifiedAt) : "—") },
          ]}
        />
        {rows.length > 200 && <Text size="caption" tone="subtle">Showing 200 of {rows.length}. Search or filter to narrow it.</Text>}
      </div>
    </div>
  );
}
