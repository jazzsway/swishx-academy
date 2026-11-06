"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useApp, current, live } from "@/store/app-store";
import { counts, daysFromToday, fmtDate, pct } from "@/store/selectors";
import { product } from "@/data/org";
import { courseMinutes } from "@/lib/learning";
import { PageHeading } from "@/components/patterns/page-heading";
import { DataTable } from "@/components/patterns/data-table";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Text } from "@/components/ui/text";
import { VersionChip } from "@/components/patterns/academy";
import type { Course } from "@/data/types";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "live", label: "Published" },
  { id: "review", label: "In review" },
  { id: "draft", label: "Drafts" },
  { id: "expiring", label: "Expiring soon" },
] as const;

export function CourseCatalogue() {
  const router = useRouter();
  const courses = useApp((s) => s.courses);
  const progress = useApp((s) => s.progress);
  const [q, setQ] = useState("");
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("all");

  const expiring = (c: Course) => {
    const lv = live(c);
    return !!lv?.expiresAt && daysFromToday(lv.expiresAt) <= 30;
  };
  const rows = courses.filter((c) => {
    if (q && !c.title.toLowerCase().includes(q.toLowerCase())) return false;
    const st = current(c).state;
    if (f === "live") return !!live(c);
    if (f === "review") return st === "in_review" || st === "changes" || st === "ready";
    if (f === "draft") return st === "draft";
    if (f === "expiring") return expiring(c);
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Courses" description="Everything you've built, its MLR status, and how many reps are certified on it."
        actions={<Button size="lg" onClick={() => router.push("/trainer/courses/new")}><Plus className="size-4" aria-hidden="true" />Create course</Button>} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-[320px]"><Field iconLeft={<Search className="size-4" />} placeholder="Search courses" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" /></div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((x) => <Chip key={x.id} size="lg" selected={f === x.id} onClick={() => setF(x.id)}>{x.label}</Chip>)}
        </div>
      </div>
      <DataTable<Course>
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => router.push(`/trainer/courses/${c.id}`)}
        empty="No courses match."
        columns={[
          { key: "title", header: "Course", cell: (c) => (
            <div className="flex flex-col gap-0.5 py-1">
              <Text size="body-lg" weight="semibold">{c.title}</Text>
              <Text size="caption" tone="subtle">{product(c.productId)?.brand ?? "Company"} · {c.format === "long" ? "Long-form" : "Short"} · {c.type === "personalised" ? "Personalised" : "Linear"} · {courseMinutes(c)} min</Text>
            </div>) },
          { key: "state", header: "Current version", cell: (c) => {
            const v = current(c);
            return <div className="flex items-center gap-2"><Text size="body" weight="semibold">v{v.version}</Text><VersionChip state={v.state} expiring={v.state === "published" && expiring(c)} /></div>;
          } },
          { key: "doc", header: "Live doc", secondary: true, cell: (c) => { const lv = live(c); return lv ? <span className="font-mono text-body">{lv.docNumber}</span> : <Text tone="faint">—</Text>; } },
          { key: "exp", header: "Expires", secondary: true, cell: (c) => { const lv = live(c); return lv?.expiresAt ? <Text tone={expiring(c) ? "warn" : "muted"} weight={expiring(c) ? "semibold" : undefined}>{fmtDate(lv.expiresAt, true)}</Text> : "—"; } },
          { key: "assigned", header: "Assigned", numeric: true, cell: (c) => progress.filter((p) => p.courseId === c.id).length || "—" },
          { key: "cert", header: "Certified", numeric: true, cell: (c) => { const ps = progress.filter((p) => p.courseId === c.id); return ps.length ? `${pct(counts(ps).certified, ps.length)}%` : "—"; } },
          { key: "upd", header: "Updated", secondary: true, cell: (c) => fmtDate(c.updatedAt) },
        ]}
      />
    </div>
  );
}
