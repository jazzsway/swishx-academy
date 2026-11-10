"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Mic, ChevronRight, Lock, CheckCircle2 } from "lucide-react"; // v1-hidden: ListChecks, Library as LibraryIcon
import { xpFor, fmtDate, daysFromToday, isOverdue } from "@/store/selectors";
import { Text } from "@/components/ui/text";
import { Ring, FictionalNote } from "@/components/patterns/academy";
import { useRep, pathProgress } from "./use-rep";
// v1-hidden: import { QuickWatchRail } from "./watch";

export function RepHome() {
  const router = useRouter();
  const { me, s, next, dueSoon, courseOf } = useRep();
  const onboarded = s.onboarded[me.id];
  /* Only a rep is sent to onboarding: while switching persona to the trainer, this must not race the navigation away. */
  const isRep = me.roles.includes("rep");
  useEffect(() => { if (!onboarded && isRep) router.replace("/rep/onboarding"); }, [onboarded, isRep, router]);
  if (!onboarded) return null;

  const xp = xpFor(s, me.id);
  const streak = s.streaks[me.id]?.days ?? 0;

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

      <section className="grid gap-3">
        <Link href="/rep/practice/prep" className="squircle flex flex-col gap-2 rounded-panel border border-tint-line bg-tint p-4">
          <span className="grid size-10 place-items-center rounded-control bg-brand text-white"><Mic className="size-5" aria-hidden="true" /></span>
          <Text size="body-lg" weight="bold">Prep for a meeting</Text>
          <span className="flex items-center gap-1 text-caption text-ink-2"><Lock className="size-3" aria-hidden="true" />Private AI roleplay</span>
        </Link>
        {/* v1-hidden: <Link href="/rep/practice/quiz" className="squircle flex flex-col gap-2 rounded-panel border border-hair bg-card p-4">
          <span className="grid size-10 place-items-center rounded-control bg-ink text-white"><ListChecks className="size-5" aria-hidden="true" /></span>
          <Text size="body-lg" weight="bold">Quick quiz</Text>
          <span className="text-caption text-ink-3">5 questions · 2 min</span>
        </Link> */}
      </section>

      {/* v1-hidden: the Library and its quick-watch rail.
      <Link href="/rep/library" className="squircle flex items-center gap-3.5 rounded-panel border border-hair bg-card p-4">
        <span className="grid size-11 place-items-center rounded-control bg-ink text-white"><LibraryIcon className="size-5" aria-hidden="true" /></span>
        <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="bold">Explore the Library</Text><Text size="caption" tone="subtle">Playlists, videos, readings and graphics for your team. Nothing graded.</Text></div>
        <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
      </Link>

      <QuickWatchRail />
      */}

      <FictionalNote className="pb-2" />
    </div>
  );
}
