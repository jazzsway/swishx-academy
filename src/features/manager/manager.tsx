"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ShieldCheck, Lock, Send, ArrowRight } from "lucide-react";
import { useApp } from "@/store/app-store";
import { counts, fmtDate, isOverdue, pct, STATE_LABEL, useMe, daysFromToday } from "@/store/selectors";
import { COMPETENCIES, DOMAINS } from "@/data/org";
import type { Progress } from "@/data/types";
import { average } from "@/lib/learning";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/patterns/page-heading";
import { Card, Meter, Avatar, bandCellClass, EmptyState, Ring } from "@/components/patterns/academy";
import { useToast, Toast } from "@/components/patterns/toast";
import { Scorecard } from "@/features/roleplay/scorecard";
import { RepDetail } from "@/features/shared/rep-detail";
import { pathProgress } from "@/features/rep/use-rep";
import { PeopleTable, personRows } from "@/features/shared/people";

function useTeam() {
  const me = useMe();
  const s = useApp();
  const team = s.users.filter((u) => u.managerId === me.id && u.active);
  const ids = new Set(team.map((u) => u.id));
  const progress = s.progress.filter((p) => ids.has(p.userId));
  return { me, s, team, progress, district: s.districts.find((d) => d.managerId === me.id) };
}

export function ManagerHome() {
  const router = useRouter();
  const { me, s, team, progress, district } = useTeam();
  const { message, open, showToast } = useToast();
  const queue = progress.filter((p) => p.state === "awaiting_verify").sort((a, b) => a.verify!.requestedAt.localeCompare(b.verify!.requestedAt));
  const overdue = progress.filter(isOverdue);
  const required = ["c-lumora-launch", "c-compliance", "c-ad101"].map((cid) => ({ c: s.courses.find((x) => x.id === cid)!, ps: progress.filter((p) => p.courseId === cid) })).filter((x) => x.ps.length);
  const lum = progress.filter((p) => p.courseId === "c-lumora-launch");
  const domains = DOMAINS.filter((d) => d.id !== "compliance");
  const mine = s.progress.filter((p) => p.userId === me.id && p.state !== "certified");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Text as="h1" size="hero" weight="extrabold" tracking="tight">Morning, {me.first}</Text>
          <Text size="subhead" tone="muted">{district?.name} · {team.length} reps. {queue.length ? `${queue.length} waiting for your sign-off.` : "No sign-offs waiting."} {overdue.length ? `${overdue.length} overdue.` : ""}</Text>
        </div>
        {queue.length > 0 && <Button size="lg" onClick={() => router.push(`/manager/verify/${queue[0].id}`)}><ShieldCheck className="size-4" aria-hidden="true" />Review {queue.length} sign-off{queue.length === 1 ? "" : "s"}</Button>}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Team readiness" eyebrow="Required courses">
          <div className="flex flex-col gap-4">
            {required.map(({ c, ps }) => {
              const ct = counts(ps);
              const v = pct(ct.certified, ct.total);
              return (
                <div key={c.id} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2"><Text size="body-lg" weight="semibold">{c.title}</Text><Text size="body" tone="subtle"><strong className="text-ink">{v}%</strong> · {ct.certified}/{ct.total} certified{ct.overdue ? <span className="text-danger"> · {ct.overdue} overdue</span> : ""}</Text></div>
                  <Meter value={v} tone={v >= 90 ? "ok" : "brand"} label={`${c.title} ${v}%`} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card tone="ink" title="Verify queue" eyebrow="Your sign-off">
          <div className="flex items-end gap-3"><Text size="hero-lg" weight="extrabold" tone="inverse" tabular>{queue.length}</Text><Text size="body-lg" tone="inverse" className="pb-2 opacity-70">waiting</Text></div>
          {queue.slice(0, 3).map((p) => {
            const u = s.users.find((x) => x.id === p.userId)!;
            const waited = -daysFromToday(p.verify!.requestedAt);
            return (
              <Link key={p.id} href={`/manager/verify/${p.id}`} className="flex items-center gap-3 rounded-control bg-white/[0.06] px-3 py-2.5 hover:bg-white/10">
                <Avatar initials={u.initials} size={30} tone="tint" />
                <span className="flex-1 text-body font-semibold">{u.name}</span>
                <span className={`text-caption ${waited > 5 ? "text-[#ff9e9b]" : "text-white/60"}`}>{waited === 0 ? "today" : `${waited}d`}</span>
              </Link>
            );
          })}
          <Link href="/manager/verify" className="mt-auto flex items-center gap-1.5 text-body font-semibold text-brand-light">Open queue <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card title="Team competency map" eyebrow="Lumora · latest assessment, else screening">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-body">
              <thead><tr className="text-left text-caption text-ink-3"><th className="px-1 font-semibold" />{domains.map((d) => <th key={d.id} className="px-1 font-semibold">{d.short}</th>)}</tr></thead>
              <tbody>
                {lum.map((p) => {
                  const u = s.users.find((x) => x.id === p.userId)!;
                  const sc = p.attempts.at(-1)?.competencyScores ?? p.screening?.scores;
                  return (
                    <tr key={p.id}>
                      <th scope="row" className="px-1 text-left"><Link href={`/manager/team/${u.id}`} className="font-semibold hover:underline">{u.name}</Link></th>
                      {domains.map((d) => {
                        const vals = COMPETENCIES.filter((c) => c.domain === d.id).map((c) => sc?.[c.id]).filter((x): x is number => x !== undefined);
                        const v = vals.length ? average(vals) : null;
                        return <td key={d.id} className={`rounded-chip px-2 py-2 text-center font-bold tabular-nums ${bandCellClass(v)}`}>{v ?? "–"}</td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card title={`Overdue · ${overdue.length}`}>
            {overdue.length === 0 ? <Text tone="subtle">Nobody overdue.</Text> : overdue.map((p) => {
              const u = s.users.find((x) => x.id === p.userId)!;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <Avatar initials={u.initials} size={32} />
                  <div className="flex min-w-0 flex-1 flex-col"><Text size="body" weight="semibold">{u.name}</Text><Text size="caption" tone="danger">{s.courses.find((c) => c.id === p.courseId)?.title} · due {fmtDate(p.dueAt)}</Text></div>
                  <Button size="sm" variant="secondary" onClick={() => showToast(s.nudge(p.id, me.id) ? `Nudged ${u.first}` : "Already nudged in the last 48 hours")}><Send className="size-3.5" aria-hidden="true" />Nudge</Button>
                </div>
              );
            })}
          </Card>
          <Card title="Team practice pulse" actions={<span className="flex items-center gap-1 text-caption text-ink-2"><Lock className="size-3.5" aria-hidden="true" />Anonymous</span>}>
            {team.length >= 5 ? (
              <>
                <Text size="body-lg"><strong>31</strong> practice calls this week across the team, up from 19.</Text>
                <Text size="body" tone="muted">Most missed: <strong className="text-ink">handling the cost &amp; access objection</strong> (hit in 44% of calls). A good topic for Monday&apos;s huddle.</Text>
              </>
            ) : <Text tone="subtle">Not enough people to keep this anonymous.</Text>}
          </Card>
          {mine.length > 0 && (
            <Card title="Your own learning" padded>
              {mine.map((p) => <Link key={p.id} href="/manager/learning" className="text-body-lg font-semibold text-brand-deep hover:underline">{s.courses.find((c) => c.id === p.courseId)?.title}</Link>)}
            </Card>
          )}
        </div>
      </div>
      <Toast message={message} open={open} />
    </div>
  );
}

export function ManagerTeam() {
  const router = useRouter();
  const { s, team } = useTeam();
  const rows = useMemo(() => personRows(s, team), [s, team]);
  const behind = rows.filter((r) => r.urgent.state !== "certified").length;
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="Team" description={`${rows.length} people · ${behind ? `${behind} with a course still open` : "everyone certified"}. Open someone to see each course step by step. Practice is private and never shown here.`} />
      <PeopleTable s={s} rows={rows} onOpen={(r) => router.push(`/manager/team/${r.u.id}`)} sub={(u) => u.territory ?? ""} />
    </div>
  );
}

export function ManagerRepDetail() {
  const { id } = useParams<{ id: string }>();
  return <RepDetail userId={id} viewer="manager" />;
}

export function ManagerLearning() {
  const me = useMe();
  const s = useApp();
  const mine = s.progress.filter((p) => p.userId === me.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeading title="My learning" description="Managers certify too. Take your courses in the Academy app on your phone; progress shows here." />
      <div className="grid gap-3 sm:grid-cols-2">
        {mine.map((p: Progress) => {
          const c = s.courses.find((x) => x.id === p.courseId)!;
          const pr = pathProgress(p, c);
          return (
            <div key={p.id} className="squircle flex items-center gap-4 rounded-card border border-hair bg-card p-5">
              <Ring value={p.state === "certified" ? 100 : pr.pct} size={48} tone={p.state === "certified" ? "ok" : "brand"} label={`${pr.pct}%`} />
              <div className="flex flex-col"><Text size="subhead" weight="bold">{c.title}</Text><Text size="caption" tone="subtle">{STATE_LABEL[p.state]}{p.dueAt ? ` · due ${fmtDate(p.dueAt)}` : ""}</Text></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SharedPractice() {
  const { id } = useParams<{ id: string }>();
  const s = useApp();
  const x = s.practice.find((p) => p.id === id && p.shared);
  const u = s.users.find((y) => y.id === x?.userId);
  const markSeen = s.markPracticeSeen;
  const unseen = x && !x.shared?.seen ? x.id : null;
  useEffect(() => { if (unseen) markSeen(unseen); }, [unseen, markSeen]);
  if (!x?.result || !u) return <EmptyState title="Not shared with you" body="This session is private, or the rep unshared it." />;
  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5">
      <Link href={`/manager/team/${u.id}`} className="self-start text-body font-semibold text-ink-3">← {u.name}</Link>
      <PageHeading eyebrow={`Shared by ${u.first} for coaching`} title={x.title} description={`Practice session · ${fmtDate(x.at)}. Only this session was shared; everything else stays private.`} />
      <Card><Scorecard result={x.result} mode="practice" /></Card>
    </div>
  );
}
