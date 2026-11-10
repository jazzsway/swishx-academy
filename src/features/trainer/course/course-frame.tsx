"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Lock, PencilLine } from "lucide-react";
import { useApp } from "@/store/app-store";
import { fmtDate } from "@/store/selectors";
import { product } from "@/data/org";
import { courseMinutes } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { TabNav } from "@/components/patterns/tab-nav";
import { VersionChip } from "@/components/patterns/academy";
import { useCourse } from "./use-course";
import { questionCount } from "./question-index";

export function CourseFrame({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const router = useRouter();
  const data = useCourse(id);
  const startNewVersion = useApp((s) => s.startNewVersion);
  if (!data) return <Text tone="subtle">Course not found. <Link href="/trainer/courses" className="text-brand-deep underline">Back to courses</Link></Text>;
  const { course, cur, lv } = data;
  const base = `/trainer/courses/${id}`;
  const tabs = [
    { id: "content", label: "Content", href: base },
    { id: "questions", label: "Questions", href: `${base}/questions`, badge: questionCount(course) || undefined },
    ...(course.type === "personalised" ? [{ id: "roleplay", label: "AI roleplay", href: `${base}/roleplay`, badge: course.scenarioIds.length || undefined }] : []),
    { id: "settings", label: "Settings", href: `${base}/settings` },
    { id: "people", label: "People & progress", href: `${base}/people` },
    // v1-hidden: { id: "preview", label: "Preview as rep", href: `${base}/preview` },
    { id: "review", label: "Publish & versions", href: `${base}/review` },
  ];
  const active = tabs.find((t) => t.href !== base && pathname.startsWith(t.href))?.id ?? "content";

  const primary: Record<string, { label: string; go: () => void }> = {
    /* v1-hidden: MLR steps (Mark as submitted, Record MLR decision, Fix MLR comments). Every draft state publishes. */
    draft: { label: "Publish", go: () => router.push(`${base}/review`) },
    ready: { label: "Publish", go: () => router.push(`${base}/review`) },
    in_review: { label: "Publish", go: () => router.push(`${base}/review`) },
    changes: { label: "Publish", go: () => router.push(`${base}/review`) },
    approved: { label: "Publish", go: () => router.push(`${base}/review`) },
    published: { label: "Assign", go: () => router.push(`${base}/assign`) },
  };
  const p = primary[cur.state];

  return (
    <div className="flex flex-col gap-5">
      <Link href="/trainer/courses" className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden="true" />Courses
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Text as="h1" size="display-lg" weight="extrabold" tracking="tight">{course.title}</Text>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-body text-ink-3">
            <span className="font-semibold text-ink">v{cur.version}</span>
            <VersionChip state={cur.state} />
            {lv && lv.version !== cur.version && <span>· v{lv.version} live</span>}
            <span>· {product(course.productId)?.brand ?? "Company"}{course.scope?.indications.length ? ` (${course.scope.indications.join(" + ")})` : course.scope?.variants.length ? ` (${course.scope.variants.join(", ")})` : ""} · {course.format === "long" ? "Long" : "Short"} · {course.type === "personalised" ? "Personalised" : "Same for everyone"} · {courseMinutes(course)} min</span>
            <span>· updated {fmtDate(course.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {cur.state === "published" && (
            <Button variant="secondary" onClick={() => { startNewVersion(course.id); router.push(base); }}>
              <PencilLine className="size-4" aria-hidden="true" />Edit as v{cur.version + 1}
            </Button>
          )}
          {lv && cur.state !== "published" && <Button variant="secondary" onClick={() => router.push(`${base}/assign`)}>Assign v{lv.version}</Button>}
          {p && <Button onClick={p.go}>{p.label}</Button>}
        </div>
      </div>
      <TabNav ariaLabel="Course sections" items={tabs} activeId={active} className="self-start max-w-full" />
      {!data.editable && active === "content" && (
        <div className="squircle flex flex-wrap items-center gap-3 rounded-panel border border-hair bg-subtle px-4 py-3">
          <Lock className="size-4 text-ink-3" aria-hidden="true" />
          <Text size="body" tone="muted" className="flex-1">
            {`v${cur.version} is live and locked. Editing creates v${cur.version + 1} as a draft; v${cur.version} stays live until you publish v${cur.version + 1}.`}
          </Text>
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
