"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flame, Mic, ChevronRight, Lock, CheckCircle2, Headphones, ArrowRight, Sparkle, Clock } from "lucide-react"; // v1-hidden: ListChecks, Library as LibraryIcon
import { AgentIcon } from "@/components/ui/logo-mark";
import { cn } from "@/lib/cn";
import { xpFor, fmtDate, daysFromToday, isOverdue } from "@/store/selectors";
import { competency, TODAY } from "@/data/org";
import { SCENARIOS } from "@/data/scenarios";
import { Text } from "@/components/ui/text";
import { Ring, FictionalNote } from "@/components/patterns/academy";
import { useCopilot } from "@/features/copilot/copilot-store";
import { useRep, pathProgress, pathModules } from "./use-rep";
import { RankCard } from "./leaderboard";
// v1-hidden: import { QuickWatchRail } from "./watch";

const greeting = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"; };

export function RepHome() {
  const router = useRouter();
  const { me, s, active, next, dueSoon, courseOf } = useRep();
  const openAgent = useCopilot((x) => x.setOpen);
  const onboarded = s.onboarded[me.id];
  /* Only a rep is sent to onboarding: while switching persona to the trainer, this must not race the navigation away. */
  const isRep = me.roles.includes("rep");
  useEffect(() => { if (!onboarded && isRep) router.replace("/rep/onboarding"); }, [onboarded, isRep, router]);
  if (!onboarded) return null;

  const xp = xpFor(s, me.id);
  const streak = s.streaks[me.id]?.days ?? 0;
  const assigned = s.progress.filter((p) => p.userId === me.id).map((p) => p.courseId);
  const practiceDoctor = SCENARIOS.find((x) => x.use.includes("practice") && assigned.includes(x.courseId));
  /* Something to listen to on the road: the first audio in a module still ahead of the rep. */
  const listen = active.flatMap((p) => (p.path || !courseOf(p).settings.screening ? pathModules(p, courseOf(p)).map((m) => ({ p, m })) : []))
    .find(({ p, m }) => m.blocks.some((b) => b.type === "audio" && !p.completedBlocks.includes(b.id)));
  /* Where they stand: the latest scores on their main course, weakest first. */
  const scored = active.find((p) => p.screening);
  const latest = scored ? (scored.attempts.at(-1)?.competencyScores ?? scored.screening!.scores) : undefined;
  const focus = latest ? Object.entries(latest).sort((a, b) => a[1] - b[1]).slice(0, 4) : [];
  const lastCall = s.practice.filter((x) => x.userId === me.id && x.kind === "roleplay").at(0);

  const shortcuts = [
    { label: "Prep for a meeting", sub: "Rehearse tomorrow's call", icon: <Mic className="size-5" aria-hidden="true" />, href: "/rep/practice/prep", tone: "brand" as const },
    { label: "Private AI roleplay", sub: practiceDoctor ? practiceDoctor.persona.name : "Talk to an AI doctor", icon: <Lock className="size-5" aria-hidden="true" />, href: practiceDoctor ? `/rep/practice/call?scenario=${practiceDoctor.id}` : "/rep/practice", tone: "ink" as const },
    { label: "Ask SwishX", sub: "Any product question", icon: <AgentIcon className="size-5" />, onClick: () => openAgent(true), tone: "tint" as const },
    { label: "Listen on the road", sub: listen ? listen.m.title : "Audio from your modules", icon: <Headphones className="size-5" aria-hidden="true" />, href: listen ? `/rep/course/${listen.p.courseId}/learn?module=${listen.m.id}` : "/rep/learn", tone: "tint" as const },
  ];

  return (
    <div className="flex flex-col gap-6 px-4 pb-4 pt-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Text size="caption" weight="semibold" tone="subtle">{new Date(TODAY).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</Text>
          <Text as="h1" size="hero" weight="extrabold" tracking="tight" className="leading-tight">{greeting()}, {me.first}</Text>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-chip bg-card px-2.5 py-1.5 text-body font-extrabold text-brand-deep shadow-hair" title={`${streak}-day streak`}><Flame className="size-4" aria-hidden="true" />{streak}</span>
          <span className="flex items-center gap-1.5 rounded-chip bg-card px-2.5 py-1.5 text-body font-bold shadow-hair" title={`${xp.levelName} · ${xp.pctToNext}% to the next level`}>
            <Ring value={xp.pctToNext} size={18} stroke={3} label="Level progress" />L{xp.level}
          </span>
        </div>
      </header>

      {/* Shortcuts first: the things a rep reaches for between calls. */}
      <section aria-label="Shortcuts" className="grid grid-cols-2 gap-2.5">
        {shortcuts.map((sc) => {
          const body = (
            <>
              <span className={cn("grid size-10 place-items-center rounded-control", sc.tone === "brand" ? "bg-brand text-white shadow-brand-lift" : sc.tone === "ink" ? "bg-ink text-white" : "bg-tint text-brand-deep")}>{sc.icon}</span>
              <span className="flex min-w-0 flex-col">
                <span className="text-body-lg font-bold leading-snug text-ink">{sc.label}</span>
                <span className="truncate text-caption text-ink-3">{sc.sub}</span>
              </span>
            </>
          );
          const cls = "squircle flex flex-col gap-3 rounded-panel border border-hair bg-card p-3.5 text-left shadow-hair transition-all hover:-translate-y-0.5 hover:shadow-soft active:scale-[0.98]";
          return sc.href ? <Link key={sc.label} href={sc.href} className={cls}>{body}</Link> : <button key={sc.label} type="button" onClick={sc.onClick} className={cls}>{body}</button>;
        })}
      </section>

      {next ? (
        <section className="squircle relative overflow-hidden rounded-card bg-ink p-5 text-white shadow-float">
          <div className="pointer-events-none absolute inset-0 opacity-70" style={{ background: "radial-gradient(circle at 100% 0%, var(--color-brand) 0, transparent 55%), radial-gradient(circle at 0% 110%, var(--color-brand-2) 0, transparent 45%)" }} />
          <div className="relative flex flex-col gap-4">
            <div className="flex items-center justify-between text-caption font-bold text-white/75">
              <span className="flex items-center gap-1.5"><Sparkle className="size-3.5" aria-hidden="true" />Up next</span>
              {next.progress.dueAt && <span className={cn(isOverdue(next.progress) && "text-brand-light")}>{isOverdue(next.progress) ? "Overdue" : `Due ${fmtDate(next.progress.dueAt)}`}</span>}
            </div>
            <div className="flex flex-col gap-1">
              <Text size="caption" tone="inverse" className="opacity-70">{next.eyebrow}</Text>
              <Text size="display-lg" weight="extrabold" tone="inverse" tracking="tight" className="leading-tight">{next.title}</Text>
              <Text size="body" tone="inverse" className="opacity-80">{next.why}</Text>
            </div>
            {next.progress.path && (
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-gradient-to-r from-brand-2 to-brand" style={{ width: `${pathProgress(next.progress, next.course).pct}%` }} /></div>
                <Text size="caption" tone="inverse" className="opacity-75" tabular>{pathProgress(next.progress, next.course).modulesDone}/{pathProgress(next.progress, next.course).modules} modules</Text>
              </div>
            )}
            <Link href={next.href} className="focus-ring flex h-12 items-center justify-center gap-2 rounded-control bg-white text-subhead font-bold text-ink transition-transform active:scale-[0.98]">
              {next.cta}{next.minutes ? <span className="font-semibold text-ink-3">· {next.minutes} min</span> : null}<ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="squircle flex items-center gap-3 rounded-card bg-ink p-5 text-white">
          <CheckCircle2 className="size-7 shrink-0 text-ok-on-dark" aria-hidden="true" />
          <Text size="body-lg" tone="inverse">You&apos;re all caught up. Rehearse your next meeting?</Text>
        </section>
      )}

      <RankCard />

      {active.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between"><Text as="h2" size="title" weight="bold">Your courses</Text><Link href="/rep/learn" className="text-body font-semibold text-brand-deep">See all</Link></div>
          <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {active.map((p) => {
              const c = courseOf(p);
              const pr = pathProgress(p, c);
              return (
                <Link key={p.id} href={`/rep/course/${c.id}`} className="squircle flex w-[220px] shrink-0 snap-start flex-col gap-3 rounded-panel border border-hair bg-card p-4 shadow-hair">
                  <div className="flex items-center justify-between">
                    <Ring value={p.path || !c.settings.screening ? pr.pct : 0} size={40} stroke={4} label={`${pr.pct}% done`}><Text size="micro" weight="bold" tabular>{p.path || !c.settings.screening ? pr.pct : 0}%</Text></Ring>
                    {p.dueAt && <span className={cn("rounded-chip px-2 py-0.5 text-micro font-bold", isOverdue(p) ? "bg-danger-bg text-danger" : "bg-subtle text-ink-3")}>{isOverdue(p) ? "Overdue" : `${daysFromToday(p.dueAt)} days`}</span>}
                  </div>
                  <span className="line-clamp-2 text-body-lg font-bold leading-snug text-ink">{c.title}</span>
                  <span className="flex items-center gap-1 text-caption text-ink-3"><Clock className="size-3" aria-hidden="true" />{p.state === "not_started" ? (c.settings.screening ? "Starts with screening" : "Not started") : `${pr.modulesDone} of ${pr.modules} modules`}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {focus.length > 0 && (
        <section className="squircle flex flex-col gap-3 rounded-card border border-hair bg-card p-4 shadow-hair">
          <div className="flex items-baseline justify-between">
            <Text as="h2" size="title" weight="bold">Where to focus</Text>
            <Text size="caption" tone="subtle">{scored!.attempts.length ? "From your last assessment" : "From your screening"}</Text>
          </div>
          {focus.map(([k, v]) => (
            <div key={k} className="flex flex-col gap-1">
              <div className="flex justify-between text-body"><span className="text-ink-2">{competency(k)?.name}</span><strong className="tabular-nums">{v}</strong></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/[0.06]"><div className={cn("h-full rounded-full", v >= 80 ? "bg-ok" : v >= 50 ? "bg-brand-2" : "bg-brand")} style={{ width: `${v}%` }} /></div>
            </div>
          ))}
        </section>
      )}

      {dueSoon.length > 0 && (
        <section className="flex flex-col gap-2">
          <Text as="h2" size="title" weight="bold">Due soon</Text>
          {dueSoon.map((p) => (
            <Link key={p.id} href={`/rep/course/${p.courseId}`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold" truncate>{courseOf(p).title}</Text>
                <Text size="caption" tone={isOverdue(p) ? "danger" : "subtle"}>{isOverdue(p) ? `Overdue since ${fmtDate(p.dueAt)}` : `Due in ${daysFromToday(p.dueAt!)} days`}</Text></div>
              <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
            </Link>
          ))}
        </section>
      )}

      {lastCall?.result && (
        <Link href={`/rep/practice/session/${lastCall.id}`} className="squircle flex items-center gap-3 rounded-panel border border-hair bg-card px-4 py-3">
          <Ring value={lastCall.result.score} size={40} stroke={4} label={`${lastCall.result.score}%`}><Text size="micro" weight="bold">{lastCall.result.score}</Text></Ring>
          <div className="flex min-w-0 flex-1 flex-col"><Text size="body-lg" weight="semibold" truncate>Your last practice call</Text><Text size="caption" tone="subtle">{lastCall.title} · {fmtDate(lastCall.at)} · only you can see it</Text></div>
          <ChevronRight className="size-4 text-ink-4" aria-hidden="true" />
        </Link>
      )}

      {/* v1-hidden: quick quiz, the Library and its quick-watch rail (<QuickWatchRail />). */}

      <FictionalNote className="pb-2" />
    </div>
  );
}
