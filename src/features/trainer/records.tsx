"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { useApp } from "@/store/app-store";
import { bucketOf, fmtDate, isOverdue, STATE_LABEL, ASSIGN_LABEL, type Bucket } from "@/store/selectors";
import { REGIONS } from "@/data/org";
import type { Progress, User } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { PageHeading } from "@/components/patterns/page-heading";
import { DataTable } from "@/components/patterns/data-table";
import { Avatar, ProgressChip } from "@/components/patterns/academy";

/** Most urgent first: overdue, in progress, not started, certified. */
const URGENCY: Record<Bucket, number> = { overdue: 0, in_progress: 1, not_started: 2, certified: 3 };
const mostUrgent = (ps: Progress[]) => [...ps].sort((a, b) => URGENCY[bucketOf(a)] - URGENCY[bucketOf(b)] || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))[0];

interface PersonRow { u: User; ps: Progress[]; urgent: Progress }

/**
 * Everyone in the Academy, one row per person; open a person to see their courses.
 * Picking a course shows that course's columns. The CSV stays one line per person per course, for audits.
 */
export function Records() {
  const router = useRouter();
  const search = useSearchParams();
  const s = useApp();
  const [courseId, setCourseId] = useState(search.get("course") ?? "all");
  const [bucket, setBucket] = useState<Bucket | "all">((search.get("bucket") as Bucket) ?? "all");
  const [state, setState] = useState(search.get("state") ?? "all");
  const [region, setRegion] = useState("all");
  const [q, setQ] = useState("");
  const courseOf = (p: Progress) => s.courses.find((c) => c.id === p.courseId)!;
  const one = courseId !== "all";

  const people = useMemo(() => {
    const byUser = new Map<string, Progress[]>();
    for (const p of s.progress) if (!one || p.courseId === courseId) byUser.set(p.userId, [...(byUser.get(p.userId) ?? []), p]);
    const out: PersonRow[] = [];
    for (const u of s.users) {
      const ps = byUser.get(u.id);
      if (!ps?.length) continue;
      if (region !== "all" && u.regionId !== region) continue;
      if (q && !u.name.toLowerCase().includes(q.toLowerCase())) continue;
      if (state !== "all" && !ps.some((p) => p.state === state)) continue;
      const urgent = mostUrgent(ps);
      if (bucket !== "all" && bucketOf(urgent) !== bucket) continue;
      out.push({ u, ps, urgent });
    }
    return out.sort((a, b) => a.u.name.localeCompare(b.u.name));
  }, [s.progress, s.users, one, courseId, region, q, state, bucket]);

  const doc = (p: Progress) => courseOf(p).versions.find((v) => v.version === p.version)?.docNumber ?? "—";
  const district = (u: User) => s.districts.find((d) => d.id === u.districtId)?.name ?? "";

  function exportCsv() {
    const head = ["Rep", "Email", "District", "Course", "How assigned", "Version", "Doc number", "State", "Assigned", "Due", "Screening", "Attempts", "Final score", "Verified by", "Attested", "Certified", "Valid until"];
    const lines = people.flatMap(({ u, ps }) => ps.map((p) => {
      const last = p.attempts.at(-1);
      return [u.name, u.email, district(u), courseOf(p).title, ASSIGN_LABEL[p.assignType], `v${p.version}`, doc(p), STATE_LABEL[p.state], p.assignedAt, p.dueAt ?? "", p.screening?.overall ?? "", p.attempts.length, last?.overall ?? "", s.users.find((x) => x.id === p.verify?.by)?.name ?? "", p.attestedAt?.slice(0, 10) ?? "", p.certifiedAt ?? "", p.certExpiresAt ?? ""]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",");
    }));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    a.download = `${one ? courseId : "all-courses"}-training-records.csv`;
    a.click();
  }

  const rep = { key: "rep", header: "Person", cell: ({ u }: PersonRow) => <div className="flex items-center gap-2.5"><Avatar initials={u.initials} size={30} /><div className="flex flex-col"><span className="font-semibold text-ink">{u.name}</span><span className="text-caption text-ink-3">{district(u)}</span></div></div> };
  const columns = one
    ? [
        rep,
        { key: "ver", header: "Version", secondary: true, cell: ({ urgent: p }: PersonRow) => <span className="font-mono text-body">v{p.version} · {doc(p)}</span> },
        { key: "st", header: "Stage", cell: ({ urgent: p }: PersonRow) => <ProgressChip state={p.state} overdue={isOverdue(p)} label={STATE_LABEL[p.state]} /> },
        { key: "scr", header: "Screening", numeric: true, secondary: true, cell: ({ urgent: p }: PersonRow) => p.screening?.overall ?? "—" },
        { key: "fin", header: "Final", numeric: true, cell: ({ urgent: p }: PersonRow) => p.attempts.filter((a) => a.passed).at(-1)?.overall ?? "—" },
        { key: "cert", header: "Certified", cell: ({ urgent: p }: PersonRow) => fmtDate(p.certifiedAt, true) },
        { key: "due", header: "Due", secondary: true, cell: ({ urgent: p }: PersonRow) => <span className={isOverdue(p) ? "font-semibold text-danger" : undefined}>{fmtDate(p.dueAt)}</span> },
      ]
    : [
        rep,
        { key: "courses", header: "Courses", cell: ({ ps }: PersonRow) => <span className="tabular-nums">{ps.filter((p) => p.state === "certified").length} of {ps.length} certified</span> },
        { key: "urgent", header: "Needs attention", cell: ({ ps, urgent }: PersonRow) => urgent.state === "certified"
            ? <Chip size="sm" tone="ok">All certified</Chip>
            : <div className="flex flex-col items-start gap-1"><ProgressChip state={urgent.state} overdue={isOverdue(urgent)} label={STATE_LABEL[urgent.state]} /><span className="text-caption text-ink-3">{courseOf(urgent).title}{ps.filter((p) => p.state !== "certified").length > 1 ? ` +${ps.filter((p) => p.state !== "certified").length - 1} more` : ""}</span></div> },
        { key: "due", header: "Next due", secondary: true, cell: ({ urgent }: PersonRow) => urgent.state === "certified" ? <span className="text-ink-3">—</span> : <span className={isOverdue(urgent) ? "font-semibold text-danger" : undefined}>{fmtDate(urgent.dueAt)}</span> },
      ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Training records" description="Everyone in the Academy and where they are. Open a person to see each course, its approved version and the full audit trail."
        actions={<Button variant="secondary" onClick={exportCsv}><Download className="size-4" aria-hidden="true" />Export CSV</Button>} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-[260px]"><Field iconLeft={<Search className="size-4" />} placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" /></div>
        <select aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
          <option value="all">All courses</option>
          {s.courses.filter((c) => s.progress.some((p) => p.courseId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
          <option value="all">All regions</option>{REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select aria-label="Stage" value={state} onChange={(e) => setState(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
          <option value="all">Any stage</option>{Object.entries(STATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "certified", "in_progress", "not_started", "overdue"] as const).map((b) => (
          <Chip key={b} size="lg" selected={bucket === b} onClick={() => setBucket(b)}>{b === "all" ? "Everyone" : b === "certified" && !one ? "All certified" : b.replace("_", " ").replace(/^./, (x) => x.toUpperCase())}</Chip>
        ))}
        <Text size="body" tone="subtle" className="self-center pl-2">{people.length} {people.length === 1 ? "person" : "people"}{one ? ` on ${s.courses.find((c) => c.id === courseId)?.title}` : ""}</Text>
      </div>
      <DataTable<PersonRow>
        rows={people.slice(0, 200)}
        rowKey={(r) => r.u.id}
        onRowClick={(r) => router.push(`/trainer/people/${r.u.id}`)}
        columns={columns}
      />
      {people.length > 200 && <Text size="caption" tone="subtle">Showing 200 of {people.length}. Search or filter to narrow it, or export the full list.</Text>}
      <Link href="/trainer/verify" className="self-start text-body font-semibold text-brand-deep hover:underline">Verifications waiting on managers</Link>
    </div>
  );
}
