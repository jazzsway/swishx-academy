"use client";

import type { Progress, User } from "@/data/types";
import type { AppState } from "@/store/app-store";
import { bucketOf, fmtDate, isOverdue, STATE_LABEL, type Bucket } from "@/store/selectors";
import { Chip } from "@/components/ui/chip";
import { DataTable } from "@/components/patterns/data-table";
import { Avatar, ProgressChip } from "@/components/patterns/academy";

/** Priya is the rep you can sign in as, so she leads every people list. */
export const PINNED_REP = "u-priya";
export const pinnedFirst = (a: User, b: User) => Number(b.id === PINNED_REP) - Number(a.id === PINNED_REP) || a.name.localeCompare(b.name);

/** Most urgent first: overdue, in progress, not started, certified. */
const URGENCY: Record<Bucket, number> = { overdue: 0, in_progress: 1, not_started: 2, certified: 3 };
export const mostUrgent = (ps: Progress[]) => [...ps].sort((a, b) => URGENCY[bucketOf(a)] - URGENCY[bucketOf(b)] || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))[0];

export interface PersonRow { u: User; ps: Progress[]; urgent: Progress }

export function personRows(s: AppState, users: User[], courseId?: string): PersonRow[] {
  return users.map((u) => {
    const ps = s.progress.filter((p) => p.userId === u.id && (!courseId || p.courseId === courseId));
    return ps.length ? { u, ps, urgent: mostUrgent(ps) } : null;
  }).filter(Boolean).sort((a, b) => pinnedFirst(a!.u, b!.u)) as PersonRow[];
}

/** One row per person across all their courses. Used by trainer Records and the manager's Team. */
export function PeopleTable({ s, rows, onOpen, sub }: { s: AppState; rows: PersonRow[]; onOpen: (r: PersonRow) => void; sub: (u: User) => string }) {
  const title = (p: Progress) => s.courses.find((c) => c.id === p.courseId)?.title ?? p.courseId;
  return (
    <DataTable<PersonRow>
      rows={rows}
      rowKey={(r) => r.u.id}
      onRowClick={onOpen}
      columns={[
        { key: "rep", header: "Person", cell: ({ u }) => <div className="flex items-center gap-2.5"><Avatar initials={u.initials} size={30} /><div className="flex flex-col"><span className="font-semibold text-ink">{u.name}{u.id === PINNED_REP && s.presenter && <Chip size="xs" tone="brand" className="ml-2 align-middle">Demo rep</Chip>}</span><span className="text-caption text-ink-3">{sub(u)}</span></div></div> },
        { key: "courses", header: "Courses", cell: ({ ps }) => <span className="tabular-nums">{ps.filter((p) => p.state === "certified").length} of {ps.length} certified</span> },
        { key: "urgent", header: "Needs attention", cell: ({ ps, urgent }) => urgent.state === "certified"
            ? <Chip size="sm" tone="ok">All certified</Chip>
            : <div className="flex flex-col items-start gap-1"><ProgressChip state={urgent.state} overdue={isOverdue(urgent)} label={STATE_LABEL[urgent.state]} /><span className="text-caption text-ink-3">{title(urgent)}{ps.filter((p) => p.state !== "certified").length > 1 ? ` +${ps.filter((p) => p.state !== "certified").length - 1} more` : ""}</span></div> },
        { key: "due", header: "Next due", secondary: true, cell: ({ urgent }) => urgent.state === "certified" ? <span className="text-ink-3">—</span> : <span className={isOverdue(urgent) ? "font-semibold text-danger" : undefined}>{fmtDate(urgent.dueAt)}</span> },
      ]}
    />
  );
}
