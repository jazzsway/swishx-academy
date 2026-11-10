"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Lock, Mic } from "lucide-react";
import { useApp, live, current } from "@/store/app-store";
import { fmtDate, isOverdue, STATE_LABEL, ASSIGN_LABEL, ASSIGN_TAG, daysFromToday } from "@/store/selectors";
import { Chip } from "@/components/ui/chip";
import { COMPETENCIES, competency } from "@/data/org";
import type { Progress, User } from "@/data/types";
import { pathMinutes } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Card, Avatar, ProgressChip, Meter, BandChip, KeyValue, EmptyState } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { TabNav } from "@/components/patterns/tab-nav";
import { CourseProgress } from "./course-progress";
import { BeforeAfter, FocusNext, PersonKpis, ScoreTrend, SkillsThenNow } from "./person-overview";

/** Needs attention first: overdue, coaching, waiting, in progress, not started, certified. */
function rank(p: Progress) {
  if (isOverdue(p)) return 0;
  return ({ needs_coaching: 1, awaiting_verify: 2, remediation: 3, assessment: 3, learning: 4, screening: 4, not_started: 5, certified: 6 } as Record<Progress["state"], number>)[p.state];
}

function events(p: Progress, users: Map<string, User>) {
  const e: { at: string; text: string }[] = [{ at: p.assignedAt, text: `Assigned (${ASSIGN_LABEL[p.assignType].toLowerCase()}) · v${p.version}${p.dueAt ? ` · due ${fmtDate(p.dueAt)}` : ""}` }];
  if (p.startedAt) e.push({ at: p.startedAt, text: "Started" });
  if (p.screening) e.push({ at: p.screening.at, text: `Screening completed · ${p.screening.overall}%${p.screening.call ? ` · call ${p.screening.call.score}%` : ""}` });
  if (p.path) e.push({ at: p.path.builtAt, text: `${p.path.kind === "remediation" ? "Retake path" : p.path.kind === "full" ? "Started the full course" : "Personalised path"} · ${p.path.moduleIds.length} modules` });
  p.attempts.forEach((a, i) => e.push({ at: a.at, text: `Assessment attempt ${i + 1} · ${a.overall}% · ${a.passed ? "passed" : `not passed${a.reason ? ` (${a.reason})` : ""}`}` }));
  if (p.attestedAt && p.attestName !== "on file") e.push({ at: p.attestedAt, text: `Attested · typed “${p.attestName}”` });
  if (p.verify) e.push({ at: p.verify.requestedAt, text: "Verification requested" });
  if (p.verify?.at) e.push({ at: p.verify.at, text: `${p.verify.status === "approved" ? "Verified" : "Needs coaching"} by ${users.get(p.verify.by ?? "")?.name ?? "manager"}${p.verify.delegate ? " (as delegate)" : ""}` });
  if (p.certifiedAt) e.push({ at: p.certifiedAt, text: `Certified · valid to ${fmtDate(p.certExpiresAt, true)}` });
  p.coachingNotes.forEach((n) => e.push({ at: n.at, text: `Coaching note from ${users.get(n.by)?.name ?? "manager"}` }));
  return e.sort((a, b) => b.at.localeCompare(a.at));
}

export function RepDetail({ userId, viewer }: { userId: string; viewer: "trainer" | "manager" }) {
  const search = useSearchParams();
  const s = useApp();
  const { message, open, showToast } = useToast();
  const users = new Map(s.users.map((u) => [u.id, u]));
  const u = users.get(userId);
  const mine = s.progress.filter((p) => p.userId === userId);
  /* The person first; a course only when a link asks for one. */
  const [tab, setTab] = useState<string>(search.get("course") ?? "overview");
  const courseId = tab === "overview" ? undefined : tab;
  const sorted = [...mine].sort((a, b) => rank(a) - rank(b));
  const [note, setNote] = useState("");
  if (!u) return <EmptyState title="Person not found" />;
  const p = mine.find((x) => x.courseId === courseId);
  const course = s.courses.find((c) => c.id === courseId);
  const mods = course ? (live(course) ?? current(course)).modules : [];
  const latest = p?.attempts.at(-1)?.competencyScores;
  const me = viewer === "manager" ? "u-david" : "u-maya";
  const shared = s.practice.filter((x) => x.userId === userId && x.shared);
  const back = viewer === "manager" ? "/manager/team" : "/trainer/records";

  /* Activity across every course; the progress analytics live in person-overview. */
  const activity = mine.flatMap((x) => events(x, users).map((e) => ({ ...e, course: s.courses.find((c) => c.id === x.courseId)?.title ?? "" })))
    .sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
  const practiceCard = (
            <Card tone="subtle" padded title="Practice">
      <div className="flex items-start gap-2.5"><Lock className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden="true" />
        <Text size="body" tone="muted">Practice is private. You only see sessions {u.first} chooses to share.</Text></div>
      {viewer === "manager" && shared.map((x) => (
        <Link key={x.id} href={`/manager/shared/${x.id}`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card px-3.5 py-3 hover:bg-tint">
          <Mic className="size-4 text-brand-deep" aria-hidden="true" />
          <div className="flex min-w-0 flex-1 flex-col"><Text size="body" weight="semibold" truncate>{x.title}</Text><Text size="caption" tone="subtle">Shared {fmtDate(x.shared!.at)}{x.result ? ` · ${x.result.score}%` : ""}</Text></div>
        </Link>
      ))}
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      <Link href={back} className="flex items-center gap-1.5 self-start text-body font-semibold text-ink-3 hover:text-ink"><ArrowLeft className="size-4" aria-hidden="true" />{viewer === "manager" ? "Team" : "Teams"}</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar initials={u.initials} size={64} tone="ink" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Text as="h1" size="display-lg" weight="extrabold">{u.name}</Text>
          <Text size="body-lg" tone="subtle">{u.title} · Territory {u.territory} · {s.districts.find((d) => d.id === u.districtId)?.name} district · Manager {users.get(u.managerId ?? "")?.name ?? "—"}</Text>
        </div>
        {p?.state === "awaiting_verify" && (viewer === "manager" || -daysFromToday(p.verify!.requestedAt) > 5) && (
          <Link href={viewer === "manager" ? `/manager/verify/${p.id}` : `/trainer/verify/${p.id}`} className="inline-flex h-10 items-center rounded-control bg-brand px-4 text-body-lg font-semibold text-white hover:bg-brand-deep">
            {viewer === "manager" ? "Review & verify" : "Verify as delegate"}
          </Link>
        )}
      </div>
      <TabNav ariaLabel="Profile sections" activeId={tab} onSelect={setTab} className="self-start max-w-full"
        items={[{ id: "overview", label: "Overview" }, ...sorted.map((x) => ({ id: x.courseId, label: s.courses.find((c) => c.id === x.courseId)?.title ?? x.courseId }))]} />

      {tab === "overview" && (
        <div className="flex flex-col gap-5">
          <PersonKpis s={s} mine={mine} />
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-5">
              <BeforeAfter s={s} mine={mine} first={u.first} onOpen={setTab} />
              <SkillsThenNow s={s} mine={mine} />
              <Card title="Assigned courses" eyebrow={`${mine.length} course${mine.length === 1 ? "" : "s"} · ${mine.filter((x) => x.state === "certified").length} certified${mine.some(isOverdue) ? ` · ${mine.filter(isOverdue).length} overdue` : ""}`}>
                <ul className="-mx-2 flex flex-col">
                  {sorted.map((x) => {
                    const c = s.courses.find((y) => y.id === x.courseId);
                    const cmp = s.campaigns.find((y) => y.id === x.campaignId);
                    return (
                      <li key={x.id}>
                        <button type="button" onClick={() => setTab(x.courseId)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 rounded-panel px-2 py-3 text-left transition-colors hover:bg-subtle">
                          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="flex min-w-0 items-center gap-2">
                              <Text size="body-lg" weight="semibold" truncate>{c?.title ?? x.courseId}</Text>
                              <Chip size="xs" tone={ASSIGN_TAG[x.assignType].tone}>{ASSIGN_LABEL[x.assignType]}</Chip>
                            </span>
                            <Text size="caption" tone="subtle">{cmp && cmp.name !== c?.title ? `Part of ${cmp.name}` : ASSIGN_TAG[x.assignType].from}</Text>
                          </span>
                          <Text size="body" tone={isOverdue(x) ? "danger" : "subtle"} className="shrink-0" tabular>
                            {x.state === "certified" ? `Valid to ${fmtDate(x.certExpiresAt, true)}` : x.dueAt ? `${isOverdue(x) ? "Was due" : "Due"} ${fmtDate(x.dueAt, true)}` : "No due date"}
                          </Text>
                          <span className="w-[150px] shrink-0 text-right"><ProgressChip state={x.state} overdue={isOverdue(x)} label={STATE_LABEL[x.state]} size="sm" /></span>
                          <ChevronRight className="size-4 shrink-0 text-ink-4" aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>

            </div>
            <aside className="flex flex-col gap-4 xl:sticky xl:top-[84px] xl:self-start">
              <FocusNext s={s} mine={mine} user={u} />
              <ScoreTrend s={s} mine={mine} />
              <Card title="Recent activity" padded>
                <ol className="flex flex-col gap-3">
                  {activity.map((e, i) => (
                    <li key={i} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" /><div className="flex flex-col"><Text size="body">{e.text}</Text><Text size="caption" tone="subtle">{e.course} · {fmtDate(e.at, true)}</Text></div></li>
                  ))}
                </ol>
              </Card>
              {practiceCard}
            </aside>
          </div>
        </div>
      )}

      {p && course && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card eyebrow={course.title} title="Where they are" actions={<ProgressChip state={p.state} overdue={isOverdue(p)} label={STATE_LABEL[p.state]} size="md" />}>
              <KeyValue items={[
                { k: "Version", v: `v${p.version}` },
                { k: "Assigned", v: `${fmtDate(p.assignedAt, true)} · ${ASSIGN_LABEL[p.assignType]}` },
                { k: "Due", v: <span className={isOverdue(p) ? "text-danger" : undefined}>{fmtDate(p.dueAt, true)}</span> },
                { k: "Time spent", v: `${p.minutesSpent} min` },
                ...(p.path ? [{ k: "Path", v: `${p.path.moduleIds.length} of ${mods.length} modules · ~${pathMinutes(mods, p.path.moduleIds)} min` }] : []),
                ...(p.certifiedAt ? [{ k: "Certified", v: `${fmtDate(p.certifiedAt, true)} · valid to ${fmtDate(p.certExpiresAt, true)}` }] : []),
              ]} />
            </Card>
            <CourseProgress p={p} course={course} mods={mods} user={u} />
            {p.screening && (
              <Card title="Screening → latest" eyebrow="By competency">
                <div className="flex flex-col gap-3">
                  {COMPETENCIES.filter((c) => p.screening!.scores[c.id] !== undefined).map((c) => {
                    const a = p.screening!.scores[c.id];
                    const b = latest?.[c.id];
                    return (
                      <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
                        <Text size="body" weight="semibold" truncate>{c.name}</Text>
                        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                          <Meter value={a} tone="ink" height={6} label={`Screening ${a}`} />
                          {b !== undefined && <Meter value={b} tone={b >= 80 ? "ok" : b >= 50 ? "brand-2" : "danger"} height={6} label={`Latest ${b}`} />}
                        </div>
                        <div className="row-start-1 flex items-center gap-2 justify-self-end sm:row-start-auto">
                          <Text size="body" tone="subtle" tabular>{a}{b !== undefined ? ` → ${b}` : ""}</Text>
                          <BandChip score={b ?? a} size="xs" />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <Text size="caption" tone="subtle">Dark bar: screening. Coloured bar: latest assessment.</Text>
              </Card>
            )}
            {p.attempts.length > 0 && (
              <Card title="Assessment attempts">
                {p.attempts.map((a, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 border-b border-hair pb-3 last:border-0">
                    <Text size="body-lg" weight="bold">Attempt {i + 1}</Text>
                    <Text size="body" tone="subtle">{fmtDate(a.at, true)}</Text>
                    <Text size="body">Quiz {a.quiz}%{a.roleplay !== undefined ? ` · roleplay ${a.roleplay}%` : ""}</Text>
                    <span className={`ml-auto rounded-chip px-2 py-0.5 text-caption font-bold ${a.passed ? "bg-ok-bg text-ok" : "bg-danger-bg text-danger"}`}>{a.passed ? "Passed" : "Not passed"}</span>
                    {!a.passed && a.failedCompetencies.length > 0 && <Text size="caption" tone="danger" className="w-full">Below the bar: {a.failedCompetencies.map((c) => competency(c)?.name).join(", ")}{a.call?.flags.some((f) => f.critical) ? " · critical compliance flag" : ""}</Text>}
                  </div>
                ))}
              </Card>
            )}
            <Card title="Coaching notes">
              {p.coachingNotes.length === 0 && <Text tone="subtle">No notes yet.</Text>}
              {p.coachingNotes.map((n, i) => (
                <div key={i} className="squircle flex flex-col gap-1 rounded-panel bg-subtle px-4 py-3">
                  <Text size="caption" tone="subtle">{users.get(n.by)?.name} · {fmtDate(n.at, true)}</Text>
                  <Text size="body-lg">{n.text}</Text>
                </div>
              ))}
              <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); if (!note.trim()) return; s.addCoachingNote(p.id, me, note.trim()); setNote(""); showToast("Note added. The rep and trainer can see it."); }}>
                <div className="flex-1"><Field label="Add a note (visible to the rep and trainer)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Lead with fair balance when you share the EASI data." /></div>
                <Button type="submit" disabled={!note.trim()}>Add</Button>
              </form>
            </Card>
          </div>
          <aside className="flex flex-col gap-4 xl:sticky xl:top-[84px] xl:self-start">
            <Card title="Record" padded>
              <ol className="flex flex-col gap-3">
                {events(p, users).map((e, i) => (
                  <li key={i} className="flex gap-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-hidden="true" /><div className="flex flex-col"><Text size="body">{e.text}</Text><Text size="caption" tone="subtle">{fmtDate(e.at, true)}</Text></div></li>
                ))}
              </ol>
            </Card>
          </aside>
        </div>
      )}
      <Toast message={message} open={open} />
    </div>
  );
}
