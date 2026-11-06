"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Mic, ListChecks, ChevronRight, Award, Lock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { xpFor, badgesFor, fmtDate, daysFromToday, isOverdue } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Ring, FictionalNote } from "@/components/patterns/academy";
import { useRep, pathProgress } from "./use-rep";

export function RepHome() {
  const router = useRouter();
  const { me, s, mine, next, dueSoon, courseOf } = useRep();
  const onboarded = s.onboarded[me.id];
  useEffect(() => { if (!onboarded) router.replace("/rep/onboarding"); }, [onboarded, router]);
  if (!onboarded) return null;

  const xp = xpFor(s, me.id);
  const streak = s.streaks[me.id]?.days ?? 0;
  const badges = badgesFor(s, me.id);
  const shown = [...badges.filter((b) => b.earned).slice(0, 1), ...badges.filter((b) => !b.earned && b.progress).slice(0, 2)];
  const ordered = [...mine].sort((a, b) => Number(a.state === "certified") - Number(b.state === "certified"));

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <section className="squircle flex flex-col gap-5 rounded-card bg-ink p-5 text-white">
        <div className="flex items-center gap-3.5">
          <Ring value={xp.pctToNext} size={60} stroke={6} tone="brand" label={`Level ${xp.level}, ${xp.pctToNext}% to next level`}>
            <Text size="title" weight="extrabold" tone="inverse">{xp.level}</Text>
          </Ring>
          <div className="flex min-w-0 flex-1 flex-col">
            <Text as="h1" size="display-lg" weight="extrabold" tone="inverse" tracking="tight">Hi {me.first}</Text>
            <Text size="body" tone="inverse" className="opacity-65">{xp.levelName} · {xp.next ? `${xp.toNext} XP to ${xp.next.name}` : "Top level"}</Text>
          </div>
          <div className="flex flex-col items-center rounded-panel bg-white/10 px-3 py-2">
            <span className="flex items-center gap-1 text-title font-extrabold text-brand-light"><Flame className="size-4.5" aria-hidden="true" />{streak}</span>
            <span className="text-micro text-white/60">day streak</span>
          </div>
        </div>

        {next ? (
          <div className="squircle flex flex-col gap-3 rounded-panel bg-brand-deep p-4">
            <div className="flex items-center justify-between text-caption font-bold text-white/80">
              <span>Today&apos;s mission</span>
              {next.progress.dueAt && <span>Due {fmtDate(next.progress.dueAt)}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Text size="caption" tone="inverse" className="opacity-75">{next.eyebrow}</Text>
              <Text size="display" weight="extrabold" tone="inverse" className="leading-tight">{next.title}</Text>
              <Text size="body" tone="inverse" className="opacity-85">{next.why}</Text>
            </div>
            {next.progress.path && (
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${pathProgress(next.progress, next.course).pct}%` }} /></div>
                <Text size="caption" tone="inverse" className="opacity-80">{pathProgress(next.progress, next.course).modulesDone} of {pathProgress(next.progress, next.course).modules} done</Text>
              </div>
            )}
            <Link href={next.href} className="focus-ring flex h-12 items-center justify-center rounded-control bg-white text-subhead font-bold text-brand-deep transition-transform active:scale-[0.98]">
              {next.cta}{next.minutes ? ` · ${next.minutes} min` : ""}
            </Link>
          </div>
        ) : (
          <div className="squircle flex items-center gap-3 rounded-panel bg-white/[0.07] p-4">
            <CheckCircle2 className="size-6 text-ok-on-dark" aria-hidden="true" />
            <Text size="body-lg" tone="inverse">You&apos;re all caught up. Practise for your next meeting?</Text>
          </div>
        )}
      </section>

      {dueSoon.length > 0 && (
        <section className="flex flex-col gap-2">
          <Text as="h2" size="subhead" weight="bold">Due soon</Text>
          {dueSoon.map((p) => (
            <Link key={p.id} href={`/rep/course/${p.courseId}`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold" truncate>{courseOf(p).title}</Text>
                <Text size="caption" tone={isOverdue(p) ? "danger" : "subtle"}>{isOverdue(p) ? `Overdue since ${fmtDate(p.dueAt)}` : `Due in ${daysFromToday(p.dueAt!)} days`}</Text></div>
              <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <Link href="/rep/practice/prep" className="squircle flex flex-col gap-2 rounded-panel border border-tint-line bg-tint p-4">
          <span className="grid size-10 place-items-center rounded-control bg-brand text-white"><Mic className="size-5" aria-hidden="true" /></span>
          <Text size="body-lg" weight="bold">Prep for a meeting</Text>
          <span className="flex items-center gap-1 text-caption text-ink-2"><Lock className="size-3" aria-hidden="true" />Private AI roleplay</span>
        </Link>
        <Link href="/rep/practice/quiz" className="squircle flex flex-col gap-2 rounded-panel border border-hair bg-card p-4">
          <span className="grid size-10 place-items-center rounded-control bg-ink text-white"><ListChecks className="size-5" aria-hidden="true" /></span>
          <Text size="body-lg" weight="bold">Quick quiz</Text>
          <span className="text-caption text-ink-3">5 questions · 2 min</span>
        </Link>
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between"><Text as="h2" size="subhead" weight="bold">Badges</Text><Link href="/rep/me" className="text-body font-semibold text-brand-deep">All {badges.length}</Link></div>
        <div className="grid grid-cols-3 gap-2.5">
          {shown.map((b) => (
            <div key={b.id} className="squircle flex flex-col items-center gap-1.5 rounded-panel border border-hair bg-card px-2 py-3 text-center">
              <div className={cn("grid size-11 place-items-center rounded-full", b.earned ? "bg-brand text-white" : "bg-subtle text-ink-3")}>
                {b.earned ? <Award className="size-5" aria-hidden="true" /> : <span className="text-caption font-bold">{b.progress}</span>}
              </div>
              <Text size="caption" weight="semibold" className="leading-tight">{b.name}</Text>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between"><Text as="h2" size="subhead" weight="bold">My courses</Text><Link href="/rep/learn" className="text-body font-semibold text-brand-deep">See all</Link></div>
        <div className="squircle overflow-hidden rounded-panel border border-hair bg-card">
          {ordered.map((p) => {
            const c = courseOf(p);
            const pr = pathProgress(p, c);
            return (
              <Link key={p.id} href={`/rep/course/${c.id}`} className="flex items-center gap-3 border-b border-hair px-4 py-3 last:border-0 hover:bg-subtle">
                {p.state === "certified" ? (
                  <span className="grid size-9 place-items-center rounded-full bg-ok-bg text-ok"><CheckCircle2 className="size-5" aria-hidden="true" /></span>
                ) : <Ring value={p.state === "not_started" ? 0 : pr.pct} size={36} stroke={4} label={`${pr.pct}% done`} />}
                <div className="flex min-w-0 flex-1 flex-col">
                  <Text size="body-lg" weight="semibold" truncate>{c.title}</Text>
                  <Text size="caption" tone={p.state === "certified" ? "ok" : "subtle"}>
                    {p.state === "certified" ? `Certified · valid to ${fmtDate(p.certExpiresAt, true)}` : p.state === "awaiting_verify" ? "Passed · waiting for your manager" : p.path ? `Your path: ${pr.modules} of ${c.modules.length} modules` : p.state === "not_started" ? (p.assignType === "default" ? "Start here" : "Not started") : "In progress"}
                  </Text>
                </div>
                <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
      <FictionalNote className="pb-2" />
    </div>
  );
}
