"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { useApp } from "@/store/app-store";
import { bucketOf, fmtDate, isOverdue, STATE_LABEL, type Bucket } from "@/store/selectors";
import { REGIONS } from "@/data/org";
import type { Progress } from "@/data/types";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { PageHeading } from "@/components/patterns/page-heading";
import { DataTable } from "@/components/patterns/data-table";
import { Avatar, ProgressChip } from "@/components/patterns/academy";

/** TR-1/TR-2: audit-ready training records with version and doc number on every row. */
export function Records() {
  const router = useRouter();
  const search = useSearchParams();
  const s = useApp();
  const [courseId, setCourseId] = useState(search.get("course") ?? "c-lumora-launch");
  const [bucket, setBucket] = useState<Bucket | "all">((search.get("bucket") as Bucket) ?? "all");
  const [state, setState] = useState(search.get("state") ?? "all");
  const [region, setRegion] = useState("all");
  const [q, setQ] = useState("");
  const byUser = useMemo(() => new Map(s.users.map((u) => [u.id, u])), [s.users]);
  const course = s.courses.find((c) => c.id === courseId)!;

  const rows = s.progress.filter((p) => {
    const u = byUser.get(p.userId);
    if (!u || p.courseId !== courseId) return false;
    if (bucket !== "all" && bucketOf(p) !== bucket) return false;
    if (state !== "all" && p.state !== state) return false;
    if (region !== "all" && u.regionId !== region) return false;
    if (q && !u.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => byUser.get(a.userId)!.name.localeCompare(byUser.get(b.userId)!.name));

  const doc = (p: Progress) => course.versions.find((v) => v.version === p.version)?.docNumber ?? "—";

  function exportCsv() {
    const head = ["Rep", "Email", "District", "Course", "Version", "Doc number", "State", "Assigned", "Due", "Screening", "Attempts", "Final score", "Verified by", "Attested", "Certified", "Valid until"];
    const lines = rows.map((p) => {
      const u = byUser.get(p.userId)!;
      const last = p.attempts.at(-1);
      return [u.name, u.email, s.districts.find((d) => d.id === u.districtId)?.name ?? "", course.title, `v${p.version}`, doc(p), STATE_LABEL[p.state], p.assignedAt, p.dueAt ?? "", p.screening?.overall ?? "", p.attempts.length, last?.overall ?? "", byUser.get(p.verify?.by ?? "")?.name ?? "", p.attestedAt?.slice(0, 10) ?? "", p.certifiedAt ?? "", p.certExpiresAt ?? ""]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",");
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
    a.download = `${course.id}-training-records.csv`;
    a.click();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Training records" description="Who was trained on which approved version, when, with what score. Records can't be edited; corrections are new events."
        actions={<Button variant="secondary" onClick={exportCsv}><Download className="size-4" aria-hidden="true" />Export CSV</Button>} />
      <div className="flex flex-wrap items-center gap-3">
        <select aria-label="Course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg font-semibold">
          {s.courses.filter((c) => s.progress.some((p) => p.courseId === c.id)).map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select aria-label="Region" value={region} onChange={(e) => setRegion(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
          <option value="all">All regions</option>{REGIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select aria-label="Stage" value={state} onChange={(e) => setState(e.target.value)} className="h-11 rounded-control border border-hair-2 bg-card px-3 text-body-lg">
          <option value="all">Any stage</option>{Object.entries(STATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div className="w-full max-w-[260px]"><Field iconLeft={<Search className="size-4" />} placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search people" /></div>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["all", "certified", "in_progress", "not_started", "overdue"] as const).map((b) => (
          <Chip key={b} size="lg" selected={bucket === b} onClick={() => setBucket(b)}>{b === "all" ? "Everyone" : b.replace("_", " ").replace(/^./, (x) => x.toUpperCase())}</Chip>
        ))}
        <Text size="body" tone="subtle" className="self-center pl-2">{rows.length} records</Text>
      </div>
      <DataTable<Progress>
        rows={rows.slice(0, 200)}
        rowKey={(p) => p.id}
        onRowClick={(p) => router.push(`/trainer/people/${p.userId}?course=${p.courseId}`)}
        columns={[
          { key: "rep", header: "Rep", cell: (p) => { const u = byUser.get(p.userId)!; return <div className="flex items-center gap-2.5"><Avatar initials={u.initials} size={30} /><div className="flex flex-col"><span className="font-semibold text-ink">{u.name}</span><span className="text-caption text-ink-3">{s.districts.find((d) => d.id === u.districtId)?.name}</span></div></div>; } },
          { key: "ver", header: "Version", cell: (p) => <span className="font-mono text-body">v{p.version} · {doc(p)}</span> },
          { key: "st", header: "Stage", cell: (p) => <ProgressChip state={p.state} overdue={isOverdue(p)} label={STATE_LABEL[p.state]} /> },
          { key: "scr", header: "Screening", numeric: true, secondary: true, cell: (p) => p.screening?.overall ?? "—" },
          { key: "fin", header: "Final", numeric: true, cell: (p) => p.attempts.filter((a) => a.passed).at(-1)?.overall ?? "—" },
          { key: "att", header: "Attempts", numeric: true, secondary: true, cell: (p) => p.attempts.length || "—" },
          { key: "cert", header: "Certified", cell: (p) => fmtDate(p.certifiedAt, true) },
          { key: "due", header: "Due", secondary: true, cell: (p) => <span className={isOverdue(p) ? "font-semibold text-danger" : undefined}>{fmtDate(p.dueAt)}</span> },
        ]}
      />
      {rows.length > 200 && <Text size="caption" tone="subtle">Showing 200 of {rows.length}. Export for the full list.</Text>}
      <Link href="/trainer/verify" className="self-start text-body font-semibold text-brand-deep hover:underline">Verifications waiting on managers</Link>
    </div>
  );
}
